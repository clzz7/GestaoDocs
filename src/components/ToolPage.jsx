import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, UploadCloud, FileText, Shield, Layers, CheckCircle2 } from 'lucide-react';
import { selectPdfFile, onProgress, onFileDrop, ocrPdfPages } from '../lib/tauri-api';
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

/**
 * Normalizes a name for matching: lowercase, no accents, trimmed.
 */
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

/**
 * Reads a PDF, extracts text (with OCR fallback), and returns bytes + texts.
 */
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

function DropZone({ label, Icon, file, onFileSelected, disabled }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = async () => {
    if (disabled) return;
    const filePath = await selectPdfFile();
    if (filePath) {
      const fileName = filePath.split(/[\\/]/).pop();
      onFileSelected(filePath, fileName);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 cursor-pointer select-none"
      style={{ minHeight: '260px' }}
    >
      <div
        className="absolute inset-0 rounded-2xl transition-all duration-300"
        style={{
          border: `2.5px dashed ${file ? '#10b981' : dragOver ? '#1a3a5c' : '#e2e8f0'}`,
          background: file
            ? '#f0fdf4'
            : dragOver
              ? `color-mix(in srgb, #1a3a5c 6%, transparent)`
              : '#ffffff',
          boxShadow: dragOver
            ? `0 0 0 6px color-mix(in srgb, #1a3a5c 12%, transparent)`
            : '0 1px 3px rgba(0,0,0,0.06)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 py-10 px-6">
        {file ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <div className="text-center">
              <p className="text-text font-semibold text-sm break-all">{file}</p>
              <p className="text-[#94a3b8] text-xs mt-1">Clique para trocar</p>
            </div>
          </>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300"
              style={{
                background: dragOver ? `#1a3a5c20` : `#1a3a5c10`,
                transform: dragOver ? 'scale(1.12)' : 'scale(1)',
              }}
            >
              <Icon
                className="w-7 h-7 transition-transform duration-300"
                style={{
                  color: '#1a3a5c',
                  transform: dragOver ? 'translateY(-3px)' : 'translateY(0)',
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-text font-semibold text-sm">{label}</p>
              <p className="text-[#94a3b8] text-xs mt-1">
                Clique para selecionar
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ToolPage({ module, onResults }) {
  const meta = MODULE_META[module];
  const { label, Icon, accent, hint, combinedLabel, SecondaryIcon } = meta;

  const [combinedMode, setCombinedMode] = useState(false);
  const [dragOverSingle, setDragOverSingle] = useState(false);
  const [singleFile, setSingleFile] = useState(null);
  const [primaryFile, setPrimaryFile] = useState(null);
  const [primaryPath, setPrimaryPath] = useState(null);
  const [secondaryFile, setSecondaryFile] = useState(null);
  const [secondaryPath, setSecondaryPath] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unlistenDrop;
    let unlistenProgress;

    (async () => {
      unlistenDrop = await onFileDrop(async (paths) => {
        if (combinedMode) return;

        const pdfPath = paths.find((p) => p.toLowerCase().endsWith('.pdf'));
        if (pdfPath) {
          const fileName = pdfPath.split(/[\\/]/).pop();
          setSingleFile(fileName);
          setDragOverSingle(false);
          setError(null);
          await runSingleProcess(pdfPath);
        } else {
          setDragOverSingle(false);
          setError('Por favor, arraste um arquivo PDF.');
        }
      });

      unlistenProgress = await onProgress((payload) => {
        setProgressInfo(payload);
      });
    })();

    return () => {
      unlistenDrop?.();
      unlistenProgress?.();
    };
  }, [module, combinedMode]);
  const handleDragOverSingle = useCallback((e) => { e.preventDefault(); setDragOverSingle(true); }, []);
  const handleDragLeaveSingle = useCallback((e) => { e.preventDefault(); setDragOverSingle(false); }, []);
  const handleDropSingle = useCallback((e) => { e.preventDefault(); setDragOverSingle(false); }, []);

  const handleClickZoneSingle = async () => {
    if (processing) return;
    try {
      const filePath = await selectPdfFile();
      if (!filePath) return;
      const fileName = filePath.split(/[\\/]/).pop();
      setSingleFile(fileName);
      setError(null);
      await runSingleProcess(filePath);
    } catch (err) {
      setError(`Erro inesperado: ${err.message ?? err}`);
    }
  };

  const runSingleProcess = async (filePath) => {
    setProcessing(true);
    setProgressInfo(null);
    setError(null);
    const start = performance.now();
    try {
      const { pdfBytes, pageTexts } = await loadPdfWithOcr(filePath, setProgressInfo);

      setProgressInfo({ stage: 'processing', message: 'Identificando funcionários...', progress: 80 });
      const { employees, totalPages } = meta.processTexts(pageTexts);

      setProgressInfo({ stage: 'splitting', message: 'Separando documentos...', progress: 90 });
      const employeesWithPdf = [];
      for (const emp of employees) {
        const empPdfBytes = await extractPages(pdfBytes, emp.pageIndices);
        employeesWithPdf.push({
          ...emp,
          pdfBytes: empPdfBytes,
        });
      }

      const processingTimeMs = Math.round(performance.now() - start);

      setProgressInfo({
        stage: 'done',
        message: `Processados ${employees.length} funcionários.`,
        progress: 100,
        processedCount: employees.length,
        totalCount: employees.length,
      });

      onResults({
        employees: employeesWithPdf,
        totalPages,
        totalEmployees: employees.length,
        processingTimeMs,
        documentType: module === 'trct' ? 'TRCT' : 'SEGURO',
      });
    } catch (err) {
      setError(`Erro inesperado: ${err.message ?? err}`);
    } finally {
      setProcessing(false);
      setProgressInfo(null);
    }
  };
  const handleProcessCombined = async () => {
    if (!primaryPath || !secondaryPath || processing) return;
    setProcessing(true);
    setProgressInfo(null);
    setError(null);
    const start = performance.now();
    try {
      const trctPath = module === 'trct' ? primaryPath : secondaryPath;
      const seguroPath = module === 'seguro' ? primaryPath : secondaryPath;
      setProgressInfo({ stage: 'reading', message: 'Processando TRCT...', progress: 10 });
      const trctData = await loadPdfWithOcr(trctPath, (info) => {
        setProgressInfo({ ...info, progress: Math.min(info.progress, 40) });
      });
      const trctResult = processTrct(trctData.pageTexts);
      setProgressInfo({ stage: 'reading', message: 'Processando Seguro...', progress: 45 });
      const seguroData = await loadPdfWithOcr(seguroPath, (info) => {
        setProgressInfo({ ...info, progress: 45 + Math.min(info.progress * 0.4, 35) });
      });
      const seguroResult = processSeguro(seguroData.pageTexts);

      setProgressInfo({ stage: 'combining', message: 'Combinando resultados...', progress: 85 });
      const trctEmployeesWithPdf = [];
      for (const emp of trctResult.employees) {
        const empPdfBytes = await extractPages(trctData.pdfBytes, emp.pageIndices);
        trctEmployeesWithPdf.push({ ...emp, pdfBytes: empPdfBytes });
      }

      const seguroEmployeesWithPdf = [];
      for (const emp of seguroResult.employees) {
        const empPdfBytes = await extractPages(seguroData.pdfBytes, emp.pageIndices);
        seguroEmployeesWithPdf.push({ ...emp, pdfBytes: empPdfBytes });
      }
      const combined = new Map();

      for (const emp of trctEmployeesWithPdf) {
        const key = normalizeName(emp.name);
        if (!combined.has(key)) {
          combined.set(key, { name: emp.name, trctBytes: null, seguroBytes: null });
        }
        combined.get(key).trctBytes = emp.pdfBytes;
      }

      for (const emp of seguroEmployeesWithPdf) {
        const key = normalizeName(emp.name);
        if (!combined.has(key)) {
          combined.set(key, { name: emp.name, trctBytes: null, seguroBytes: null });
        }
        combined.get(key).seguroBytes = emp.pdfBytes;
      }

      const employees = [...combined.values()].map((emp, i) => ({
        index: i + 1,
        ...emp,
      }));

      const processingTimeMs = Math.round(performance.now() - start);

      setProgressInfo({
        stage: 'done',
        message: `Combinados ${employees.length} funcionários.`,
        progress: 100,
        processedCount: employees.length,
        totalCount: employees.length,
      });

      onResults({
        employees,
        totalEmployees: employees.length,
        processingTimeMs,
        documentType: 'COMBINADO',
      });
    } catch (err) {
      setError(`Erro inesperado: ${err.message ?? err}`);
    } finally {
      setProcessing(false);
      setProgressInfo(null);
    }
  };

  const bothSelected = primaryPath && secondaryPath;

  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2 flex-1">
          <div
            className="rounded-md p-1.5"
            style={{ background: `${accent}18` }}
          >
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <h1 className="text-text font-semibold text-lg">{label}</h1>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-border shadow-sm cursor-pointer select-none" onClick={() => { if(!processing) setCombinedMode(!combinedMode); setError(null); }}>
          <span className="text-sm font-medium text-text whitespace-nowrap">
            {combinedLabel}
          </span>
          <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={combinedMode} 
              readOnly 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a3a5c]"></div>
          </label>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-10 pb-10 gap-6 animate-fade-in-up">
        {!combinedMode ? (
          <>
            <p className="text-text-muted text-sm max-w-md text-center">{hint}</p>

            <div
              onClick={handleClickZoneSingle}
              onDragOver={handleDragOverSingle}
              onDragLeave={handleDragLeaveSingle}
              onDrop={handleDropSingle}
              className="relative w-full max-w-2xl cursor-pointer select-none"
              style={{ minHeight: '340px' }}
            >
              <div
                className="absolute inset-0 rounded-3xl transition-all duration-300"
                style={{
                  border: `2.5px dashed ${dragOverSingle ? accent : '#e2e8f0'}`,
                  background: dragOverSingle ? `color-mix(in srgb, ${accent} 6%, transparent)` : '#ffffff',
                  boxShadow: dragOverSingle ? `0 0 0 6px color-mix(in srgb, ${accent} 12%, transparent)` : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 py-16 px-8">
                {processing ? (
                  <>
                    <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${accent} transparent ${accent} ${accent}` }} />
                    <p className="text-text-muted font-medium">{progressInfo?.message ?? 'Processando…'}</p>
                    {progressInfo?.progress != null && (
                      <div className="w-full max-w-xs">
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressInfo.progress}%`, background: accent }} />
                        </div>
                        {progressInfo.processedCount != null && (
                          <p className="text-xs text-[#94a3b8] mt-1 text-center">{progressInfo.processedCount} / {progressInfo.totalCount}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : singleFile && !error ? (
                  <>
                    <CheckCircle2 className="w-14 h-14" style={{ color: accent }} />
                    <p className="text-text font-semibold text-lg">{singleFile}</p>
                    <p className="text-[#94a3b8] text-sm">Arquivo selecionado — clique para processar outro</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-300" style={{ background: dragOverSingle ? `${accent}20` : `${accent}10`, transform: dragOverSingle ? 'scale(1.12)' : 'scale(1)' }}>
                      <UploadCloud className="w-10 h-10 transition-transform duration-300" style={{ color: accent, transform: dragOverSingle ? 'translateY(-4px)' : 'translateY(0)' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-text font-semibold text-xl">{dragOverSingle ? 'Solte o arquivo aqui' : 'Arraste o PDF para esta área'}</p>
                      <p className="text-[#94a3b8] text-sm mt-1">ou <span className="underline underline-offset-2" style={{ color: accent }}>clique para selecionar do computador</span></p>
                    </div>
                    <div className="mt-2 px-4 py-1.5 rounded-full bg-surface-hover text-[#94a3b8] text-xs font-medium">Apenas arquivos .pdf</div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-text-muted text-sm max-w-lg text-center animate-fade-in">
              Importe os dois PDFs do mesmo dia. O sistema vai processar cada um, combinar por nome do funcionário, e gerar um ZIP com <strong>TRCT.pdf</strong> e <strong>SEGURO.pdf</strong>.
            </p>

            {!processing ? (
              <div className="w-full max-w-2xl flex gap-4 animate-fade-in-up">
                <DropZone
                  label={`PDF de ${label.replace('Apólices de ', '').replace('Termos de ', '')}`}
                  Icon={Icon}
                  file={primaryFile}
                  onFileSelected={(path, name) => { setPrimaryPath(path); setPrimaryFile(name); setError(null); }}
                  disabled={processing}
                />
                <DropZone
                  label={`PDF de ${module === 'trct' ? 'Seguro' : 'TRCT'}`}
                  Icon={SecondaryIcon}
                  file={secondaryFile}
                  onFileSelected={(path, name) => { setSecondaryPath(path); setSecondaryFile(name); setError(null); }}
                  disabled={processing}
                />
              </div>
            ) : (
              <div className="relative w-full max-w-2xl animate-fade-in" style={{ minHeight: '260px' }}>
                <div className="absolute inset-0 rounded-2xl border-2 border-border bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} />
                <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 py-16 px-8">
                  <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${accent} transparent ${accent} ${accent}` }} />
                  <p className="text-text-muted font-medium">{progressInfo?.message ?? 'Processando…'}</p>
                  {progressInfo?.progress != null && (
                    <div className="w-full max-w-xs">
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressInfo.progress}%`, background: accent }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!processing && (
              <button
                onClick={handleProcessCombined}
                disabled={!bothSelected}
                className="w-full max-w-2xl py-3 px-6 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 animate-fade-in-up"
                style={{
                  background: bothSelected ? accent : '#e2e8f0',
                  color: bothSelected ? '#fff' : '#94a3b8',
                  cursor: bothSelected ? 'pointer' : 'not-allowed',
                }}
              >
                <Layers className="w-4 h-4" />
                {bothSelected ? 'Processar e Combinar' : 'Selecione ambos os arquivos'}
              </button>
            )}
          </>
        )}
        {error && (
          <div className="max-w-2xl w-full bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm animate-fade-in">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
