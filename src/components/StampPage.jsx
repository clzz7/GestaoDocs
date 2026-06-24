import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stamp, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { selectPdfFile, selectImageFile } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export default function StampPage() {
  const [pdfPath, setPdfPath] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState({ w: 1, h: 1 });
  const canvasRef = useRef(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageBytes, setImageBytes] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [imageAspect, setImageAspect] = useState(1);
  const [placements, setPlacements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const dragRef = useRef(null);
  const accent = '#1a3a5c';

  const hNorm = useCallback((w) => (w * pageSize.w) / (imageAspect * pageSize.h), [imageAspect, pageSize]);

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
      const vp1 = page.getViewport({ scale: 1 });
      setPageSize({ w: vp1.width, h: vp1.height });
    })();
  }, [pdfDoc, pageIndex]);

  const handleSelectImage = async () => {
    const path = await selectImageFile(); if (!path) return;
    const bytes = await readBinaryFile(path);
    setImagePath(path); setImageBytes(bytes);
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    setImageDataUrl(url);
    const img = new Image(); img.src = url;
    await new Promise((res) => { img.onload = res; });
    setImageAspect(img.naturalWidth / img.naturalHeight);
  };

  const handleAddStamp = () => {
    if (!imageDataUrl) return;
    const id = Date.now();
    setPlacements(p => [...p, { id, pageIndex, x: 0.35, y: 0.35, w: 0.25 }]);
    setSelectedId(id);
  };

  const handleMouseDown = (e, id) => {
    e.stopPropagation(); setSelectedId(id);
    const pl = placements.find(p => p.id === id);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, initX: pl.x, initY: pl.y };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const { id, startX, startY, initX, initY } = dragRef.current;
      const dx = (e.clientX - startX) / rect.width;
      const dy = (e.clientY - startY) / rect.height;
      setPlacements(prev => prev.map(p => p.id === id ? { ...p, x: Math.max(0, Math.min(1 - p.w, initX + dx)), y: Math.max(0, Math.min(1 - hNorm(p.w), initY + dy)) } : p));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [hNorm]);

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
              <button onClick={handleSelectImage} className="px-4 py-2 rounded-xl bg-white border border-border text-sm font-medium">Selecionar Imagem</button>
              {imageDataUrl && <button onClick={handleAddStamp} className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: accent }}>Inserir Carimbo</button>}
            </div>
            <div className="relative border border-border rounded-xl shadow-sm bg-white overflow-hidden">
              <canvas ref={canvasRef} />
              {placements.filter(p => p.pageIndex === pageIndex).map(p => (
                <div key={p.id} onMouseDown={(e) => handleMouseDown(e, p.id)} className="absolute border-2 border-dashed border-blue-500 cursor-move" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`, height: `${hNorm(p.w) * 100}%` }}>
                  <img src={imageDataUrl} className="w-full h-full object-contain pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}