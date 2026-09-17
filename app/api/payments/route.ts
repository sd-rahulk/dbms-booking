import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { paymentSchema } from "@/lib/validators";
export async function POST(request: Request) {
  const session = await getSession(); if (!session?.userId) return NextResponse.json({ error: "Passenger sign in required." }, { status: 401 });
  const body = await request.json(); const tripId = String(body.tripId || ""); const parsed = paymentSchema.safeParse({ method: body.method });
  if (!tripId || !parsed.success) return NextResponse.json({ error: "Trip and payment method are required." }, { status: 400 });
  try {
    const payment = await db.$transaction(async (tx) => {
      const trip = await tx.trip.findFirst({ where: { tripId, userId: session.userId }, include: { assignments: true } }); if (!trip) throw new Error("Trip not found.");
      if (trip.status !== "COMPLETED") throw new Error("Payment becomes available after the trip is completed.");
      const existing = await tx.payment.findUnique({ where: { tripId_paymentMethod: { tripId, paymentMethod: parsed.data.method } } }); if (existing) return existing;
      return tx.payment.create({ data: { paymentId: `P${Date.now().toString().slice(-8)}`, userId: session.userId!, driverId: trip.assignments[0]?.driverId, tripId, paymentDate: new Date(), paymentMethod: parsed.data.method, amount: trip.finalFare ?? trip.estimatedFare ?? 0, status: "PAID", transactionReference: `AER-${Date.now().toString(36).toUpperCase()}` } });
    });
    return NextResponse.json({ payment: { ...payment, amount: payment.amount.toString(), createdAt: payment.createdAt.toISOString() } }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Payment failed." }, { status: 400 }); }
}
