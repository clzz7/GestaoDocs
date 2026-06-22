import React, { useState } from 'react';
import { UploadCloud, FileText, Shield, Layers, CheckCircle2 } from 'lucide-react';
import { selectPdfFile } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';
import { extractTextFromPdf, extractPages } from '../lib/pdf-utils';
import { processTrct } from '../lib/process-trct';
import { processSeguro } from '../lib/process-seguro';

export default function ToolPage({ module, onResults }) {
  const [file, setFile] = useState(null);
  const [trctFile, setTrctFile] = useState(null);
  const [trctPath, setTrctPath] = useState(null);
  const [seguroFile, setSeguroFile] = useState(null);
  const [seguroPath, setSeguroPath] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [error, setError] = useState(null);
  const accent = '#1a3a5c';
  const isCombined = module === 'combined';

  const handleClick = async () => {
    if (processing) return;
    try {
      const filePath = await selectPdfFile();
      if (!filePath) return;
      setFile(filePath.split(/[\\/]/).pop()); setError(null);
      await runProcess(filePath);
    } catch (err) { setError('Erro: ' + (err.message ?? err)); }
  };

  const runProcess = async (filePath) => {
    setProcessing(true); setProgressInfo({ message: 'Lendo arquivo...', progress: 10 }); setError(null);
    const start = performance.now();
    try {
      const pdfBytes = await readBinaryFile(filePath);
      setProgressInfo({ message: 'Extraindo texto das pÃ¡ginas...', progress: 35 });
      const pageTexts = await extractTextFromPdf(pdfBytes);
      setProgressInfo({ message: 'Identificando funcionÃ¡rios...', progress: 70 });
      const { employees, totalPages } = (module === 'seguro' ? processSeguro : processTrct)(pageTexts);
      const employeesWithPdf = [];
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        setProgressInfo({ message: 'Separando ' + (i + 1) + ' de ' + employees.length + '...', progress: 70 + Math.round(((i + 1) / employees.length) * 30) });
        employeesWithPdf.push({ ...emp, pdfBytes: await extractPages(pdfBytes, emp.pageIndices) });
      }
      onResults({ employees: employeesWithPdf, totalPages, totalEmployees: employees.length, processingTimeMs: Math.round(performance.now() - start), documentType: module === 'seguro' ? 'SEGURO' : 'TRCT' });
    } catch (err) { setError('Erro: ' + (err.message ?? err)); }
    finally { setProcessing(false); setProgressInfo(null); }
  };

  const handleTrctClick = async () => {
    if (processing) return;
    const fp = await selectPdfFile(); if (!fp) return;
    setTrctPath(fp); setTrctFile(fp.split(/[\\/]/).pop());
  };
  const handleSeguroClick = async () => {
    if (processing) return;
    const fp = await selectPdfFile(); if (!fp) return;
    setSeguroPath(fp); setSeguroFile(fp.split(/[\\/]/).pop());
  };

  if (isCombined) {
    return (
      <div className="flex flex-col h-full bg-background font-sans no-drag">
        <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
          <div className="flex items-center gap-2"><div className="rounded-md p-1.5" style={{ background: accent + '18' }}><Layers className="w-5 h-5" style={{ color: accent }} /></div><h1 className="text-text font-semibold text-lg">Termos + ApÃ³lices (Combinado)</h1></div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-10 pb-10 gap-6 animate-fade-in-up">
          <p className="text-text-muted text-sm max-w-md text-center">Selecione o PDF de Termos de RescisÃ£o e o de ApÃ³lices para gerar um ZIP combinado</p>
          <div className="flex gap-4 w-full max-w-2xl">
            <div onClick={handleTrctClick} className="flex-1 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border bg-white cursor-pointer">
              {trctFile ? <CheckCircle2 className="w-8 h-8" style={{ color: accent }} /> : <FileText className="w-8 h-8" style={{ color: accent }} />}
              <p className="text-sm font-medium text-text text-center">{trctFile ?? 'TRCT â€” Clique para selecionar'}</p>
            </div>
            <div onClick={handleSeguroClick} className="flex-1 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border bg-white cursor-pointer">
              {seguroFile ? <CheckCircle2 className="w-8 h-8" style={{ color: accent }} /> : <Shield className="w-8 h-8" style={{ color: accent }} />}
              <p className="text-sm font-medium text-text text-center">{seguroFile ?? 'Seguro â€” Clique para selecionar'}</p>
            </div>
          </div>
          <button disabled className="mt-2 px-8 py-3 rounded-xl text-white font-medium opacity-50 cursor-not-allowed" style={{ background: accent }}>Processar combinado</button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2"><div className="rounded-md p-1.5" style={{ background: accent + '18' }}>{module === 'seguro' ? <Shield className="w-5 h-5" style={{ color: accent }} /> : <FileText className="w-5 h-5" style={{ color: accent }} />}</div><h1 className="text-text font-semibold text-lg">{module === 'seguro' ? 'ApÃ³lices de Seguro' : 'Termos de RescisÃ£o'}</h1></div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-10 pb-10 gap-6 animate-fade-in-up">
        <p className="text-text-muted text-sm max-w-md text-center">Importe o PDF consolidado</p>
        <div onClick={handleClick} className="relative w-full max-w-2xl cursor-pointer select-none" style={{ minHeight: '340px' }}>
          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-border bg-white" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 py-16 px-8">
            {processing ? <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: accent + ' transparent ' + accent + ' ' + accent }} /> : file ? <p className="text-text font-semibold text-lg">{file}</p> : <p className="text-text font-semibold text-xl">Clique para selecionar</p>}
          </div>
        </div>
      </main>
    </div>
  );
}