import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stamp, ImagePlus, ChevronLeft, ChevronRight, Trash2, Save } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { selectPdfFile, selectImageFile, selectPdfSaveLocation } from '../lib/tauri-api';
import { readBinaryFile, writeBinaryFile } from '../lib/file-io';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export default function StampPage() {
  const [pdfPath, setPdfPath] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState({ w: 1, h: 1 });
  const canvasRef = useRef(null);

  const [imagePath, setImagePath] = useState(null);
  const [imageBytes, setImageBytes] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageAspect, setImageAspect] = useState(1);
  const [placements, setPlacements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);
  const accent = '#1a3a5c';

  const hNorm = useCallback((w) => {
    if (!pageSize.w || !pageSize.h || !imageAspect) return w;
    return w * (pageSize.w / pageSize.h) / imageAspect;
  }, [pageSize, imageAspect]);

  const handleSelectPdf = async () => {
    const path = await selectPdfFile(); if (!path) return;
    const bytes = await readBinaryFile(path);
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    setPdfBytes(bytes); setPdfDoc(doc); setPageCount(doc.numPages); setPageIndex(0); setPdfPath(path); setPlacements([]);
  };

  const handleSelectImage = async () => {
    const path = await selectImageFile(); if (!path) return;
    const bytes = await readBinaryFile(path);
    const ext = path.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { setImageAspect(img.width / img.height); };
    img.src = url;
    setImageBytes(bytes); setImagePath(path); setImageDataUrl(url);
  };

  const handleAddStamp = () => {
    if (!imageDataUrl) return;
    const id = Date.now().toString();
    const w = 0.25;
    const h = hNorm(w);
    const newP = { id, pageIndex, x: 0.5 - w / 2, y: 0.5 - h / 2, w };
    setPlacements(prev => [...prev, newP]);
    setSelectedId(id);
  };

  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    const pl = placements.find(p => p.id === id);
    if (!pl) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, initX: pl.x, initY: pl.y };
  };

  const handleResize = (e) => {
    const w = parseFloat(e.target.value);
    setPlacements(prev => prev.map(p => p.id === selectedId ? { ...p, w } : p));
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setPlacements(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = async () => {
    if (!pdfBytes || !imageBytes || placements.length === 0) return;
    setSaving(true);
    try {
      const savePath = await selectPdfSaveLocation('documento_carimbado.pdf');
      if (!savePath) { setSaving(false); return; }
      const doc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
      const ext = imagePath.split('.').pop().toLowerCase();
      const pdfImage = ext === 'png' ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
      for (const p of placements) {
        const page = doc.getPage(p.pageIndex);
        const { width, height } = page.getSize();
        const h = hNorm(p.w);
        const x_pdf = p.x * width;
        const y_pdf = p.y * height;
        page.drawImage(pdfImage, { x: x_pdf, y: y_pdf, width: p.w * width, height: h * height });
      }
      const saved = await doc.save();
      await writeBinaryFile(savePath, new Uint8Array(saved));
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
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

  useEffect(() => {
    if (!pdfDoc) return;
    (async () => {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      setPageSize({ w: viewport.width, h: viewport.height });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    })();
  }, [pdfDoc, pageIndex]);

  const sel = placements.find(p => p.id === selectedId);

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
              {sel && (
                <div className="flex items-center gap-2 ml-4 bg-white px-3 py-1.5 rounded-xl border border-border">
                  <span className="text-xs text-text-muted">Tamanho:</span>
                  <input type="range" min="0.05" max="0.8" step="0.01" value={sel.w} onChange={handleResize} className="w-24" />
                  <button onClick={handleDelete} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center gap-1"><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar PDF'}</button>
            </div>
            <div className="relative border border-border rounded-xl shadow-sm bg-white overflow-hidden">
              <canvas ref={canvasRef} />
              {placements.filter(p => p.pageIndex === pageIndex).map(p => (
                <div key={p.id} onMouseDown={(e) => handleMouseDown(e, p.id)} className={`absolute border-2 ${p.id === selectedId ? 'border-blue-500' : 'border-transparent'} cursor-move`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`, height: `${hNorm(p.w) * 100}%` }}>
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
