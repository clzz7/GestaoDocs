import React, { useState } from 'react';
import { Home, FileText, Shield, Stamp, Code, Layers, Banknote, FileOutput, Menu, ChevronDown } from 'lucide-react';
import ResultsPanel from './components/ResultsPanel';
import EfficiencyMetrics from './components/EfficiencyMetrics';
import ToolPage from './components/ToolPage';
import StampPage from './components/StampPage';
import FgtsPage from './components/FgtsPage';
import ConvertPage from './components/ConvertPage';
import OrganizePage from './components/OrganizePage';

import TitleBar from './components/TitleBar';
import { isTauri } from './lib/tauri-api';

function App() {
  const [page, setPage] = useState('home');
  const [results, setResults] = useState(null);
  const [resultsModule, setResultsModule] = useState(null);
  const [error, setError] = useState(null);
  const [openGroups, setOpenGroups] = useState({ rh: true, pdf: true });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleReset = () => {
    setResults(null);
    setResultsModule(null);
    setError(null);
    setPage('home');
  };

  const handleResults = (data, module) => {
    setResults(data);
    setResultsModule(module);
    setPage('results');
  };

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const isActive = page === item.id || (page === 'results' && item.id === resultsModule);
    return (
      <button
        key={item.id}
        onClick={() => setPage(item.id)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left font-medium text-sm ${
          isActive
            ? 'bg-[#1a3a5c] text-white shadow-md shadow-[#1a3a5c]/20'
            : 'text-text-muted hover:bg-surface-hover hover:text-text'
        }`}
      >
        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-text-muted'}`} />
        {item.label}
      </button>
    );
  };

  const renderContent = () => {
    if (!isTauri() && page === 'home') {
      return (
        <div className="flex-1 flex items-center justify-center p-10 animate-fade-in">
          <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-2xl max-w-md text-center shadow-sm">
            <h3 className="text-xl font-bold mb-3">Atenção!</h3>
            <p>O aplicativo precisa ser executado através da janela do Tauri.</p>
            <p className="opacity-80 text-sm mt-4">Você provavelmente abriu este link no seu navegador. Feche esta janela e execute <b className="bg-red-100 px-1 py-0.5 rounded">npm run tauri dev</b> no terminal.</p>
          </div>
        </div>
      );
    }

    if (error && page === 'home') {
      return (
        <div className="p-10 animate-fade-in">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-bold">Erro no processamento</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (page === 'carimbo') return <StampPage />;
    if (page === 'fgts') return <FgtsPage />;
    if (page === 'convert') return <ConvertPage />;
    if (page === 'organize') return <OrganizePage />;
    if (page === 'trct' || page === 'seguro') {
      return <ToolPage module={page} onResults={(data) => handleResults(data, page)} />;
    }
    
    if (page === 'results' && results) {
      return (
        <div className="w-full h-full flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar no-drag">
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
            <EfficiencyMetrics data={results} />
            <ResultsPanel results={results} onReset={handleReset} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-fade-in-up">
        <div className="max-w-lg">
          <div className="w-16 h-16 bg-[#1a3a5c]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Layers className="w-8 h-8 text-[#1a3a5c]" />
          </div>
          <h1 className="text-3xl font-semibold text-text mb-3">
            Bem-vindo ao <span className="text-[#1a3a5c]">GestãoDocs</span>
          </h1>
          <p className="text-text-muted text-base leading-relaxed mb-8">
            Selecione uma das ferramentas na barra lateral para começar a organizar, converter ou carimbar seus documentos de RH com facilidade.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans text-text overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-border flex flex-col shrink-0 z-10">
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar no-drag">
            {renderMenuItem({ id: 'home', label: 'Início', icon: Home })}

            <div className="mt-6 mb-2">
              <button 
                onClick={() => toggleGroup('rh')}
                className="flex items-center justify-between w-full px-2 py-1.5 group outline-none"
              >
                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest group-hover:text-[#1a3a5c] transition-colors">
                  Funções Especiais / RH
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${openGroups.rh ? '' : '-rotate-90'}`} />
              </button>
              
              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${openGroups.rh ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                {renderMenuItem({ id: 'trct', label: 'Termos de Rescisão', icon: FileText })}
                {renderMenuItem({ id: 'seguro', label: 'Apólices de Seguro', icon: Shield })}
                {renderMenuItem({ id: 'fgts', label: 'Extrato FGTS', icon: Banknote })}
              </div>
            </div>

            <div className="mt-4 mb-2">
              <button 
                onClick={() => toggleGroup('pdf')}
                className="flex items-center justify-between w-full px-2 py-1.5 group outline-none"
              >
                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest group-hover:text-[#1a3a5c] transition-colors">
                  Funções Básicas de PDF
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${openGroups.pdf ? '' : '-rotate-90'}`} />
              </button>
              
              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${openGroups.pdf ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                {renderMenuItem({ id: 'carimbo', label: 'Carimbo em PDF', icon: Stamp })}
                {renderMenuItem({ id: 'convert', label: 'DOC → PDF', icon: FileOutput })}
                {renderMenuItem({ id: 'organize', label: 'Organizar PDF', icon: Layers })}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border bg-white no-drag">
            <div className="flex items-center gap-2 justify-center text-xs text-text-muted font-medium">
              <Code className="w-3.5 h-3.5 text-[#1a3a5c]" strokeWidth={2.5} />
              Desenvolvido por Carlos
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background no-drag">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
