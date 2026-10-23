-- AERIDE Supabase PostgreSQL schema.
-- Run this file in the Supabase SQL Editor before running the seed script.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_user (
  user_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_phone (
  user_id TEXT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  PRIMARY KEY (user_id, phone_number)
);

CREATE TABLE IF NOT EXISTS emergency_contact (
  contact_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS driver (
  driver_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL UNIQUE,
  availability_status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (availability_status IN ('ONLINE','OFFLINE','ON_TRIP')),
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS driver_phone (
  driver_id TEXT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  PRIMARY KEY (driver_id, phone_number)
);

CREATE TABLE IF NOT EXISTS vehicle (
  vehicle_id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  registration_number TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS vehicle_document (
  document_id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicle(vehicle_id) ON DELETE CASCADE,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL CHECK (expiry_date > issue_date),
  document_type TEXT NOT NULL DEFAULT 'RC',
  document_url TEXT
);

CREATE TABLE IF NOT EXISTS fare_policy (
  policy_id TEXT PRIMARY KEY,
  vehicle_type TEXT NOT NULL,
  base_fare NUMERIC(12,2) NOT NULL CHECK (base_fare >= 0),
  per_km_rate NUMERIC(12,2) NOT NULL CHECK (per_km_rate >= 0)
);

CREATE TABLE IF NOT EXISTS trip (
  trip_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  policy_id TEXT NOT NULL REFERENCES fare_policy(policy_id) ON DELETE RESTRICT,
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','ASSIGNED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED')),
  distance_km NUMERIC(10,2),
  estimated_fare NUMERIC(12,2),
  final_fare NUMERIC(12,2),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS assigned_to (
  trip_id TEXT NOT NULL REFERENCES trip(trip_id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES driver(driver_id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, driver_id)
);

CREATE TABLE IF NOT EXISTS payment (
  payment_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  driver_id TEXT REFERENCES driver(driver_id) ON DELETE SET NULL,
  trip_id TEXT NOT NULL REFERENCES trip(trip_id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CARD','UPI','CASH')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  transaction_reference TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, payment_method)
);

CREATE TABLE IF NOT EXISTS review (
  review_id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL UNIQUE REFERENCES trip(trip_id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT
);

CREATE TABLE IF NOT EXISTS auth_account (
  account_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PASSENGER','DRIVER','ADMIN')),
  user_id TEXT UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE,
  driver_id TEXT UNIQUE REFERENCES driver(driver_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auth_account_owner_check CHECK (
    (role = 'PASSENGER' AND user_id IS NOT NULL AND driver_id IS NULL)
    OR (role = 'DRIVER' AND user_id IS NULL AND driver_id IS NOT NULL)
    OR (role = 'ADMIN' AND user_id IS NULL AND driver_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS trip_event (
  event_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trip_id TEXT NOT NULL REFERENCES trip(trip_id) ON DELETE CASCADE,
  actor_id TEXT,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_user_requested_idx ON trip(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS trip_status_requested_idx ON trip(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS assigned_driver_idx ON assigned_to(driver_id, trip_id);
CREATE INDEX IF NOT EXISTS payment_status_created_idx ON payment(status, created_at DESC);
CREATE INDEX IF NOT EXISTS document_expiry_idx ON vehicle_document(expiry_date);
CREATE INDEX IF NOT EXISTS trip_event_trip_created_idx ON trip_event(trip_id, created_at DESC);

CREATE OR REPLACE FUNCTION aeride_trip_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO trip_event(event_id, trip_id, event_type, previous_status, new_status)
    VALUES (gen_random_uuid()::text, NEW.trip_id, 'STATUS_CHANGED', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_status_audit ON trip;
CREATE TRIGGER trip_status_audit
AFTER UPDATE OF status ON trip
FOR EACH ROW EXECUTE FUNCTION aeride_trip_status_audit();

CREATE OR REPLACE FUNCTION register_passenger(
  p_user_id TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE account_row auth_account%ROWTYPE;
BEGIN
  INSERT INTO app_user(user_id, first_name, last_name, email)
  VALUES (p_user_id, p_first_name, NULLIF(p_last_name, ''), lower(p_email));
  INSERT INTO user_phone(user_id, phone_number) VALUES (p_user_id, p_phone);
  INSERT INTO auth_account(email, password_hash, role, user_id)
  VALUES (lower(p_email), p_password_hash, 'PASSENGER', p_user_id)
  RETURNING * INTO account_row;
  RETURN jsonb_build_object('account_id', account_row.account_id, 'email', account_row.email, 'role', account_row.role, 'user_id', account_row.user_id);
END;
$$;

CREATE OR REPLACE FUNCTION create_trip_with_assignment(
  p_trip_id TEXT,
  p_user_id TEXT,
  p_policy_id TEXT,
  p_pickup_location TEXT,
  p_drop_location TEXT,
  p_booking_date DATE,
  p_booking_time TIME,
  p_distance_km NUMERIC,
  p_estimated_fare NUMERIC,
  p_actor_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE selected_driver TEXT;
BEGIN
  INSERT INTO trip(trip_id, user_id, policy_id, pickup_location, drop_location, booking_date, booking_time, distance_km, estimated_fare)
  VALUES (p_trip_id, p_user_id, p_policy_id, p_pickup_location, p_drop_location, p_booking_date, p_booking_time, p_distance_km, p_estimated_fare);
  INSERT INTO trip_event(trip_id, actor_id, event_type, new_status)
  VALUES (p_trip_id, p_actor_id, 'TRIP_REQUESTED', 'REQUESTED');

  SELECT d.driver_id INTO selected_driver
  FROM driver d
  WHERE d.availability_status = 'ONLINE'
    AND d.verification_status = 'VERIFIED'
    AND d.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM assigned_to a JOIN trip active_trip ON active_trip.trip_id = a.trip_id
      WHERE a.driver_id = d.driver_id AND active_trip.status IN ('ASSIGNED','ACCEPTED','IN_PROGRESS')
    )
  ORDER BY d.driver_id
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF selected_driver IS NOT NULL THEN
    INSERT INTO assigned_to(trip_id, driver_id) VALUES (p_trip_id, selected_driver);
    UPDATE trip SET status = 'ASSIGNED' WHERE trip_id = p_trip_id;
    UPDATE driver SET availability_status = 'ON_TRIP' WHERE driver_id = selected_driver;
    INSERT INTO trip_event(trip_id, actor_id, event_type, previous_status, new_status)
    VALUES (p_trip_id, p_actor_id, 'DRIVER_ASSIGNED', 'REQUESTED', 'ASSIGNED');
  END IF;
  RETURN p_trip_id;
END;
$$;

CREATE OR REPLACE FUNCTION transition_trip(
  p_trip_id TEXT,
  p_actor_id TEXT,
  p_actor_role TEXT,
  p_to_status TEXT,
  p_reason TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_trip trip%ROWTYPE;
DECLARE owns_trip BOOLEAN;
BEGIN
  SELECT * INTO current_trip FROM trip WHERE trip_id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found.'; END IF;
  SELECT p_actor_role = 'ADMIN'
    OR (p_actor_role = 'PASSENGER' AND current_trip.user_id = p_actor_id)
    OR (p_actor_role = 'DRIVER' AND EXISTS (SELECT 1 FROM assigned_to WHERE trip_id = p_trip_id AND driver_id = p_actor_id))
  INTO owns_trip;
  IF NOT owns_trip THEN RAISE EXCEPTION 'You cannot update this trip.'; END IF;

  IF NOT (
    (current_trip.status = 'REQUESTED' AND p_to_status IN ('ASSIGNED','CANCELLED')) OR
    (current_trip.status = 'ASSIGNED' AND p_to_status IN ('ACCEPTED','REQUESTED','CANCELLED')) OR
    (current_trip.status = 'ACCEPTED' AND p_to_status IN ('IN_PROGRESS','CANCELLED')) OR
    (current_trip.status = 'IN_PROGRESS' AND p_to_status IN ('COMPLETED','CANCELLED'))
  ) THEN RAISE EXCEPTION 'Cannot move % to %.', current_trip.status, p_to_status; END IF;
  IF p_actor_role = 'PASSENGER' AND p_to_status <> 'CANCELLED' THEN RAISE EXCEPTION 'Passengers can only cancel a trip.'; END IF;
  IF p_actor_role = 'DRIVER' AND p_to_status = 'CANCELLED' AND current_trip.status = 'REQUESTED' THEN RAISE EXCEPTION 'A driver cannot cancel an unassigned trip.'; END IF;

  UPDATE trip SET
    status = p_to_status,
    started_at = CASE WHEN p_to_status = 'IN_PROGRESS' THEN now() ELSE started_at END,
    completed_at = CASE WHEN p_to_status = 'COMPLETED' THEN now() ELSE completed_at END,
    cancelled_at = CASE WHEN p_to_status = 'CANCELLED' THEN now() ELSE cancelled_at END,
    cancellation_reason = CASE WHEN p_to_status = 'CANCELLED' THEN p_reason ELSE cancellation_reason END,
    final_fare = CASE WHEN p_to_status = 'COMPLETED' THEN COALESCE(final_fare, estimated_fare) ELSE final_fare END
  WHERE trip_id = p_trip_id;
  IF p_to_status IN ('COMPLETED','CANCELLED','REQUESTED') THEN
    UPDATE driver SET availability_status = 'ONLINE' WHERE driver_id IN (SELECT driver_id FROM assigned_to WHERE trip_id = p_trip_id);
  END IF;
  IF p_to_status = 'REQUESTED' THEN DELETE FROM assigned_to WHERE trip_id = p_trip_id; END IF;
  INSERT INTO trip_event(trip_id, actor_id, event_type, previous_status, new_status)
  VALUES (p_trip_id, p_actor_id, 'TRIP_' || p_to_status, current_trip.status, p_to_status);
  RETURN p_trip_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_payment(p_trip_id TEXT, p_user_id TEXT, p_payment_method TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_trip trip%ROWTYPE;
DECLARE assigned_driver TEXT;
DECLARE existing_payment TEXT;
DECLARE new_payment TEXT := 'P' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
BEGIN
  SELECT * INTO current_trip FROM trip WHERE trip_id = p_trip_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found.'; END IF;
  IF current_trip.status <> 'COMPLETED' THEN RAISE EXCEPTION 'Payment becomes available after the trip is completed.'; END IF;
  SELECT payment_id INTO existing_payment FROM payment WHERE trip_id = p_trip_id AND payment_method = p_payment_method;
  IF existing_payment IS NOT NULL THEN RETURN existing_payment; END IF;
  SELECT driver_id INTO assigned_driver FROM assigned_to WHERE trip_id = p_trip_id ORDER BY assigned_at LIMIT 1;
  INSERT INTO payment(payment_id, user_id, driver_id, trip_id, payment_date, payment_method, amount, status, transaction_reference)
  VALUES (new_payment, p_user_id, assigned_driver, p_trip_id, CURRENT_DATE, p_payment_method, COALESCE(current_trip.final_fare, current_trip.estimated_fare, 0), 'PAID', 'AER-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));
  RETURN new_payment;
END;
$$;

CREATE OR REPLACE FUNCTION run_sql_lab_query(p_query_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  CASE p_query_key
    WHEN 'passenger_history' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT u.user_id, u.first_name || ' ' || COALESCE(u.last_name, '') AS passenger, t.trip_id, t.pickup_location, t.drop_location, t.status, t.estimated_fare FROM app_user u JOIN trip t ON t.user_id = u.user_id ORDER BY t.requested_at DESC LIMIT 20) q;
    WHEN 'driver_earnings' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT d.driver_id, d.first_name || ' ' || COALESCE(d.last_name, '') AS driver, COUNT(p.payment_id) AS paid_trips, COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) AS earnings FROM driver d LEFT JOIN payment p ON p.driver_id = d.driver_id GROUP BY d.driver_id, d.first_name, d.last_name ORDER BY earnings DESC) q;
    WHEN 'most_booked_vehicle' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT v.type, v.model, COUNT(a.trip_id) AS bookings FROM vehicle v JOIN assigned_to a ON a.driver_id = v.driver_id GROUP BY v.vehicle_id, v.type, v.model ORDER BY bookings DESC LIMIT 1) q;
    WHEN 'monthly_totals' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT to_char(payment_date, 'YYYY-MM') AS month, COUNT(*) AS transactions, COALESCE(SUM(amount), 0) AS total FROM payment GROUP BY month ORDER BY month DESC) q;
    WHEN 'revenue_by_payment' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT payment_method, COUNT(*) AS transactions, COALESCE(SUM(amount), 0) AS revenue FROM payment WHERE status = 'PAID' GROUP BY payment_method ORDER BY revenue DESC) q;
    WHEN 'active_passengers' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT u.user_id, u.first_name, u.email, COUNT(t.trip_id) AS trips FROM app_user u JOIN trip t ON t.user_id = u.user_id GROUP BY u.user_id ORDER BY trips DESC LIMIT 10) q;
    WHEN 'inactive_drivers' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT d.driver_id, d.first_name, d.email FROM driver d LEFT JOIN assigned_to a ON a.driver_id = d.driver_id WHERE a.trip_id IS NULL GROUP BY d.driver_id) q;
    WHEN 'expiring_documents' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT v.registration_number, v.model, vd.document_type, vd.expiry_date FROM vehicle_document vd JOIN vehicle v ON v.vehicle_id = vd.vehicle_id WHERE vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' ORDER BY vd.expiry_date) q;
    WHEN 'average_ratings' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating, COUNT(*) AS reviews FROM review) q;
    WHEN 'cancellation_rates' THEN SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (SELECT COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled, COUNT(*) AS total, ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'CANCELLED') / NULLIF(COUNT(*), 0), 2) AS cancellation_rate FROM trip) q;
    ELSE RAISE EXCEPTION 'Unknown query.';
  END CASE;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION register_passenger(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_trip_with_assignment(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TIME,NUMERIC,NUMERIC,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION transition_trip(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_payment(TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION run_sql_lab_query(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_passenger(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_trip_with_assignment(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TIME,NUMERIC,NUMERIC,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION transition_trip(TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_payment(TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION run_sql_lab_query(TEXT) TO service_role;
