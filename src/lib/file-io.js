/**
 * file-io.js
 *
 * File read/write and shell utilities using Tauri plugins.
 * Replaces stamp.rs (read_file_base64, write_file) and shell.rs (open_folder, open_file).
 */
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';

/**
 * Reads a file from disk as a Uint8Array.
 * This is much more efficient than the old base64 approach — no encoding overhead.
 * @param {string} path - Absolute path to the file.
 * @returns {Promise<Uint8Array>} Raw file bytes.
 */
export async function readBinaryFile(path) {
  try {
    const bytes = await readFile(path);
    console.log(`[file-io] readBinaryFile '${path}' returned:`, Object.prototype.toString.call(bytes), `length=${bytes?.length}`);
    if (bytes?.length >= 4) {
      console.log(`[file-io] First 4 bytes:`, Array.from(bytes.slice(0, 4)).map(b => b.toString(16)).join(' '));
    }
    return bytes;
  } catch (err) {
    console.error(`[file-io] readBinaryFile error for '${path}':`, err);
    throw err;
  }
}

/**
 * Writes raw bytes to a file on disk.
 * @param {string} path - Absolute path where to save the file.
 * @param {Uint8Array} bytes - Raw file contents.
 * @returns {Promise<void>}
 */
export async function writeBinaryFile(path, bytes) {
  await writeFile(path, bytes);
}

/**
 * Reads a text file from disk.
 * @param {string} path - Absolute path to the file.
 * @returns {Promise<string>} File contents as a string.
 */
export async function readTextFile(path) {
  const bytes = await readFile(path);
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Opens a file or folder with the system default handler (Explorer, default app, etc.).
 * @param {string} path - Absolute path to open.
 * @returns {Promise<void>}
 */
export async function openSystemPath(path) {
  await openPath(path);
}
