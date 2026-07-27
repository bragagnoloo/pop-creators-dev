export type UserRole = 'creator' | 'admin' | 'campaign_admin';

export type AdminTab = 'assinaturas' | 'users' | 'ranking';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  extraTabs: AdminTab[];
}

export interface AdminCampaignAssignment {
  adminId: string;
  campaignId: string;
  assignedAt: string;
  assignedBy: string | null;
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
  pixHolderName: string | null;
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
  // Campanha Convite (migration 0026): oculta dos usuários; entrada só via admin.
  // Definido na criação e imutável depois.
  isInvite: boolean;
  // Campanha Review (migration 0030): pública como a tradicional, mas categoria
  // POPline Creators Review — aba própria + borda roxa. Imutável após a criação.
  isReview: boolean;
  // Stages (migration 0015)
  currentStage?: CampaignStage;
  whatsappGroupLink?: string | null;
  briefingFileUrl?: string | null;
  stageHistory?: StageHistoryEntry[];
  stageUpdatedAt?: string;
}

export type CampaignStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StageHistoryEntry =
  | {
      action: 'completed';
      stage: number;
      at: string;
      by: string;
      note: string | null;
    }
  | {
      action: 'reverted';
      from_stage: number;
      to_stage: number;
      at: string;
      by: string;
      reason: string;
    };

export type StageTemporalStatus = 'on_track' | 'overdue' | 'extended' | 'done';

export interface CampaignStageScheduleEntry {
  stage: CampaignStage;
  dueDate: string;
  originalDueDate: string;
  extendedAt: string | null;
  extendedReason: string | null;
  completedAt: string | null;
  status: StageTemporalStatus;
}

export interface StageBlocker {
  code: string;
  message: string;
  count?: number;
}

export interface StageReadiness {
  currentStage: CampaignStage;
  nextStage: CampaignStage | null;
  ready: boolean;
  blockers: StageBlocker[];
  schedule: CampaignStageScheduleEntry[];
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

export type DeliverableStatus = 'pending' | 'approved' | 'needs_revision';
export type PublicationStatus = 'pending' | 'confirmed' | 'not_confirmed' | 'needs_resubmit';

export interface PublicationRevision {
  id: string;
  deliveryId: string;
  round: number;
  note: string | null;
  dueDate: string;
  revisedUrls: Record<string, string>;
  revisedAt: string | null;
  approvedAt: string | null;
  requestedAt: string;
  requestedBy: string | null;
}

export interface DeliveryRevision {
  id: string;
  deliveryId: string;
  round: number;
  note: string;
  dueDate: string;
  revisedUrl: string | null;
  revisedAt: string | null;
  approvedAt: string | null;
  requestedAt: string;
  requestedBy: string | null;
}

export interface CampaignDelivery {
  id: string;
  campaignId: string;
  userId: string;
  index: number;
  scheduledDate: string | null;
  contentUrl: string | null;
  // Stages (migration 0015)
  deliverableStatus?: DeliverableStatus;
  revisionNote?: string | null;
  revisionDueDate?: string | null;
  publicationUrl?: string | null;
  publicationUrls?: Record<string, string>;
  publicationStatus?: PublicationStatus;
  publicationDate?: string | null;
  publicationPlatform?: string | null;
  publicationPlatforms?: string[];
  publicationCaption?: string | null;
  publicationDueDate?: string | null;
  publicationConfirmedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
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
  pixHolderName: string | null;
  profileNameSnapshot: string | null;
  status: 'requested' | 'paid' | 'flagged';
  createdAt: string;
  paidAt: string | null;
  flaggedAt: string | null;
  flagReason: string | null;
  consumedCredits: { creditId: string; amount: number }[];
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  userId: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  // Stages (migration 0015)
  joinedWhatsappGroup?: boolean;
  joinedAt?: string | null;
  disqualifiedAt?: string | null;
  disqualificationReason?: string | null;
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

export type WorkshopStatus = 'available' | 'coming_soon';

export interface Workshop {
  id: string;
  title: string;
  expert: string | null;
  description: string;
  thumbnailUrl: string | null;
  position: number;
  createdAt: string;
  status: WorkshopStatus;
}

export interface WorkshopWithLessons extends Workshop {
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  workshopId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  position: number;
  createdAt: string;
}

export interface LessonRating {
  userId: string;
  lessonId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
}

// ---- #CriarSemTigrinho ----

export type OppCategory = 'freelance' | 'agencias' | 'plataformas' | 'marcas' | 'ugc' | 'afiliados';

export interface Opportunity {
  id: string;
  name: string;
  categories: OppCategory[];
  logoUrl: string | null;
  shortDesc: string;
  fullDesc: string;
  url: string;
  position: number;
  published: boolean;
  createdAt: string;
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
  assignedBy: 'system' | 'admin' | 'payment';
  kiwifySubscriptionId: string | null;
  paymentMethod: 'pix' | 'credit_card' | null;
}

export interface Payment {
  id: string;
  userId: string;
  kiwifyOrderId: string;
  plan: PlanId;
  amount: number;
  status: string;
  paymentMethod: string | null;
  capiEventId: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

export interface SubscriptionEvent {
  id: string;
  userId: string | null;
  eventType: string;
  kiwifyOrderId: string | null;
  plan: PlanId | null;
  amount: number | null;
  paymentMethod: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

export type AuthResult = {
  success: true;
  user: AuthUser;
} | {
  success: false;
  error: string;
};

export type RankingEntry = {
  rank: number;
  userId: string;
  fullName: string;
  photoUrl: string | null;
  plan: PlanId;
  totalPoints: number;
};

export type UserRankingStats = {
  monthlyRank: number | null;
  monthlyPoints: number;
  alltimeRank: number | null;
  alltimePoints: number;
  fullName: string;
  photoUrl: string | null;
  plan: PlanId;
};
