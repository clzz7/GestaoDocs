import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, UploadCloud, FileText, Shield, Layers, CheckCircle2 } from 'lucide-react';
import { selectPdfFile, onProgress, ocrPdfPages } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';
import { extractTextFromPdf, hasUsableText, extractPages } from '../lib/pdf-utils';
import { processTrct } from '../lib/process-trct';
import { processSeguro } from '../lib/process-seguro';

const MODULE_META = {
  trct: {
    label: 'Termos de Rescisão',
    Icon: FileText,
    accent: '#1a3a5c',
    hint: 'Importe o PDF consolidado com os Termos de Rescisão',
    processTexts: (texts) => processTrct(texts),
    combinedLabel: 'Processar junto com Seguro',
    SecondaryIcon: Shield,
  },
  seguro: {
    label: 'Apólices de Seguro',
    Icon: Shield,
    accent: '#1a3a5c',
    hint: 'Importe o PDF consolidado com as Apólices de Seguro',
    processTexts: (texts) => processSeguro(texts),
    combinedLabel: 'Processar junto com TRCT',
    SecondaryIcon: FileText,
  },
};

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadPdfWithOcr(filePath, setProgressInfo) {
  setProgressInfo({ stage: 'reading', message: 'Lendo arquivo PDF...', progress: 5 });
  const pdfBytes = await readBinaryFile(filePath);

  setProgressInfo({ stage: 'extracting', message: 'Extraindo texto das páginas...', progress: 15 });
  const pageTexts = await extractTextFromPdf(pdfBytes);
  const ocrNeeded = [];
  for (let i = 0; i < pageTexts.length; i++) {
    if (!hasUsableText(pageTexts[i])) {
      ocrNeeded.push(i);
    }
  }

  if (ocrNeeded.length > 0) {
    setProgressInfo({
      stage: 'ocr',
      message: `Aplicando OCR em ${ocrNeeded.length} página(s)...`,
      progress: 25,
    });

    try {
      const ocrResults = await ocrPdfPages(filePath, ocrNeeded);
      for (const [pageIdx, text] of Object.entries(ocrResults)) {
        pageTexts[Number(pageIdx)] = text;
      }
    } catch (err) {
      console.warn('OCR failed, proceeding with extracted text only:', err);
    }
  }

  return { pdfBytes, pageTexts };
}

export default function ToolPage({ module: activeModule, onResults }) {
  const meta = MODULE_META[activeModule] || MODULE_META.trct;
  const isCombined = false;
  const [filePrimary, setFilePrimary] = useState(null);
  const [fileSecondary, setFileSecondary] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unlisten;
    onProgress((p) => {
      setProgressInfo({ stage: p.stage, message: p.message, progress: p.progress });
    }).then((fn) => { unlisten = fn; });
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleSelectPrimary = async () => {
    try {
      const path = await selectPdfFile();
      if (path) setFilePrimary(path);
    } catch (err) {
      setError(err.message || 'Erro ao selecionar arquivo');
    }
  };

  const handleProcess = async () => {
    if (!filePrimary) return;
    setProcessing(true);
    setError(null);
    const startTime = performance.now();

    try {
      const { pdfBytes, pageTexts } = await loadPdfWithOcr(filePrimary, setProgressInfo);
      setProgressInfo({ stage: 'processing', message: 'Identificando funcionários...', progress: 70 });

      const parsed = meta.processTexts(pageTexts);
      const totalEmployees = parsed.employees.length;

      setProgressInfo({ stage: 'splitting', message: 'Separando páginas...', progress: 85 });
      for (let i = 0; i < parsed.employees.length; i++) {
        const emp = parsed.employees[i];
        emp.pdfBytes = await extractPages(pdfBytes, emp.pageIndices);
      }

      const elapsed = Math.round(performance.now() - startTime);
      onResults({
        documentType: activeModule.toUpperCase(),
        totalEmployees,
        totalPages: parsed.totalPages,
        employees: parsed.employees,
        processingTimeMs: elapsed,
      });
    } catch (err) {
      setError(err.message || 'Erro durante o processamento');
    } finally {
      setProcessing(false);
      setProgressInfo(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background font-sans select-none overflow-y-auto custom-scrollbar no-drag">
      <header className="px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${meta.accent}15` }}>
            <meta.Icon className="w-5 h-5" style={{ color: meta.accent }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">{meta.label}</h1>
            <p className="text-xs text-text-muted">{meta.hint}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-10 py-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
        <div className="bg-white border border-border rounded-2xl p-8 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center mb-4 text-[#1a3a5c]">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-text mb-1">
            {filePrimary ? filePrimary.split(/[/\\]/).pop() : 'Selecione o arquivo PDF'}
          </h3>
          <p className="text-xs text-text-muted max-w-sm mb-6">
            O documento será processado de forma 100% segura e offline no seu computador.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleSelectPrimary}
              disabled={processing}
              className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold text-text hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              {filePrimary ? 'Trocar arquivo' : 'Buscar arquivo'}
            </button>
            {filePrimary && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="px-6 py-2.5 rounded-xl bg-[#1a3a5c] text-white text-xs font-semibold hover:bg-[#153250] transition-colors disabled:opacity-50 shadow-sm"
              >
                {processing ? 'Processando...' : 'Iniciar Processamento'}
              </button>
            )}
          </div>
        </div>

        {progressInfo && (
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text">{progressInfo.message}</span>
              <span className="font-mono text-text-muted">{progressInfo.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#1a3a5c] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressInfo.progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
