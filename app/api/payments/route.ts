import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";
import { mapPayment } from "@/lib/supabase-data";
import { paymentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Passenger sign in required." }, { status: 401 });
  const body = await request.json();
  const tripId = String(body.tripId || "");
  const parsed = paymentSchema.safeParse({ method: body.method });
  if (!tripId || !parsed.success) return NextResponse.json({ error: "Trip and payment method are required." }, { status: 400 });
  try {
    const { data: paymentId, error } = await getSupabaseAdmin().rpc("create_payment", {
      p_trip_id: tripId,
      p_user_id: session.userId,
      p_payment_method: parsed.data.method,
    });
    if (error) throw error;
    const { data: payment, error: paymentError } = await getSupabaseAdmin().from("payment").select("*").eq("payment_id", paymentId).single();
    if (paymentError) throw paymentError;
    return NextResponse.json({ payment: mapPayment(payment) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: supabaseErrorMessage(error, "Payment failed.") }, { status: 400 });
  }
}
