-- =============================================================================
-- Kiwify Payments Integration
-- =============================================================================

-- Remove campo Asaas se migration anterior foi rodada
ALTER TABLE profiles DROP COLUMN IF EXISTS asaas_customer_id;

-- Kiwify tracking + Meta CAPI
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kiwify_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_fbp                TEXT,
  ADD COLUMN IF NOT EXISTS meta_fbc                TEXT,
  ADD COLUMN IF NOT EXISTS first_subscribed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_utm_source        TEXT,
  ADD COLUMN IF NOT EXISTS first_utm_campaign      TEXT;

-- Subscription metadata
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS kiwify_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method         TEXT;

-- =============================================================================
-- payments — registra cada cobrança confirmada
-- =============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kiwify_order_id  TEXT          NOT NULL UNIQUE,
  plan             plan_id       NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'CONFIRMED',
  payment_method   TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  client_ip        TEXT,
  capi_event_id    TEXT,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  utm_content      TEXT,
  utm_term         TEXT,
  kiwify_src       TEXT,
  kiwify_sck       TEXT
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: user reads own"
  ON payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- =============================================================================
-- subscription_events — log de todos os eventos Kiwify (analytics + auditoria)
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  event_type             TEXT        NOT NULL,
  kiwify_order_id        TEXT,
  kiwify_subscription_id TEXT,
  plan                   plan_id,
  amount                 NUMERIC(10,2),
  payment_method         TEXT,
  utm_source             TEXT,
  utm_medium             TEXT,
  utm_campaign           TEXT,
  utm_content            TEXT,
  utm_term               TEXT,
  kiwify_src             TEXT,
  kiwify_sck             TEXT,
  raw_payload            JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_events: admin reads"
  ON subscription_events FOR SELECT TO authenticated
  USING (is_admin());

-- 'payment' como fonte de assinatura
ALTER TYPE subscription_source ADD VALUE IF NOT EXISTS 'payment';
