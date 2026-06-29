import React, { useState } from 'react';
import { Layers, Loader2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { selectPdfFile } from '../lib/tauri-api';
import { readBinaryFile } from '../lib/file-io';
import { renderPageThumbnail } from '../lib/pdf-utils';
import { PDFDocument } from 'pdf-lib';

function SortableItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="p-2 bg-white rounded-xl border border-border flex flex-col items-center relative group">
      <div {...attributes} {...listeners} className="absolute top-2 left-2 cursor-grab"><GripVertical className="w-4 h-4 text-text-muted" /></div>
      {item.thumbnail ? <img src={item.thumbnail} className="w-32 h-44 object-contain" /> : <Loader2 className="w-6 h-6 animate-spin" />}
      <span className="text-xs text-text-muted mt-2">{item.label}</span>
    </div>
  );
}

export default function OrganizePage() {
  const [pages, setPages] = useState([]);
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto max-h-[500px]">
                {pages.map(page => <SortableItem key={page.id} item={page} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
}