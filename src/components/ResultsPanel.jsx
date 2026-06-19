import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ResultsPanel({ results, onReset }) {
  if (!results) return null;

  return (
    <div className="bg-white border border-border rounded-2xl mb-12 p-6 shadow-sm flex flex-col h-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-text flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-emerald-500" /> Processamento Concluído</h3>
        <span className="bg-surface-hover text-text px-3 py-1 rounded-full text-sm font-medium border border-border">{results.totalEmployees} Funcionários</span>
      </div>
      <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar border border-border rounded-xl bg-background p-2">
        {results.employees.map((emp) => (
          <div key={emp.index} className="flex items-center justify-between p-3 border-b border-border last:border-0 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-surface-hover w-8 h-8 rounded-full flex items-center justify-center text-xs text-text-muted font-mono border border-border">{emp.index}</div>
              <div><p className="text-text font-medium">{emp.name}</p><p className="text-xs text-text-muted">{emp.pageCount} páginas</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <button onClick={onReset} className="w-full bg-[#1a3a5c] text-white font-medium py-3 px-6 rounded-xl hover:bg-[#153250] transition-colors">Concluir</button>
      </div>
    </div>
  );
}
