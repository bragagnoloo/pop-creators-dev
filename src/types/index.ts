export interface AuthUser {
  id: string;
  email: string;
  role: 'creator' | 'admin';
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  photoUrl: string | null;
  bio: string;
  instagram: string;
  instagramFollowers: string;
  tiktok: string;
  tiktokFollowers: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  address: string;
  onboardingComplete: boolean;
  pixKey: string | null;
  pixKeyType: PixKeyType | null;
}

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  deadline: string | null;
  imageUrl: string | null;
  briefing: string | null;
  cache: number;
  deliveryCount: number;
  createdAt: string;
  hasCache: boolean;
  hasPermuta: boolean;
  permutaDescription: string | null;
  hasCommission: boolean;
  commissionPercentage: number | null;
  commissionDescription: string | null;
}

export interface CampaignNotice {
  id: string;
  campaignId: string;
  authorId: string;
  content: string;
  isGeneral: boolean;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  recipients?: string[];
  readCount?: number;
}

export interface CampaignNoticeCounts {
  read: number;
  unread: number;
}

export interface CampaignTermAcceptance {
  id: string;
  userId: string;
  campaignId: string;
  termVersion: string;
  acceptedAt: string;
}

export interface CampaignDelivery {
  id: string;
  campaignId: string;
  userId: string;
  index: number;
  scheduledDate: string | null;
  contentUrl: string | null;
}

export interface BalanceCredit {
  id: string;
  userId: string;
  campaignId: string;
  amount: number;
  status: 'processing' | 'available' | 'withdrawn';
  createdAt: string;
  releasedAt: string | null;
  consumedAmount: number;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  status: 'requested' | 'paid';
  createdAt: string;
  paidAt: string | null;
  consumedCredits: { creditId: string; amount: number }[];
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  userId: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SavedScript {
  id: string;
  userId: string;
  title: string;
  inputs: {
    mode: 'ugc' | 'personal';
    product?: string;
    format?: string;
    briefing: string;
    platform: string;
    duration: number;
    objective: string;
    tone: string;
    notes?: string;
  };
  variation: {
    title: string;
    beats: { label: string; time: string; content: string }[];
    caption: string;
    hashtags: string[];
  };
  refinementLevel: number;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  youtubeUrl: string;
  createdAt: string;
}

export interface LessonRating {
  userId: string;
  lessonId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
}

export interface LessonComment {
  id: string;
  lessonId: string;
  userId: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  createdAt: string;
}

export type PlanId = 'free' | 'monthly' | 'semester' | 'yearly';

export interface Subscription {
  userId: string;
  plan: PlanId;
  startedAt: string;
  expiresAt: string | null;
  assignedBy: 'system' | 'admin';
}

export type AuthResult = {
  success: true;
  user: AuthUser;
} | {
  success: false;
  error: string;
};
