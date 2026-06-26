/**
 * tauri-api.js
 *
 * Módulo central de integração com as APIs nativas do Tauri e utilitários do sistema.
 * Gerencia comandos do sistema operacional e re-exporta utilitários de I/O e caixas de diálogo.
 */
import { Command } from '@tauri-apps/plugin-shell';

export {
  selectPdfFile,
  selectSaveLocation,
  selectImageFile,
  selectPdfSaveLocation,
  selectTxtFile,
  selectDocFile,
} from './dialogs.js';

export {
  readBinaryFile,
  writeBinaryFile,
  readTextFile,
  openSystemPath,
} from './file-io.js';

/**
 * Retorna true quando executando dentro do Tauri (desktop).
 */
export function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Converte um arquivo DOC/DOCX em PDF usando a automação COM do Microsoft Word via PowerShell.
 *
 * @param {string} filePath - Caminho absoluto do arquivo DOC/DOCX.
 * @param {string} savePath - Caminho absoluto de destino para o PDF gerado.
 * @returns {Promise<{success: boolean, path: string, processingTimeMs: number}>}
 */
export async function convertDocToPdf(filePath, savePath) {
  const start = performance.now();

  const inputEscaped = filePath.replace(/'/g, "''");
  const outputEscaped = savePath.replace(/'/g, "''");

  const psScript = `
$ErrorActionPreference = 'Stop'
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open('${inputEscaped}')
    $doc.SaveAs([ref] '${outputEscaped}', [ref] 17)
    $doc.Close([ref] 0)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    Write-Output 'SUCCESS'
} catch {
    if ($word) {
        try { $word.Quit() } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
    }
    Write-Error $_.Exception.Message
    exit 1
}`;

  const command = Command.create('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    psScript,
  ]);

  const output = await command.execute();
  const processingTimeMs = Math.round(performance.now() - start);

  if (output.code !== 0) {
    const stderr = output.stderr || '';
    let errorMsg;
    if (stderr.includes('Word.Application') || stderr.includes('ComObject')) {
      errorMsg = 'Microsoft Word não está instalado ou não foi possível iniciá-lo. Verifique se o Word está instalado corretamente.';
    } else if (stderr.includes('Documents.Open')) {
      errorMsg = 'Não foi possível abrir o documento. Verifique se o arquivo não está corrompido ou aberto em outro programa.';
    } else {
      errorMsg = `Erro na conversão: ${stderr.trim()}`;
    }
    throw new Error(errorMsg);
  }

  return {
    success: true,
    path: savePath,
    processingTimeMs,
  };
}
