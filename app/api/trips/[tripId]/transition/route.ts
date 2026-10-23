import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";
import { getTripById } from "@/lib/supabase-data";
import { transitionSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid transition." }, { status: 400 });
  try {
    const { error } = await getSupabaseAdmin().rpc("transition_trip", {
      p_trip_id: params.tripId,
      p_actor_id: session.userId ?? session.driverId ?? session.accountId,
      p_actor_role: session.role,
      p_to_status: parsed.data.to,
      p_reason: parsed.data.reason ?? null,
    });
    if (error) throw error;
    const trip = await getTripById(params.tripId);
    return NextResponse.json({ trip });
  } catch (error) {
    return NextResponse.json({ error: supabaseErrorMessage(error, "Transition failed.") }, { status: 400 });
  }
}
