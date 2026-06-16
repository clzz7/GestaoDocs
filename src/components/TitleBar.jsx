import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from '../lib/tauri-api';

export default function TitleBar() {
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setIsWindowMaximized);
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsWindowMaximized(maximized);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  if (!isTauri()) return null;

  const appWindow = getCurrentWindow();

  return (
    <div 
      data-tauri-drag-region 
      className="h-8 flex justify-between items-center bg-transparent select-none shrink-0"
    >
      <div data-tauri-drag-region className="flex items-center pl-3 flex-1 h-full">
        <span data-tauri-drag-region className="text-[#1e293b] text-xs font-semibold tracking-wide">
          GestãoDocs
        </span>
      </div>
      <div className="flex h-full">
        <button
          className="w-11 h-full flex justify-center items-center text-[#64748b] hover:bg-[#1e293b]/10 transition-colors"
          onClick={() => appWindow.minimize()}
          title="Minimizar"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          className="w-11 h-full flex justify-center items-center text-[#64748b] hover:bg-[#1e293b]/10 transition-colors"
          onClick={() => appWindow.toggleMaximize()}
          title="Maximizar"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-11 h-full flex justify-center items-center text-[#64748b] hover:bg-red-500 hover:text-white transition-colors"
          onClick={() => appWindow.close()}
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
