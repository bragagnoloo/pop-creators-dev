import { RankingEntry, UserRankingStats, PlanId } from '@/types';
import { createClient } from '@/lib/supabase/client';

type RankingRow = {
  rank: number;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  plan: PlanId;
  total_points: number;
};

type StatsRow = {
  monthly_rank: number | null;
  monthly_points: number;
  alltime_rank: number | null;
  alltime_points: number;
  full_name: string | null;
  photo_url: string | null;
  plan: PlanId | null;
};

function toEntry(r: RankingRow): RankingEntry {
  return {
    rank: Number(r.rank),
    userId: r.user_id,
    fullName: r.full_name,
    photoUrl: r.photo_url,
    plan: r.plan,
    totalPoints: Number(r.total_points),
  };
}

export async function getMonthlyRanking(limit = 50): Promise<RankingEntry[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc('get_monthly_ranking', { p_limit: limit });
  if (!data) return [];
  return (data as RankingRow[]).map(toEntry);
}

export async function getAllTimeRanking(limit = 50): Promise<RankingEntry[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc('get_alltime_ranking', { p_limit: limit });
  if (!data) return [];
  return (data as RankingRow[]).map(toEntry);
}

export async function getUserRankingStats(): Promise<UserRankingStats> {
  const supabase = createClient();
  const { data } = await supabase.rpc('get_user_ranking_stats');
  if (!data || !data[0]) {
    return {
      monthlyRank: null,
      monthlyPoints: 0,
      alltimeRank: null,
      alltimePoints: 0,
      fullName: '',
      photoUrl: null,
      plan: 'free',
    };
  }
  const r = data[0] as StatsRow;
  return {
    monthlyRank: r.monthly_rank ? Number(r.monthly_rank) : null,
    monthlyPoints: Number(r.monthly_points ?? 0),
    alltimeRank: r.alltime_rank ? Number(r.alltime_rank) : null,
    alltimePoints: Number(r.alltime_points ?? 0),
    fullName: r.full_name ?? '',
    photoUrl: r.photo_url,
    plan: r.plan ?? 'free',
  };
}

export async function recordDailyLogin(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('record_daily_login');
}

export interface AdminUserRank {
  userId: string;
  monthlyRank: number | null;
  alltimeRank: number | null;
  monthlyPoints: number;
  alltimePoints: number;
}

type AdminUserRankRow = {
  user_id: string;
  monthly_rank: number | null;
  alltime_rank: number | null;
  monthly_points: number;
  alltime_points: number;
};

export async function getAdminUserRanks(): Promise<Record<string, AdminUserRank>> {
  const supabase = createClient();
  const { data } = await supabase.rpc('get_admin_user_ranks');
  const map: Record<string, AdminUserRank> = {};
  for (const r of (data ?? []) as AdminUserRankRow[]) {
    map[r.user_id] = {
      userId: r.user_id,
      monthlyRank: r.monthly_rank ? Number(r.monthly_rank) : null,
      alltimeRank: r.alltime_rank ? Number(r.alltime_rank) : null,
      monthlyPoints: Number(r.monthly_points ?? 0),
      alltimePoints: Number(r.alltime_points ?? 0),
    };
  }
  return map;
}

export interface AdminRankingEntry {
  rank: number;
  userId: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  state: string | null;
  city: string | null;
  plan: PlanId;
  totalPoints: number;
}

type AdminRankingRow = {
  rank: number;
  user_id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  state: string | null;
  city: string | null;
  plan: PlanId;
  total_points: number;
};

export interface AdminRankingParams {
  scope: 'monthly' | 'alltime';
  year?: number;
  month?: number;
  state?: string;
  city?: string;
  limit?: number;
}

export async function getAdminRanking(params: AdminRankingParams): Promise<AdminRankingEntry[]> {
  const qs = new URLSearchParams();
  qs.set('scope', params.scope);
  if (params.year)  qs.set('year',  String(params.year));
  if (params.month) qs.set('month', String(params.month));
  if (params.state) qs.set('state', params.state);
  if (params.city)  qs.set('city',  params.city);
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`/api/admin/ranking?${qs.toString()}`);
  if (!res.ok) return [];
  const json = await res.json() as { data: AdminRankingRow[] };
  return (json.data ?? []).map(r => ({
    rank: Number(r.rank),
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    whatsapp: r.whatsapp,
    state: r.state,
    city: r.city,
    plan: r.plan,
    totalPoints: Number(r.total_points),
  }));
}
