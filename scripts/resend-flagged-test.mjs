// Reenvio one-off do email withdrawal-flagged para o teste órfão de 03/07/2026.
// HTML inline (não usa o template React) para evitar problemas de import ESM.
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br';

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Precisamos revisar seu último saque</title></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111118;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <p style="margin:0 0 8px;font-size:12px;color:#9999aa;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Carteira · Conformidade</p>
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#111118;line-height:1.3;">Precisamos revisar seu último saque</h1>

    <p style="margin:0 0 20px;font-size:15px;color:#444455;line-height:1.7;">
      Olá, Alessandra. Identificamos uma possível divergência nos dados do seu último pedido de saque,
      então ele foi <strong>interrompido temporariamente</strong> para revisão de conformidade.
      Seu saldo foi devolvido integralmente para "Disponível" na sua carteira.
    </p>

    <div style="background:#fdf0f7;border:1px solid #f5c6e0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#c2185b;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Valor devolvido para disponível</p>
      <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#111118;">R$ 100,00</p>
      <p style="margin:0;font-size:13px;color:#888899;">Motivo: Teste Teste</p>
    </div>

    <div style="margin:0 0 20px;padding:16px 20px;background:#fff8e6;border:1px solid #f5d97a;border-radius:8px;font-size:14px;color:#5a4515;line-height:1.6;">
      <strong>Por que isso acontece?</strong> Por segurança e obrigação legal, a chave PIX cadastrada
      precisa ser da <strong>sua própria conta bancária</strong>, com o mesmo nome do assinante
      da POPline Creators. Saques com dados divergentes são interrompidos.
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#444455;line-height:1.7;">
      <strong>O que fazer:</strong> confira sua chave PIX e o nome do titular no painel. Se estiver
      tudo certo, é só solicitar o saque novamente e vamos processar em até 48h úteis. Se precisar
      corrigir, atualize os dados antes.
    </p>

    <a href="https://poplinecreators.com.br/dashboard/carteira" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;background:linear-gradient(135deg,#c2185b,#e91e8c);border-radius:8px;text-decoration:none;">
      Revisar minha chave PIX →
    </a>

    <hr style="margin:32px 0 16px;border:none;border-top:1px solid #eeeef2;" />
    <p style="margin:0;font-size:12px;color:#9999aa;">POPline Creators · Este é um reenvio manual do teste do dia 03/07.</p>
  </div>
</body></html>`;

const { data, error } = await resend.emails.send({
  from: `POPline Creators <${FROM}>`,
  to: 'rodrigobragagnolo04@gmail.com',
  subject: 'Precisamos revisar seu último saque',
  html,
});

if (error) {
  console.error('Erro:', error);
  process.exit(1);
}
console.log('Enviado:', data);
