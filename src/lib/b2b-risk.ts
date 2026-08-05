import type { B2BFinanceRow, B2BRiskAssessment, B2BRiskBand } from '@/types';
import { diffDaysFromTodayBR } from '@/lib/date-br';

/**
 * Termômetro de risco financeiro de uma campanha.
 *
 * Puro de propósito: sem React e sem I/O, para poder ser ajustado sem migration
 * e testado isoladamente. Os insumos vêm prontos da view b2b_finance_overview
 * (já calculados no fuso de Brasília); aqui só há a ponderação.
 *
 * Cinco eixos independentes, somados e limitados a 0..100. Os pesos NÃO somam
 * 100 de propósito: cada um é calibrado pela gravidade isolada do problema, de
 * modo que um problema grave sozinho já cai na faixa certa e combinações
 * escalam para Alto/Crítico.
 *
 *   35 — proximidade/estouro do prazo de pagamento aos creators
 *   35 — cachê devido que ainda não virou saldo liberado na carteira
 *   30 — campanha aberta há tempo demais sem ser concluída
 *   20 — atraso no pagamento da empresa, proporcional ao que falta receber
 *   10 — campanha encerrada há muito tempo e ainda "em aberto" no financeiro
 */

const BAND_LABELS: Record<B2BRiskBand, string> = {
  baixo: 'Baixo',
  atencao: 'Atenção',
  alto: 'Alto',
  critico: 'Crítico',
};

export function riskBandLabel(band: B2BRiskBand): string {
  return BAND_LABELS[band];
}

function bandFor(score: number): B2BRiskBand {
  if (score >= 75) return 'critico';
  if (score >= 50) return 'alto';
  if (score >= 25) return 'atencao';
  return 'baixo';
}

/**
 * Quanto de cachê a plataforma ainda precisa liberar para os creators:
 * o que falta creditar mais o que já foi creditado mas segue em processamento.
 *
 * Zero aqui significa que o POPline cumpriu a obrigação por inteiro. O saldo
 * que sobra em `walletTotal` já está disponível na carteira — sacar ou não é
 * decisão do creator, não atraso da plataforma. Por isso o prazo dos creators
 * deixa de ser alerta quando este valor zera, mesmo com a data vencida.
 */
export function pendingToRelease(row: B2BFinanceRow): number {
  return Math.max(row.totalDueCreators - row.creditedTotal, 0) + row.processingTotal;
}

/**
 * Há quantos dias a campanha está aberta. `null` quando já foi concluída —
 * aí o tempo de vida deixa de ser um problema.
 */
export function daysOpenWithoutClosing(row: B2BFinanceRow): number | null {
  if (row.campaignStatus === 'completed') return null;
  const diff = diffDaysFromTodayBR(row.openedOn);
  return diff === null ? null : Math.max(-diff, 0);
}

/**
 * Limite a partir do qual uma campanha aberta começa a pontuar risco.
 *
 * Calibrado pelo histórico real da plataforma: as campanhas já concluídas
 * fecharam entre 12 e 43 dias (mediana ~19). 45 dias é, portanto, "pior que o
 * pior caso já observado" — antes disso não faz sentido alarmar.
 */
export const CAMPAIGN_STALE_DAYS = 45;

