CREATE TABLE IF NOT EXISTS ctv_topups (
  code TEXT PRIMARY KEY,
  ctv_id INTEGER NOT NULL REFERENCES ctv_users(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  unit_price INTEGER NOT NULL CHECK(unit_price > 0),
  credits INTEGER NOT NULL CHECK(credits > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_ref TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);
