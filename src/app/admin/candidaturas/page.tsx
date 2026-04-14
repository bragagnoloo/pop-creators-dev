'use client';

import { useState, useEffect, useMemo } from 'react';
import { Campaign, CampaignApplication, UserProfile } from '@/types';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { InstagramIcon, TikTokIcon } from '@/components/ui/SocialIcons';

const campaignStatusVariant: Record<Campaign['status'], 'success' | 'warning' | 'default'> = {
  open: 'success',
  in_progress: 'warning',
  completed: 'default',
};

const campaignStatusLabel: Record<Campaign['status'], string> = {
  open: 'Inscricoes Abertas',
  in_progress: 'Em Andamento',
  completed: 'Finalizada',
};

const appStatusLabel: Record<CampaignApplication['status'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const appStatusVariant: Record<CampaignApplication['status'], 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'default',
};

interface EnrichedApplication extends CampaignApplication {
  profile: UserProfile | null;
}

function generateCsv(campaign: Campaign, applications: EnrichedApplication[]): string {
  const headers = [
    'Nome Completo',
    'Email',
    'WhatsApp',
    'Instagram',
    'Seguidores Instagram',
    'TikTok',
    'Seguidores TikTok',
    'CEP',
    'Estado',
    'Cidade',
    'Bairro',
    'Endereco',
    'Bio',
    'Status Candidatura',
    'Data Inscricao',
  ];

  const rows = applications.map(app => {
    const p = app.profile;
    return [
      p?.fullName || '',
      p?.email || '',
      p?.whatsapp || '',
      p?.instagram ? `@${p.instagram}` : '',
      p?.instagramFollowers || '',
      p?.tiktok ? `@${p.tiktok}` : '',
      p?.tiktokFollowers || '',
      p?.cep || '',
      p?.state || '',
      p?.city || '',
      p?.neighborhood || '',
      p?.address || '',
      p?.bio || '',
      appStatusLabel[app.status],
      new Date(app.appliedAt).toLocaleDateString('pt-BR'),
    ];
  });

  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return '\uFEFF' + lines.join('\r\n'); // BOM for Excel UTF-8
}

