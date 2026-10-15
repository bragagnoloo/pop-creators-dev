import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import {
  UUID_RE,
  ValidationError,
  parseText,
  parseMoney,
  parseDate,
  parseEnum,
} from '@/lib/b2b-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FINANCE_STATUS = ['em_aberto', 'finalizada'] as const;
const PAYMENT_STATUS = ['pendente', 'parcial', 'pago'] as const;
const PAYMENT_ROUTE = ['popline', 'direto', 'interna'] as const;
const TAX_FREE_LABEL: Record<string, string> = {
  direto: 'Pagamento direto no POPline Creators não tem imposto.',
  interna: 'Campanha do POPline não tem imposto.',
};

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
    if ('packageId' in body) {
      const raw = body.packageId;
      if (raw === null || raw === undefined || raw === '') {
        patch.package_id = null;
      } else if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
        throw new ValidationError('Pacote inválido.');
      } else {
        patch.package_id = raw;
      }
    }
    if ('paymentRoute' in body) {
      patch.payment_route = parseEnum(body.paymentRoute, PAYMENT_ROUTE, 'Recebimento');
    }
    if ('nfIssuedAt' in body) {
      patch.nf_issued_at = parseDate(body.nfIssuedAt, 'Emissão da NF');
    }
    if ('repasseDueDate' in body) {
      patch.repasse_due_date = parseDate(body.repasseDueDate, 'Data limite do repasse');
    }
    if ('repasseDoneAt' in body) {
      patch.repasse_done_at = parseDate(body.repasseDoneAt, 'Data efetiva do repasse');
    }
    if ('complementsCampaignId' in body) {
      const raw = body.complementsCampaignId;
      if (raw === null || raw === undefined || raw === '') {
        patch.complements_campaign_id = null;
      } else if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
        throw new ValidationError('Campanha original inválida.');
      } else if (raw === campaignId) {
        throw new ValidationError('Uma campanha não pode complementar a si mesma.');
      } else {
        patch.complements_campaign_id = raw;
      }
    }
    if ('repasseTransferred' in body) {
      if (typeof body.repasseTransferred !== 'boolean') {
        throw new ValidationError('Status do repasse inválido.');
      }
      patch.repasse_transferred = body.repasseTransferred;
    }
    if ('companyLastPaymentAt' in body) {
      patch.company_last_payment_at = parseDate(
        body.companyLastPaymentAt,
        'Data do pagamento realizado'
      );
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

  if (typeof patch.package_id === 'string') {
    const { data: pkg } = await supabase
      .from('b2b_packages')
      .select('id')
      .eq('id', patch.package_id)
      .maybeSingle();
    if (!pkg) {
      return NextResponse.json({ error: 'Pacote não encontrado.' }, { status: 404 });
    }
  }

  if (typeof patch.complements_campaign_id === 'string') {
    const { data: original } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', patch.complements_campaign_id)
      .maybeSingle();
    if (!original) {
      return NextResponse.json({ error: 'Campanha original não encontrada.' }, { status: 404 });
    }
  }

  // Direto no PC e campanha do POPline não pagam imposto. A constraint
  // campaign_finance_rota_sem_imposto garante no banco; aqui vira mensagem clara.
  const route = patch.payment_route as string | undefined;
  if (route && route !== 'popline') {
    if (typeof patch.tax_rate === 'number' && patch.tax_rate > 0) {
      return NextResponse.json({ error: TAX_FREE_LABEL[route] }, { status: 400 });
    }
    patch.tax_rate = 0;
  } else if (route === undefined && typeof patch.tax_rate === 'number' && patch.tax_rate > 0) {
    const { data: current } = await supabase
      .from('campaign_finance')
      .select('payment_route')
      .eq('campaign_id', campaignId)
      .maybeSingle();
    if (current && current.payment_route !== 'popline') {
      return NextResponse.json(
        {
          error: `${TAX_FREE_LABEL[current.payment_route]} Mude o recebimento para "Via POPline" antes.`,
        },
        { status: 400 }
      );
    }
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
