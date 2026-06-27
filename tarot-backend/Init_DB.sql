-- SQLite
-- SELECT id, user_id, type, credits, balance_after, reference_type, reference_id, description, created_at
-- FROM credit_transactions;
DELETE FROM credit_transactions;
DELETE FROM dimension;
DELETE FROM email_verifications;
DELETE FROM users;
DELETE FROM user_balance;
DELETE FROM purchases;
DELETE FROM redeem_codes;