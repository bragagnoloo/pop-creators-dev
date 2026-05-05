import { createHash } from 'crypto';

const ENDPOINT = `https://graph.facebook.com/v18.0/${process.env.META_PIXEL_ID}/events`;

export function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export interface CAPIUserData {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  external_id?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

export interface CAPICustomData {
  currency: 'BRL';
  value: number;
  content_name: string;
  content_ids: string[];
  content_type: 'product';
  order_id?: string;
}

export interface CAPIEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: 'website';
  user_data: CAPIUserData;
  custom_data?: CAPICustomData;
}

export async function sendCAPIEvents(events: CAPIEvent[]): Promise<void> {
  if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_TOKEN) return;

  const payload: Record<string, unknown> = { data: events };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(`${ENDPOINT}?access_token=${process.env.META_CAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[meta-capi] erro:', err);
    }
  } catch (err) {
    console.error('[meta-capi] falha no envio:', err);
  }
}
