-- Required query showcase, SQLite syntax.
SELECT u.user_id, t.trip_id, t.pickup_location, t.drop_location, t.status FROM app_user u JOIN trip t ON t.user_id=u.user_id WHERE u.user_id='U001' ORDER BY t.requested_at DESC;
SELECT d.driver_id, COALESCE(SUM(CASE WHEN p.status='PAID' THEN p.amount ELSE 0 END),0) AS earnings FROM driver d LEFT JOIN payment p ON p.driver_id=d.driver_id GROUP BY d.driver_id;
SELECT v.type, v.model, COUNT(a.trip_id) AS bookings FROM vehicle v JOIN assigned_to a ON a.driver_id=v.driver_id GROUP BY v.vehicle_id ORDER BY bookings DESC LIMIT 1;
SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS total FROM payment GROUP BY month ORDER BY month;
SELECT payment_method, SUM(amount) AS revenue FROM payment WHERE status='PAID' GROUP BY payment_method;
SELECT user_id, COUNT(*) AS trips FROM trip GROUP BY user_id HAVING trips >= 2;
SELECT d.* FROM driver d LEFT JOIN assigned_to a ON a.driver_id=d.driver_id WHERE a.trip_id IS NULL;
SELECT * FROM vehicle_document WHERE date(expiry_date) <= date('now','+30 day');
SELECT AVG(rating) AS average_rating FROM review;
SELECT 100.0 * SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0) AS cancellation_rate FROM trip;
