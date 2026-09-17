import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
export async function GET(_: Request, { params }: { params: { paymentId: string } }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const payment = await db.payment.findUnique({ where: { paymentId: params.paymentId }, include: { trip: true, user: true } });
  if (!payment || (session.role === "PASSENGER" && payment.userId !== session.userId)) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const body = [`AERIDE / PAYMENT RECEIPT`, `Receipt: ${payment.paymentId}`, `Passenger: ${payment.user.firstName} ${payment.user.lastName ?? ""}`, `Trip: ${payment.tripId}`, `Route: ${payment.trip.pickupLocation} -> ${payment.trip.dropLocation}`, `Method: ${payment.paymentMethod}`, `Amount: ₹${payment.amount.toFixed(2)}`, `Reference: ${payment.transactionReference ?? "—"}`].join("\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${payment.paymentId}-receipt.txt"` } });
}
