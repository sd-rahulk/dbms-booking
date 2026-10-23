import { NextResponse } from "next/server";
import { calculateFare, resolveRouteDistance } from "@/lib/fare";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";
import { getTripById, getTripsForSession } from "@/lib/supabase-data";
import { bookingSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    return NextResponse.json({ trips: await getTripsForSession(session) });
  } catch (error) {
    return NextResponse.json({ error: supabaseErrorMessage(error, "Could not load trips.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "PASSENGER" || !session.userId) return NextResponse.json({ error: "Passenger sign in required." }, { status: 401 });
  const parsed = bookingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Add pickup, destination, and vehicle type." }, { status: 400 });
  const { pickupLocation, dropLocation, vehicleType } = parsed.data;
  try {
    const client = getSupabaseAdmin();
    const { data: policy, error: policyError } = await client.from("fare_policy").select("policy_id,base_fare,per_km_rate").eq("vehicle_type", vehicleType).order("policy_id").limit(1).maybeSingle();
    if (policyError) throw policyError;
    if (!policy) throw new Error("No fare policy for that vehicle type.");
    const distanceKm = await resolveRouteDistance(pickupLocation, dropLocation);
    const estimatedFare = calculateFare(policy.base_fare, policy.per_km_rate, distanceKm);
    const tripId = `T${Date.now().toString().slice(-8)}`;
    const now = new Date();
    const { error } = await client.rpc("create_trip_with_assignment", {
      p_trip_id: tripId,
      p_user_id: session.userId,
      p_policy_id: policy.policy_id,
      p_pickup_location: pickupLocation,
      p_drop_location: dropLocation,
      p_booking_date: now.toISOString().slice(0, 10),
      p_booking_time: now.toISOString().slice(11, 19),
      p_distance_km: distanceKm,
      p_estimated_fare: estimatedFare,
      p_actor_id: session.userId,
    });
    if (error) throw error;
    const trip = await getTripById(tripId);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: supabaseErrorMessage(error, "Booking failed.") }, { status: 400 });
  }
}
