import React, { useState } from 'react';
import { UploadCloud, Banknote, CheckCircle2 } from 'lucide-react';
import { selectTxtFile } from '../lib/tauri-api';
import { readTextFile } from '../lib/file-io';
import { parseFgtsTxt, generateFgtsPdf } from '../lib/process-fgts';
import ResultsPanel from './ResultsPanel';

export default function FgtsPage() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const accent = '#1a3a5c';

  const handleClick = async () => {
    if (processing) return;
    try {
      const filePath = await selectTxtFile(); if (!filePath) return;
      setFile(filePath.split(/[\\/]/).pop()); setError(null);
      await runProcess(filePath);
    } catch (err) { setError('Erro: ' + (err.message ?? err)); }
  };

  const runProcess = async (filePath) => {
    setProcessing(true); setError(null);
    const start = performance.now();
    try {
      const content = await readTextFile(filePath);
      const fgtsEmployees = parseFgtsTxt(content);
      if (fgtsEmployees.length === 0) throw new Error('Nenhum funcionÃ¡rio encontrado.');
      const employees = fgtsEmployees.map((emp, idx) => ({
        index: idx + 1,
        name: emp.name,
        pageCount: Math.ceil(emp.lines.length / 40),
        pdfBytes: generateFgtsPdf(emp.lines),
      }));
      setResults({ totalEmployees: employees.length, employees, totalPages: employees.length, processingTimeMs: Math.round(performance.now() - start), documentType: 'FGTS' });
    } catch (err) { setError('Erro: ' + (err.message ?? err)); }
    finally { setProcessing(false); }
  };

  if (results) {
    return <div className="p-10 max-w-4xl mx-auto w-full"><ResultsPanel results={results} onReset={() => setResults(null)} /></div>;
  }
  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2"><div className="rounded-md p-1.5" style={{ background: accent + '18' }}><Banknote className="w-5 h-5" style={{ color: accent }} /></div><h1 className="text-text font-semibold text-lg">Extrato FGTS</h1></div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-10 pb-10 gap-6 animate-fade-in-up">
        <p className="text-text-muted text-sm max-w-md text-center">Importe o arquivo TXT do Extrato AnalÃ­tico FGTS da Caixa</p>
        <div onClick={handleClick} className="relative w-full max-w-2xl cursor-pointer select-none" style={{ minHeight: '340px' }}>
          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-border bg-white" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 py-16 px-8">
            {processing ? <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: accent + ' transparent ' + accent + ' ' + accent }} /> : file ? <p className="text-text font-semibold text-lg">{file}</p> : <p className="text-text font-semibold text-xl">Clique para selecionar arquivo TXT</p>}
          </div>
        </div>
        {error && <div className="max-w-2xl w-full bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm">{error}</div>}
      </main>
    </div>
  );
}