function downloadCsv(campaign: Campaign, applications: EnrichedApplication[]) {
  const csv = generateCsv(campaign, applications);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidaturas-${campaign.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCandidaturasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [appCountsState, setAppCountsState] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setCampaigns(await campaignService.getAllCampaigns());
      const all = await campaignService.getAllApplications();
      const counts: Record<string, number> = {};
      for (const a of all) counts[a.campaignId] = (counts[a.campaignId] || 0) + 1;
      setAppCountsState(counts);
    })();
  }, []);

  const openCampaign = async (campaign: Campaign) => {
    const apps = await campaignService.getCampaignApplications(campaign.id);
    const enriched: EnrichedApplication[] = await Promise.all(
      apps.map(async app => ({
        ...app,
        profile: await userService.getProfile(app.userId),
      }))
    );
    setApplications(enriched);
    setSelectedCampaign(campaign);
  };

  const handleStatusChange = async (appId: string, status: CampaignApplication['status']) => {
    await campaignService.updateApplicationStatus(appId, status);
    if (selectedCampaign) openCampaign(selectedCampaign);
  };

  const appCounts = appCountsState;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Candidaturas</h1>

      {/* Campaign cards */}
      {!selectedCampaign && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <Card
              key={campaign.id}
              className="cursor-pointer hover:border-popline-pink/30 transition-colors"
            >
              <div onClick={() => openCampaign(campaign)}>
                <div className="flex items-start gap-3 mb-3">
                  {campaign.imageUrl ? (
                    <img src={campaign.imageUrl} alt={campaign.title} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{campaign.title}</h3>
                    <Badge variant={campaignStatusVariant[campaign.status]}>
                      {campaignStatusLabel[campaign.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-end text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{appCounts[campaign.id] || 0} candidatura{(appCounts[campaign.id] || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Card>
          ))}

          {campaigns.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <p className="text-center text-text-secondary">Nenhuma campanha criada.</p>
            </Card>
          )}
        </div>
      )}

      {/* Campaign detail with applications table */}
      {selectedCampaign && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{selectedCampaign.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={campaignStatusVariant[selectedCampaign.status]}>
                  {campaignStatusLabel[selectedCampaign.status]}
                </Badge>
                <span className="text-sm text-text-secondary">{applications.length} candidatura{applications.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {applications.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => downloadCsv(selectedCampaign, applications)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar CSV
              </Button>
            )}
          </div>

          {applications.length === 0 ? (
            <Card>
              <p className="text-center text-text-secondary">Nenhuma candidatura nesta campanha.</p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-text-secondary font-medium px-4 py-3">Criador</th>
                      <th className="text-left text-xs text-text-secondary font-medium px-4 py-3">WhatsApp</th>
                      <th className="text-left text-xs text-text-secondary font-medium px-4 py-3">Redes</th>
                      <th className="text-left text-xs text-text-secondary font-medium px-4 py-3">Localizacao</th>
                      <th className="text-left text-xs text-text-secondary font-medium px-4 py-3">Data</th>
                      <th className="text-left text-xs text-text-secondary font-medium px-4 py-3">Status</th>
                      <th className="text-right text-xs text-text-secondary font-medium px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => {
                      const p = app.profile;
                      return (
                        <tr key={app.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar src={p?.photoUrl} name={p?.fullName || ''} size="sm" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{p?.fullName || 'Sem nome'}</p>
                                <p className="text-xs text-text-secondary truncate">{p?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{p?.whatsapp || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {p?.instagram && (
                                <div className="flex items-center gap-1">
                                  <InstagramIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs">@{p.instagram}</span>
                                  {p.instagramFollowers && <span className="text-xs text-text-secondary">({Number(p.instagramFollowers).toLocaleString('pt-BR')})</span>}
                                </div>
                              )}
                              {p?.tiktok && (
                                <div className="flex items-center gap-1">
                                  <TikTokIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs">@{p.tiktok}</span>
                                  {p.tiktokFollowers && <span className="text-xs text-text-secondary">({Number(p.tiktokFollowers).toLocaleString('pt-BR')})</span>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {p?.city && p?.state ? `${p.city} - ${p.state}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary">
                            {new Date(app.appliedAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={appStatusVariant[app.status]}>{appStatusLabel[app.status]}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(p || null)}>
                                Ver
                              </Button>
                              {app.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleStatusChange(app.id, 'approved')}>Aprovar</Button>
                                  <Button variant="danger" size="sm" onClick={() => handleStatusChange(app.id, 'rejected')}>Rejeitar</Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/tablet cards */}
              <div className="lg:hidden divide-y divide-border">
                {applications.map(app => {
                  const p = app.profile;
                  return (
                    <div key={app.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar src={p?.photoUrl} name={p?.fullName || ''} size="sm" />
                          <div>
                            <p className="font-medium text-sm">{p?.fullName || 'Sem nome'}</p>
                            <p className="text-xs text-text-secondary">{p?.email}</p>
                          </div>
                        </div>
                        <Badge variant={appStatusVariant[app.status]}>{appStatusLabel[app.status]}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                        <div>WhatsApp: {p?.whatsapp || '—'}</div>
                        <div>{p?.city && p?.state ? `${p.city} - ${p.state}` : '—'}</div>
                        {p?.instagram && <div className="flex items-center gap-1"><InstagramIcon className="w-3 h-3" /> @{p.instagram}</div>}
                        {p?.tiktok && <div className="flex items-center gap-1"><TikTokIcon className="w-3 h-3" /> @{p.tiktok}</div>}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(p || null)}>Ver Perfil</Button>
                        {app.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleStatusChange(app.id, 'approved')}>Aprovar</Button>
                            <Button variant="danger" size="sm" onClick={() => handleStatusChange(app.id, 'rejected')}>Rejeitar</Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* User profile popup */}
      {selectedUser && (
        <Modal isOpen onClose={() => setSelectedUser(null)} title="Perfil do Criador">
          <div className="flex flex-col items-center gap-4">
            <Avatar src={selectedUser.photoUrl} name={selectedUser.fullName} size="xl" />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">{selectedUser.fullName || 'Sem nome'}</h3>
              <p className="text-sm text-text-secondary">{selectedUser.email}</p>
              {selectedUser.whatsapp && <p className="text-sm text-text-secondary">WhatsApp: {selectedUser.whatsapp}</p>}
              {selectedUser.bio && <p className="text-sm text-text-secondary mt-2">{selectedUser.bio}</p>}

              {(selectedUser.city || selectedUser.state) && (
                <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-text-secondary">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {[selectedUser.city, selectedUser.state].filter(Boolean).join(' - ')}
                    {selectedUser.neighborhood && ` · ${selectedUser.neighborhood}`}
                    {selectedUser.cep && ` · CEP ${selectedUser.cep}`}
                  </span>
                </div>
              )}
              {selectedUser.address && <p className="text-xs text-text-secondary">{selectedUser.address}</p>}

              {(selectedUser.instagram || selectedUser.tiktok) && (
                <div className="flex flex-col gap-2 mt-3">
                  {selectedUser.instagram && (
                    <div className="flex items-center justify-center gap-2">
                      <InstagramIcon className="w-4 h-4" />
                      <span className="text-sm">@{selectedUser.instagram}</span>
                      {selectedUser.instagramFollowers && (
                        <span className="text-xs text-text-secondary">{Number(selectedUser.instagramFollowers).toLocaleString('pt-BR')} seguidores</span>
                      )}
                    </div>
                  )}
                  {selectedUser.tiktok && (
                    <div className="flex items-center justify-center gap-2">
                      <TikTokIcon className="w-4 h-4" />
                      <span className="text-sm">@{selectedUser.tiktok}</span>
                      {selectedUser.tiktokFollowers && (
                        <span className="text-xs text-text-secondary">{Number(selectedUser.tiktokFollowers).toLocaleString('pt-BR')} seguidores</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
