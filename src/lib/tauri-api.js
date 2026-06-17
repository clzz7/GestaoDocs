export { selectPdfFile, selectSaveLocation } from './dialogs.js';
export { readBinaryFile, writeBinaryFile, readTextFile } from './file-io.js';
export function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}