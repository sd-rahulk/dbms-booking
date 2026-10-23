import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";

const entities = ["users", "drivers", "vehicles", "documents", "trips", "policies", "reviews"] as const;
type Entity = typeof entities[number];
function validEntity(value: string | null): value is Entity { return !!value && (entities as readonly string[]).includes(value); }

function camelize(value: any): any {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), camelize(entry)]));
}

async function readEntity(entity: Entity) {
  const client = getSupabaseAdmin();
  const query = entity === "users" ? client.from("app_user").select("*, phones:user_phone(*)").order("user_id")
    : entity === "drivers" ? client.from("driver").select("*").order("driver_id")
    : entity === "vehicles" ? client.from("vehicle").select("*, driver:driver(*)").order("vehicle_id")
    : entity === "documents" ? client.from("vehicle_document").select("*, vehicle:vehicle(*)").order("expiry_date")
    : entity === "trips" ? client.from("trip").select("*").order("requested_at", { ascending: false }).limit(50)
    : entity === "policies" ? client.from("fare_policy").select("*").order("policy_id")
    : client.from("review").select("*, trip:trip(*)").order("review_id");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(camelize);
}

export async function GET(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const entity = new URL(request.url).searchParams.get("entity");
  if (!validEntity(entity)) return NextResponse.json({ error: "Unknown resource." }, { status: 400 });
  try { return NextResponse.json({ rows: await readEntity(entity) }); }
  catch (error) { return NextResponse.json({ error: supabaseErrorMessage(error, "Could not load records.") }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const body = await request.json();
  const entity = body.entity as string;
  if (!validEntity(entity)) return NextResponse.json({ error: "Unknown resource." }, { status: 400 });
  try {
    const client = getSupabaseAdmin();
    const table = entity === "users" ? "app_user" : entity === "drivers" ? "driver" : entity === "vehicles" ? "vehicle" : entity === "documents" ? "vehicle_document" : entity === "policies" ? "fare_policy" : entity === "reviews" ? "review" : null;
    if (!table) return NextResponse.json({ error: "Trips are updated through the state machine." }, { status: 400 });
    const row: Record<string, unknown> = entity === "users" ? { user_id: body.userId, first_name: body.firstName, last_name: body.lastName || null, email: body.email }
      : entity === "drivers" ? { driver_id: body.driverId, first_name: body.firstName, last_name: body.lastName || null, email: body.email, verification_status: "PENDING" }
      : entity === "vehicles" ? { vehicle_id: body.vehicleId, driver_id: body.driverId, type: body.type, model: body.model, capacity: Number(body.capacity), registration_number: body.registrationNumber }
      : entity === "documents" ? { document_id: body.documentId, vehicle_id: body.vehicleId, issue_date: body.issueDate, expiry_date: body.expiryDate, document_type: body.documentType || "RC", document_url: body.documentUrl || null }
      : entity === "policies" ? { policy_id: body.policyId, vehicle_type: body.vehicleType, base_fare: Number(body.baseFare), per_km_rate: Number(body.perKmRate) }
      : { review_id: body.reviewId, trip_id: body.tripId, rating: Number(body.rating), comment: body.comment || null };
    const { data, error } = await client.from(table).insert(row as any).select().single();
    if (error) throw error;
    return NextResponse.json({ row: camelize(data) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: supabaseErrorMessage(error, "Could not create record.") }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const body = await request.json();
  try {
    const client = getSupabaseAdmin();
    if (body.entity === "policies") {
      const { data, error } = await client.from("fare_policy").update({ vehicle_type: body.vehicleType, base_fare: Number(body.baseFare), per_km_rate: Number(body.perKmRate) }).eq("policy_id", body.id).select().single();
      if (error) throw error;
      return NextResponse.json({ row: camelize(data) });
    }
    if (body.entity === "trips") {
      const { data, error } = await client.from("trip").update({ cancellation_reason: body.cancellationReason }).eq("trip_id", body.id).select().single();
      if (error) throw error;
      return NextResponse.json({ row: camelize(data) });
    }
    return NextResponse.json({ error: "This resource has no editable admin fields." }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: supabaseErrorMessage(error, "Could not update record.") }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { await requireSession("ADMIN"); } catch { return NextResponse.json({ error: "Admin access required." }, { status: 403 }); }
  const body = await request.json();
  try {
    const client = getSupabaseAdmin();
    const tableByEntity: Record<string, string> = { policies: "fare_policy", reviews: "review", documents: "vehicle_document", vehicles: "vehicle", drivers: "driver", users: "app_user" };
    const idByEntity: Record<string, string> = { policies: "policy_id", reviews: "review_id", documents: "document_id", vehicles: "vehicle_id", drivers: "driver_id", users: "user_id" };
    if (!tableByEntity[body.entity]) return NextResponse.json({ error: "Trips must be preserved as historical records." }, { status: 400 });
    const { error } = await client.from(tableByEntity[body.entity]).delete().eq(idByEntity[body.entity], body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: supabaseErrorMessage(error, "Could not delete record.") }, { status: 400 }); }
}
