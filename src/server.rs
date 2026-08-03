// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use anyhow::Result;
use axum::{
    body::Body,
    extract::Path,
    http::{header, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use tower_http::compression::CompressionLayer;
use crate::compiler;
use crate::assets;
use crate::errors::{json_error, SigilError};

/// MIME type mapping for static file serving
fn mime_type_guess(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("html") | Some("htm") => "text/html",
        Some("js") | Some("mjs") | Some("ts") | Some("tsx") | Some("jsx") => "application/javascript",
        Some("css") => "text/css",
        Some("json") => "application/json",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("webp") => "image/webp",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("ttf") => "font/ttf",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    }
}

fn resolve_source_module(src_root: &PathBuf, file: &str) -> std::io::Result<PathBuf> {
    let base = src_root.join(file);
    let candidates = [
        base.clone(),
        base.with_extension("tsx"),
        base.with_extension("ts"),
        base.with_extension("jsx"),
        base.with_extension("js"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        format!("Source module '{}' was not found.", file),
    ))
}

/// Cached compilation result
#[derive(Clone)]
struct CacheEntry {
    js: String,
    etag: String,
}

pub async fn start_server(port: u16, root_dir: PathBuf) -> Result<()> {
    let src_dir = root_dir.join("src");
    
    // File watcher broadcast channel
    let (reload_tx, _) = broadcast::channel::<()>(16);
    let reload_tx = Arc::new(reload_tx);

    // Compilation cache: path -> CacheEntry
    let cache: Arc<Mutex<HashMap<String, CacheEntry>>> = Arc::new(Mutex::new(HashMap::new()));

    // Canonicalize project root and src_dir once at startup.
    let canonical_root_dir = match root_dir.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("⚠️  Failed to canonicalize project root: {:?}", e);
            eprintln!("   Static file path protection may not work correctly.");
            root_dir.clone()
        }
    };
    let canonical_root_dir = Arc::new(canonical_root_dir);

    let canonical_src_dir = match src_dir.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("⚠️  Failed to canonicalize src directory: {:?}", e);
            eprintln!("   Path traversal protection may not work correctly.");
            src_dir.clone()
        }
    };
    let canonical_src_dir = Arc::new(canonical_src_dir);

    // Start file watcher (invalidates only changed file cache entries)
    let watcher_tx = reload_tx.clone();
    let watch_src_clone = src_dir.clone();
    let cache_clone = cache.clone();
    tokio::spawn(async move {
        use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event};
        let watch_prefix = watch_src_clone.clone();
        let mut watcher = match RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    for path in &event.paths {
                        if path.extension().is_some_and(|e| e == "tsx" || e == "ts" || e == "js") {
                            // Only invalidate the specific changed file
                            if let Ok(relative) = path.strip_prefix(&watch_prefix) {
                                let key = relative.to_string_lossy().replace('\\', "/");
                                // C3 fix: Handle poisoned mutex
                                let mut cache = cache_clone.lock().unwrap_or_else(|e| e.into_inner());
                                if cache.remove(&key).is_some() {
                                    println!("♻️  Cache invalidated: {}", key);
                                }
                            }
                            let _ = watcher_tx.send(());
                        }
                    }
                }
            },
            notify::Config::default().with_poll_interval(std::time::Duration::from_secs(1)),
        ) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("⚠️  File watcher failed: {:?}, hot-reload disabled", e);
                return;
            }
        };
        if let Err(e) = watcher.watch(&watch_src_clone, RecursiveMode::Recursive) {
            eprintln!("⚠️  Failed to watch src directory: {:?}", e);
            eprintln!("   Hot-reload will be disabled. Check that the src/ directory exists.");
            // Don't return - keep watcher alive even if watch fails
        } else {
            println!("👀 Watching: {}", watch_src_clone.display());
        }
        // Keep watcher alive
        tokio::signal::ctrl_c().await.ok();
    });

    // SSE endpoint for live reload
    let reload_tx_clone = reload_tx.clone();
    let reload_route = get(move || {
        let mut rx = reload_tx_clone.subscribe();
        async move {
            let stream = async_stream::stream! {
                yield Ok::<_, std::convert::Infallible>(axum::response::sse::Event::default().data("connected"));
                loop {
                    match rx.recv().await {
                        Ok(()) => {
                            yield Ok(axum::response::sse::Event::default().data("reload"));
                        }
                        Err(broadcast::error::RecvError::Lagged(n)) => {
                            eprintln!("SSE client lagged by {}", n);
                        }
                        Err(broadcast::error::RecvError::Closed) => break,
                    }
                }
            };
            axum::response::Sse::new(stream).keep_alive(
                axum::response::sse::KeepAlive::new()
                    .interval(std::time::Duration::from_secs(15))
                    .text("keep-alive"),
            )
        }
    });

    // TSX compilation handler with cache
    let cache_clone2 = cache.clone();
    let canonical_src_dir_clone = canonical_src_dir.clone();
    let compile_route = get(move |Path(file): Path<String>| {
        let canonical_src = canonical_src_dir_clone.clone();
        let c = cache_clone2.clone();
        async move {
            let full_path = match resolve_source_module(&canonical_src, &file) {
                Ok(path) => path,
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                    return json_error(
                        StatusCode::NOT_FOUND,
                        SigilError::new(
                            "SIG-SERVER-SRC-NOT-FOUND",
                            format!("Source module '{}' was not found.", file),
                            "The requested TSX module does not exist under src/.",
                            "Create the file under src/ or update the import path to a real module.",
                        ),
                    );
                }
                Err(e) => {
                    return json_error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        SigilError::new(
                            "SIG-SERVER-PATH-RESOLVE-FAILED",
                            format!("Failed to resolve source module '{}'.", file),
                            "The dev server could not determine which source file to compile.",
                            "Check file permissions and ensure the project src/ directory is accessible.",
                        )
                        .with_details(serde_json::json!({ "cause": e.to_string() })),
                    );
                }
            };

            // Security: Prevent path traversal attacks
            // Canonicalize path and verify the result is within src_dir
            let canonical_path = match full_path.canonicalize() {
                Ok(p) => p,
                Err(_) => {
                    return json_error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        SigilError::new(
                            "SIG-SERVER-PATH-RESOLVE-FAILED",
                            format!("Failed to resolve source module '{}'.", file),
                            "The dev server could not canonicalize the requested path.",
                            "Check file permissions and ensure the project src/ directory is accessible.",
                        ),
                    );
                }
            };
            if !canonical_path.starts_with(&*canonical_src) {
                return json_error(
                    StatusCode::FORBIDDEN,
                    SigilError::new(
                        "SIG-SERVER-PATH-FORBIDDEN",
                        format!("Access to '{}' is outside the src/ root.", file),
                        "A request attempted to traverse outside the project source directory.",
                        "Only import modules that live inside src/ and use relative imports from that root.",
                    ),
                );
            }

            let source = match std::fs::read_to_string(&canonical_path) {
                Ok(s) => s,
                Err(e) => {
                    return json_error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        SigilError::new(
                            "SIG-SERVER-SRC-READ-FAILED",
                            format!("Failed to read '{}'.", file),
                            "The source module exists but could not be read from disk.",
                            "Check file permissions and confirm the file is valid UTF-8.",
                        )
                        .with_details(serde_json::json!({ "cause": e.to_string() })),
                    );
                }
            };

            // Compute etag from file content
            let etag = format!("\"{}\"", {
                use std::collections::hash_map::DefaultHasher;
                use std::hash::{Hash, Hasher};
                let mut hasher = DefaultHasher::new();
                source.hash(&mut hasher);
                hasher.finish()
            });

            // Check cache (C3 fix: handle poisoned mutex)
            {
                let guard = c.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(entry) = guard.get(&file) {
                    if entry.etag == etag {
                        return Response::builder()
                            .header(header::CONTENT_TYPE, "application/javascript")
                            .header(header::CACHE_CONTROL, "no-cache")
                            .body(Body::from(entry.js.clone()))
                            .expect("response build failed");
                    }
                }
            }

            // Compile
            let file_key = file.clone();
            let etag_key = etag.clone();
            let module_path = file_key.clone();
            let result = tokio::task::spawn_blocking(move || {
                compiler::transform_tsx_at_path(&source, std::path::Path::new(&module_path))
            }).await;

            match result {
                Ok(Ok(compiled)) => {
                    // Store in cache (only JS, source map is inlined)
                    c.lock().unwrap_or_else(|e| e.into_inner()).insert(file_key, CacheEntry { js: compiled.js.clone(), etag: etag_key });
                    Response::builder()
                        .header(header::CONTENT_TYPE, "application/javascript")
                        .header(header::CACHE_CONTROL, "no-cache")
                        .body(Body::from(compiled.js))
                        .expect("response build failed")
                }
                Ok(Err(e)) => {
                    let diagnostics = compiler::extract_compile_diagnostics(&e).unwrap_or_default();
                    let mut error = SigilError::new(
                        "SIG-COMPILE-FAILED",
                        format!("TSX compilation failed for '{}'.", file),
                        "The module contains invalid TSX syntax, an unsupported construct, or an inconsistent import.",
                        "Fix the first diagnostic location, then re-run the dev server request.",
                    )
                    .with_details(serde_json::json!({ "diagnostics": diagnostics }));

                    if let Some(primary) = compiler::extract_compile_diagnostics(&e)
                        .and_then(|items| items.into_iter().find_map(|item| item.location.map(|location| (location, item.message))))
                    {
                        error = error.with_location(primary.0.file, primary.0.line, primary.0.column);
                    }

                    json_error(StatusCode::BAD_REQUEST, error)
                }
                Err(e) => json_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    SigilError::new(
                        "SIG-SERVER-COMPILE-TASK-FAILED",
                        format!("Background compile task crashed for '{}'.", file),
                        "The Rust worker panicked or could not return the compile result.",
                        "Inspect the server logs and retry after fixing the reported worker error.",
                    )
                    .with_details(serde_json::json!({ "cause": e.to_string() })),
                ),
            }
        }
    });

    // Serve runtime file
    let runtime_route = get(move || {
        async move {
            match assets::read_runtime_asset("runtime.js") {
                Ok(code) => Response::builder()
                    .header(header::CONTENT_TYPE, "application/javascript")
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(Body::from(code))
                    .expect("response build failed"),
                Err(e) => json_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    SigilError::new(
                        "SIG-SERVER-RUNTIME-ASSET-MISSING",
                        "Failed to load embedded runtime asset.",
                        "The runtime asset was missing from disk and the embedded fallback could not be loaded.",
                        "Reinstall the CLI or rebuild Sigil so runtime assets are embedded correctly.",
                    )
                    .with_details(serde_json::json!({ "cause": e.to_string() })),
                ),
            }
        }
    });

    // Serve UI file
    let ui_route = get(move || {
        async move {
            match assets::read_runtime_asset("ui.js") {
                Ok(code) => Response::builder()
                    .header(header::CONTENT_TYPE, "application/javascript")
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(Body::from(code))
                    .expect("response build failed"),
                Err(e) => json_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    SigilError::new(
                        "SIG-SERVER-UI-ASSET-MISSING",
                        "Failed to load embedded UI asset.",
                        "The UI asset was missing from disk and the embedded fallback could not be loaded.",
                        "Reinstall the CLI or rebuild Sigil so UI assets are embedded correctly.",
                    )
                    .with_details(serde_json::json!({ "cause": e.to_string() })),
                ),
            }
        }
    });

    let app = Router::new()
        .route("/@runtime", runtime_route)
        .route("/@ui", ui_route)
        .route("/@reload", reload_route)
        .route("/src/*file", compile_route)
        .fallback_service(get(move |req: axum::http::Request<Body>| {
            let root = root_dir.clone();
            let canonical_root = canonical_root_dir.clone();
            async move {
                let path = req.uri().path().trim_start_matches('/');
                if path.is_empty() {
                    // Serve index.html for root
                    let full_path = root.join("index.html");
                    match std::fs::read_to_string(&full_path) {
                        Ok(content) => Response::builder()
                            .header(header::CONTENT_TYPE, "text/html")
                            .header(header::CACHE_CONTROL, "no-cache")
                            .body(Body::from(content))
                            .expect("response build failed"),
                        Err(e) => json_error(
                            StatusCode::NOT_FOUND,
                            SigilError::new(
                                "SIG-SERVER-ENTRY-NOT-FOUND",
                                "Project entry file index.html was not found.",
                                "The dev server expects index.html at the project root.",
                                "Add index.html to the project root or scaffold a new project with `sig new`.",
                            )
                            .with_details(serde_json::json!({ "cause": e.to_string() })),
                        ),
                    }
                } else {
                    let full_path = root.join(path);
                    // Security: prevent path traversal
                    let canonical_path = match full_path.canonicalize() {
                        Ok(p) => p,
                        Err(_) => {
                            return json_error(
                                StatusCode::NOT_FOUND,
                                SigilError::new(
                                    "SIG-SERVER-STATIC-NOT-FOUND",
                                    format!("Static asset '{}' was not found.", path),
                                    "The requested file does not exist under the project root.",
                                    "Create the asset under the project root or fix the asset URL.",
                                ),
                            );
                        }
                    };
                    if !canonical_path.starts_with(&*canonical_root) {
                        return json_error(
                            StatusCode::FORBIDDEN,
                            SigilError::new(
                                "SIG-SERVER-STATIC-FORBIDDEN",
                                format!("Access to '{}' is outside the project root.", path),
                                "A request attempted to traverse outside the project root.",
                                "Reference only assets inside the project root or public/ directory.",
                            ),
                        );
                    }
                    if canonical_path.is_file() {
                        let content_type = mime_type_guess(&full_path);
                        match std::fs::read(&full_path) {
                            Ok(data) => Response::builder()
                                .header(header::CONTENT_TYPE, content_type)
                                .header(header::CACHE_CONTROL, "no-cache")
                                .body(Body::from(data))
                                .expect("response build failed"),
                            Err(e) => json_error(
                                StatusCode::INTERNAL_SERVER_ERROR,
                                SigilError::new(
                                    "SIG-SERVER-STATIC-READ-FAILED",
                                    format!("Failed to read static asset '{}'.", path),
                                    "The asset exists but could not be read from disk.",
                                    "Check file permissions and confirm the asset is accessible.",
                                )
                                .with_details(serde_json::json!({ "cause": e.to_string() })),
                            ),
                        }
                    } else {
                        json_error(
                            StatusCode::NOT_FOUND,
                            SigilError::new(
                                "SIG-SERVER-STATIC-NOT-FOUND",
                                format!("Static asset '{}' was not found.", path),
                                "The requested path resolved, but it is not a file.",
                                "Point the browser to an existing file or ensure the build emitted the asset.",
                            ),
                        )
                    }
                }
            }
        }))
        .layer(CompressionLayer::new());

    // Bind to port with auto-increment on conflict (max 10 attempts)
    let mut bind_port = port;
    let max_attempts = 10;
    let listener = loop {
        match tokio::net::TcpListener::bind(format!("127.0.0.1:{}", bind_port)).await {
            Ok(listener) => break listener,
            Err(e) if bind_port < port + max_attempts => {
                eprintln!("⚠️  Port {} is in use: {}, trying {}...", bind_port, e, bind_port + 1);
                bind_port += 1;
            }
            Err(e) => return Err(e.into()),
        }
    };
    
    if bind_port != port {
        println!("✅ Ready! Open http://localhost:{} (auto-selected)", bind_port);
    } else {
        println!("✅ Ready! Open http://localhost:{}", port);
    }
    axum::serve(listener, app).await?;
    Ok(())
}
