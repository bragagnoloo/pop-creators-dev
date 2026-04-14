import { CampaignApplication, AuthUser } from '@/types';

export interface DayBucket {
  label: string;
  value: number;
  isoDate: string;
}

function formatDayLabel(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function startOfDayISO(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

/**
 * Constrói buckets por dia (últimos N dias, incluindo hoje) e contabiliza
 * items cujo campo `dateField` (string ISO) cai naquele dia.
 */
export function bucketizeByDay<T>(
  items: T[],
  dateField: (item: T) => string | null | undefined,
  days: number
): DayBucket[] {
  const buckets: DayBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({
      label: formatDayLabel(d),
      value: 0,
      isoDate: startOfDayISO(d),
    });
  }

  const bucketMap = new Map(buckets.map(b => [b.isoDate, b]));

  for (const item of items) {
    const iso = dateField(item);
    if (!iso) continue;
    const key = iso.slice(0, 10);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.value += 1;
  }

  return buckets;
}

export function applicationStatusCounts(apps: CampaignApplication[]) {
  return {
    approved: apps.filter(a => a.status === 'approved').length,
    pending: apps.filter(a => a.status === 'pending').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };
}

export function nonAdminUsers(users: AuthUser[]): AuthUser[] {
  return users.filter(u => u.role !== 'admin');
}
