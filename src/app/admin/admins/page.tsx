'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Campaign } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import * as campaignService from '@/services/campaigns';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';

interface CampaignAdminEntry {
  adminId: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  campaigns: Pick<Campaign, 'id' | 'title'>[];
}

export default function AdminAdminsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [admins, setAdmins] = useState<CampaignAdminEntry[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createCampaignIds, setCreateCampaignIds] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  // Edit form
  const [editAdmin, setEditAdmin] = useState<CampaignAdminEntry | null>(null);
  const [editCampaignIds, setEditCampaignIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Revoke confirmation
  const [confirmRevoke, setConfirmRevoke] = useState<CampaignAdminEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace('/admin/campaigns');
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const [adminRes, campaigns] = await Promise.all([
      fetch('/api/admin/admins').then(r => r.json()),
      campaignService.getAllCampaigns(),
    ]);
    setAdmins(Array.isArray(adminRes) ? adminRes : []);
    setAllCampaigns(campaigns);
    setLoading(false);
  };

  const openEdit = (admin: CampaignAdminEntry) => {
    setEditAdmin(admin);
    setEditCampaignIds(admin.campaigns.map(c => c.id));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (createCampaignIds.length === 0) {
      setCreateError('Selecione ao menos uma campanha.');
      return;
    }
    setCreateSaving(true);
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: createEmail, password: createPassword, campaignIds: createCampaignIds }),
    });
    const data = await res.json();
    setCreateSaving(false);
    if (!res.ok) {
      setCreateError(data.error ?? 'Erro ao criar admin.');
      return;
    }
    setShowCreate(false);
    setCreateEmail('');
    setCreatePassword('');
    setCreateCampaignIds([]);
    loadData();
  };

  const handleEdit = async () => {
    if (!editAdmin) return;
    setEditSaving(true);
    await fetch(`/api/admin/admins/${editAdmin.adminId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignIds: editCampaignIds }),
    });
    setEditSaving(false);
    setEditAdmin(null);
    loadData();
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    await fetch(`/api/admin/admins/${confirmRevoke.adminId}`, { method: 'DELETE' });
    setConfirmRevoke(null);
    loadData();
  };

  const toggleCampaign = (ids: string[], setIds: (v: string[]) => void, campaignId: string) => {
    setIds(ids.includes(campaignId) ? ids.filter(id => id !== campaignId) : [...ids, campaignId]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admins de Campanha</h1>
        <Button onClick={() => { setShowCreate(true); setCreateError(null); }}>Novo Admin</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary">
            Nenhum admin de campanha criado. Clique em &quot;Novo Admin&quot; para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <Card key={admin.adminId}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={admin.photoUrl} name={admin.fullName || admin.email} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{admin.fullName || '—'}</p>
                    <p className="text-sm text-text-secondary truncate">{admin.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {admin.campaigns.length === 0 ? (
                        <span className="text-xs text-text-secondary">Nenhuma campanha atribuída</span>
                      ) : (
                        admin.campaigns.map(c => (
                          <Badge key={c.id} variant="default">{c.title}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(admin)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmRevoke(admin)}>
                    Revogar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} title="Novo Admin de Campanha">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
              required
            />
            <Input
              label="Senha inicial"
              type="password"
              value={createPassword}
              onChange={e => setCreatePassword(e.target.value)}
              required
              placeholder="Mínimo 6 caracteres"
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary font-medium">Campanhas atribuídas</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {allCampaigns.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createCampaignIds.includes(c.id)}
                      onChange={() => toggleCampaign(createCampaignIds, setCreateCampaignIds, c.id)}
                      className="accent-popline-pink"
                    />
                    <span className="text-sm">{c.title}</span>
                  </label>
                ))}
                {allCampaigns.length === 0 && (
                  <p className="text-sm text-text-secondary">Nenhuma campanha disponível.</p>
                )}
              </div>
            </div>
            {createError && <p className="text-sm text-red-400">{createError}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createSaving}>
                {createSaving ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editAdmin && (
        <Modal isOpen onClose={() => setEditAdmin(null)} title={`Editar: ${editAdmin.email}`}>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary font-medium">Campanhas atribuídas</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {allCampaigns.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editCampaignIds.includes(c.id)}
                      onChange={() => toggleCampaign(editCampaignIds, setEditCampaignIds, c.id)}
                      className="accent-popline-pink"
                    />
                    <span className="text-sm">{c.title}</span>
                  </label>
                ))}
                {allCampaigns.length === 0 && (
                  <p className="text-sm text-text-secondary">Nenhuma campanha disponível.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditAdmin(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={editSaving} onClick={handleEdit}>
                {editSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke Confirmation */}
      {confirmRevoke && (
        <Modal isOpen onClose={() => setConfirmRevoke(null)} title="Revogar Acesso">
          <p className="text-text-secondary mb-6">
            Tem certeza que deseja revogar o acesso de <strong>{confirmRevoke.email}</strong>? O usuário voltará a ser um creator normal.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmRevoke(null)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleRevoke}>
              Revogar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
