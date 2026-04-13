ALTER TABLE credit_transactions ADD COLUMN source_type TEXT;
ALTER TABLE credit_transactions ADD COLUMN expires_at TEXT;
ALTER TABLE credit_transactions ADD COLUMN remaining_amount INTEGER;
ALTER TABLE credit_transactions ADD COLUMN package_code TEXT;
ALTER TABLE credit_transactions ADD COLUMN payment_provider TEXT;
ALTER TABLE credit_transactions ADD COLUMN payment_session_id TEXT;

UPDATE credit_transactions
SET source_type = CASE
  WHEN type = 'signup_bonus' THEN 'signup'
  WHEN type = 'daily_check_in' THEN 'check_in'
  WHEN type = 'topup' THEN 'topup'
  WHEN type IN ('text_to_image', 'image_to_image') THEN 'generation'
  ELSE 'system'
END
WHERE source_type IS NULL;

UPDATE credit_transactions
SET remaining_amount = CASE
  WHEN amount > 0 THEN amount
  ELSE NULL
END
WHERE remaining_amount IS NULL;

UPDATE credit_transactions
SET expires_at = datetime(created_at, '+7 days')
WHERE type = 'daily_check_in' AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_expires_at
  ON credit_transactions (user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_source_type_created_at
  ON credit_transactions (user_id, source_type, created_at);
