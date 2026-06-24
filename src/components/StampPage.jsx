import React, { useState, useRef, useEffect } from 'react';
import { Stamp, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { selectPdfFile } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export default function StampPage() {
  const [pdfPath, setPdfPath] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const canvasRef = useRef(null);
  const accent = '#1a3a5c';

  const handleSelectPdf = async () => {
    const path = await selectPdfFile(); if (!path) return;
    const bytes = await readBinaryFile(path);
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    setPdfBytes(bytes); setPdfDoc(doc); setPageCount(doc.numPages); setPageIndex(0); setPdfPath(path);
  };

  useEffect(() => {
    if (!pdfDoc) return;
    (async () => {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    })();
  }, [pdfDoc, pageIndex]);

  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4">
        <div className="flex items-center gap-2"><Stamp className="w-5 h-5" style={{ color: accent }} /><h1 className="text-text font-semibold text-lg">Carimbo em PDF</h1></div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!pdfDoc ? (
          <button onClick={handleSelectPdf} className="px-6 py-3 rounded-xl text-white font-medium" style={{ background: accent }}>Selecionar PDF para carimbar</button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <button disabled={pageIndex === 0} onClick={() => setPageIndex(p => p - 1)} className="p-2 rounded-lg bg-white border border-border"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium">PÃ¡gina {pageIndex + 1} de {pageCount}</span>
              <button disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex(p => p + 1)} className="p-2 rounded-lg bg-white border border-border"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="relative border border-border rounded-xl shadow-sm bg-white overflow-hidden">
              <canvas ref={canvasRef} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}