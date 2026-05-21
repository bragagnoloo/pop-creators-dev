-- Adiciona campo para armazenar o User-Agent do navegador do usuário
-- Capturado em /api/tracking/meta-params durante o checkout e usado
-- no envio CAPI (Meta Conversions API) para elevar o Event Match Quality.

alter table profiles
  add column if not exists meta_user_agent text;
