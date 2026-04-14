'use client';

import { UserProfile } from '@/types';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { InstagramIcon, TikTokIcon } from '@/components/ui/SocialIcons';

interface ProfileBlockProps {
  profile: UserProfile;
  onEdit: () => void;
}

function formatFollowers(value: string): string {
  if (!value) return '';
  const num = parseInt(value.replace(/\D/g, ''), 10);
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace('.0', '')}K`;
  return num.toString();
}

export default function ProfileBlock({ profile, onEdit }: ProfileBlockProps) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Avatar src={profile.photoUrl} name={profile.fullName} size="xl" />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold">{profile.fullName || 'Sem nome'}</h2>
          <p className="text-text-secondary text-sm mt-1">{profile.email}</p>
          {profile.whatsapp && (
            <p className="text-text-secondary text-sm mt-1">WhatsApp: {profile.whatsapp}</p>
          )}
          {profile.bio && (
            <p className="text-text-secondary text-sm mt-3">{profile.bio}</p>
          )}

          {/* Location */}
          {(profile.city || profile.state) && (
            <div className="flex items-start gap-1.5 mt-3 text-sm text-text-secondary">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <span>{[profile.city, profile.state].filter(Boolean).join(' - ')}</span>
                {profile.neighborhood && (
                  <span className="text-text-secondary"> · {profile.neighborhood}</span>
                )}
                {profile.cep && (
                  <span className="text-text-secondary"> · CEP {profile.cep}</span>
                )}
                {profile.address && (
                  <p className="text-xs text-text-secondary mt-0.5">{profile.address}</p>
                )}
              </div>
            </div>
          )}

          {/* Social accounts */}
          {(profile.instagram || profile.tiktok) && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              {profile.instagram && (
                <div className="flex items-center gap-2">
                  <InstagramIcon />
                  <span className="text-sm text-text-primary">@{profile.instagram}</span>
                  {profile.instagramFollowers && (
                    <span className="text-xs text-text-secondary bg-surface-hover px-2 py-0.5 rounded-full">
                      {formatFollowers(profile.instagramFollowers)} seguidores
                    </span>
                  )}
                </div>
              )}
              {profile.tiktok && (
                <div className="flex items-center gap-2">
                  <TikTokIcon />
                  <span className="text-sm text-text-primary">@{profile.tiktok}</span>
                  {profile.tiktokFollowers && (
                    <span className="text-xs text-text-secondary bg-surface-hover px-2 py-0.5 rounded-full">
                      {formatFollowers(profile.tiktokFollowers)} seguidores
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <Button variant="secondary" size="sm" className="mt-4" onClick={onEdit}>
            Editar Perfil
          </Button>
        </div>
      </div>
    </Card>
  );
}
