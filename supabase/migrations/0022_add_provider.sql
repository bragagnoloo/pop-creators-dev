-- =============================================================================
-- Gateway de pagamento — coluna `provider` (migração Kiwify → Hotmart)
-- =============================================================================
-- Aditiva e não-destrutiva: distingue a origem do registro sem renomear nada.
-- Linhas existentes recebem 'kiwify' via DEFAULT (backfill implícito).
-- O webhook Hotmart grava provider='hotmart' reusando as colunas existentes
-- (kiwify_order_id ← transaction, kiwify_subscription_id ← subscriber code).

alter table subscriptions       add column if not exists provider text default 'kiwify';
alter table payments            add column if not exists provider text default 'kiwify';
alter table subscription_events add column if not exists provider text default 'kiwify';
