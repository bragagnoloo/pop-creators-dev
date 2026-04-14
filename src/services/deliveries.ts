import { CampaignDelivery } from '@/types';
import { getItem, setItem, generateId } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

function getAll(): CampaignDelivery[] {
  return getItem<CampaignDelivery[]>(STORAGE_KEYS.DELIVERIES) || [];
}

function saveAll(list: CampaignDelivery[]): void {
  setItem(STORAGE_KEYS.DELIVERIES, list);
}

export function getDeliveriesForUser(campaignId: string, userId: string): CampaignDelivery[] {
  return getAll()
    .filter(d => d.campaignId === campaignId && d.userId === userId)
    .sort((a, b) => a.index - b.index);
}

export function getCampaignDeliveries(campaignId: string): CampaignDelivery[] {
  return getAll().filter(d => d.campaignId === campaignId);
}

/**
 * Garante N slots de entrega para (campaignId, userId).
 * Cria os que faltam; não remove os excedentes (preserva histórico se admin reduzir a quantidade depois).
 */
export function ensureDeliveries(campaignId: string, userId: string, count: number): CampaignDelivery[] {
  const all = getAll();
  const existing = all.filter(d => d.campaignId === campaignId && d.userId === userId);
  const existingIdx = new Set(existing.map(d => d.index));
  const toCreate: CampaignDelivery[] = [];
  for (let i = 1; i <= count; i++) {
    if (!existingIdx.has(i)) {
      toCreate.push({
        id: generateId(),
        campaignId,
        userId,
        index: i,
        scheduledDate: null,
        contentUrl: null,
      });
    }
  }
  if (toCreate.length > 0) {
    saveAll([...all, ...toCreate]);
  }
  return getDeliveriesForUser(campaignId, userId);
}

export function updateDelivery(id: string, data: Partial<Pick<CampaignDelivery, 'scheduledDate' | 'contentUrl'>>): CampaignDelivery | null {
  const all = getAll();
  const idx = all.findIndex(d => d.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data };
  saveAll(all);
  return all[idx];
}
