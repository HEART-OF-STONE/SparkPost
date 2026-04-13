CREATE TABLE IF NOT EXISTS daily_check_ins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  check_in_date TEXT NOT NULL,
  reward_credits INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_id_created_at
  ON daily_check_ins (user_id, created_at);
