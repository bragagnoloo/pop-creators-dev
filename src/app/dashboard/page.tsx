'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import * as userService from '@/services/users';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import ProfileBlock from '@/components/dashboard/ProfileBlock';
import ProfileEditModal from '@/components/dashboard/ProfileEditModal';
import CampaignList from '@/components/dashboard/CampaignList';
import MyCampaigns from '@/components/dashboard/MyCampaigns';

export default function DashboardPage() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: profile, mutate: mutateProfile } = useSWR(
    user ? ['profile', user.id] : null,
    ([, uid]) => userService.getProfile(uid)
  );

  useEffect(() => {
    if (profile && !profile.onboardingComplete) setShowOnboarding(true);
  }, [profile]);

  if (!user || !profile) return null;

  return (
    <div className="space-y-8">
      {showOnboarding && (
        <OnboardingModal
          userId={user.id}
          onComplete={() => {
            setShowOnboarding(false);
            mutateProfile();
          }}
        />
      )}

      {showEditProfile && (
        <ProfileEditModal
          profile={profile}
          onSave={async (data) => {
            await userService.updateProfile(user.id, data);
            mutateProfile();
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
