// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use anyhow::Result;
use std::fs;
use std::path::PathBuf;

pub const EMBEDDED_RUNTIME_JS: &str = include_str!("../runtime/runtime.js");
pub const EMBEDDED_UI_JS: &str = include_str!("../runtime/ui.js");
pub const EMBEDDED_TYPES_D_TS: &str = include_str!("../runtime/types.d.ts");

fn candidate_runtime_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
            roots.push(root.to_path_buf());
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        roots.push(cwd);
    }

    roots
}

fn embedded_asset(asset_name: &str) -> Option<&'static str> {
    match asset_name {
        "runtime.js" => Some(EMBEDDED_RUNTIME_JS),
        "ui.js" => Some(EMBEDDED_UI_JS),
        "types.d.ts" => Some(EMBEDDED_TYPES_D_TS),
        _ => None,
    }
}

pub fn read_runtime_asset(asset_name: &str) -> Result<String> {
    for root in candidate_runtime_roots() {
        let candidate = root.join("runtime").join(asset_name);
        if candidate.exists() {
            return Ok(fs::read_to_string(candidate)?);
        }
    }

    embedded_asset(asset_name)
        .map(ToString::to_string)
        .ok_or_else(|| anyhow::anyhow!("Unknown embedded asset: {}", asset_name))
}
