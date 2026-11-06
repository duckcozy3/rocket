-- NULL preserves unrestricted eligibility for existing promo codes.
ALTER TABLE promo_codes ADD COLUMN plan_types TEXT;
ALTER TABLE spotify_promo_codes ADD COLUMN plan_types TEXT;
