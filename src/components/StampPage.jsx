import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Stamp, ImagePlus, Save, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { selectPdfFile, selectImageFile, selectPdfSaveLocation } from '../lib/tauri-api';
import { readBinaryFile, writeBinaryFile } from '../lib/file-io';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

const DEFAULT_STAMP_W = 0.25;

export default function StampPage() {
  const [pdfPath, setPdfPath]     = useState(null);
  const [pdfBytes, setPdfBytes]   = useState(null);
  const [pdfDoc, setPdfDoc]       = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize]   = useState({ w: 1, h: 1 });
  const canvasRef    = useRef(null);
  const RENDER_SCALE = 1.5;
  const [imagePath, setImagePath]       = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageBytes, setImageBytes]     = useState(null);
  const [imageAspect, setImageAspect]   = useState(1);
  const [placements, setPlacements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const dragRef = useRef(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const accent = '#1a3a5c';
  const hNorm = useCallback(
    (w) => (w * pageSize.w) / (imageAspect * pageSize.h),
    [imageAspect, pageSize],
  );
  const handleSelectPdf = async () => {
    setError(null);
    const path = await selectPdfFile();
    if (!path) return;
    try {
      const bytes = await readBinaryFile(path);
      const doc  = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPdfBytes(bytes);
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setPageIndex(0);
      setPdfPath(path);
      setPlacements([]);
      setSelectedId(null);
    } catch (e) {
      setError(`Não foi possível abrir o PDF: ${e.message ?? e}`);
    }
  };
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    (async () => {
      const page     = await pdfDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas   = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const vp1 = page.getViewport({ scale: 1 });
      if (!cancelled) setPageSize({ w: vp1.width, h: vp1.height });
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageIndex]);
  const handleSelectImage = async () => {
    setError(null);
    const path = await selectImageFile();
    if (!path) return;
    setImagePath(path);

    const bytes = await readBinaryFile(path);
    setImageBytes(bytes);

    const ext  = path.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const blob = new Blob([bytes], { type: mime });
    const url  = URL.createObjectURL(blob);
    setImageDataUrl(url);
    const img = new Image();
    img.src = url;
    await new Promise((res) => { img.onload = res; });
    setImageAspect(img.naturalWidth / img.naturalHeight);
  };
  const handleAddStamp = () => {
    if (!imageDataUrl) return;
    const w = DEFAULT_STAMP_W;
    const h = hNorm(w);
    const id = Date.now();
    setPlacements((prev) => [
      ...prev,
      {
        id,
        pageIndex,
        x: Math.max(0, (1 - w) / 2),
        y: Math.max(0, (1 - h) / 2),
        w,
      },
    ]);
    setSelectedId(id);
  };
  const handleStampMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    const pl = placements.find((p) => p.id === id);
    dragRef.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: pl.x,
      startY: pl.y,
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const { id, startMouseX, startMouseY, startX, startY } = dragRef.current;
      const dx = (e.clientX - startMouseX) / rect.width;
      const dy = (e.clientY - startMouseY) / rect.height;
      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const h = hNorm(p.w);
          return {
            ...p,
            x: Math.max(0, Math.min(1 - p.w, startX + dx)),
            y: Math.max(0, Math.min(1 - h,   startY + dy)),
          };
        }),
      );
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [hNorm]);
  const handleResize = (e) => {
    const w = parseFloat(e.target.value);
    setPlacements((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, w } : p)),
    );
  };

  const handleResetSize = () => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, w: DEFAULT_STAMP_W } : p)),
    );
  };
  const handleDelete = () => {
    if (!selectedId) return;
    setPlacements((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };
  const handleSave = async () => {
    if (!pdfBytes || !imageBytes || placements.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const savePath = await selectPdfSaveLocation(
        pdfPath.split(/[\\/]/).pop().replace(/\.pdf$/i, '_carimbado.pdf'),
      );
      if (!savePath) { setSaving(false); return; }
      const doc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
      const ext      = imagePath.split('.').pop().toLowerCase();
      const pdfImage = ext === 'png'
        ? await doc.embedPng(imageBytes)
        : await doc.embedJpg(imageBytes);
      for (const p of placements) {
        const page              = doc.getPage(p.pageIndex);
        const { width, height } = page.getSize();
        const h                 = hNorm(p.w);
        const x_pdf = p.x        * width;
        const w_pdf = p.w        * width;
        const h_pdf = h          * height;
        const y_pdf = (1 - p.y - h) * height;

        page.drawImage(pdfImage, { x: x_pdf, y: y_pdf, width: w_pdf, height: h_pdf });
      }
      const saved = await doc.save();
      await writeBinaryFile(savePath, new Uint8Array(saved));

      setSuccessMsg('PDF salvo com sucesso!');
    } catch (err) {
      setError(`Erro ao salvar: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };
  const selectedPlacement  = placements.find((p) => p.id === selectedId);
  const placementsOnPage   = placements.filter((p) => p.pageIndex === pageIndex);
  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2">
          <div className="rounded-md p-1.5" style={{ background: `${accent}18` }}>
            <Stamp className="w-5 h-5" style={{ color: accent }} />
          </div>
          <h1 className="text-text font-semibold text-lg">Carimbo em PDF</h1>
        </div>
      </header>
      <main className="flex-1 flex gap-6 px-10 pb-8 overflow-hidden animate-fade-in-up">
        <aside className="w-64 shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 flex flex-col gap-2 border border-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">1. Documento</p>
            <button
              id="btn-select-pdf"
              onClick={handleSelectPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a3a5c] text-white text-sm font-medium hover:bg-[#153250] transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              {pdfPath ? 'Trocar PDF' : 'Selecionar PDF'}
            </button>
            {pdfPath && (
              <p className="text-xs text-text-muted truncate" title={pdfPath}>
                {pdfPath.split(/[\\/]/).pop()}
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 flex flex-col gap-2 border border-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">2. Carimbo</p>
            <button
              id="btn-select-stamp"
              onClick={handleSelectImage}
              disabled={!pdfPath}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text text-sm font-medium hover:border-[#1a3a5c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ImagePlus className="w-4 h-4" />
              {imagePath ? 'Trocar imagem' : 'Escolher imagem'}
            </button>
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Preview do carimbo"
                className="rounded-lg object-contain max-h-20 border border-border"
              />
            )}
            {imageDataUrl && pdfDoc && (
              <button
                id="btn-add-stamp"
                onClick={handleAddStamp}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-text text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                <Stamp className="w-4 h-4" />
                Adicionar carimbo na página
              </button>
            )}
          </div>
          {imageDataUrl && selectedPlacement && (
            <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 border border-border">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">3. Ajustar</p>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted font-medium">Tamanho</span>
                <input
                  id="stamp-size-slider"
                  type="range"
                  min="0.03"
                  max="0.6"
                  step="0.01"
                  value={selectedPlacement.w}
                  onChange={handleResize}
                  className="accent-[#1a3a5c] w-full"
                />
                {selectedPlacement.w === DEFAULT_STAMP_W ? (
                  <span className="text-[10px] text-[#94a3b8] leading-tight">
                    Tamanho padrão aplicado
                  </span>
                ) : (
                  <button
                    id="btn-reset-stamp-size"
                    onClick={handleResetSize}
                    className="text-[10px] text-[#1a3a5c] underline underline-offset-2 text-left hover:text-[#153250] transition-colors"
                  >
                    Restaurar tamanho padrão
                  </button>
                )}
              </label>
              <button
                id="btn-delete-stamp"
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remover carimbo
              </button>
            </div>
          )}
          <div className="mt-auto bg-white rounded-2xl p-4 flex flex-col gap-2 border border-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">4. Salvar</p>
            <button
              id="btn-save-pdf"
              onClick={handleSave}
              disabled={!pdfBytes || !imageBytes || placements.length === 0 || saving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a3a5c] text-white text-sm font-medium hover:bg-[#153250] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando…' : 'Salvar PDF'}
            </button>
            {placements.length === 0 && pdfPath && imageDataUrl && (
              <p className="text-xs text-text-muted text-center">
                Clique na página para posicionar o carimbo
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs">
              {successMsg}
            </div>
          )}
        </aside>
        <section className="flex-1 flex flex-col gap-3 overflow-hidden">
          {!pdfDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border">
              <Stamp className="w-14 h-14 text-[#cbd5e1]" />
              <p className="text-[#94a3b8] font-medium">Selecione um PDF para começar</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs text-text-muted">
                  {imageDataUrl
                    ? 'Arraste o carimbo para reposicionar'
                    : 'Escolha uma imagem de carimbo no painel esquerdo'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-prev-page"
                    onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                    disabled={pageIndex === 0}
                    className="p-1.5 rounded-lg hover:bg-surface-hover disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-text" />
                  </button>
                  <span className="text-sm text-text font-medium">
                    {pageIndex + 1} / {pageCount}
                  </span>
                  <button
                    id="btn-next-page"
                    onClick={() => setPageIndex((i) => Math.min(pageCount - 1, i + 1))}
                    disabled={pageIndex === pageCount - 1}
                    className="p-1.5 rounded-lg hover:bg-surface-hover disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-text" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto flex items-start justify-center">
                <div
                  className="relative inline-block shadow-xl rounded-lg overflow-hidden shrink-0"
                  onClick={() => setSelectedId(null)}
                >
                  <canvas ref={canvasRef} className="block" />
                  {placementsOnPage.map((p) => {
                    const h = hNorm(p.w);
                    return (
                      <div
                        key={p.id}
                        id={`stamp-overlay-${p.id}`}
                        onMouseDown={(e) => handleStampMouseDown(e, p.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left:   `${p.x * 100}%`,
                          top:    `${p.y * 100}%`,
                          width:  `${p.w * 100}%`,
                          height: `${h   * 100}%`,
                          cursor: 'move',
                          boxSizing: 'border-box',
                          border: selectedId === p.id
                            ? '2px solid #1a3a5c'
                            : '2px solid rgba(26,58,92,0.3)',
                          borderRadius: '4px',
                          userSelect: 'none',
                        }}
                      >
                        <img
                          src={imageDataUrl}
                          alt="carimbo"
                          draggable={false}
                          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
