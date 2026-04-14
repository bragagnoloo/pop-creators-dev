import { UserProfile } from '@/types';
import { getItem, setItem } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

function getProfiles(): UserProfile[] {
  return getItem<UserProfile[]>(STORAGE_KEYS.PROFILES) || [];
}

function saveProfiles(profiles: UserProfile[]): void {
  setItem(STORAGE_KEYS.PROFILES, profiles);
}

export function getProfile(userId: string): UserProfile | null {
  return getProfiles().find(p => p.userId === userId) || null;
}

export function getAllProfiles(): UserProfile[] {
  return getProfiles();
}

export function updateProfile(userId: string, data: Partial<UserProfile>): UserProfile | null {
  const profiles = getProfiles();
  const index = profiles.findIndex(p => p.userId === userId);
  if (index === -1) return null;
  profiles[index] = { ...profiles[index], ...data };
  saveProfiles(profiles);
  return profiles[index];
}
