import { NextRequest, NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const guard = await requireTabAccess('ranking');
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = req.nextUrl;
  const scope = searchParams.get('scope') === 'monthly' ? 'monthly' : 'alltime';
  const year  = searchParams.get('year');
  const month = searchParams.get('month');
  const state = searchParams.get('state');
  const city  = searchParams.get('city');
  const limit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') ?? '5000')));

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_admin_ranking', {
    p_scope: scope,
    p_year:  year  ? parseInt(year)  : null,
    p_month: month ? parseInt(month) : null,
    p_state: state || null,
    p_city:  city  || null,
    p_limit: limit,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}
