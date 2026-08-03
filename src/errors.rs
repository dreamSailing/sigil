// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorLocation {
    pub file: Option<String>,
    pub line: Option<usize>,
    pub column: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SigilError {
    pub code: String,
    pub message: String,
    pub likely_cause: String,
    pub suggested_fix: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<ErrorLocation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl SigilError {
    pub fn new(code: &str, message: impl Into<String>, likely_cause: impl Into<String>, suggested_fix: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            likely_cause: likely_cause.into(),
            suggested_fix: suggested_fix.into(),
            location: None,
            details: None,
        }
    }

    pub fn with_location(mut self, file: impl Into<String>, line: usize, column: usize) -> Self {
        self.location = Some(ErrorLocation {
            file: Some(file.into()),
            line: Some(line),
            column: Some(column),
        });
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }

    pub fn to_pretty_json(&self) -> String {
        serde_json::to_string_pretty(&serde_json::json!({ "error": self }))
            .unwrap_or_else(|_| format!("{{\"error\":{{\"code\":\"{}\",\"message\":\"{}\"}}}}", self.code, self.message))
    }
}

pub fn json_error(status: StatusCode, error: SigilError) -> Response {
    (status, Json(serde_json::json!({ "error": error }))).into_response()
}
