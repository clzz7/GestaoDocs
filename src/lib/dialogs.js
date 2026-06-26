/**
 * dialogs.js
 *
 * Native file dialog wrappers using @tauri-apps/plugin-dialog.
 * Replaces all custom Rust dialog commands (dialog.rs).
 */
import { open, save } from '@tauri-apps/plugin-dialog';

/**
 * Opens a native file-open dialog filtered to PDF files.
 * @returns {Promise<string|null>} The selected file path, or null if cancelled.
 */
export async function selectPdfFile() {
  const result = await open({
    title: 'Selecionar arquivo PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    multiple: false,
  });
  return result ?? null;
}

/**
 * Opens a native save dialog for choosing a ZIP file save location.
 * @param {string} [defaultName='documentos.zip'] - Default filename suggestion.
 * @returns {Promise<string|null>} The chosen save path, or null if cancelled.
 */
export async function selectSaveLocation(defaultName = 'documentos.zip') {
  const result = await save({
    title: 'Salvar arquivo ZIP',
    defaultPath: defaultName,
    filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
  });
  return result ?? null;
}

/**
 * Opens a native file-open dialog filtered to image files (PNG, JPG).
 * @returns {Promise<string|null>} The selected file path, or null if cancelled.
 */
export async function selectImageFile() {
  const result = await open({
    title: 'Selecionar imagem do carimbo',
    filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg'] }],
    multiple: false,
  });
  return result ?? null;
}

/**
 * Opens a native save dialog for choosing a PDF file save location.
 * @param {string} [defaultName='documento.pdf'] - Default filename suggestion.
 * @returns {Promise<string|null>} The chosen save path, or null if cancelled.
 */
export async function selectPdfSaveLocation(defaultName = 'documento.pdf') {
  const result = await save({
    title: 'Salvar PDF',
    defaultPath: defaultName,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });
  return result ?? null;
}

/**
 * Opens a native file-open dialog filtered to TXT files.
 * @returns {Promise<string|null>} The selected file path, or null if cancelled.
 */
export async function selectTxtFile() {
  const result = await open({
    title: 'Selecionar arquivo TXT',
    filters: [{ name: 'Arquivos de Texto', extensions: ['txt'] }],
    multiple: false,
  });
  return result ?? null;
}

/**
 * Opens a native file-open dialog filtered to DOC/DOCX files.
 * @returns {Promise<string|null>} The selected file path, or null if cancelled.
 */
export async function selectDocFile() {
  const result = await open({
    title: 'Selecionar documento Word',
    filters: [{ name: 'Word Documents', extensions: ['doc', 'docx'] }],
    multiple: false,
  });
  return result ?? null;
}
