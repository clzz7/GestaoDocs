import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
  Layers,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { selectPdfFile, selectPdfSaveLocation } from '../lib/tauri-api';
import { readBinaryFile, writeBinaryFile } from '../lib/file-io';
import { renderPageThumbnail, reorganizePages } from '../lib/pdf-utils';
import { PDFDocument } from 'pdf-lib';

let nextId = 1;
function genId() {
  return `page-${nextId++}`;
}

const PageItemUI = React.forwardRef(
  ({ item, isSelected, onSelect, onDelete, dragHandleProps, isOverlay, style }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
          isSelected
            ? 'border-[#1a3a5c] shadow-md'
            : 'border-border hover:border-[#1a3a5c]/30 hover:shadow-sm'
        } ${isOverlay ? 'shadow-2xl scale-105 border-[#1a3a5c] rotate-2' : ''}`}
        onClick={() => onSelect?.(item.id)}
      >
        <div
          {...dragHandleProps}
          className={`absolute top-1 left-1 z-10 p-1 rounded-md bg-white/80 backdrop-blur-sm transition-opacity cursor-grab active:cursor-grabbing touch-none ${
            isOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-text-muted" />
        </div>
        {!isOverlay && (
          <button
            className="absolute top-1 right-1 z-10 p-1 rounded-md bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(item.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
        <div className="w-full aspect-3/4 bg-background flex items-center justify-center">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={`Página ${item.label}`}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <Loader2 className="w-5 h-5 text-[#94a3b8] animate-spin" />
          )}
        </div>
        <div className="px-2 py-1.5 bg-white border-t border-border text-center">
          <span className="text-xs font-medium text-text-muted">{item.label}</span>
        </div>
      </div>
    );
  }
);

function SortablePageItem({ item, isSelected, onSelect, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1 : 'auto',
  };

  return (
    <PageItemUI
      ref={setNodeRef}
      style={style}
      item={item}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

export default function OrganizePage() {
  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const accent = '#1a3a5c';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleLoadPdf = async (append = false) => {
    if (loading) return;
    setError(null);
    setSuccessMsg(null);

    try {
      const filePath = await selectPdfFile();
      if (!filePath) return;

      setLoading(true);
      const pdfBytes = await readBinaryFile(filePath);
      const doc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
      const numPages = doc.getPageCount();
      const fileName = filePath.split(/[\\/]/).pop();

      const newPages = [];
      for (let i = 1; i <= numPages; i++) {
        const id = genId();
        newPages.push({
          id,
          pdfPath: filePath,
          pdfBytes: pdfBytes,
          pageNumber: i,
          rotation: 0,
          thumbnail: null,
          label: `${fileName} - p.${i}`,
        });
      }

      if (append) {
        setPages((prev) => [...prev, ...newPages]);
      } else {
        setPages(newPages);
      }
      for (const page of newPages) {
        renderPageThumbnail(page.pdfBytes, page.pageNumber, 0.4, page.rotation).then((thumb) => {
          if (thumb) {
            setPages((prev) =>
              prev.map((p) => (p.id === page.id ? { ...p, thumbnail: thumb } : p)),
            );
          }
        });
      }
    } catch (err) {
      setError(`Erro ao carregar PDF: ${err.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPages((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };
  const handleDelete = (id) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleRotate = (id, degrees) => {
    const page = pages.find((item) => item.id === id);
    if (!page) return;

    const rotation = (page.rotation + degrees + 360) % 360;
    setPages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation, thumbnail: null } : item)),
    );

    renderPageThumbnail(page.pdfBytes, page.pageNumber, 0.4, rotation).then((thumbnail) => {
      if (thumbnail) {
        setPages((prev) =>
          prev.map((item) =>
            item.id === id && item.rotation === rotation ? { ...item, thumbnail } : item,
          ),
        );
      }
    });
  };
  const handleSave = async () => {
    if (pages.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const savePath = await selectPdfSaveLocation('documento_organizado.pdf');
      if (!savePath) {
        setSaving(false);
        return;
      }

      const pageSources = pages.map((p) => ({
        pdfBytes: p.pdfBytes,
        pageNumber: p.pageNumber,
        rotation: p.rotation,
      }));

      const resultBytes = await reorganizePages(pageSources);
      await writeBinaryFile(savePath, resultBytes);

      setSuccessMsg('PDF salvo com sucesso!');
    } catch (err) {
      setError(`Erro ao salvar: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-col h-full bg-background font-sans no-drag">
      <header className="flex items-center gap-4 px-10 pt-8 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-2 flex-1">
          <div className="rounded-md p-1.5" style={{ background: `${accent}18` }}>
            <Layers className="w-5 h-5" style={{ color: accent }} />
          </div>
          <h1 className="text-text font-semibold text-lg">Organizar PDF</h1>
          {pages.length > 0 && (
            <span className="bg-surface-hover text-text-muted px-2.5 py-0.5 rounded-full text-xs font-medium border border-border ml-2">
              {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedId && (
            <>
              <button
                onClick={() => handleRotate(selectedId, -90)}
                disabled={saving}
                title="Girar página selecionada 90° para a esquerda"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-text text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
                Girar à esquerda
              </button>
              <button
                onClick={() => handleRotate(selectedId, 90)}
                disabled={saving}
                title="Girar página selecionada 90° para a direita"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-text text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-40"
              >
                <RotateCw className="w-4 h-4" />
                Girar à direita
              </button>
            </>
          )}
          {pages.length > 0 && (
            <button
              onClick={() => handleLoadPdf(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-text text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              Adicionar páginas
            </button>
          )}
          {pages.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving || pages.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-40"
              style={{ background: accent }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar PDF'}
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-8 animate-fade-in-up">
        {pages.length === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <div
              onClick={() => handleLoadPdf(false)}
              className="relative w-full max-w-lg cursor-pointer select-none"
              style={{ minHeight: '300px' }}
            >
              <div
                className="absolute inset-0 rounded-3xl transition-all duration-300 border-2 border-dashed border-border hover:border-[#1a3a5c]/30 bg-white hover:bg-background"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 py-16 px-8">
                {loading ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: accent }} />
                    <p className="text-text-muted font-medium">Carregando páginas...</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${accent}10` }}>
                      <Layers className="w-10 h-10" style={{ color: accent }} />
                    </div>
                    <div className="text-center">
                      <p className="text-text font-semibold text-xl">Selecione um PDF para organizar</p>
                      <p className="text-[#94a3b8] text-sm mt-1">
                        Clique para carregar um PDF e reorganizar suas páginas
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Page grid with drag & drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                {pages.map((page) => (
                  <SortablePageItem
                    key={page.id}
                    item={page}
                    isSelected={selectedId === page.id}
                    onSelect={setSelectedId}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <PageItemUI
                  item={pages.find((p) => p.id === activeId)}
                  isOverlay={true}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        {error && (
          <div className="mt-4 max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm animate-fade-in">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 max-w-2xl mx-auto bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl text-sm animate-fade-in">
            {successMsg}
          </div>
        )}
      </main>
    </div>
  );
}
