import React, { useState } from 'react';
import { ArrowLeft, FileText, FileOutput, CheckCircle2, Loader2 } from 'lucide-react';
import {
  selectDocFile,
  selectPdfSaveLocation,
  convertDocToPdf,
} from '../lib/tauri-api';

export default function ConvertPage() {
  const [docPath, setDocPath] = useState(null);
  const [docName, setDocName] = useState(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const accent = '#1a3a5c';

  const handleSelectDoc = async () => {
    if (converting) return;
    setError(null);
    try {
      const filePath = await selectDocFile();
      if (!filePath) return;
      const fileName = filePath.split(/[\\/]/).pop();
      setDocPath(filePath);
      setDocName(fileName);
      setResult(null);
    } catch (err) {
      setError(`Erro ao selecionar arquivo: ${err.message ?? err}`);
    }
  };

  const handleConvert = async () => {
    if (!docPath || converting) return;
    setConverting(true);
    setError(null);
    setResult(null);
    try {
      const pdfName = docName.replace(/\.(docx?|DOCX?)$/i, '.pdf');
      const savePath = await selectPdfSaveLocation(pdfName);
      if (!savePath) {
        setConverting(false);
        return;
      }

      const response = await convertDocToPdf(docPath, savePath);
      setResult(response);
    } catch (err) {
      setError(`Erro na conversão: ${err.message ?? err}`);
    } finally {
      setConverting(false);
    }
  };

  const handleReset = () => {
    setDocPath(null);
    setDocName(null);
    setResult(null);
    setError(null);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2">
          <div className="rounded-md p-1.5" style={{ background: `${accent}18` }}>
            <FileOutput className="w-5 h-5" style={{ color: accent }} />
          </div>
          <h1 className="text-text font-semibold text-lg">DOC → PDF</h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-10 pb-10 gap-6 animate-fade-in-up">
        <p className="text-text-muted text-sm max-w-md text-center">
          Converta documentos Word (.doc, .docx) para PDF utilizando o Microsoft Word instalado no seu computador.
        </p>
        <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-muted border border-border">1</div>
              <p className="text-sm font-semibold text-text">Selecionar documento</p>
            </div>
            <button
              onClick={handleSelectDoc}
              disabled={converting}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-[#1a3a5c]/30 hover:bg-background transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-5 h-5 text-text-muted" />
              <span className="text-sm text-text font-medium flex-1 text-left truncate">
                {docName || 'Clique para selecionar um arquivo .doc ou .docx'}
              </span>
              {docName && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-muted border border-border">2</div>
              <p className="text-sm font-semibold text-text">Converter para PDF</p>
            </div>

            {result ? (
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-800">Conversão concluída!</p>
                    <p className="text-xs text-emerald-600 truncate">{result.path}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">
                      Convertido em {(result.processingTimeMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface-hover text-text-muted text-sm font-medium hover:bg-border transition-colors"
                >
                  Converter outro documento
                </button>
              </div>
            ) : (
              <button
                onClick={handleConvert}
                disabled={!docPath || converting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: docPath && !converting ? accent : '#e2e8f0',
                  color: docPath && !converting ? '#fff' : '#94a3b8',
                  cursor: docPath && !converting ? 'pointer' : 'not-allowed',
                }}
              >
                {converting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Convertendo...
                  </>
                ) : (
                  <>
                    <FileOutput className="w-4 h-4" />
                    {docPath ? 'Converter para PDF' : 'Selecione um documento primeiro'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="max-w-lg w-full bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm animate-fade-in">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
