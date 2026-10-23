-- PostgreSQL domain constraints and indexes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_registration ON vehicle(registration_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_reference ON payment(transaction_reference);
ALTER TABLE payment DROP CONSTRAINT IF EXISTS payment_method_check;
ALTER TABLE payment ADD CONSTRAINT payment_method_check CHECK (payment_method IN ('CARD','UPI','CASH'));
ALTER TABLE vehicle_document DROP CONSTRAINT IF EXISTS vehicle_document_dates_check;
ALTER TABLE vehicle_document ADD CONSTRAINT vehicle_document_dates_check CHECK (expiry_date > issue_date);
