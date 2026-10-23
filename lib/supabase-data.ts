import { getSupabaseAdmin } from "./supabase";

export function mapDriver(row: any) {
  if (!row) return null;
  return {
    driverId: row.driver_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    availabilityStatus: row.availability_status,
    verificationStatus: row.verification_status,
    isActive: row.is_active,
  };
}

export function mapPolicy(row: any) {
  if (!row) return null;
  return { policyId: row.policy_id, vehicleType: row.vehicle_type, baseFare: row.base_fare, perKmRate: row.per_km_rate };
}

export function mapPayment(row: any) {
  if (!row) return null;
  return {
    paymentId: row.payment_id,
    userId: row.user_id,
    driverId: row.driver_id,
    tripId: row.trip_id,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    amount: row.amount,
    status: row.status,
    transactionReference: row.transaction_reference,
    createdAt: row.created_at,
  };
}

export function mapTrip(row: any) {
  return {
    tripId: row.trip_id,
    userId: row.user_id,
    policyId: row.policy_id,
    pickupLocation: row.pickup_location,
    dropLocation: row.drop_location,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    status: row.status,
    distanceKm: row.distance_km,
    estimatedFare: row.estimated_fare,
    finalFare: row.final_fare,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    policy: mapPolicy(row.policy),
    assignments: (row.assignments ?? []).map((assignment: any) => ({
      tripId: assignment.trip_id,
      driverId: assignment.driver_id,
      assignedAt: assignment.assigned_at,
      driver: mapDriver(assignment.driver),
    })),
    payments: (row.payments ?? []).map(mapPayment),
    reviews: row.reviews ?? [],
  };
}

export async function getTripById(tripId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("trip")
    .select("*, policy:fare_policy(*), assignments:assigned_to(*, driver:driver(*)), payments:payment(*), reviews:review(*)")
    .eq("trip_id", tripId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTrip(data) : null;
}

export async function getTripsForSession(session: { role: string; userId?: string; driverId?: string }) {
  const client = getSupabaseAdmin();
  let query = client
    .from("trip")
    .select("*, policy:fare_policy(*), assignments:assigned_to(*, driver:driver(*)), payments:payment(*), reviews:review(*)")
    .order("requested_at", { ascending: false })
    .limit(40);

  if (session.role === "PASSENGER") query = query.eq("user_id", session.userId ?? "");
  if (session.role === "DRIVER") {
    const { data: assignments, error: assignmentError } = await client.from("assigned_to").select("trip_id").eq("driver_id", session.driverId ?? "");
    if (assignmentError) throw assignmentError;
    const tripIds = (assignments ?? []).map((assignment) => assignment.trip_id);
    if (!tripIds.length) return [];
    query = query.in("trip_id", tripIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapTrip);
}

export async function getDriverOrUserName(session: { role: string; userId?: string; driverId?: string }) {
  const client = getSupabaseAdmin();
  if (session.role === "PASSENGER" && session.userId) {
    const { data } = await client.from("app_user").select("first_name,last_name").eq("user_id", session.userId).maybeSingle();
    return data ? `${data.first_name} ${data.last_name ?? ""}`.trim() : null;
  }
  if (session.role === "DRIVER" && session.driverId) {
    const { data } = await client.from("driver").select("first_name,last_name").eq("driver_id", session.driverId).maybeSingle();
    return data ? `${data.first_name} ${data.last_name ?? ""}`.trim() : null;
  }
  return null;
}
