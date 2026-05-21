import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ orderId: null });

  const admin = createAdminClient();
  const { data } = await admin
    .from('payments')
    .select('kiwify_order_id')
    .eq('user_id', user.id)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ orderId: data?.kiwify_order_id ?? null });
}
