import { open, save } from '@tauri-apps/plugin-dialog';

export async function selectPdfFile() {
  const result = await open({
    title: 'Selecionar arquivo PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    multiple: false,
  });
  return result ?? null;
}

export async function selectSaveLocation(defaultName = 'documentos.zip') {
  const result = await save({
    title: 'Salvar arquivo ZIP',
    defaultPath: defaultName,
    filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
  });
  return result ?? null;
}