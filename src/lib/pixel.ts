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
