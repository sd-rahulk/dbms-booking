-- AERIDE / SQLite core schema. Original academic names are retained in comments.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS app_user (user_id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT, email TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS user_phone (user_id TEXT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE, phone_number TEXT NOT NULL, PRIMARY KEY (user_id, phone_number));
CREATE TABLE IF NOT EXISTS emergency_contact (contact_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE, name TEXT NOT NULL, phone_number TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS driver (driver_id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT, email TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS driver_phone (driver_id TEXT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE, phone_number TEXT NOT NULL, PRIMARY KEY (driver_id, phone_number));
CREATE TABLE IF NOT EXISTS vehicle (vehicle_id TEXT PRIMARY KEY, driver_id TEXT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE, type TEXT NOT NULL, model TEXT NOT NULL, capacity INTEGER NOT NULL CHECK (capacity > 0));
CREATE TABLE IF NOT EXISTS vehicle_document (document_id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL REFERENCES vehicle(vehicle_id) ON DELETE CASCADE, issue_date TEXT NOT NULL, expiry_date TEXT NOT NULL CHECK (expiry_date > issue_date));
CREATE TABLE IF NOT EXISTS fare_policy (policy_id TEXT PRIMARY KEY, vehicle_type TEXT NOT NULL, base_fare REAL NOT NULL CHECK (base_fare >= 0), per_km_rate REAL NOT NULL CHECK (per_km_rate >= 0));
CREATE TABLE IF NOT EXISTS trip (trip_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES app_user(user_id), policy_id TEXT NOT NULL REFERENCES fare_policy(policy_id), pickup_location TEXT NOT NULL, drop_location TEXT NOT NULL, booking_date TEXT NOT NULL, booking_time TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assigned_to (trip_id TEXT NOT NULL REFERENCES trip(trip_id) ON DELETE CASCADE, driver_id TEXT NOT NULL REFERENCES driver(driver_id), assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (trip_id, driver_id));
CREATE TABLE IF NOT EXISTS payment (payment_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES app_user(user_id), driver_id TEXT REFERENCES driver(driver_id), trip_id TEXT NOT NULL REFERENCES trip(trip_id), payment_date TEXT NOT NULL, payment_method TEXT NOT NULL, amount REAL NOT NULL CHECK (amount >= 0));
CREATE TABLE IF NOT EXISTS review (review_id TEXT PRIMARY KEY, trip_id TEXT NOT NULL UNIQUE REFERENCES trip(trip_id) ON DELETE CASCADE, rating INTEGER CHECK (rating BETWEEN 1 AND 5), comment TEXT);
