-- PostgreSQL trigger equivalent for audit. Full transaction functions are in supabase/schema.sql.
CREATE OR REPLACE FUNCTION academic_trip_status_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO trip_event(event_id,trip_id,event_type,previous_status,new_status) VALUES (gen_random_uuid()::text,NEW.trip_id,'STATUS_CHANGED',OLD.status,NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_trip_status_audit ON trip;
CREATE TRIGGER academic_trip_status_audit AFTER UPDATE OF status ON trip FOR EACH ROW EXECUTE FUNCTION academic_trip_status_audit();
