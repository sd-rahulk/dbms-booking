-- GROUP BY, HAVING, FILTER-equivalent conditional aggregation.
SELECT status, COUNT(*) AS trips, ROUND(AVG(distance_km),2) AS avg_distance FROM trip GROUP BY status ORDER BY trips DESC;
SELECT strftime('%Y-%m', requested_at) AS month, SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled FROM trip GROUP BY month;
