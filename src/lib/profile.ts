import { UserProfile } from '@/types';

const requiredFields: (keyof UserProfile)[] = [
  'fullName',
  'whatsapp',
  'cep',
  'state',
  'city',
  'address',
  'instagram',
  'tiktok',
];

export function getProfileCompleteness(profile: UserProfile): { complete: boolean; missing: string[] } {
  const labels: Record<string, string> = {
    fullName: 'Nome Completo',
    whatsapp: 'WhatsApp',
    cep: 'CEP',
    state: 'Estado',
    city: 'Cidade',
    address: 'Endereco',
    instagram: 'Instagram',
    tiktok: 'TikTok',
  };

  const missing: string[] = [];
  for (const field of requiredFields) {
    const value = profile[field];
    if (!value || (typeof value === 'string' && !value.trim())) {
      missing.push(labels[field] || field);
    }
  }

  return { complete: missing.length === 0, missing };
}
