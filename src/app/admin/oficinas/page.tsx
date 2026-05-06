'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { Workshop, Lesson } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as workshopService from '@/services/workshops';
import * as lessonService from '@/services/lessons';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { uploadImage, lessonThumbnailPath } from '@/lib/supabase/storage';

// ---------- Workshop Form Modal ----------
function WorkshopModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Workshop | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [expert, setExpert] = useState(editing?.expert ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(editing?.thumbnailUrl ?? null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { alert('Imagem muito grande. Máximo 800KB.'); return; }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let finalThumb = thumbnailUrl;
    if (thumbnailFile) {
      const uploaded = await uploadImage(
        'lesson-thumbnails',
        lessonThumbnailPath(thumbnailFile),
        thumbnailFile,
        editing?.thumbnailUrl ?? null
      );
      if (uploaded) finalThumb = uploaded;
    }
    const data = { title, expert: expert.trim() || null, description, thumbnailUrl: finalThumb };
    if (editing) {
      await workshopService.updateWorkshop(editing.id, data);
    } else {
      await workshopService.createWorkshop(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Editar Oficina' : 'Nova Oficina'}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Thumbnail (formato 4:5)</label>
          <div className="flex items-start gap-4">
            <div className="w-24 aspect-[4/5] rounded-xl bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
              {thumbnailPreview || thumbnailUrl ? (
                thumbnailPreview
                  ? <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  : <Image src={thumbnailUrl!} alt="Thumbnail" width={96} height={120} className="w-full h-full object-cover" sizes="96px" />
              ) : (
                <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {thumbnailPreview || thumbnailUrl ? 'Trocar imagem' : 'Carregar imagem'}
              </Button>
              {(thumbnailPreview || thumbnailUrl) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setThumbnailUrl(null); setThumbnailFile(null); setThumbnailPreview(null); }}>
                  Remover
                </Button>
              )}
              <p className="text-xs text-text-secondary">Máx 800KB. Proporção 4:5.</p>
            </div>
          </div>
        </div>
        <Input label="Título da oficina" value={title} onChange={e => setTitle(e.target.value)} required />
        <Input label="Expert (com)" value={expert} onChange={e => setExpert(e.target.value)} placeholder="Nome do expert (opcional)" />
        <Textarea label="Descrição" value={description} onChange={e => setDescription(e.target.value)} rows={3} required />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Enviando...' : editing ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Lesson Form Modal ----------
function LessonModal({
  workshopId,
  editing,
  onClose,
  onSaved,
}: {
  workshopId: string;
  editing: Lesson | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(editing?.youtubeUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl && !lessonService.extractYoutubeId(youtubeUrl)) {
      setUrlError('URL do YouTube inválida.');
      return;
    }
    setSaving(true);
    const data = { title, description, youtubeUrl };
    if (editing) {
      await workshopService.updateLesson(editing.id, data);
    } else {
      await workshopService.createLesson(workshopId, data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Editar Aula' : 'Nova Aula'}>
      <form onSubmit={handleSave} className="space-y-4">
        <Input label="Título da aula" value={title} onChange={e => setTitle(e.target.value)} required />
        <Textarea label="Descrição" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        <div>
          <Input
            label="URL do YouTube"
            value={youtubeUrl}
            onChange={e => { setYoutubeUrl(e.target.value); setUrlError(null); }}
            placeholder="https://youtube.com/watch?v=..."
            required
          />
          {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Enviando...' : editing ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Workshop Row com sub-lista de aulas ----------
function WorkshopRow({
  workshop,
  onEdit,
  onDelete,
  onReload,
  dragProps,
  dragOver,
}: {
  workshop: Workshop;
  onEdit: () => void;
  onDelete: () => void;
  onReload: () => void;
  dragProps: object;
  dragOver: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonModal, setLessonModal] = useState<'create' | Lesson | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<string | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const loadLessons = async () => {
    setLoadingLessons(true);
    setLessons(await workshopService.getLessonsForWorkshop(workshop.id));
    setLoadingLessons(false);
  };

  const handleExpand = () => {
    if (!expanded) loadLessons();
    setExpanded(v => !v);
  };

  const handleDeleteLesson = async (id: string) => {
    await workshopService.deleteLesson(id);
    setConfirmDeleteLesson(null);
    loadLessons();
  };

  return (
    <div className={`transition-opacity ${dragOver ? 'opacity-50' : 'opacity-100'}`}>
      <Card>
        <div className="flex gap-4 items-start">
          {/* Drag handle */}
          <div className="flex items-center px-1 pt-1 cursor-grab active:cursor-grabbing text-text-secondary hover:text-white transition-colors shrink-0" title="Arrastar para reordenar" {...dragProps}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
            </svg>
          </div>

          {/* Thumbnail */}
          <div className="w-20 aspect-[4/5] rounded-xl overflow-hidden border border-border bg-background shrink-0">
            {workshop.thumbnailUrl ? (
              <Image src={workshop.thumbnailUrl} alt={workshop.title} width={80} height={100} className="w-full h-full object-cover" sizes="80px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-6 h-6 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 9h.01M15 15l-4-4-3 3" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{workshop.title}</h3>
                {workshop.expert && <p className="text-xs text-popline-light mt-0.5">Com {workshop.expert}</p>}
                <p className="text-sm text-text-secondary line-clamp-2 mt-1">{workshop.description}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={onEdit}>Editar</Button>
                <Button variant="danger" size="sm" onClick={onDelete}>Excluir</Button>
              </div>
            </div>

            {/* Expandir aulas */}
            <button
              type="button"
              onClick={handleExpand}
              className="mt-3 flex items-center gap-2 text-xs text-text-secondary hover:text-white transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {expanded ? 'Ocultar aulas' : `Ver aulas`}
            </button>
          </div>
        </div>

        {/* Sub-lista de aulas */}
        {expanded && (
          <div className="mt-4 pl-[calc(1rem+1rem+5rem)] space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">Aulas desta oficina</span>
              <Button size="sm" onClick={() => setLessonModal('create')}>+ Nova Aula</Button>
            </div>

            {loadingLessons && <p className="text-sm text-text-secondary">Carregando...</p>}

            {!loadingLessons && lessons.length === 0 && (
              <p className="text-sm text-text-secondary">Nenhuma aula cadastrada.</p>
            )}

            {lessons.map((lesson, idx) => (
              <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border">
                <span className="text-xs text-text-secondary w-5 text-center">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                  {lesson.description && <p className="text-xs text-text-secondary truncate">{lesson.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => setLessonModal(lesson)}>Editar</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDeleteLesson(lesson.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modais de aula */}
      {lessonModal && (
        <LessonModal
          workshopId={workshop.id}
          editing={lessonModal === 'create' ? null : lessonModal}
          onClose={() => setLessonModal(null)}
          onSaved={() => { loadLessons(); onReload(); }}
        />
      )}
      {confirmDeleteLesson && (
        <Modal isOpen onClose={() => setConfirmDeleteLesson(null)} title="Excluir Aula">
          <p className="text-text-secondary mb-6">Tem certeza que deseja excluir esta aula?</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDeleteLesson(null)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" onClick={() => handleDeleteLesson(confirmDeleteLesson)}>Excluir</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Página principal ----------
export default function AdminOficinas() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopModal, setWorkshopModal] = useState<'create' | Workshop | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const load = async () => setWorkshops(await workshopService.getAllWorkshops());
  useLoadOnMount(load);

  const handleDragStart = (index: number) => { dragIndex.current = index; };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOver(index); };
  const handleDrop = async (dropIndex: number) => {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) { setDragOver(null); return; }
    const reordered = [...workshops];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setWorkshops(reordered);
    setDragOver(null);
    dragIndex.current = null;
    await workshopService.reorderWorkshops(reordered.map(w => w.id));
  };
  const handleDragEnd = () => { setDragOver(null); dragIndex.current = null; };

  const handleDelete = async (id: string) => {
    await workshopService.deleteWorkshop(id);
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Oficinas</h1>
        <Button onClick={() => setWorkshopModal('create')}>Nova Oficina</Button>
      </div>

      {workshopModal && (
        <WorkshopModal
          editing={workshopModal === 'create' ? null : workshopModal}
          onClose={() => setWorkshopModal(null)}
          onSaved={load}
        />
      )}

      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} title="Excluir Oficina">
          <p className="text-text-secondary mb-6">Excluir esta oficina também removerá todas as suas aulas.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" onClick={() => handleDelete(confirmDelete)}>Excluir</Button>
          </div>
        </Modal>
      )}

      <div className="space-y-4">
        {workshops.map((workshop, index) => (
          <div
            key={workshop.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
          >
            <WorkshopRow
              workshop={workshop}
              onEdit={() => setWorkshopModal(workshop)}
              onDelete={() => setConfirmDelete(workshop.id)}
              onReload={load}
              dragProps={{}}
              dragOver={dragOver === index && dragIndex.current !== index}
            />
          </div>
        ))}
        {workshops.length === 0 && (
          <Card>
            <p className="text-center text-text-secondary">Nenhuma oficina criada. Clique em &quot;Nova Oficina&quot; para começar.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
