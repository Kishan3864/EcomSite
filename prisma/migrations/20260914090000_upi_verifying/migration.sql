-- A UPI payment the customer has reported but nobody has checked against the
-- bank yet. Distinct from PENDING (nothing reported) and PAID (money seen).
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'VERIFYING' BEFORE 'PAID';
