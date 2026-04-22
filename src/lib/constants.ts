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

export const CURRENT_TERM_VERSION = 'v1';

export const CAMPAIGN_TERM_TEXT = `📄 Termo Universal de Autorização de Uso de Imagem e Conteúdo – Popline Creators

Ao se candidatar e/ou participar de campanhas por meio da plataforma Popline Creators, a criadora declara estar ciente e de acordo com os seguintes termos:

1. Propriedade e Uso do Conteúdo
Todo conteúdo enviado, publicado ou compartilhado nas campanhas da Popline Creators — incluindo, mas não se limitando a vídeos, fotos, áudios, textos, depoimentos e demais materiais audiovisuais — será considerado Conteúdo da Criadora.
Ao disponibilizar esse conteúdo, a criadora concede à Popline Creators e às marcas associadas às campanhas o direito de uso gratuito, irrevogável e por tempo indeterminado de sua imagem, voz e materiais produzidos, para fins de divulgação institucional, promocional e publicitária, em qualquer formato ou mídia, incluindo, mas não se limitando a:

• Websites institucionais e de marcas;
• Redes sociais (Instagram, TikTok, YouTube, Facebook, Pinterest e similares);
• Materiais impressos e digitais;
• Newsletters e e-mails de comunicação;
• Publicações e campanhas de marketing;
• Apresentações, catálogos e demais canais oficiais da Popline Creators e das marcas parceiras.

2. Autorização de Uso de Imagem e Voz
Ao participar das campanhas, a criadora autoriza expressamente a Popline Creators e as marcas envolvidas a utilizar sua imagem, voz e quaisquer direitos conexos aos conteúdos produzidos, de forma total ou parcial, para fins de divulgação, publicidade e ações institucionais.
Essa autorização é gratuita, válida em todo o território nacional e no exterior, e abrange adaptações, edições ou montagens que preservem a integridade e o propósito do conteúdo original.

3. Responsabilidade da Criadora
A criadora declara que:

• É titular legítima dos conteúdos enviados e que estes não violam direitos de terceiros;
• Está ciente de que o material poderá ser repostado, editado ou adaptado pela Popline Creators e pelas marcas, sem necessidade de nova autorização;
• Não fará qualquer reivindicação, solicitação de remuneração ou ação judicial futura em relação ao uso autorizado neste termo.

Caso o conteúdo inclua a imagem de terceiros, a criadora declara que possui autorização expressa dessas pessoas para o uso conforme disposto neste documento.

4. Proteção de Dados
A Popline Creators assegura que o tratamento dos dados pessoais fornecidos pela criadora seguirá as disposições da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), sendo utilizados exclusivamente para fins operacionais e administrativos relacionados às campanhas.

5. Vigência
Esta autorização tem validade por tempo indeterminado, abrangendo todas as campanhas e parcerias realizadas através da Popline Creators, sem necessidade de novo consentimento a cada candidatura.

📍 Declaro que li, compreendi e concordo com os termos acima, autorizando o uso da minha imagem, voz e conteúdo conforme disposto neste documento.`;
