-- SQLite trigger equivalent for audit. SQLite has no stored procedure language;
-- the guarded completion procedure is implemented in the server transaction API.
CREATE TRIGGER IF NOT EXISTS aeride_trip_status_audit AFTER UPDATE OF status ON trip WHEN OLD.status IS NOT NEW.status BEGIN INSERT INTO trip_event(event_id,trip_id,event_type,previous_status,new_status) VALUES ('AUTO-' || hex(randomblob(8)),NEW.trip_id,'STATUS_CHANGED',OLD.status,NEW.status); END;
