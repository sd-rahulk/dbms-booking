import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateFare, resolveRouteDistance } from "@/lib/fare";
import { getSession } from "@/lib/auth";
import { bookingSchema } from "@/lib/validators";

function serialiseTrip(trip: any) {
  return { ...trip, distanceKm: trip.distanceKm ?? null, estimatedFare: trip.estimatedFare ?? null, finalFare: trip.finalFare ?? null, bookingDate: trip.bookingDate?.toISOString(), bookingTime: trip.bookingTime?.toISOString(), requestedAt: trip.requestedAt?.toISOString(), startedAt: trip.startedAt?.toISOString() ?? null, completedAt: trip.completedAt?.toISOString() ?? null };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const where = session.role === "PASSENGER" ? { userId: session.userId } : session.role === "DRIVER" ? { assignments: { some: { driverId: session.driverId } } } : {};
  const trips = await db.trip.findMany({ where, include: { policy: true, assignments: { include: { driver: true } }, payments: true, reviews: true }, orderBy: { requestedAt: "desc" }, take: 40 });
  return NextResponse.json({ trips: trips.map(serialiseTrip) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "PASSENGER" || !session.userId) return NextResponse.json({ error: "Passenger sign in required." }, { status: 401 });
  const parsed = bookingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Add pickup, destination, and vehicle type." }, { status: 400 });
  const { pickupLocation, dropLocation, vehicleType } = parsed.data;
  try {
    const trip = await db.$transaction(async (tx) => {
      const policy = await tx.farePolicy.findFirst({ where: { vehicleType }, orderBy: { policyId: "asc" } });
      if (!policy) throw new Error("No fare policy for that vehicle type.");
      const distanceKm = await resolveRouteDistance(pickupLocation, dropLocation);
      const estimatedFare = calculateFare(policy.baseFare, policy.perKmRate, distanceKm);
      const created = await tx.trip.create({ data: { tripId: `T${Date.now().toString().slice(-8)}`, userId: session.userId!, policyId: policy.policyId, pickupLocation, dropLocation, bookingDate: new Date(), bookingTime: new Date(), distanceKm, estimatedFare, status: "REQUESTED" } });
      await tx.tripEvent.create({ data: { tripId: created.tripId, actorId: session.userId, eventType: "TRIP_REQUESTED", newStatus: "REQUESTED" } });
      // SQLite serializes write transactions, providing a database-level lock for this critical section.
      const driver = await tx.driver.findFirst({ where: { availabilityStatus: "ONLINE", verificationStatus: "VERIFIED", isActive: true, assignments: { none: { trip: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] } } } } }, orderBy: { driverId: "asc" } });
      if (driver) {
        await tx.assignment.create({ data: { tripId: created.tripId, driverId: driver.driverId } });
        await tx.trip.update({ where: { tripId: created.tripId }, data: { status: "ASSIGNED" } });
        await tx.driver.update({ where: { driverId: driver.driverId }, data: { availabilityStatus: "ON_TRIP" } });
        await tx.tripEvent.create({ data: { tripId: created.tripId, actorId: session.userId, eventType: "DRIVER_ASSIGNED", previousStatus: "REQUESTED", newStatus: "ASSIGNED" } });
      }
      return tx.trip.findUniqueOrThrow({ where: { tripId: created.tripId }, include: { policy: true, assignments: { include: { driver: true } } } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ trip: serialiseTrip(trip) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Booking failed." }, { status: 400 });
  }
}
