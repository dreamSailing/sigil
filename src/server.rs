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
use tower_http::services::ServeDir;
use tower_http::compression::CompressionLayer;
use crate::compiler;

/// Cached compilation result
#[derive(Clone)]
struct CacheEntry {
    js: String,
    etag: String,
}

pub async fn start_server(port: u16, root_dir: PathBuf) -> Result<()> {
    let src_dir = root_dir.join("src");
    
    // Locate runtime files relative to the binary
    // Binary is at target/release/sig, runtime is at project_root/runtime/
    let project_root = std::env::current_exe()
        .ok()
        .and_then(|p| {
            let target = p.parent()?.parent()?.parent()?;
            Some(target.to_path_buf())
        });
    
    let runtime_path = project_root
        .as_ref()
        .map(|p| p.join("runtime/runtime.js"))
        .filter(|p| p.exists())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default().join("runtime/runtime.js"));
    
    let ui_path = project_root
        .as_ref()
        .map(|p| p.join("runtime/ui.js"))
        .filter(|p| p.exists())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default().join("runtime/ui.js"));

    // File watcher broadcast channel
    let (reload_tx, _) = broadcast::channel::<()>(16);
    let reload_tx = Arc::new(reload_tx);

    // Compilation cache: path -> CacheEntry
    let cache: Arc<Mutex<HashMap<String, CacheEntry>>> = Arc::new(Mutex::new(HashMap::new()));

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
                                let key = relative.to_string_lossy().to_string();
                                let mut cache = cache_clone.lock().unwrap();
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
    let src_dir_clone = src_dir.clone();
    let compile_route = get(move |Path(file): Path<String>| {
        let src = src_dir_clone.clone();
        let c = cache_clone2.clone();
        async move {
            let full_path = src.join(&file);
            
            // Security: Prevent path traversal attacks
            // Canonicalize both paths and verify the result is within src_dir
            let canonical_path = match full_path.canonicalize() {
                Ok(p) => p,
                Err(_) => {
                    return Response::builder()
                        .status(StatusCode::NOT_FOUND)
                        .header(header::CONTENT_TYPE, "text/plain")
                        .body(Body::from("File not found"))
                        .expect("response build failed");
                }
            };
            let canonical_src = match src.canonicalize() {
                Ok(p) => p,
                Err(_) => {
                    return Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header(header::CONTENT_TYPE, "text/plain")
                        .body(Body::from("Server configuration error"))
                        .expect("response build failed");
                }
            };
            if !canonical_path.starts_with(&canonical_src) {
                return Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .header(header::CONTENT_TYPE, "text/plain")
                    .body(Body::from("Access denied"))
                    .expect("response build failed");
            }

            if !canonical_path.exists() {
                return Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .header(header::CONTENT_TYPE, "text/plain")
                    .body(Body::from("File not found"))
                    .expect("response build failed");
            }

            let source = match std::fs::read_to_string(&canonical_path) {
                Ok(s) => s,
                Err(e) => {
                    return Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header(header::CONTENT_TYPE, "text/plain")
                        .body(Body::from(format!("Read error: {}", e)))
                        .expect("response build failed");
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

            // Check cache
            {
                let guard = c.lock().unwrap();
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
            let result = tokio::task::spawn_blocking(move || {
                compiler::transform_tsx(&source)
            }).await;

            match result {
                Ok(Ok(compiled)) => {
                    // Store in cache (only JS, source map is inlined)
                    c.lock().unwrap().insert(file_key, CacheEntry { js: compiled.js.clone(), etag: etag_key });
                    Response::builder()
                        .header(header::CONTENT_TYPE, "application/javascript")
                        .header(header::CACHE_CONTROL, "no-cache")
                        .body(Body::from(compiled.js))
                        .expect("response build failed")
                }
                Ok(Err(e)) => Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header(header::CONTENT_TYPE, "text/plain")
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(Body::from(format!("Compile Error: {}", e)))
                    .expect("response build failed"),
                Err(e) => Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header(header::CONTENT_TYPE, "text/plain")
                    .body(Body::from(format!("Task Error: {}", e)))
                    .expect("response build failed"),
            }
        }
    });

    // Serve runtime file
    let runtime_route = get(move || {
        let path = runtime_path.clone();
        async move {
            match std::fs::read_to_string(path) {
                Ok(code) => Response::builder()
                    .header(header::CONTENT_TYPE, "application/javascript")
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(Body::from(code))
                    .expect("response build failed"),
                Err(e) => Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header(header::CONTENT_TYPE, "text/plain")
                    .body(Body::from(format!("Runtime not found: {}", e)))
                    .expect("response build failed"),
            }
        }
    });

    // Serve UI file
    let ui_route = get(move || {
        let path = ui_path.clone();
        async move {
            match std::fs::read_to_string(path) {
                Ok(code) => Response::builder()
                    .header(header::CONTENT_TYPE, "application/javascript")
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(Body::from(code))
                    .expect("response build failed"),
                Err(e) => Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header(header::CONTENT_TYPE, "text/plain")
                    .body(Body::from(format!("UI library not found: {}", e)))
                    .expect("response build failed"),
            }
        }
    });

    let app = Router::new()
        .route("/@runtime", runtime_route)
        .route("/@ui", ui_route)
        .route("/@reload", reload_route)
        .route("/src/*file", compile_route)
        .fallback_service(ServeDir::new(root_dir))
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
