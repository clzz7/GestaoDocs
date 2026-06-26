import React, { useState } from 'react';
import { Home, FileText, Shield, Code, Layers, Banknote, Stamp, FileOutput, ChevronDown } from 'lucide-react';
import ResultsPanel from './components/ResultsPanel';
import EfficiencyMetrics from './components/EfficiencyMetrics';
import ToolPage from './components/ToolPage';
import FgtsPage from './components/FgtsPage';
import StampPage from './components/StampPage';
import ConvertPage from './components/ConvertPage';
import TitleBar from './components/TitleBar';

function App() {
  const [page, setPage] = useState('home');
  const [results, setResults] = useState(null);
  const [openGroups, setOpenGroups] = useState({ rh: true, tools: true });
  const toggleGroup = (g) => setOpenGroups(p => ({ ...p, [g]: !p[g] }));
  const handleResults = (data) => { setResults(data); setPage('results'); };
  const handleReset = () => { setResults(null); setPage('home'); };

  const renderMenuItem = ({ id, label, icon: Icon }) => {
    const active = page === id;
    return (
      <button
        key={id}
        onClick={() => setPage(id)}
        className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${active ? 'bg-[#1a3a5c] text-white shadow-sm' : 'text-text-muted hover:bg-surface-hover hover:text-text'}`}
      >
        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-text-muted'}`} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans text-text overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-border flex flex-col shrink-0 z-10">
          <div className="p-5 flex-1 overflow-y-auto no-drag">
            {renderMenuItem({ id: 'home', label: 'Início', icon: Home })}
            <div className="mt-6 mb-2">
              <button onClick={() => toggleGroup('rh')} className="flex items-center justify-between w-full px-2 py-1.5 outline-none">
                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">Funções Especiais / RH</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${openGroups.rh ? '' : '-rotate-90'}`} />
              </button>
              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${openGroups.rh ? 'max-h-64 mt-1' : 'max-h-0'}`}>
                {renderMenuItem({ id: 'trct', label: 'Termos de Rescisão', icon: FileText })}
                {renderMenuItem({ id: 'seguro', label: 'Apólices de Seguro', icon: Shield })}
                {renderMenuItem({ id: 'fgts', label: 'Extrato FGTS', icon: Banknote })}
              </div>
            </div>
            <div className="mt-4 mb-2">
              <button onClick={() => toggleGroup('tools')} className="flex items-center justify-between w-full px-2 py-1.5 outline-none">
                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">Ferramentas PDF</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${openGroups.tools ? '' : '-rotate-90'}`} />
              </button>
              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${openGroups.tools ? 'max-h-64 mt-1' : 'max-h-0'}`}>
                {renderMenuItem({ id: 'stamp', label: 'Carimbo em PDF', icon: Stamp })}
                {renderMenuItem({ id: 'convert', label: 'DOC → PDF', icon: FileOutput })}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-white no-drag">
            <div className="flex items-center gap-2 justify-center text-xs text-text-muted font-medium">
              <Code className="w-3.5 h-3.5 text-[#1a3a5c]" /> Desenvolvido por Carlos
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background no-drag">
          {page === 'stamp' && <StampPage />}
          {page === 'fgts' && <FgtsPage />}
          {page === 'convert' && <ConvertPage />}
          {(page === 'trct' || page === 'seguro') && <ToolPage module={page} onResults={handleResults} />}
          {page === 'results' && results && (
            <div className="p-10 max-w-4xl mx-auto w-full">
              <EfficiencyMetrics data={results} />
              <ResultsPanel results={results} onReset={handleReset} />
            </div>
          )}
          {page === 'home' && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <h1 className="text-3xl font-semibold text-text mb-3">
                Bem-vindo ao <span className="text-[#1a3a5c]">GestãoDocs</span>
              </h1>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
export default App;
