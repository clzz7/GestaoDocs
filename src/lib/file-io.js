import { readFile, writeFile } from '@tauri-apps/plugin-fs';

export async function readBinaryFile(path) {
  try {
    const bytes = await readFile(path);
    return bytes;
  } catch (err) {
    console.error('[file-io] readBinaryFile error:', err);
    throw err;
  }
}

export async function writeBinaryFile(path, bytes) {
  await writeFile(path, bytes);
}

export async function readTextFile(path) {
  const bytes = await readFile(path);
  return new TextDecoder('utf-8').decode(bytes);
}