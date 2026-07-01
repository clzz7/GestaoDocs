/// Simplified OCR module — the only remaining Rust backend command.
///
/// Receives a PDF file path and a list of 0-based page indices from the
/// frontend, renders each page via Windows PDF APIs, and runs the native
/// Windows OCR engine to recognise text.
///
/// The frontend (pdf.js) is responsible for extracting text from the PDF and
/// determining which pages need OCR — this module handles ONLY the OCR itself.
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
struct OcrProgress {
    stage: String,
    message: String,
    progress: u32,
}

/// Tauri command: OCR specific pages of a PDF using the native Windows OCR engine.
///
/// # Arguments
/// * `file_path` — Absolute path to the PDF file on disk.
/// * `page_indices` — 0-based indices of the pages that need OCR.
///
/// # Returns
/// A `HashMap<u32, String>` mapping each page index to its recognised text.
#[tauri::command]
pub async fn ocr_pdf_pages(
    app: AppHandle,
    file_path: String,
    page_indices: Vec<u32>,
) -> Result<HashMap<u32, String>, String> {
    if page_indices.is_empty() {
        return Ok(HashMap::new());
    }

    let app_clone = app.clone();
    let total = page_indices.len();

    // Emit initial progress
    let _ = app.emit("processing-progress", OcrProgress {
        stage: "ocr".into(),
        message: format!("Iniciando OCR em {} página(s)...", total),
        progress: 0,
    });

    // Run OCR in a blocking thread to avoid blocking the async runtime
    let result = tokio::task::spawn_blocking(move || {
        recognize_pdf_pages_with_windows(&file_path, &page_indices, &mut |completed, total| {
            let progress = ((completed as f64 / total as f64) * 100.0) as u32;
            let _ = app_clone.emit("processing-progress", OcrProgress {
                stage: "ocr".into(),
                message: format!("OCR: página {} de {}", completed, total),
                progress,
            });
        })
    })
    .await
    .map_err(|e| format!("Erro interno no OCR: {e}"))??;

    Ok(result)
}

