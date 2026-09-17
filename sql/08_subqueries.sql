-- Scalar and correlated subqueries.
SELECT * FROM trip WHERE estimated_fare > (SELECT AVG(estimated_fare) FROM trip);
SELECT u.* FROM app_user u WHERE EXISTS (SELECT 1 FROM trip t WHERE t.user_id=u.user_id AND t.status='COMPLETED');
