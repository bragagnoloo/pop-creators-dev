import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { isDateISO } from '@/lib/date-br';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FINANCE_STATUS = ['em_aberto', 'finalizada'] as const;
const PAYMENT_STATUS = ['pendente', 'parcial', 'pago'] as const;

const MAX_MONEY = 99_999_999.99;

class ValidationError extends Error {}

function parseText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new ValidationError(`${label} inválido.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new ValidationError(`${label} deve ter no máximo ${max} caracteres.`);
  }
  return trimmed;
}

function parseMoney(value: unknown, label: string, nullable: boolean): number | null {
  if (value === null || value === undefined || value === '') {
    return nullable ? null : 0;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new ValidationError(`${label} inválido.`);
  if (n < 0) throw new ValidationError(`${label} não pode ser negativo.`);
  if (n > MAX_MONEY) throw new ValidationError(`${label} excede o limite permitido.`);
  return Math.round(n * 100) / 100;
}

function parseDate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !isDateISO(value)) {
    throw new ValidationError(`${label} deve ser uma data válida (AAAA-MM-DD).`);
  }
  return value;
}

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${label} inválido.`);
  }
  return value as T;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { campaignId } = await params;
  if (!UUID_RE.test(campaignId)) {
    return NextResponse.json({ error: 'Campanha inválida.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  // Whitelist chave a chave: nunca espalhar o body do cliente na tabela.
  const patch: Record<string, unknown> = {};
  try {
    if ('payingCompany' in body) {
      patch.paying_company = parseText(body.payingCompany, 160, 'Empresa');
    }
    if ('agreedValue' in body) {
      patch.agreed_value = parseMoney(body.agreedValue, 'Valor acordado', true);
    }
    if ('contractedCreators' in body) {
      const raw = body.contractedCreators;
      if (raw === null || raw === undefined || raw === '') {
        patch.contracted_creators = null;
      } else {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > 100_000) {
          throw new ValidationError('Creators contratados deve ser um número inteiro válido.');
        }
        patch.contracted_creators = n;
      }
    }
    if ('agreedPaymentDueDate' in body) {
      patch.agreed_payment_due_date = parseDate(
        body.agreedPaymentDueDate,
        'Prazo de pagamento'
      );
    }
    if ('companyPaymentEstimate' in body) {
      patch.company_payment_estimate = parseDate(
        body.companyPaymentEstimate,
        'Estimativa de pagamento'
      );
    }
    if ('companyPaymentStatus' in body) {
      patch.company_payment_status = parseEnum(
        body.companyPaymentStatus,
        PAYMENT_STATUS,
        'Status de pagamento'
      );
    }
    if ('companyPaidValue' in body) {
      patch.company_paid_value = parseMoney(body.companyPaidValue, 'Valor pago', false);
    }
    if ('taxRate' in body) {
      const raw = body.taxRate;
      if (raw === null || raw === undefined || raw === '') {
        patch.tax_rate = 0;
      } else {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          throw new ValidationError('Imposto deve estar entre 0 e 100.');
        }
        patch.tax_rate = Math.round(n * 100) / 100;
      }
    }
    if ('closedAtOverride' in body) {
      patch.closed_at_override = parseDate(body.closedAtOverride, 'Data de encerramento');
    }
    if ('financeStatus' in body) {
      patch.finance_status = parseEnum(
        body.financeStatus,
        FINANCE_STATUS,
        'Status financeiro'
      );
    }
    if ('notes' in body) {
      patch.notes = parseText(body.notes, 2000, 'Observações');
    }
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : 'Dados inválidos.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Confere antes: sem isso, uma campanha inexistente vira erro de FK 500.
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }

  const { error: upsertError } = await supabase
    .from('campaign_finance')
    .upsert(
      { campaign_id: campaignId, ...patch, updated_by: guard.userId },
      { onConflict: 'campaign_id' }
    );

  if (upsertError) {
    console.error('[admin/b2b PATCH] upsert error', upsertError.message);
    return NextResponse.json({ error: 'Erro ao salvar os dados.' }, { status: 500 });
  }

  // Devolve a linha já recalculada pela view, para o cliente atualizar o cache
  // local sem refazer a busca da lista inteira.
  const { data: row, error: readError } = await supabase
    .from('b2b_finance_overview')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (readError || !row) {
    console.error('[admin/b2b PATCH] read-back error', readError?.message);
    return NextResponse.json(
      { error: 'Salvo, mas houve erro ao recarregar a linha. Atualize a página.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: row });
}
