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
    let result = tokio::task::spawn_blocking(move || {
        recognize_pdf_pages_with_windows(&file_path, &page_indices)
    }).await.map_err(|e| format!("Erro interno no OCR: {e}"))??;
    Ok(result)
}

#[cfg(windows)]
fn recognize_pdf_pages_with_windows(
    path: &str,
    page_indices: &[u32],
) -> Result<HashMap<u32, String>, String> {
    use windows::{
        core::HSTRING,
        Data::Pdf::PdfDocument,
        Storage::StorageFile,
    };
    let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .map_err(|e| format!("Erro ao abrir PDF: {e}"))?
        .get()
        .map_err(|e| format!("Erro ao abrir PDF: {e}"))?;
    let _pdf = PdfDocument::LoadFromFileAsync(&file)
        .map_err(|e| format!("Erro ao carregar PDF: {e}"))?
        .get()
        .map_err(|e| format!("Erro ao carregar PDF: {e}"))?;
    Ok(HashMap::new())
}