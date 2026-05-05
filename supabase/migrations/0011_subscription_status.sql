-- =============================================================================
-- Subscription Status — coluna explícita como fonte única de verdade
-- =============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free';

-- Backfill dados existentes
UPDATE subscriptions SET subscription_status =
  CASE
    WHEN plan = 'free'                                       THEN 'free'
    WHEN plan != 'free'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()                              THEN 'active'
    -- status='active' mas expirado é calculado em query time (expires_at < now)
    WHEN plan != 'free'                                      THEN 'active'
    ELSE 'free'
  END;

-- Nota: 'refunded' e 'chargeback' serão setados pelo webhook a partir de agora.
-- Dados históricos anteriores a esta migration não possuem esses status.
-- 'expired' não é armazenado — derivado em query time: status='active' AND expires_at < now.
