import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: { paymentId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: payment } = await getSupabaseAdmin().from("payment").select("*, trip:trip(*), user:app_user(*)").eq("payment_id", params.paymentId).maybeSingle();
  if (!payment || (session.role === "PASSENGER" && payment.user_id !== session.userId)) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const body = [`AERIDE / PAYMENT RECEIPT`, `Receipt: ${payment.payment_id}`, `Passenger: ${payment.user.first_name} ${payment.user.last_name ?? ""}`, `Trip: ${payment.trip_id}`, `Route: ${payment.trip.pickup_location} -> ${payment.trip.drop_location}`, `Method: ${payment.payment_method}`, `Amount: ₹${Number(payment.amount).toFixed(2)}`, `Reference: ${payment.transaction_reference ?? "—"}`].join("\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${payment.payment_id}-receipt.txt"` } });
}
