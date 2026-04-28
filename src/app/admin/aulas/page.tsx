'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { Lesson } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as lessonService from '@/services/lessons';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { uploadImage, lessonThumbnailPath } from '@/lib/supabase/storage';

export default function AdminAulasPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [expert, setExpert] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const load = async () => setLessons(await lessonService.getAllLessons());

  useLoadOnMount(load);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert('Imagem muito grande. Máximo 800KB.');
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setExpert('');
    setDescription('');
    setYoutubeUrl('');
    setThumbnailUrl(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setUrlError(null);
    setShowForm(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setTitle(lesson.title);
    setExpert(lesson.expert ?? '');
    setDescription(lesson.description);
    setYoutubeUrl(lesson.youtubeUrl);
    setThumbnailUrl(lesson.thumbnailUrl);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setUrlError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl && !lessonService.extractYoutubeId(youtubeUrl)) {
      setUrlError('URL do YouTube inválida. Use um link como https://youtube.com/watch?v=...');
      return;
    }
    setSaving(true);
    let finalThumb = thumbnailUrl;
    if (thumbnailFile) {
      const uploaded = await uploadImage(
        'lesson-thumbnails',
        lessonThumbnailPath(thumbnailFile),
        thumbnailFile,
        editing?.thumbnailUrl || null
      );
      if (uploaded) finalThumb = uploaded;
    }
    const data = { title, expert: expert.trim() || null, description, youtubeUrl, thumbnailUrl: finalThumb };
    if (editing) {
      await lessonService.updateLesson(editing.id, data);
    } else {
      await lessonService.createLesson(data);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = async (dropIndex: number) => {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      setDragOver(null);
      return;
    }
    const reordered = [...lessons];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setLessons(reordered);
    setDragOver(null);
    dragIndex.current = null;
    await lessonService.reorderLessons(reordered.map(l => l.id));
  };

  const handleDragEnd = () => {
    setDragOver(null);
    dragIndex.current = null;
  };

  const handleDelete = async (id: string) => {
    await lessonService.deleteLesson(id);
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aulas</h1>
        <Button onClick={openCreate}>Nova Aula</Button>
      </div>

      {showForm && (
        <Modal isOpen onClose={() => setShowForm(false)} title={editing ? 'Editar Aula' : 'Nova Aula'}>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Thumbnail 4:5 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Thumbnail (formato 4:5)</label>
              <div className="flex items-start gap-4">
                <div className="w-24 aspect-[4/5] rounded-xl bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {thumbnailPreview || thumbnailUrl ? (
                    thumbnailPreview ? (
                      // blob: URL local do preview — não otimizar
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={thumbnailUrl!}
                        alt="Thumbnail"
                        width={96}
                        height={120}
                        className="w-full h-full object-cover"
                        sizes="96px"
                      />
                    )
                  ) : (
                    <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
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

            <Input
              label="Título"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <Input
              label="Com"
              value={expert}
              onChange={e => setExpert(e.target.value)}
              placeholder="Nome do expert (opcional)"
            />
            <Textarea
              label="Descrição"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              required
            />
            <div>
              <Input
                label="URL do YouTube"
                value={youtubeUrl}
                onChange={e => {
                  setYoutubeUrl(e.target.value);
                  setUrlError(null);
                }}
                placeholder="https://youtube.com/watch?v=..."
              />
              {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Enviando...' : editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} title="Confirmar Exclusão">
          <p className="text-text-secondary mb-6">Tem certeza que deseja excluir esta aula?</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => handleDelete(confirmDelete)}>
              Excluir
            </Button>
          </div>
        </Modal>
      )}

      <div className="space-y-4">
        {lessons.map((lesson, index) => (
          <div
            key={lesson.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={`transition-opacity ${dragOver === index && dragIndex.current !== index ? 'opacity-50' : 'opacity-100'}`}
          >
          <Card>
            <div className="flex gap-4">
              <div
                className="flex items-center px-1 cursor-grab active:cursor-grabbing text-text-secondary hover:text-white transition-colors shrink-0"
                title="Arrastar para reordenar"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                  <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
                </svg>
              </div>
              <div className="w-20 aspect-[4/5] rounded-xl overflow-hidden border border-border bg-background shrink-0">
                {lesson.thumbnailUrl ? (
                  <Image
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    width={80}
                    height={100}
                    className="w-full h-full object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">{lesson.title}</h3>
                <p className="text-sm text-text-secondary line-clamp-2 mb-2">{lesson.description}</p>
                <p className="text-xs text-text-secondary truncate">{lesson.youtubeUrl}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => openEdit(lesson)}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(lesson.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          </Card>
          </div>
        ))}

        {lessons.length === 0 && (
          <Card>
            <p className="text-center text-text-secondary">
              Nenhuma aula criada. Clique em &quot;Nova Aula&quot; para começar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
