import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";

const allowedQueries = new Set([
  "passenger_history", "driver_earnings", "most_booked_vehicle", "monthly_totals", "revenue_by_payment",
  "active_passengers", "inactive_drivers", "expiring_documents", "average_ratings", "cancellation_rates",
]);

export async function GET(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const key = new URL(request.url).searchParams.get("key") || "passenger_history";
  if (!allowedQueries.has(key)) return NextResponse.json({ error: "Unknown query." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc("run_sql_lab_query", { p_query_key: key });
  if (error) return NextResponse.json({ error: supabaseErrorMessage(error, "The selected Supabase query could not be executed.") }, { status: 500 });
  return NextResponse.json({ key, rows: Array.isArray(data) ? data : [] });
}
