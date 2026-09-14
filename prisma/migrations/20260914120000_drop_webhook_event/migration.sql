-- The gateway is PayU now, and it is reconciled by hash rather than by a
-- replayed event id, so nothing writes this table any more. Idempotency
-- lives in applyPayuResponse, which simply finds the order already paid.
DROP TABLE IF EXISTS "WebhookEvent";
