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
    return { monthlyRank: null, monthlyPoints: 0, alltimeRank: null, alltimePoints: 0 };
  }
  const r = data[0] as StatsRow;
  return {
    monthlyRank: r.monthly_rank ? Number(r.monthly_rank) : null,
    monthlyPoints: Number(r.monthly_points ?? 0),
    alltimeRank: r.alltime_rank ? Number(r.alltime_rank) : null,
    alltimePoints: Number(r.alltime_points ?? 0),
  };
}

export async function recordDailyLogin(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('record_daily_login');
}
