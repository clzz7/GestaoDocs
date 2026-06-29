import React, { useState } from 'react';
import { Layers, Loader2, GripVertical, RotateCw, Trash2, Save } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { selectPdfFile, selectPdfSaveLocation } from '../lib/tauri-api';
import { readBinaryFile, writeBinaryFile } from '../lib/file-io';
import { renderPageThumbnail, reorganizePages } from '../lib/pdf-utils';
import { PDFDocument } from 'pdf-lib';

function SortableItem({ item, onRotate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="p-2 bg-white rounded-xl border border-border flex flex-col items-center relative group">
      <div {...attributes} {...listeners} className="absolute top-2 left-2 cursor-grab"><GripVertical className="w-4 h-4 text-text-muted" /></div>
      <div className="absolute top-2 right-2 flex gap-1">
        <button onClick={() => onRotate(item.id)} className="p-1 bg-white/80 rounded hover:bg-white"><RotateCw className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(item.id)} className="p-1 bg-white/80 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {item.thumbnail ? <img src={item.thumbnail} className="w-32 h-44 object-contain" /> : <Loader2 className="w-6 h-6 animate-spin" />}
      <span className="text-xs text-text-muted mt-2">{item.label}</span>
    </div>
  );
}

export default function OrganizePage() {
  const [pages, setPages] = useState([]);
  const [saving, setSaving] = useState(false);
  const accent = '#1a3a5c';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleLoadPdf = async () => {
    const filePath = await selectPdfFile(); if (!filePath) return;
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
  };

  const handleRotate = (id) => {
    setPages(prev => prev.map(p => {
      if (p.id !== id) return p;
      const newRot = (p.rotation + 90) % 360;
      renderPageThumbnail(p.pdfBytes, p.pageNumber, 0.4, newRot).then(thumb => {
        if (thumb) setPages(curr => curr.map(c => c.id === id ? { ...c, thumbnail: thumb } : c));
      });
      return { ...p, rotation: newRot };
    }));
  };

  const handleDelete = (id) => setPages(prev => prev.filter(p => p.id !== id));

  const handleSave = async () => {
    if (pages.length === 0) return;
    setSaving(true);
    try {
      const savePath = await selectPdfSaveLocation('documento_organizado.pdf');
      if (!savePath) { setSaving(false); return; }
      const pageSources = pages.map(p => ({ pdfBytes: p.pdfBytes, pageNumber: p.pageNumber, rotation: p.rotation }));
      const resultBytes = await reorganizePages(pageSources);
      await writeBinaryFile(savePath, resultBytes);
    } finally { setSaving(false); }
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
          <div className="flex flex-col items-center gap-4">
            <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Salvar PDF Organizado</button>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => { if (e.active.id !== e.over?.id) setPages(items => arrayMove(items, items.findIndex(i => i.id === e.active.id), items.findIndex(i => i.id === e.over.id))); }}>
              <SortableContext items={pages} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto max-h-[500px]">
                  {pages.map(page => <SortableItem key={page.id} item={page} onRotate={handleRotate} onDelete={handleDelete} />)}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </main>
    </div>
  );
}