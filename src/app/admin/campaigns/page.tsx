'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Campaign, CampaignApplication, UserProfile } from '@/types';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Avatar from '@/components/ui/Avatar';

const statusVariant: Record<Campaign['status'], 'success' | 'warning' | 'default'> = {
  open: 'success',
  in_progress: 'warning',
  completed: 'default',
};

const statusLabel: Record<Campaign['status'], string> = {
  open: 'Inscricoes Abertas',
  in_progress: 'Em Andamento',
  completed: 'Finalizada',
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewingApplications, setViewingApplications] = useState<string | null>(null);
  const [applications, setApplications] = useState<(CampaignApplication & { profile: UserProfile | null })[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Campaign['status']>('open');
  const [cache, setCache] = useState<string>('0');
  const [deliveryCount, setDeliveryCount] = useState<string>('1');
  const [briefing, setBriefing] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCampaigns = () => {
    setCampaigns(campaignService.getAllCampaigns());
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setStatus('open');
    setCache('0');
    setDeliveryCount('1');
    setBriefing('');
    setImageUrl(null);
    setShowForm(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setTitle(campaign.title);
    setDescription(campaign.description);
    setStatus(campaign.status);
    setCache(String(campaign.cache ?? 0));
    setDeliveryCount(String(campaign.deliveryCount ?? 1));
    setBriefing(campaign.briefing ?? '');
    setImageUrl(campaign.imageUrl);
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title,
      description,
      status,
      deadline: null,
      cache: Number(cache) || 0,
      deliveryCount: Math.max(1, Number(deliveryCount) || 1),
      briefing: briefing.trim() || null,
      imageUrl,
    };

    if (editing) {
      campaignService.updateCampaign(editing.id, data);
    } else {
      campaignService.createCampaign(data);
    }

    setShowForm(false);
    loadCampaigns();
  };

  const openApplications = (campaignId: string) => {
    const apps = campaignService.getCampaignApplications(campaignId);
    const enriched = apps.map(app => ({
      ...app,
      profile: userService.getProfile(app.userId),
    }));
    setApplications(enriched);
    setViewingApplications(campaignId);
  };

  const handleAppStatusChange = (applicationId: string, appStatus: CampaignApplication['status']) => {
    campaignService.updateApplicationStatus(applicationId, appStatus);
    if (viewingApplications) openApplications(viewingApplications);
  };

  const handleDelete = (id: string) => {
    campaignService.deleteCampaign(id);
    setConfirmDelete(null);
    loadCampaigns();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <Button onClick={openCreate}>Nova Campanha</Button>
      </div>

      {/* Campaign Form Modal */}
      {showForm && (
        <Modal isOpen onClose={() => setShowForm(false)} title={editing ? 'Editar Campanha' : 'Nova Campanha'}>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Logo upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Logo da Campanha</label>
              <div className="flex items-center gap-4">
                {imageUrl ? (
                  <img src={imageUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-background border border-border flex items-center justify-center">
                    <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                    {imageUrl ? 'Trocar Logo' : 'Carregar Logo'}
                  </Button>
                  {imageUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Input
              label="Titulo"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <Textarea
              label="Descricao"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Campaign['status'])}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-popline-pink transition-colors"
              >
                <option value="open">Inscricoes Abertas</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Finalizada</option>
              </select>
            </div>
            <Input
              label="Cachê por criador (R$)"
              type="number"
              min="0"
              step="0.01"
              value={cache}
              onChange={e => setCache(e.target.value)}
              required
            />
            <Input
              label="Quantidade de entregas por participante"
              type="number"
              min="1"
              step="1"
              value={deliveryCount}
              onChange={e => setDeliveryCount(e.target.value)}
              required
            />
            <Textarea
              label="Briefing (opcional)"
              value={briefing}
              onChange={e => setBriefing(e.target.value)}
              rows={6}
              placeholder="Cole aqui o briefing completo da campanha. Criadores aprovados poderão ver e baixar."
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} title="Confirmar Exclusao">
          <p className="text-text-secondary mb-6">Tem certeza que deseja excluir esta campanha? Esta acao nao pode ser desfeita.</p>
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

      {/* Applications Modal */}
      {viewingApplications && (
        <Modal isOpen onClose={() => setViewingApplications(null)} title="Inscricoes da Campanha">
          {applications.length === 0 ? (
            <p className="text-text-secondary text-center py-4">Nenhuma inscricao nesta campanha.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {applications.map(app => {
                const statusConfig: Record<CampaignApplication['status'], { label: string; variant: 'warning' | 'success' | 'default' }> = {
                  pending: { label: 'Pendente', variant: 'warning' },
                  approved: { label: 'Aprovado', variant: 'success' },
                  rejected: { label: 'Rejeitado', variant: 'default' },
                };
                const s = statusConfig[app.status];
                return (
                  <div key={app.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={app.profile?.photoUrl} name={app.profile?.fullName || ''} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{app.profile?.fullName || 'Sem nome'}</p>
                        <p className="text-xs text-text-secondary truncate">{app.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => handleAppStatusChange(app.id, 'approved')}>
                            Aprovar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleAppStatusChange(app.id, 'rejected')}>
                            Rejeitar
                          </Button>
                        </>
                      ) : (
                        <Badge variant={s.variant}>{s.label}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map(campaign => (
          <Card key={campaign.id}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {campaign.imageUrl ? (
                  <img src={campaign.imageUrl} alt={campaign.title} className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{campaign.title}</h3>
                    <Badge variant={statusVariant[campaign.status]}>
                      {statusLabel[campaign.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{campaign.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span>
                      Inscricoes: {campaignService.getCampaignApplications(campaign.id).length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Link href={`/admin/campaigns/${campaign.id}`}>
                  <Button size="sm">Painel</Button>
                </Link>
                <Button variant="secondary" size="sm" onClick={() => openApplications(campaign.id)}>
                  Inscricoes
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(campaign)}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(campaign.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {campaigns.length === 0 && (
          <Card>
            <p className="text-center text-text-secondary">
              Nenhuma campanha criada. Clique em &quot;Nova Campanha&quot; para comecar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
