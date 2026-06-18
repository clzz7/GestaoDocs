import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { selectPdfFile } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';
import { extractTextFromPdf, extractPages } from '../lib/pdf-utils';
import { processTrct } from '../lib/process-trct';

export default function ToolPage({ module, onResults }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const accent = '#1a3a5c';

  const handleClick = async () => {
    if (processing) return;
    try {
      const filePath = await selectPdfFile();
      if (!filePath) return;
      setFile(filePath.split(/[\\/]/).pop());
      setError(null);
      await runProcess(filePath);
    } catch (err) { setError('Erro: ' + (err.message ?? err)); }
  };

  const runProcess = async (filePath) => {
    setProcessing(true); setError(null);
    const start = performance.now();
    try {
      const pdfBytes = await readBinaryFile(filePath);
      const pageTexts = await extractTextFromPdf(pdfBytes);
      const { employees, totalPages } = processTrct(pageTexts);
      const employeesWithPdf = [];
      for (const emp of employees) {
        const empPdfBytes = await extractPages(pdfBytes, emp.pageIndices);
        employeesWithPdf.push({ ...emp, pdfBytes: empPdfBytes });
      }
      onResults({ employees: employeesWithPdf, totalPages, totalEmployees: employees.length, processingTimeMs: Math.round(performance.now() - start), documentType: 'TRCT' });
    } catch (err) { setError('Erro: ' + (err.message ?? err)); }
    finally { setProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2">
          <div className="rounded-md p-1.5" style={{ background: accent + '18' }}><FileText className="w-5 h-5" style={{ color: accent }} /></div>
          <h1 className="text-text font-semibold text-lg">Termos de RescisÃ£o</h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-10 pb-10 gap-6 animate-fade-in-up">
        <p className="text-text-muted text-sm max-w-md text-center">Importe o PDF consolidado com os Termos de RescisÃ£o</p>
        <div onClick={handleClick} className="relative w-full max-w-2xl cursor-pointer select-none" style={{ minHeight: '340px' }}>
          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-border bg-white" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 py-16 px-8">
            {processing ? (
              <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: accent + ' transparent ' + accent + ' ' + accent }} />
            ) : file && !error ? (
              <><CheckCircle2 className="w-14 h-14" style={{ color: accent }} /><p className="text-text font-semibold text-lg">{file}</p></>
            ) : (
              <><div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: accent + '10' }}><UploadCloud className="w-10 h-10" style={{ color: accent }} /></div><p className="text-text font-semibold text-xl">Clique para selecionar do computador</p></>
            )}
          </div>
        </div>
        {error && <div className="max-w-2xl w-full bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm">{error}</div>}
      </main>
    </div>
  );
}