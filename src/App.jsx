import React from 'react';

function App() {
  return (
    <div className="flex h-screen w-full bg-background font-sans text-text overflow-hidden">
      <aside className="w-64 bg-white border-r border-border flex flex-col shrink-0">
        <div className="p-5 flex-1">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Menu</h2>
          <p className="text-sm text-text-muted">Em construÃ§Ã£o...</p>
        </div>
        <div className="p-4 border-t border-border bg-white">
          <div className="flex items-center gap-2 justify-center text-xs text-text-muted font-medium">
            Desenvolvido por Carlos
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col items-center justify-center p-10">
        <h1 className="text-3xl font-semibold text-text mb-3">GestÃ£oDocs</h1>
        <p className="text-text-muted text-base">Ferramenta para organizaÃ§Ã£o de documentos de RH</p>
      </main>
    </div>
  );
}

export default App;