use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
struct OcrProgress {
    stage: String,
    message: String,
    progress: u32,
}

#[tauri::command]
pub async fn ocr_pdf_pages(
    app: AppHandle,
    file_path: String,
    page_indices: Vec<u32>,
) -> Result<HashMap<u32, String>, String> {
    if page_indices.is_empty() {
        return Ok(HashMap::new());
    }
    Ok(HashMap::new())
}