import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { selectSaveLocation, openSystemPath } from '../lib/tauri-api';
import { writeBinaryFile } from '../lib/file-io';
import { generateZip, generateCombinedZip } from '../lib/zip-utils';

export default function ResultsPanel({ results, onReset }) {
  const [zipStatus, setZipStatus] = useState(null);
  const [zipError, setZipError] = useState('');
  const [zipPath, setZipPath] = useState('');

  if (!results) return null;

  const handleGenerateZip = async () => {
    try {
      setZipStatus('generating');
      setZipError('');

      const defaultName = `Documentos_${results.documentType}_${new Date().toISOString().split('T')[0]}.zip`;
      const savePath = await selectSaveLocation(defaultName);
      if (!savePath) {
        setZipStatus(null);
        return;
      }
      let zipBytes;
      if (results.documentType === 'COMBINADO') {
        zipBytes = generateCombinedZip(results.employees);
      } else {
        zipBytes = generateZip(results.employees, results.documentType);
      }
      await writeBinaryFile(savePath, zipBytes);

      setZipStatus('success');
      setZipPath(savePath);
    } catch (error) {
      setZipStatus('error');
      setZipError(error?.message ?? String(error));
      console.error('Error generating ZIP:', error);
    }
  };

  const handleOpenFolder = () => {
    if (zipPath) {
      const folderPath = zipPath.replace(/[\\/][^\\/]+$/, '');
      openSystemPath(folderPath);
    }
  };

  return (
    <div className="bg-white border border-border rounded-2xl mb-12 p-6 shadow-sm flex flex-col h-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-text flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Processamento Concluído
        </h3>
        <span className="bg-surface-hover text-text px-3 py-1 rounded-full text-sm font-medium border border-border">
          {results.totalEmployees} Funcionários
        </span>
      </div>

      <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar border border-border rounded-xl bg-background p-2">
        {results.employees.map((emp) => (
          <div key={emp.index} className="flex items-center justify-between p-3 border-b border-border last:border-0 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-surface-hover w-8 h-8 rounded-full flex items-center justify-center text-xs text-text-muted font-mono border border-border">
                {emp.index}
              </div>
              <div>
                <p className="text-text font-medium select-text">{emp.name}</p>
                <p className="text-xs text-text-muted">
                  {results.documentType === 'COMBINADO' ? (
                    <>
                      {emp.trctBytes ? 'TRCT' : ''}
                      {emp.trctBytes && emp.seguroBytes ? ' + ' : ''}
                      {emp.seguroBytes ? 'Seguro' : ''}
                    </>
                  ) : (
                    <>{emp.pageCount} {emp.pageCount === 1 ? 'página' : 'páginas'}</>
                  )}
                </p>
              </div>
            </div>
            <div className="text-emerald-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {zipStatus === null && (
          <button
            onClick={handleGenerateZip}
            className="w-full bg-[#1a3a5c] hover:bg-[#153250] text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Exportar como ZIP
          </button>
        )}

        {zipStatus === 'generating' && (
          <button disabled className="w-full bg-surface-hover text-text-muted font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-wait border border-border">
            <div className="w-5 h-5 border-2 border-[#cbd5e1] border-t-transparent rounded-full animate-spin"></div>
            Gerando ZIP...
          </button>
        )}

        {zipStatus === 'success' && (
          <div className="w-full flex gap-2">
            <button
              onClick={handleOpenFolder}
              className="flex-1 bg-surface-hover hover:bg-border text-text font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-border"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              Abrir Pasta do ZIP
            </button>
            <button
              onClick={onReset}
              className="flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Concluir
            </button>
          </div>
        )}

        {zipStatus === 'error' && (
          <div className="w-full flex gap-2 items-center">
            <div className="flex-1 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
              Erro ao gerar ZIP{zipError ? `: ${zipError}` : '.'}
            </div>
            <button onClick={() => { setZipStatus(null); setZipError(''); }} className="bg-surface-hover hover:bg-border text-text px-4 py-3 rounded-xl border border-border">
              Tentar Novamente
            </button>
          </div>
        )}

        {zipStatus === null && (
          <button
            onClick={onReset}
            className="w-full bg-transparent cursor-pointer text-text-muted hover:text-text font-medium py-2 px-4 rounded-xl transition-colors text-sm"
          >
            Voltar ao Início
          </button>
        )}
      </div>
    </div>
  );
}
