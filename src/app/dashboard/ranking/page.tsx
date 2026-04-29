'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { RankingEntry, UserRankingStats } from '@/types';
import { getMonthlyRanking, getAllTimeRanking, getUserRankingStats } from '@/services/ranking';
import { ROUTES } from '@/lib/constants';

const MEDAL = ['🥇', '🥈', '🥉'];

const PLAN_LABEL: Record<string, string> = {
  semester: 'Semestral',
  yearly: 'Anual',
  monthly: 'Mensal',
  free: 'Gratuito',
};

function PodiumCard({
  entry,
  isMe,
  position,
}: {
  entry: RankingEntry;
  isMe: boolean;
  position: 'first' | 'second' | 'third';
}) {
  const heights = { first: 'h-28', second: 'h-20', third: 'h-16' };
  const avatarSizes = { first: 'lg' as const, second: 'md' as const, third: 'md' as const };
  const textSizes = { first: 'text-lg', second: 'text-base', third: 'text-sm' };

  return (
    <div className={`flex flex-col items-center gap-2 ${position === 'first' ? 'order-2 scale-105' : position === 'second' ? 'order-1' : 'order-3'}`}>
      <span className="text-2xl">{MEDAL[entry.rank - 1]}</span>
      <div className={`relative ${isMe ? 'ring-2 ring-popline-pink ring-offset-2 ring-offset-background rounded-full' : ''}`}>
        <Avatar src={entry.photoUrl} name={entry.fullName} size={avatarSizes[position]} />
      </div>
      <div className="text-center">
        <p className={`font-semibold text-text-primary ${textSizes[position]} max-w-[80px] truncate`}>
          {entry.fullName.split(' ')[0]}
        </p>
        <p className="text-popline-pink font-bold text-sm">{entry.totalPoints.toLocaleString('pt-BR')} pts</p>
      </div>
      <div className={`w-full rounded-t-lg gradient-bg ${heights[position]} flex items-end justify-center pb-2`}>
        <span className="text-white font-black text-xl">#{entry.rank}</span>
      </div>
    </div>
  );
}

