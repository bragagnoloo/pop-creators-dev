'use client';

import { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { pixelAddPaymentInfo, pixelCustom } from '@/lib/pixel';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import { BalanceCredit, Withdrawal, PixKeyType, Campaign } from '@/types';
import * as userService from '@/services/users';
import * as walletService from '@/services/wallet';
import * as campaignService from '@/services/campaigns';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import WithdrawalRulesModal from '@/components/wallet/WithdrawalRulesModal';

export default function CarteiraPage() {
  const { user } = useAuth();

  const { data: walletData, mutate: mutateWallet } = useSWR(
    user ? ['wallet', user.id] : null,
    async ([, uid]) => {
      const [profile, summary, credits, withdrawals, allCampaigns] = await Promise.all([
        userService.getProfile(uid),
        walletService.getUserWalletSummary(uid),
        walletService.getUserCredits(uid),
        walletService.getUserWithdrawals(uid),
        campaignService.getAllCampaigns(),
      ]);
      const campaignMap: Record<string, Campaign> = {};
      for (const camp of allCampaigns) campaignMap[camp.id] = camp;
      return { profile, summary, credits, withdrawals, campaigns: campaignMap };
    }
  );

  const profile = walletData?.profile ?? null;
  const summary = walletData?.summary ?? { available: 0, processing: 0, totalWithdrawn: 0 };
  const credits = walletData?.credits ?? [];
  const withdrawals = walletData?.withdrawals ?? [];
  const campaigns = walletData?.campaigns ?? {};

  // Pix form
  const [showPixForm, setShowPixForm] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf');
  const [pixHolderName, setPixHolderName] = useState('');
  const [pixConfirm, setPixConfirm] = useState(false);

  // Withdraw
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Rules modal
  const [showRules, setShowRules] = useState(false);


  const history = useMemo(() => {
    type Entry =
      | { kind: 'credit'; date: string; credit: BalanceCredit }
      | { kind: 'withdrawal'; date: string; withdrawal: Withdrawal };
    const entries: Entry[] = [
      ...credits.map(c => ({ kind: 'credit' as const, date: c.createdAt, credit: c })),
      ...withdrawals.map(w => ({ kind: 'withdrawal' as const, date: w.createdAt, withdrawal: w })),
    ];
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [credits, withdrawals]);

  if (!profile) return null;

  const hasPix = !!profile.pixKey && !!profile.pixKeyType && !!profile.pixHolderName;

  const openPixForm = () => {
    setPixKey(profile.pixKey || '');
    setPixKeyType(profile.pixKeyType || 'cpf');
    setPixHolderName(profile.pixHolderName || profile.fullName || '');
    setPixConfirm(false);
    setShowPixForm(true);
  };

  const handlePixSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPixConfirm(true);
  };

  const confirmPix = async () => {
    if (!user) return;
    await userService.updateProfile(user.id, {
      pixKey,
      pixKeyType,
      pixHolderName: pixHolderName.trim(),
    });
    pixelAddPaymentInfo({ currency: 'BRL' });
    setShowPixForm(false);
    setPixConfirm(false);
    mutateWallet();
  };

  const openWithdraw = () => {
    setWithdrawAmount('');
    setWithdrawError(null);
    setWithdrawSuccess(false);
    setShowWithdraw(true);
  };

  const closeWithdraw = () => {
    setShowWithdraw(false);
    setWithdrawSuccess(false);
    if (withdrawSuccess) mutateWallet();
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile.pixKey || !profile.pixKeyType) return;
    const amount = Number(withdrawAmount);
    const result = await walletService.requestWithdrawal(amount);
    if (!result.success) {
      setWithdrawError(result.error);
      return;
    }
    pixelCustom('WithdrawalRequested', { value: amount, currency: 'BRL' });
    setWithdrawSuccess(true);
    // Confete — dispara ao chegar na tela de sucesso.
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.7 } }), 250);
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.7 } }), 400);
  };

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-bold">Carteira</h1>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-secondary">Disponível para saque</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {walletService.formatBRL(summary.available)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Em processamento</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {walletService.formatBRL(summary.processing)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Total sacado</p>
          <p className="text-2xl font-bold mt-1">
            {walletService.formatBRL(summary.totalWithdrawn)}
          </p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={openWithdraw}
          disabled={!hasPix || summary.available <= 0}
        >
          Solicitar saque
        </Button>
        <Button variant="secondary" onClick={openPixForm}>
          {hasPix ? 'Editar chave PIX' : 'Cadastrar chave PIX'}
        </Button>
        <Button variant="ghost" onClick={() => setShowRules(true)}>
          Regras de saque
        </Button>
      </div>

      {/* Pix card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">Chave PIX cadastrada</p>
            {hasPix ? (
              <p className="font-medium mt-1">
                <span className="text-text-secondary">
                  {walletService.pixKeyTypeLabels[profile.pixKeyType!]}:
                </span>{' '}
                {profile.pixKey}
              </p>
            ) : (
              <p className="text-sm mt-1">Nenhuma chave cadastrada — cadastre antes de solicitar saque.</p>
            )}
          </div>
        </div>
      </Card>

      {/* History */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Histórico</h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">Sem movimentações ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary border-b border-border">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Descrição</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString('pt-BR')}
                    </td>
                    {entry.kind === 'credit' ? (
                      <>
                        <td className="py-3 pr-4">
                          <Badge variant="success">Crédito</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {campaigns[entry.credit.campaignId]?.title || 'Campanha'}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.credit.status === 'processing' && (
                            <span className="text-yellow-400">Em processamento</span>
                          )}
                          {entry.credit.status === 'available' && (
                            <span className="text-green-400">Disponível</span>
                          )}
                          {entry.credit.status === 'withdrawn' && (
                            <span className="text-text-secondary">Sacado</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-medium text-green-400 whitespace-nowrap">
                          + {walletService.formatBRL(entry.credit.amount)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-4">
                          <Badge variant="warning">Saque</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <p>PIX: {entry.withdrawal.pixKey}</p>
                          {entry.withdrawal.status === 'flagged' && (
                            <p className="text-xs text-red-400 mt-1">
                              Saque interrompido por divergência de titularidade. Confira as{' '}
                              <button
                                type="button"
                                className="underline hover:text-red-300 cursor-pointer"
                                onClick={() => setShowRules(true)}
                              >
                                regras de saque
                              </button>
                              {' '}e atualize sua chave PIX se necessário.
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.withdrawal.status === 'requested' && (
                            <span className="text-yellow-400">Solicitado</span>
                          )}
                          {entry.withdrawal.status === 'paid' && (
                            <span className="text-green-400">Pago</span>
                          )}
                          {entry.withdrawal.status === 'flagged' && (
                            <span className="text-red-400">Interrompido — conformidade</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-medium whitespace-nowrap">
                          {entry.withdrawal.status === 'flagged' ? (
                            <span className="text-text-secondary line-through">
                              − {walletService.formatBRL(entry.withdrawal.amount)}
                            </span>
                          ) : (
                            <>− {walletService.formatBRL(entry.withdrawal.amount)}</>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pix Modal */}
      {showPixForm && (
        <Modal isOpen onClose={() => setShowPixForm(false)} title="Chave PIX">
          {!pixConfirm ? (
            <form onSubmit={handlePixSave} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                Por segurança, a chave PIX cadastrada precisa ser da <strong>sua própria conta bancária</strong>.
                O nome do titular deve ser o mesmo que consta no seu perfil ({profile.fullName || 'seu nome'}).
                Saques com dados divergentes são interrompidos por conformidade.
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-medium">Tipo da chave</label>
                <select
                  value={pixKeyType}
                  onChange={e => setPixKeyType(e.target.value as PixKeyType)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-popline-pink transition-colors"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave aleatória</option>
                </select>
              </div>
              <Input
                label="Nome completo do titular da conta"
                value={pixHolderName}
                onChange={e => setPixHolderName(e.target.value)}
                placeholder="Como aparece no seu banco"
                required
              />
              <Input
                label="Chave"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowPixForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Revisar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">Confira os dados antes de salvar:</p>
              <div className="p-4 rounded-xl bg-background border border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Tipo</span>
                  <span className="font-medium">{walletService.pixKeyTypeLabels[pixKeyType]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Titular</span>
                  <span className="font-medium text-right">{pixHolderName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Chave</span>
                  <span className="font-medium break-all text-right">{pixKey}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setPixConfirm(false)}>
                  Voltar
                </Button>
                <Button className="flex-1" onClick={confirmPix}>
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <Modal isOpen onClose={closeWithdraw} title={withdrawSuccess ? undefined : 'Solicitar saque'}>
          {withdrawSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-9 h-9 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary">
                Parabéns! Seu Cachê está chegando.
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                O Prazo máximo é de até <strong className="text-text-primary">48h úteis</strong>.
              </p>
              <p className="text-sm text-text-secondary">
                Obrigado por fazer parte da POPline Creators.
              </p>
              <Button className="w-full mt-2" onClick={closeWithdraw}>
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="p-3 rounded-xl bg-background border border-border text-sm">
                <p className="text-text-secondary">Disponível</p>
                <p className="text-lg font-bold text-green-400">
                  {walletService.formatBRL(summary.available)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed space-y-1.5">
                <p>
                  <strong>⚠️ Titularidade obrigatória:</strong> a chave PIX cadastrada deve ser da{' '}
                  <strong>sua própria conta bancária</strong>, com o mesmo nome do assinante. Saques com
                  dados divergentes serão interrompidos.
                </p>
                <p>
                  <strong>⏱️ Prazo:</strong> saques solicitados podem levar até <strong>48h úteis</strong>{' '}
                  para serem depositados.
                </p>
              </div>

              <Input
                label="Valor (R$)"
                type="number"
                min="0.01"
                step="0.01"
                max={summary.available}
                value={withdrawAmount}
                onChange={e => {
                  setWithdrawAmount(e.target.value);
                  setWithdrawError(null);
                }}
                required
              />

              <div className="text-sm space-y-1">
                <p className="text-text-secondary">Receberá em</p>
                <p className="font-medium">
                  {walletService.pixKeyTypeLabels[profile.pixKeyType!]}: {profile.pixKey}
                </p>
                <p className="text-xs text-text-secondary">
                  Titular: <span className="text-text-primary font-medium">{profile.pixHolderName || '—'}</span>
                </p>
              </div>

              {withdrawError && <p className="text-xs text-red-400">{withdrawError}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowWithdraw(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Solicitar
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      <WithdrawalRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
