-- Inner and outer joins.
SELECT t.trip_id, u.first_name AS passenger, d.first_name AS driver, v.model FROM trip t JOIN app_user u ON u.user_id=t.user_id LEFT JOIN assigned_to a ON a.trip_id=t.trip_id LEFT JOIN driver d ON d.driver_id=a.driver_id LEFT JOIN vehicle v ON v.driver_id=d.driver_id;
SELECT d.driver_id, d.first_name, COUNT(a.trip_id) AS assignments FROM driver d LEFT JOIN assigned_to a ON a.driver_id=d.driver_id GROUP BY d.driver_id, d.first_name;