function RankRow({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isMe
          ? 'bg-popline-pink/10 border border-popline-pink/30'
          : 'bg-surface hover:bg-surface-hover border border-border'
      }`}
    >
      <span className={`w-7 text-center font-bold text-sm shrink-0 ${isMe ? 'text-popline-pink' : 'text-text-secondary'}`}>
        #{entry.rank}
      </span>
      <Avatar src={entry.photoUrl} name={entry.fullName} size="sm" />
      <p className={`flex-1 font-medium text-sm truncate ${isMe ? 'text-popline-light' : 'text-text-primary'}`}>
        {entry.fullName}
        {isMe && <span className="ml-1 text-xs text-text-secondary">(você)</span>}
      </p>
      <Badge variant={entry.plan === 'yearly' ? 'pink' : 'default'}>
        {PLAN_LABEL[entry.plan] ?? entry.plan}
      </Badge>
      <span className={`font-bold text-sm shrink-0 ${isMe ? 'text-popline-pink' : 'text-text-primary'}`}>
        {entry.totalPoints.toLocaleString('pt-BR')} pts
      </span>
    </div>
  );
}

function HowItWorksSection() {
  const rules = [
    { icon: '🎬', action: 'Assistir uma aula', points: '+10 pts', note: 'Uma vez por aula' },
    { icon: '✅', action: 'Ser aprovado em campanha', points: '+50 pts', note: 'Uma vez por campanha' },
    { icon: '📅', action: 'Assinar plano semestral', points: '+20 pts', note: 'A cada ativação ou renovação' },
    { icon: '🏆', action: 'Assinar plano anual', points: '+50 pts', note: 'A cada ativação ou renovação' },
    { icon: '🔥', action: 'Login diário', points: '+1 pt/dia', note: 'Primeiro acesso do dia' },
  ];

  return (
    <div className="mt-10 space-y-6">
      <h2 className="text-lg font-bold text-text-primary">Como funciona</h2>

      {/* Como ganhar pontos */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Como ganhar pontos</h3>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.action} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="text-xl w-8 text-center shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{r.action}</p>
                <p className="text-xs text-text-secondary">{r.note}</p>
              </div>
              <span className="font-bold text-popline-pink text-sm shrink-0">{r.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quem pode participar */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
        <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Quem pode participar</h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Apenas assinantes dos planos <span className="text-text-primary font-medium">Semestral</span> e{' '}
          <span className="text-text-primary font-medium">Anual</span> acumulam pontos e aparecem no ranking.
          Usuários dos planos Mensal e Gratuito não pontuam, mas podem assinar um plano elegível a qualquer momento.
        </p>
      </div>

      {/* Ranking mensal vs geral */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Mensal vs Geral</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-hover rounded-xl p-4 space-y-1">
            <p className="font-semibold text-text-primary text-sm">📆 Ranking Mensal</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Considera apenas os pontos ganhos no mês atual. Reinicia todo dia 1º.
            </p>
          </div>
          <div className="bg-surface-hover rounded-xl p-4 space-y-1">
            <p className="font-semibold text-text-primary text-sm">🌟 Ranking Geral</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Acumula todos os pontos desde o início, sem reiniciar. Mostra quem é mais consistente.
            </p>
          </div>
        </div>
      </div>

      {/* Premiações */}
      <div className="bg-popline-pink/5 border border-popline-pink/20 rounded-2xl p-5 space-y-2">
        <h3 className="font-semibold text-popline-light text-sm uppercase tracking-wide">🎁 Premiações</h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          As premiações são anunciadas mensalmente pela equipe POPline. Os vencedores de cada período são
          notificados diretamente. Fique de olho nos avisos de campanha para não perder nenhuma novidade!
        </p>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'monthly' | 'alltime'>('monthly');
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [stats, setStats] = useState<UserRankingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = tab === 'monthly' ? getMonthlyRanking : getAllTimeRanking;
    Promise.all([fetch(), getUserRankingStats()])
      .then(([list, userStats]) => {
        setEntries(list);
        setStats(userStats);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const myPoints = tab === 'monthly' ? (stats?.monthlyPoints ?? 0) : (stats?.alltimePoints ?? 0);
  const myRank = tab === 'monthly' ? stats?.monthlyRank : stats?.alltimeRank;

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const myUserId = user?.id;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Ranking</h1>
        <p className="text-text-secondary text-sm mt-1">Ganhe pontos e dispute prêmios mensais</p>
      </div>

      {/* Toggle tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit mb-6">
        {(['monthly', 'alltime'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'gradient-bg text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'monthly' ? 'Mensal' : 'Geral'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Sua posição */}
          {myPoints > 0 && stats ? (
            <div className="bg-popline-pink/10 border border-popline-pink/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <Avatar src={null} name={user?.email ?? ''} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary">Sua posição</p>
                <p className="font-bold text-text-primary">
                  {myRank ? `#${myRank}` : 'Fora do top 50'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-popline-pink">{myPoints.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-text-secondary">pontos</p>
              </div>
            </div>
          ) : myPoints === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-5 mb-6 text-center space-y-2">
              <p className="text-2xl">🎯</p>
              <p className="font-semibold text-text-primary text-sm">Você ainda não tem pontos</p>
              <p className="text-xs text-text-secondary">
                Assista aulas, participe de campanhas e faça login todos os dias para começar a pontuar.
              </p>
              <button
                onClick={() => router.push(ROUTES.AULAS ?? '/dashboard/aulas')}
                className="mt-2 text-sm text-popline-pink font-medium hover:text-popline-light transition-colors"
              >
                Ver aulas disponíveis →
              </button>
            </div>
          ) : null}

          {entries.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-3xl">🏅</p>
              <p className="text-text-secondary text-sm">Nenhum usuário pontuou ainda este período.</p>
            </div>
          ) : (
            <>
              {/* Pódio */}
              {podium.length >= 1 && (
                <div className="bg-surface border border-border rounded-2xl p-6 mb-4">
                  <div className="flex items-end justify-center gap-4">
                    {podium[1] && (
                      <PodiumCard
                        entry={podium[1]}
                        isMe={podium[1].userId === myUserId}
                        position="second"
                      />
                    )}
                    <PodiumCard
                      entry={podium[0]}
                      isMe={podium[0].userId === myUserId}
                      position="first"
                    />
                    {podium[2] && (
                      <PodiumCard
                        entry={podium[2]}
                        isMe={podium[2].userId === myUserId}
                        position="third"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Lista restante */}
              {rest.length > 0 && (
                <div className="space-y-2">
                  {rest.map((entry) => (
                    <RankRow
                      key={entry.userId}
                      entry={entry}
                      isMe={entry.userId === myUserId}
                    />
                  ))}
                </div>
              )}

              {/* Usuário fora do top 50 mas com pontos */}
              {myRank && myRank > 50 && myPoints > 0 && (
                <div className="mt-2">
                  <RankRow
                    entry={{
                      rank: myRank,
                      userId: myUserId ?? '',
                      fullName: user?.email?.split('@')[0] ?? 'Você',
                      photoUrl: null,
                      plan: 'free',
                      totalPoints: myPoints,
                    }}
                    isMe
                  />
                </div>
              )}
            </>
          )}

          <HowItWorksSection />
        </>
      )}
    </div>
  );
}
