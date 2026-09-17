import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function GET() {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.role === "ADMIN") {
    const [users, drivers, trips, revenue, active, pendingDocs, monthly] = await Promise.all([
      db.appUser.count(), db.driver.count(), db.trip.count(), db.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }), db.trip.count({ where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] } } }), db.vehicleDocument.count({ where: { expiryDate: { lte: new Date(Date.now() + 30 * 86400000) } } }),
      db.payment.findMany({ where: { status: "PAID" }, select: { amount: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]); const grouped = new Map<string, number>(); for (const row of monthly) { const key = row.createdAt.toLocaleString("en-US", { month: "short" }); grouped.set(key, (grouped.get(key) ?? 0) + row.amount); } return NextResponse.json({ users, drivers, trips, revenue: revenue._sum.amount?.toString() ?? "0", active, pendingDocs, monthly: Array.from(grouped.entries()).slice(0, 6).map(([month, total]) => ({ month, total: total.toString() })) });
  }
  const where = session.role === "PASSENGER" ? { userId: session.userId } : { assignments: { some: { driverId: session.driverId } } };
  const [trips, total] = await Promise.all([db.trip.findMany({ where, orderBy: { requestedAt: "desc" }, take: 4, include: { assignments: { include: { driver: true } }, policy: true } }), db.trip.count({ where })]);
  return NextResponse.json({ trips: trips.map((trip) => ({ ...trip, distanceKm: trip.distanceKm, estimatedFare: trip.estimatedFare, finalFare: trip.finalFare, requestedAt: trip.requestedAt.toISOString() })), total });
}