// ── Windows OCR Implementation ──────────────────────────────────────────────

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
        .map_err(|e| format!("Não foi possível abrir o PDF no Windows: {e}"))?
        .get()
        .map_err(|e| format!("Não foi possível abrir o PDF no Windows: {e}"))?;
    let pdf = PdfDocument::LoadFromFileAsync(&file)
        .map_err(|e| format!("O Windows não conseguiu carregar este PDF: {e}"))?
        .get()
        .map_err(|e| format!("O Windows não conseguiu carregar este PDF: {e}"))?;

    let max_dimension = OcrEngine::MaxImageDimension()
        .map_err(|e| format!("Não foi possível configurar o OCR do Windows: {e}"))?;

    let total = page_indices.len();
    let max_threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    let num_threads = max_threads.min(total).max(1);

    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::scope(|scope| {
        let chunk_size = (total + num_threads - 1) / num_threads;

        for chunk in page_indices.chunks(chunk_size) {
            let tx = tx.clone();
            let pdf = pdf.clone();

            scope.spawn(move || {
                let _apartment = ComApartment::initialize().ok();

                let portuguese = Language::CreateLanguage(&HSTRING::from("pt-BR"))
                    .map_err(|e| format!("Não foi possível preparar o idioma do OCR: {e}"));
                let engine_result = portuguese.and_then(|lang| {
                    OcrEngine::TryCreateFromLanguage(&lang)
                        .or_else(|_| OcrEngine::TryCreateFromUserProfileLanguages())
                        .map_err(|_| "O OCR do Windows não está disponível. Instale o recurso de OCR em Configurações > Hora e idioma > Idioma e região > Português (Brasil) > Recursos de idioma.".to_string())
                });

                let engine = match engine_result {
                    Ok(e) => e,
                    Err(err) => {
                        let _ = tx.send(Err(err));
                        return;
                    }
                };

                for &page_index in chunk {
                    let process_page = || -> Result<String, String> {
                        let page = pdf.GetPage(page_index)
                            .map_err(|e| format!("Não foi possível renderizar a página {}: {e}", page_index + 1))?;
                        let size = page.Size()
                            .map_err(|e| format!("Não foi possível obter o tamanho da página {}: {e}", page_index + 1))?;
                        let scale = (2400.0 / size.Width.max(1.0))
                            .min(max_dimension as f32 / size.Width.max(1.0))
                            .min(max_dimension as f32 / size.Height.max(1.0));
                        let width = (size.Width * scale).round().max(1.0) as u32;
                        let height = (size.Height * scale).round().max(1.0) as u32;
                        let options = PdfPageRenderOptions::new()
                            .map_err(|e| format!("Não foi possível configurar a página {}: {e}", page_index + 1))?;
                        options.SetDestinationWidth(width).map_err(|e| e.to_string())?;
                        options.SetDestinationHeight(height).map_err(|e| e.to_string())?;
                        let stream = InMemoryRandomAccessStream::new()
                            .map_err(|e| format!("Não foi possível preparar a página {} para OCR: {e}", page_index + 1))?;
                        page.RenderWithOptionsToStreamAsync(&stream, &options)
                            .map_err(|e| format!("Não foi possível renderizar a página {}: {e}", page_index + 1))?
                            .get()
                            .map_err(|e| format!("Não foi possível renderizar a página {}: {e}", page_index + 1))?;
                        stream.Seek(0).map_err(|e| format!("Não foi possível ler a página {}: {e}", page_index + 1))?;
                        let decoder = BitmapDecoder::CreateAsync(&stream)
                            .map_err(|e| format!("Não foi possível preparar a imagem da página {}: {e}", page_index + 1))?
                            .get()
                            .map_err(|e| format!("Não foi possível preparar a imagem da página {}: {e}", page_index + 1))?;
                        let bitmap = decoder.GetSoftwareBitmapAsync()
                            .map_err(|e| format!("Não foi possível ler a imagem da página {}: {e}", page_index + 1))?
                            .get()
                            .map_err(|e| format!("Não foi possível ler a imagem da página {}: {e}", page_index + 1))?;
                        let result = engine.RecognizeAsync(&bitmap)
                            .map_err(|e| format!("O OCR falhou na página {}: {e}", page_index + 1))?
                            .get()
                            .map_err(|e| format!("O OCR falhou na página {}: {e}", page_index + 1))?;

                        Ok(result.Text().map_err(|e| e.to_string())?.to_string())
                    };

                    match process_page() {
                        Ok(text) => {
                            if tx.send(Ok((page_index, text))).is_err() {
                                break;
                            }
                        }
                        Err(e) => {
                            let _ = tx.send(Err(e));
                            break;
                        }
                    }
                }
            });
        }
        drop(tx);

        let mut results = HashMap::with_capacity(total);
        let mut completed = 0;

        for res in rx {
            match res {
                Ok((page_index, text)) => {
                    results.insert(page_index, text);
                    completed += 1;
                    progress_cb(completed, total);
                }
                Err(e) => return Err(e),
            }
        }

        Ok(results)
    })
}

// ── COM Apartment helper ────────────────────────────────────────────────────

#[cfg(windows)]
struct ComApartment;

#[cfg(windows)]
impl ComApartment {
    fn initialize() -> Result<Self, String> {
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
        unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }
            .ok()
            .map_err(|e| format!("Não foi possível inicializar o OCR do Windows: {e}"))?;
        Ok(Self)
    }
}

#[cfg(windows)]
impl Drop for ComApartment {
    fn drop(&mut self) {
        unsafe { windows::Win32::System::Com::CoUninitialize() };
    }
}

// ── Non-Windows fallback ────────────────────────────────────────────────────

#[cfg(not(windows))]
fn recognize_pdf_pages_with_windows<F>(
    _path: &str,
    _page_indices: &[u32],
    _progress_cb: &mut F,
) -> Result<HashMap<u32, String>, String>
where
    F: FnMut(usize, usize),
{
    Err("O OCR nativo está disponível apenas na versão para Windows do GestãoDocs.".into())
}
