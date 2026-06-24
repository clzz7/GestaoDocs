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

export async function selectImageFile() {
  const result = await open({
    title: 'Selecionar imagem do carimbo',
    filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg'] }],
    multiple: false,
  });
  return result ?? null;
}

export async function selectPdfSaveLocation(defaultName = 'documento.pdf') {
  const result = await save({
    title: 'Salvar PDF',
    defaultPath: defaultName,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });
  return result ?? null;
}

export async function selectTxtFile() {
  const result = await open({
    title: 'Selecionar arquivo TXT',
    filters: [{ name: 'Arquivos de Texto', extensions: ['txt'] }],
    multiple: false,
  });
  return result ?? null;
}