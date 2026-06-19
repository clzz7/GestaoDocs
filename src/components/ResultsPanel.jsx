import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { selectSaveLocation } from '../lib/tauri-api';
import { writeBinaryFile } from '../lib/file-io';
import { generateZip } from '../lib/zip-utils';

export default function ResultsPanel({ results, onReset }) {
  const [zipStatus, setZipStatus] = useState(null);
  if (!results) return null;

  const handleGenerateZip = async () => {
    try {
      setZipStatus('generating');
      const defaultName = 'Documentos_' + results.documentType + '.zip';
      const savePath = await selectSaveLocation(defaultName);
      if (!savePath) { setZipStatus(null); return; }
      const zipBytes = generateZip(results.employees, results.documentType);
      await writeBinaryFile(savePath, zipBytes);
      setZipStatus('success');
    } catch (error) { setZipStatus('error'); }
  };

  return (
    <div className="bg-white border border-border rounded-2xl mb-12 p-6 shadow-sm flex flex-col h-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-text flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-emerald-500" /> Processamento ConcluÃ­do</h3>
        <span className="bg-surface-hover text-text px-3 py-1 rounded-full text-sm font-medium border border-border">{results.totalEmployees} FuncionÃ¡rios</span>
      </div>
      <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar border border-border rounded-xl bg-background p-2">
        {results.employees.map((emp) => (
          <div key={emp.index} className="flex items-center justify-between p-3 border-b border-border last:border-0 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-surface-hover w-8 h-8 rounded-full flex items-center justify-center text-xs text-text-muted font-mono border border-border">{emp.index}</div>
              <div><p className="text-text font-medium">{emp.name}</p><p className="text-xs text-text-muted">{emp.pageCount} pÃ¡ginas</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {zipStatus === null && <button onClick={handleGenerateZip} className="w-full bg-[#1a3a5c] text-white font-medium py-3 px-4 rounded-xl">Exportar como ZIP</button>}
        {zipStatus === 'generating' && <button disabled className="w-full bg-surface-hover text-text-muted font-medium py-3 px-4 rounded-xl">Gerando ZIP...</button>}
        {zipStatus === 'success' && <button onClick={onReset} className="w-full bg-emerald-600 text-white font-medium py-3 px-6 rounded-xl">Concluir</button>}
      </div>
    </div>
  );
}