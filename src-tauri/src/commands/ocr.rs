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
    let total = page_indices.len();
    let app_clone = app.clone();
    let result = tokio::task::spawn_blocking(move || {
        recognize_pdf_pages_with_windows(&file_path, &page_indices, &mut |completed, total| {
            let progress = ((completed as f64 / total as f64) * 100.0) as u32;
            let _ = app_clone.emit("processing-progress", OcrProgress {
                stage: "ocr".into(),
                message: format!("OCR: pÃ¡gina {} de {}", completed, total),
                progress,
            });
        })
    }).await.map_err(|e| format!("Erro interno no OCR: {e}"))??;
    Ok(result)
}

#[cfg(windows)]
struct ComApartment;

#[cfg(windows)]
impl ComApartment {
    fn initialize() -> Result<Self, String> {
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
        unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }
            .ok()
            .map_err(|e| format!("Erro COM: {e}"))?;
        Ok(Self)
    }
}

#[cfg(windows)]
impl Drop for ComApartment {
    fn drop(&mut self) {
        unsafe { windows::Win32::System::Com::CoUninitialize() };
    }
}

#[cfg(windows)]
fn recognize_pdf_pages_with_windows<F>(
    path: &str,
    page_indices: &[u32],
    progress_cb: &mut F,
) -> Result<HashMap<u32, String>, String>
where
    F: FnMut(usize, usize),
{
    use windows::{
        core::HSTRING,
        Data::Pdf::{PdfDocument, PdfPageRenderOptions},
        Globalization::Language,
        Graphics::Imaging::BitmapDecoder,
        Media::Ocr::OcrEngine,
        Storage::{StorageFile, Streams::InMemoryRandomAccessStream},
    };
    let _apartment = ComApartment::initialize()?;
    let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .map_err(|e| format!("Erro: {e}"))?.get().map_err(|e| format!("Erro: {e}"))?;
    let pdf = PdfDocument::LoadFromFileAsync(&file)
        .map_err(|e| format!("Erro: {e}"))?.get().map_err(|e| format!("Erro: {e}"))?;
    let total = page_indices.len();
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::scope(|scope| {
        for &page_index in page_indices {
            let tx = tx.clone();
            let pdf = pdf.clone();
            scope.spawn(move || {
                let _apartment = ComApartment::initialize().ok();
                let portuguese = Language::CreateLanguage(&HSTRING::from("pt-BR")).unwrap();
                let engine = OcrEngine::TryCreateFromLanguage(&portuguese).unwrap();
                let page = pdf.GetPage(page_index).unwrap();
                let stream = InMemoryRandomAccessStream::new().unwrap();
                let options = PdfPageRenderOptions::new().unwrap();
                page.RenderWithOptionsToStreamAsync(&stream, &options).unwrap().get().unwrap();
                stream.Seek(0).unwrap();
                let decoder = BitmapDecoder::CreateAsync(&stream).unwrap().get().unwrap();
                let bitmap = decoder.GetSoftwareBitmapAsync().unwrap().get().unwrap();
                let result = engine.RecognizeAsync(&bitmap).unwrap().get().unwrap();
                let _ = tx.send((page_index, result.Text().unwrap().to_string()));
            });
        }
    });
    drop(tx);
    let mut results = HashMap::new();
    let mut completed = 0;
    for (idx, text) in rx {
        results.insert(idx, text);
        completed += 1;
        progress_cb(completed, total);
    }
    Ok(results)
}