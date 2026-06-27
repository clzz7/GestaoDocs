import React, { useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { selectPdfFile } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';
import { renderPageThumbnail } from '../lib/pdf-utils';
import { PDFDocument } from 'pdf-lib';

export default function OrganizePage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const accent = '#1a3a5c';

  const handleLoadPdf = async () => {
    const filePath = await selectPdfFile(); if (!filePath) return;
    setLoading(true);
    try {
      const bytes = await readBinaryFile(filePath);
      const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
      const numPages = doc.getPageCount();
      const fileName = filePath.split(/[\\/]/).pop();
      const newPages = [];
      for (let i = 1; i <= numPages; i++) {
        newPages.push({ id: `p-${i}`, pdfPath: filePath, pdfBytes: bytes, pageNumber: i, rotation: 0, thumbnail: null, label: `${fileName} - p.${i}` });
      }
      setPages(newPages);
      for (const page of newPages) {
        renderPageThumbnail(page.pdfBytes, page.pageNumber, 0.4, 0).then((thumb) => {
          if (thumb) setPages(prev => prev.map(p => p.id === page.id ? { ...p, thumbnail: thumb } : p));
        });
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4">
        <div className="flex items-center gap-2"><Layers className="w-5 h-5" style={{ color: accent }} /><h1 className="text-text font-semibold text-lg">Organizar PDF</h1></div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {pages.length === 0 ? (
          <button onClick={handleLoadPdf} className="px-6 py-3 rounded-xl text-white font-medium" style={{ background: accent }}>Selecionar PDF para organizar</button>
        ) : (
          <div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto max-h-[500px]">
            {pages.map(page => (
              <div key={page.id} className="p-2 bg-white rounded-xl border border-border flex flex-col items-center">
                {page.thumbnail ? <img src={page.thumbnail} className="w-32 h-44 object-contain" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                <span className="text-xs text-text-muted mt-2">{page.label}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}