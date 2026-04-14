import { Campaign, CampaignApplication } from '@/types';
import { getItem, setItem, generateId } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

function getCampaigns(): Campaign[] {
  return getItem<Campaign[]>(STORAGE_KEYS.CAMPAIGNS) || [];
}

function saveCampaigns(campaigns: Campaign[]): void {
  setItem(STORAGE_KEYS.CAMPAIGNS, campaigns);
}

function getApplications(): CampaignApplication[] {
  return getItem<CampaignApplication[]>(STORAGE_KEYS.APPLICATIONS) || [];
}

function saveApplications(apps: CampaignApplication[]): void {
  setItem(STORAGE_KEYS.APPLICATIONS, apps);
}

export function getAllCampaigns(): Campaign[] {
  return getCampaigns();
}

export function getCampaignById(id: string): Campaign | null {
  return getCampaigns().find(c => c.id === id) || null;
}

export function createCampaign(data: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
  const campaign: Campaign = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  saveCampaigns([...getCampaigns(), campaign]);
  return campaign;
}

export function updateCampaign(id: string, data: Partial<Campaign>): Campaign | null {
  const campaigns = getCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return null;
  campaigns[index] = { ...campaigns[index], ...data };
  saveCampaigns(campaigns);
  return campaigns[index];
}

export function deleteCampaign(id: string): void {
  saveCampaigns(getCampaigns().filter(c => c.id !== id));
  saveApplications(getApplications().filter(a => a.campaignId !== id));
}

export function applyToCampaign(campaignId: string, userId: string): CampaignApplication {
  const app: CampaignApplication = {
    id: generateId(),
    campaignId,
    userId,
    appliedAt: new Date().toISOString(),
    status: 'pending',
  };
  saveApplications([...getApplications(), app]);
  return app;
}

export function getUserApplications(userId: string): CampaignApplication[] {
  return getApplications().filter(a => a.userId === userId);
}

export function getCampaignApplications(campaignId: string): CampaignApplication[] {
  return getApplications().filter(a => a.campaignId === campaignId);
}

export function getAllApplications(): CampaignApplication[] {
  return getApplications();
}

export function updateApplicationStatus(applicationId: string, status: CampaignApplication['status']): CampaignApplication | null {
  const apps = getApplications();
  const index = apps.findIndex(a => a.id === applicationId);
  if (index === -1) return null;
  apps[index] = { ...apps[index], status };
  saveApplications(apps);
  return apps[index];
}
