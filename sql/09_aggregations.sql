-- PostgreSQL GROUP BY, HAVING, FILTER, and conditional aggregation.
SELECT status, COUNT(*) AS trips, ROUND(AVG(distance_km),2) AS avg_distance FROM trip GROUP BY status ORDER BY trips DESC;
SELECT to_char(requested_at, 'YYYY-MM') AS month, COUNT(*) FILTER (WHERE status='COMPLETED') AS completed, COUNT(*) FILTER (WHERE status='CANCELLED') AS cancelled FROM trip GROUP BY month;
