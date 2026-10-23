import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";
import { getTripsForSession } from "@/lib/supabase-data";

async function count(table: string, filters: (query: any) => any = (query) => query) {
  const query = filters(getSupabaseAdmin().from(table).select("*", { count: "exact", head: true }));
  const { count: result, error } = await query;
  if (error) throw error;
  return result ?? 0;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const client = getSupabaseAdmin();
    if (session.role === "ADMIN") {
      const [users, drivers, trips, paidRows, active, pendingDocs, monthly] = await Promise.all([
        count("app_user"), count("driver"), count("trip"),
        client.from("payment").select("amount,created_at").eq("status", "PAID").order("created_at", { ascending: false }).limit(100),
        count("trip", (query) => query.in("status", ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])),
        count("vehicle_document", (query) => query.lte("expiry_date", new Date(Date.now() + 30 * 86400000).toISOString())),
        client.from("payment").select("amount,created_at").eq("status", "PAID").order("created_at", { ascending: false }).limit(100),
      ]);
      if (paidRows.error || monthly.error) throw paidRows.error ?? monthly.error;
      const revenue = (paidRows.data ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);
      const grouped = new Map<string, number>();
      for (const row of monthly.data ?? []) {
        const key = new Date(row.created_at).toLocaleString("en-US", { month: "short" });
        grouped.set(key, (grouped.get(key) ?? 0) + Number(row.amount ?? 0));
      }
      return NextResponse.json({ users, drivers, trips, revenue: revenue.toFixed(2), active, pendingDocs, monthly: Array.from(grouped.entries()).slice(0, 6).map(([month, total]) => ({ month, total: total.toFixed(2) })) });
    }
    const tripRows = await getTripsForSession(session);
    let totalQuery = client.from("trip").select("*", { count: "exact", head: true });
    if (session.role === "PASSENGER") totalQuery = totalQuery.eq("user_id", session.userId ?? "");
    else {
      const { data: assignments, error } = await client.from("assigned_to").select("trip_id").eq("driver_id", session.driverId ?? "");
      if (error) throw error;
      const tripIds = (assignments ?? []).map((row) => row.trip_id);
      if (!tripIds.length) return NextResponse.json({ trips: [], total: 0 });
      totalQuery = totalQuery.in("trip_id", tripIds);
    }
    const { count: total, error } = await totalQuery;
    if (error) throw error;
    return NextResponse.json({ trips: tripRows.slice(0, 4), total: total ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: supabaseErrorMessage(error, "Could not load the workspace.") }, { status: 500 });
  }
}