export function assessRisk(row: B2BFinanceRow): B2BRiskAssessment {
  const reasons: string[] = [];
  let score = 0;

  // --- 1. Prazo de pagamento aos creators (encerramento + 60 dias) ---------
  // Só é risco enquanto ainda falta liberar cachê. Campanha com tudo creditado
  // e liberado não gera alerta por mais antiga que seja — senão toda campanha
  // encerrada há mais de 60 dias ficaria permanentemente em "Atenção".
  const pendente = pendingToRelease(row);
  const d = row.daysToCreatorDeadline;
  if (d !== null && pendente > 0) {
    if (d < 0) {
      score += 35;
      reasons.push(`Prazo de pagamento aos creators vencido há ${Math.abs(d)} dia(s)`);
    } else if (d <= 7) {
      score += 28;
      reasons.push(`Faltam ${d} dia(s) para o prazo dos creators`);
    } else if (d <= 15) {
      score += 21;
      reasons.push(`Faltam ${d} dias para o prazo dos creators`);
    } else if (d <= 30) {
      score += 10;
      reasons.push(`Prazo dos creators em ${d} dias`);
    }
  }

  // --- 2. Pagamento da empresa --------------------------------------------
  // Quitado de verdade (status pago E nada em aberto) não gera risco nenhum.
  const quitado = row.companyPaymentStatus === 'pago' && row.companyOutstanding === 0;
  if (!quitado) {
    // Fração ainda não recebida: um contrato 90% pago pesa 10% do que pesaria
    // se nada tivesse entrado.
    const aberto =
      row.agreedValue && row.agreedValue > 0
        ? Math.min(Math.max(row.companyOutstanding / row.agreedValue, 0), 1)
        : 1;

    // Considera o prazo mais estourado entre o contratual e a estimativa.
    const prazos = [row.daysToAgreedDue, row.daysToCompanyEstimate].filter(
      (v): v is number => v !== null
    );
    const e = prazos.length > 0 ? Math.min(...prazos) : null;

    let base = 0;
    if (e === null) {
      if ((row.agreedValue ?? 0) > 0) {
        base = 8;
        reasons.push('Sem previsão de pagamento da empresa');
      }
    } else if (e < -30) {
      base = 20;
      reasons.push(`Pagamento da empresa atrasado há ${Math.abs(e)} dias`);
    } else if (e < 0) {
      base = 14;
      reasons.push(`Pagamento da empresa vencido há ${Math.abs(e)} dia(s)`);
    } else if (e <= 7) {
      base = 6;
      reasons.push(`Pagamento da empresa vence em ${e} dia(s)`);
    }

    score += base * aberto;
  }

  // --- 3. Cachê devido que ainda não chegou na carteira do creator ---------
  // Cobre os dois buracos: cachê nunca creditado (campanha concluída e ninguém
  // recebeu nada) e cachê creditado mas travado em "processando".
  //
  // creditedTotal pode superar totalDueCreators (o crédito sobrevive a uma
  // desclassificação posterior), por isso o max: a razão nunca passa de 1.
  const owed = Math.max(row.creditedTotal, row.totalDueCreators);
  if (owed > 0 && pendente > 0) {
    const p = Math.min(pendente / owed, 1);
    const concluida = row.campaignStatus === 'completed';
    // Campanha em andamento pesa bem menos: antes do encerramento é normal o
    // saldo ainda não ter sido gerado.
    const peso = concluida ? 1 : 0.35;
    score += 35 * p * peso;

    if (concluida && row.creditedTotal === 0) {
      reasons.push(
        `Campanha concluída e nenhum cachê gerado — ${row.eligibleParticipants} aptos aguardando`
      );
    } else if (row.pendingToGenerate > 0) {
      reasons.push(`Falta gerar saldo de ${Math.round(p * 100)}% do cachê devido`);
    } else {
      reasons.push(
        `${Math.round(p * 100)}% do cachê ainda em processamento (não liberado na carteira)`
      );
    }
  }

  // --- 4. Campanha aberta há tempo demais sem ser concluída ----------------
  // Campanha que não fecha trava tudo que vem depois: o cachê não é gerado, o
  // prazo dos creators nem começa a contar e a cobrança da empresa fica em
  // aberto por tempo indeterminado.
  const diasAberta = daysOpenWithoutClosing(row);
  if (diasAberta !== null && diasAberta > CAMPAIGN_STALE_DAYS) {
    if (diasAberta > 150) score += 30;
    else if (diasAberta > 90) score += 25;
    else score += 12;

    reasons.push(
      `Aberta há ${diasAberta} dias sem ser concluída (etapa ${row.currentStage} de 8)`
    );
  }

  // --- 5. Estagnação financeira -------------------------------------------
  if (row.financeStatus === 'em_aberto' && row.daysSinceClosed !== null) {
    if (row.daysSinceClosed > 60) {
      score += 10;
      reasons.push(`Encerrada há ${row.daysSinceClosed} dias e ainda em aberto`);
    } else if (row.daysSinceClosed > 30) {
      score += 5;
      reasons.push(`Encerrada há ${row.daysSinceClosed} dias e ainda em aberto`);
    }
  }

  const final = Math.round(Math.min(Math.max(score, 0), 100));
  if (reasons.length === 0) reasons.push('Sem alertas financeiros');

  return { score: final, band: bandFor(final), reasons };
}
