CREATE TABLE IF NOT EXISTS ctv_credits (
  ctv_id INTEGER PRIMARY KEY REFERENCES ctv_users(id),
  credits INTEGER NOT NULL DEFAULT 0 CHECK(credits >= 0)
);
CREATE TABLE IF NOT EXISTS ctv_credit_purchases (
  request_id TEXT PRIMARY KEY,
  ctv_id INTEGER NOT NULL REFERENCES ctv_users(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 10 AND 100),
  unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
