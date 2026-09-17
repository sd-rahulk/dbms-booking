import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const entities = ["users", "drivers", "vehicles", "documents", "trips", "policies", "reviews"] as const;
type Entity = typeof entities[number];
function validEntity(value: string | null): value is Entity { return !!value && (entities as readonly string[]).includes(value); }

export async function GET(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const entity = new URL(request.url).searchParams.get("entity"); if (!validEntity(entity)) return NextResponse.json({ error: "Unknown resource." }, { status: 400 });
  const rows = entity === "users" ? await db.appUser.findMany({ include: { phones: true }, orderBy: { userId: "asc" } })
    : entity === "drivers" ? await db.driver.findMany({ orderBy: { driverId: "asc" } })
    : entity === "vehicles" ? await db.vehicle.findMany({ include: { driver: true }, orderBy: { vehicleId: "asc" } })
    : entity === "documents" ? await db.vehicleDocument.findMany({ include: { vehicle: true }, orderBy: { expiryDate: "asc" } })
    : entity === "trips" ? await db.trip.findMany({ orderBy: { requestedAt: "desc" }, take: 50 })
    : entity === "policies" ? await db.farePolicy.findMany({ orderBy: { policyId: "asc" } })
    : await db.review.findMany({ include: { trip: true }, orderBy: { reviewId: "asc" } });
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const body = await request.json(); const entity = body.entity as string; if (!validEntity(entity)) return NextResponse.json({ error: "Unknown resource." }, { status: 400 });
  try {
    const row = entity === "users" ? await db.appUser.create({ data: { userId: body.userId, firstName: body.firstName, lastName: body.lastName || null, email: body.email } })
      : entity === "drivers" ? await db.driver.create({ data: { driverId: body.driverId, firstName: body.firstName, lastName: body.lastName || null, email: body.email, verificationStatus: "PENDING" } })
      : entity === "vehicles" ? await db.vehicle.create({ data: { vehicleId: body.vehicleId, driverId: body.driverId, type: body.type, model: body.model, capacity: Number(body.capacity), registrationNumber: body.registrationNumber } })
      : entity === "documents" ? await db.vehicleDocument.create({ data: { documentId: body.documentId, vehicleId: body.vehicleId, issueDate: new Date(body.issueDate), expiryDate: new Date(body.expiryDate), documentType: body.documentType || "RC", documentUrl: body.documentUrl || null } })
      : entity === "policies" ? await db.farePolicy.create({ data: { policyId: body.policyId, vehicleType: body.vehicleType, baseFare: Number(body.baseFare), perKmRate: Number(body.perKmRate) } })
      : entity === "reviews" ? await db.review.create({ data: { reviewId: body.reviewId, tripId: body.tripId, rating: Number(body.rating), comment: body.comment || null } })
      : null;
    if (!row) return NextResponse.json({ error: "Trips are updated through the state machine." }, { status: 400 });
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create record." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const body = await request.json();
  try {
    if (body.entity === "policies") { const row = await db.farePolicy.update({ where: { policyId: body.id }, data: { vehicleType: body.vehicleType, baseFare: Number(body.baseFare), perKmRate: Number(body.perKmRate) } }); return NextResponse.json({ row }); }
    if (body.entity === "trips") { const row = await db.trip.update({ where: { tripId: body.id }, data: { cancellationReason: body.cancellationReason } }); return NextResponse.json({ row }); }
    return NextResponse.json({ error: "This resource has no editable admin fields." }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update record." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const body = await request.json();
  try {
    if (body.entity === "policies") await db.farePolicy.delete({ where: { policyId: body.id } });
    else if (body.entity === "reviews") await db.review.delete({ where: { reviewId: body.id } });
    else if (body.entity === "documents") await db.vehicleDocument.delete({ where: { documentId: body.id } });
    else if (body.entity === "vehicles") await db.vehicle.delete({ where: { vehicleId: body.id } });
    else if (body.entity === "drivers") await db.driver.delete({ where: { driverId: body.id } });
    else if (body.entity === "users") await db.appUser.delete({ where: { userId: body.id } });
    else return NextResponse.json({ error: "Trips must be preserved as historical records." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete record." }, { status: 400 }); }
}
