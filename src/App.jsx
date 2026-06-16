import React, { useState } from 'react';
import { Home, FileText, Code } from 'lucide-react';
import TitleBar from './components/TitleBar';

function App() {
  const [page, setPage] = useState('home');
  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const isActive = page === item.id;
    return (
      <button key={item.id} onClick={() => setPage(item.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left font-medium text-sm ${isActive ? 'bg-[#1a3a5c] text-white shadow-md' : 'text-text-muted hover:bg-surface-hover hover:text-text'}`}>
        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-text-muted'}`} />
        {item.label}
      </button>
    );
  };
  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans text-text overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-border flex flex-col shrink-0 z-10">
          <div className="p-5 flex-1 overflow-y-auto no-drag">
            {renderMenuItem({ id: 'home', label: 'InÃ­cio', icon: Home })}
            <div className="mt-4 flex flex-col gap-1">
              {renderMenuItem({ id: 'trct', label: 'Termos de RescisÃ£o', icon: FileText })}
            </div>
          </div>
          <div className="p-4 border-t border-border bg-white no-drag"><div className="flex items-center gap-2 justify-center text-xs text-text-muted font-medium"><Code className="w-3.5 h-3.5 text-[#1a3a5c]" /> Desenvolvido por Carlos</div></div>
        </aside>
        <main className="flex-1 flex flex-col items-center justify-center p-10 no-drag">
          <h1 className="text-3xl font-semibold text-text mb-3">Bem-vindo ao <span className="text-[#1a3a5c]">GestÃ£oDocs</span></h1>
          <p className="text-text-muted text-base">Selecione uma ferramenta na barra lateral para comeÃ§ar.</p>
        </main>
      </div>
    </div>
  );
}
export default App;