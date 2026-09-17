-- SQLite access paths supporting the operational workload.
CREATE INDEX IF NOT EXISTS idx_trip_user_requested ON trip(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_status_requested ON trip(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_driver ON assigned_to(driver_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_date ON payment(status, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_document_expiry ON vehicle_document(expiry_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_registration_unique ON vehicle(registration_number);
