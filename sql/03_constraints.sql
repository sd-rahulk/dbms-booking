-- SQLite domain constraints that are easiest to express as indexes/triggers.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_registration ON vehicle(registration_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_reference ON payment(transaction_reference);
CREATE TRIGGER IF NOT EXISTS vehicle_document_dates_ck BEFORE INSERT ON vehicle_document WHEN NEW.expiry_date <= NEW.issue_date BEGIN SELECT RAISE(ABORT, 'expiry_date must be after issue_date'); END;
