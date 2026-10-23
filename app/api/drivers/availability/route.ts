import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { availabilitySchema } from "@/lib/validators";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";
export async function POST(request: Request) {
  const session = await getSession(); if (!session?.driverId) return NextResponse.json({ error: "Driver sign in required." }, { status: 401 });
  const parsed = availabilitySchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("driver").update({ availability_status: parsed.data.status }).eq("driver_id", session.driverId).select("availability_status").single();
  if (error) return NextResponse.json({ error: supabaseErrorMessage(error, "Could not update availability.") }, { status: 400 });
  return NextResponse.json({ status: data.availability_status });
}
