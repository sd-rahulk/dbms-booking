import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// This is an allow-list, not user-provided SQL. The browser can select only these keys.
const queries: Record<string, string> = {
  passenger_history: `SELECT u.user_id, u.first_name || ' ' || COALESCE(u.last_name,'') AS passenger, t.trip_id, t.pickup_location, t.drop_location, t.status, t.estimated_fare FROM app_user u JOIN trip t ON t.user_id=u.user_id ORDER BY t.requested_at DESC LIMIT 20`,
  driver_earnings: `SELECT d.driver_id, d.first_name || ' ' || COALESCE(d.last_name,'') AS driver, COUNT(p.payment_id) AS paid_trips, COALESCE(SUM(CASE WHEN p.status='PAID' THEN p.amount ELSE 0 END),0) AS earnings FROM driver d LEFT JOIN payment p ON p.driver_id=d.driver_id GROUP BY d.driver_id, d.first_name, d.last_name ORDER BY earnings DESC`,
  most_booked_vehicle: `SELECT v.type, v.model, COUNT(a.trip_id) AS bookings FROM vehicle v JOIN assigned_to a ON a.driver_id=v.driver_id GROUP BY v.vehicle_id, v.type, v.model ORDER BY bookings DESC LIMIT 1`,
  monthly_totals: `SELECT strftime('%Y-%m', payment_date) AS month, COUNT(*) AS transactions, COALESCE(SUM(amount),0) AS total FROM payment GROUP BY month ORDER BY month DESC`,
  revenue_by_payment: `SELECT payment_method, COUNT(*) AS transactions, COALESCE(SUM(amount),0) AS revenue FROM payment WHERE status='PAID' GROUP BY payment_method ORDER BY revenue DESC`,
  active_passengers: `SELECT u.user_id, u.first_name, u.email, COUNT(t.trip_id) AS trips FROM app_user u JOIN trip t ON t.user_id=u.user_id GROUP BY u.user_id ORDER BY trips DESC LIMIT 10`,
  inactive_drivers: `SELECT d.driver_id, d.first_name, d.email FROM driver d LEFT JOIN assigned_to a ON a.driver_id=d.driver_id WHERE a.trip_id IS NULL GROUP BY d.driver_id`,
  expiring_documents: `SELECT v.registration_number, v.model, vd.document_type, vd.expiry_date FROM vehicle_document vd JOIN vehicle v ON v.vehicle_id=vd.vehicle_id WHERE date(vd.expiry_date) <= date('now','+30 day') ORDER BY vd.expiry_date`,
  average_ratings: `SELECT ROUND(AVG(rating),2) AS average_rating, COUNT(*) AS reviews FROM review`,
  cancellation_rates: `SELECT SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled, COUNT(*) AS total, ROUND(100.0 * SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0),2) AS cancellation_rate FROM trip`,
};

export async function GET(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const key = new URL(request.url).searchParams.get("key") || "passenger_history";
  const sql = queries[key];
  if (!sql) return NextResponse.json({ error: "Unknown query." }, { status: 400 });
  const rows = await db.$queryRawUnsafe(sql);
  return NextResponse.json({ key, rows });
}
