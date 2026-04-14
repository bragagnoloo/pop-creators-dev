'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { UserProfile } from '@/types';
import * as userService from '@/services/users';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import ProfileBlock from '@/components/dashboard/ProfileBlock';
import ProfileEditModal from '@/components/dashboard/ProfileEditModal';
import CampaignList from '@/components/dashboard/CampaignList';
import MyCampaigns from '@/components/dashboard/MyCampaigns';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const loadProfile = useCallback(() => {
    if (!user) return;
    const p = userService.getProfile(user.id);
    setProfile(p);
    if (p && !p.onboardingComplete) {
      setShowOnboarding(true);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!user || !profile) return null;

  return (
    <div className="space-y-8">
      {showOnboarding && (
        <OnboardingModal
          userId={user.id}
          onComplete={() => {
            setShowOnboarding(false);
            loadProfile();
          }}
        />
      )}

      {showEditProfile && (
        <ProfileEditModal
          profile={profile}
          onSave={(data) => {
            userService.updateProfile(user.id, data);
            loadProfile();
          }}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      <ProfileBlock profile={profile} onEdit={() => setShowEditProfile(true)} />
      <MyCampaigns userId={user.id} />
      <CampaignList userId={user.id} onEditProfile={() => setShowEditProfile(true)} />
    </div>
  );
}
