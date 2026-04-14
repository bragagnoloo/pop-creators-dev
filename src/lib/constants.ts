export const STORAGE_KEYS = {
  USERS: 'popline_users',
  PROFILES: 'popline_profiles',
  CAMPAIGNS: 'popline_campaigns',
  APPLICATIONS: 'popline_applications',
  LESSONS: 'popline_lessons',
  CREDITS: 'popline_credits',
  WITHDRAWALS: 'popline_withdrawals',
  SCRIPTS: 'popline_scripts',
  DELIVERIES: 'popline_deliveries',
  WATCHED_LESSONS: 'popline_watched_lessons',
  LESSON_RATINGS: 'popline_lesson_ratings',
  LESSON_COMMENTS: 'popline_lesson_comments',
  SUBSCRIPTIONS: 'popline_subscriptions',
  SESSION: 'popline_session',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  CAMPANHAS: '/dashboard/campanhas',
  AULAS: '/dashboard/aulas',
  ROTEIROS: '/dashboard/roteiros',
  CARTEIRA: '/dashboard/carteira',
  RANKING: '/dashboard/ranking',
  PLANOS: '/dashboard/planos',
  BENEFICIOS: '/dashboard/beneficios',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_CAMPAIGNS: '/admin/campaigns',
  ADMIN_CANDIDATURAS: '/admin/candidaturas',
  ADMIN_AULAS: '/admin/aulas',
  ADMIN_SAQUES: '/admin/saques',
} as const;

export const ADMIN_SEED = {
  email: 'admin@popline.com.br',
  password: 'admin123',
} as const;
