'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Opportunity, OppCategory } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as opportunityService from '@/services/opportunities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { uploadImage, opportunityLogoPath } from '@/lib/supabase/storage';

const CATEGORY_OPTIONS: { value: OppCategory; label: string }[] = [
  { value: 'marcas', label: 'Campanhas com marcas' },
  { value: 'ugc', label: 'UGC' },
  { value: 'afiliados', label: 'Afiliados' },
  { value: 'plataformas', label: 'Plataformas' },
  { value: 'editais', label: 'Editais' },
];

const CATEGORY_LABEL: Record<OppCategory, string> = {
  marcas: 'Marcas',
  ugc: 'UGC',
  afiliados: 'Afiliados',
  plataformas: 'Plataformas',
  editais: 'Editais',
};

// ---------- Form Modal ----------
function OpportunityModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Opportunity | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [category, setCategory] = useState<OppCategory>(editing?.category ?? 'plataformas');
  const [shortDesc, setShortDesc] = useState(editing?.shortDesc ?? '');
  const [fullDesc, setFullDesc] = useState(editing?.fullDesc ?? '');
  const [url, setUrl] = useState(editing?.url ?? '');
  const [published, setPublished] = useState(editing?.published ?? true);
  const [logoUrl, setLogoUrl] = useState<string | null>(editing?.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { alert('Imagem muito grande. Máximo 800KB.'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let finalLogo = logoUrl;
    if (logoFile) {
      const uploaded = await uploadImage(
        'criarsemtigrinho-logos',
        opportunityLogoPath(logoFile),
        logoFile,
        editing?.logoUrl ?? null
      );
      if (uploaded) finalLogo = uploaded;
    }
    const data = {
      name: name.trim(),
      category,
      logoUrl: finalLogo,
      shortDesc: shortDesc.trim(),
      fullDesc: fullDesc.trim(),
      url: url.trim(),
      published,
    };
    if (editing) {
      await opportunityService.updateOpportunity(editing.id, data);
    } else {
      await opportunityService.createOpportunity(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Editar Oportunidade' : 'Nova Oportunidade'}>
      <form onSubmit={handleSave} className="space-y-4">
        {/* Logo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Logo (quadrada, ~1:1)</label>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
              {logoPreview || logoUrl ? (
                logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Image src={logoUrl!} alt="Logo" width={80} height={80} className="w-full h-full object-cover" sizes="80px" />
              ) : (
                <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {logoPreview || logoUrl ? 'Trocar logo' : 'Carregar logo'}
              </Button>
              {(logoPreview || logoUrl) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setLogoUrl(null); setLogoFile(null); setLogoPreview(null); }}>
                  Remover
                </Button>
              )}
              <p className="text-xs text-text-secondary">Máx 800KB. Sem logo, mostramos a inicial do nome.</p>
            </div>
          </div>
        </div>

        <Input label="Nome da plataforma" value={name} onChange={e => setName(e.target.value)} required />

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Categoria</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  category === opt.value
                    ? 'gradient-bg text-white border-transparent'
                    : 'bg-transparent border-border text-text-secondary hover:border-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea label="Descrição curta (aparece no card fechado)" value={shortDesc} onChange={e => setShortDesc(e.target.value)} rows={2} required />
        <Textarea label="Descrição completa (aparece ao expandir)" value={fullDesc} onChange={e => setFullDesc(e.target.value)} rows={4} required />
        <Input label="Link da plataforma" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required />

        {/* Publicado */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Visibilidade</label>
          <div className="flex gap-3">
            {[true, false].map(v => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setPublished(v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  published === v
                    ? v
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-transparent border-border text-text-secondary hover:border-white/20'
                }`}
              >
                {v ? '✓ Publicada' : '⏳ Rascunho'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Enviando...' : editing ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Card na lista admin ----------
function OpportunityRow({
  opportunity,
  onEdit,
  onDelete,
  dragProps,
  dragOver,
}: {
  opportunity: Opportunity;
  onEdit: () => void;
  onDelete: () => void;
  dragProps: object;
  dragOver: boolean;
}) {
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

          {/* Logo */}
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-border bg-background shrink-0 flex items-center justify-center">
            {opportunity.logoUrl ? (
              <Image src={opportunity.logoUrl} alt={opportunity.name} width={64} height={64} className="w-full h-full object-cover" sizes="64px" />
            ) : (
              <span className="text-xl font-bold gradient-text">{opportunity.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className="font-semibold truncate">{opportunity.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-popline-pink/20 text-popline-light">
                    {CATEGORY_LABEL[opportunity.category]}
                  </span>
                  {!opportunity.published && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      Rascunho
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary line-clamp-2 mt-1">{opportunity.shortDesc}</p>
                <a href={opportunity.url} target="_blank" rel="noopener noreferrer" className="text-xs text-popline-light hover:underline mt-1 inline-block truncate max-w-full">
                  {opportunity.url}
                </a>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={onEdit}>Editar</Button>
                <Button variant="danger" size="sm" onClick={onDelete}>Excluir</Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------- Página principal ----------
export default function AdminOportunidades() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [modal, setModal] = useState<'create' | Opportunity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const load = async () => setOpportunities(await opportunityService.getAllOpportunities());
  useLoadOnMount(load);

  const handleDragStart = (index: number) => { dragIndex.current = index; };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOver(index); };
  const handleDrop = async (dropIndex: number) => {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) { setDragOver(null); return; }
    const reordered = [...opportunities];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setOpportunities(reordered);
    setDragOver(null);
    dragIndex.current = null;
    await Promise.all(
      reordered.map((o, index) => opportunityService.updateOpportunity(o.id, { position: index + 1 }))
    );
  };
  const handleDragEnd = () => { setDragOver(null); dragIndex.current = null; };

  const handleDelete = async (id: string) => {
    await opportunityService.deleteOpportunity(id);
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Oportunidades</h1>
        <Button onClick={() => setModal('create')}>Nova Oportunidade</Button>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Conteúdo da página pública <span className="text-popline-light">/criarsemtigrinho</span>. Arraste para reordenar.
      </p>

      {modal && (
        <OpportunityModal
          editing={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} title="Excluir Oportunidade">
          <p className="text-text-secondary mb-6">Tem certeza que deseja excluir esta oportunidade?</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" onClick={() => handleDelete(confirmDelete)}>Excluir</Button>
          </div>
        </Modal>
      )}

      <div className="space-y-4">
        {opportunities.map((opportunity, index) => (
          <div
            key={opportunity.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
          >
            <OpportunityRow
              opportunity={opportunity}
              onEdit={() => setModal(opportunity)}
              onDelete={() => setConfirmDelete(opportunity.id)}
              dragProps={{}}
              dragOver={dragOver === index && dragIndex.current !== index}
            />
          </div>
        ))}
        {opportunities.length === 0 && (
          <Card>
            <p className="text-center text-text-secondary">Nenhuma oportunidade criada. Clique em &quot;Nova Oportunidade&quot; para começar.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
