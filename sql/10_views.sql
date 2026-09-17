-- Read-only analytics views.
CREATE VIEW IF NOT EXISTS v_trip_summary AS SELECT t.trip_id, u.first_name || ' ' || COALESCE(u.last_name,'') AS passenger, t.pickup_location, t.drop_location, t.status, t.estimated_fare, t.final_fare FROM trip t JOIN app_user u ON u.user_id=t.user_id;
CREATE VIEW IF NOT EXISTS v_driver_earnings AS SELECT d.driver_id, d.first_name || ' ' || COALESCE(d.last_name,'') AS driver, COALESCE(SUM(CASE WHEN p.status='PAID' THEN p.amount ELSE 0 END),0) AS earnings FROM driver d LEFT JOIN payment p ON p.driver_id=d.driver_id GROUP BY d.driver_id, d.first_name, d.last_name;
