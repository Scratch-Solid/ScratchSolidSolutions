-- Fixes a real production bug found via static code audit (2026-07-19,
-- no live schema access available): migration 009 created loyalty_points/
-- loyalty_transactions/referrals with columns that never actually matched
-- what src/app/api/loyalty/route.ts and src/app/api/referrals/route.ts
-- write to. Every loyalty-point award and referral-code generation call
-- has been throwing "no such column" since 009 first ran - same class of
-- silent-until-exercised bug as the original 021 gap.

ALTER TABLE loyalty_transactions ADD COLUMN transaction_type TEXT;
ALTER TABLE loyalty_transactions ADD COLUMN description TEXT;
ALTER TABLE loyalty_transactions ADD COLUMN booking_id INTEGER;

ALTER TABLE loyalty_points ADD COLUMN earned_at DATETIME;
ALTER TABLE loyalty_points ADD COLUMN expires_at DATETIME;

ALTER TABLE referrals ADD COLUMN expires_at DATETIME;
