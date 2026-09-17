import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canTransition, type TripStatus } from "@/lib/state-machine";
import { transitionSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid transition." }, { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { tripId: params.tripId }, include: { assignments: true } });
      if (!trip) throw new Error("Trip not found.");
      const owns = session.role === "ADMIN" || trip.userId === session.userId || trip.assignments.some((a) => a.driverId === session.driverId);
      if (!owns) throw new Error("You cannot update this trip.");
      const next = parsed.data.to as TripStatus;
      if (!canTransition(trip.status as TripStatus, next)) throw new Error(`Cannot move ${trip.status} to ${next}.`);
      const now = new Date();
      const updated = await tx.trip.update({ where: { tripId: trip.tripId }, data: { status: next, startedAt: next === "IN_PROGRESS" ? now : undefined, completedAt: next === "COMPLETED" ? now : undefined, cancelledAt: next === "CANCELLED" ? now : undefined, cancellationReason: next === "CANCELLED" ? parsed.data.reason : undefined } });
      await tx.tripEvent.create({ data: { tripId: trip.tripId, actorId: session.userId, eventType: `TRIP_${next}`, previousStatus: trip.status, newStatus: next } });
      if (next === "COMPLETED" || next === "CANCELLED") for (const assignment of trip.assignments) await tx.driver.update({ where: { driverId: assignment.driverId }, data: { availabilityStatus: "ONLINE" } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ trip: { ...result, estimatedFare: result.estimatedFare?.toString(), finalFare: result.finalFare?.toString() } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Transition failed." }, { status: 400 }); }
}
