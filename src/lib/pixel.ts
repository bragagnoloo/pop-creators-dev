declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

// Inicializa o pixel com dados do usuário autenticado para Advanced Matching.
// Chamado no dashboard layout após carregar o profile.
// Melhora o EMQ de ViewContent e InitiateCheckout disparados no nosso domínio.
export function initPixelWithUser(user: {
  email: string;
  whatsapp?: string;
  fullName?: string;
  state?: string;
  city?: string;
  cep?: string;
}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;

  const names = (user.fullName ?? '').trim().split(' ').filter(Boolean);
  const userData: Record<string, string> = {
    em: user.email.toLowerCase(),
  };
  if (user.whatsapp) userData.ph = user.whatsapp.replace(/\D/g, '');
  if (names[0]) userData.fn = names[0].toLowerCase();
  if (names.length > 1) userData.ln = names[names.length - 1].toLowerCase();
  if (user.city) userData.ct = user.city.toLowerCase();
  if (user.state) userData.st = user.state.toLowerCase();
  if (user.cep) userData.zp = user.cep.replace(/\D/g, '');

  window.fbq('init', pixelId, userData);
}

export function pixelPageView() {
  fbq('track', 'PageView');
}

export function pixelViewContent(data?: Record<string, unknown>) {
  fbq('track', 'ViewContent', data);
}

export function pixelLead(data?: Record<string, unknown>) {
  fbq('track', 'Lead', data);
}

export function pixelCompleteRegistration(data?: Record<string, unknown>) {
  fbq('track', 'CompleteRegistration', data);
}

export function pixelInitiateCheckout(data?: Record<string, unknown>) {
  fbq('track', 'InitiateCheckout', data);
}

export function pixelPurchase(data: Record<string, unknown>) {
  fbq('track', 'Purchase', data);
}

export function pixelAddPaymentInfo() {
  fbq('track', 'AddPaymentInfo');
}

export function pixelCustom(event: string, data?: Record<string, unknown>) {
  fbq('trackCustom', event, data);
}
