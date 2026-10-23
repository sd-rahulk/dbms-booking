import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

function loadRootEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?([^"']*)["']?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadRootEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

async function upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw error;
}

async function main() {
  const hash = await bcrypt.hash("aeride123", 12);
  const adminHash = await bcrypt.hash("admin1234", 12);
  const users = [
    ["U001", "Ananya", "Rao", "ananya@aeride.local", "+91 90000 10001"], ["U002", "Vikram", "Iyer", "vikram@aeride.local", "+91 90000 10002"], ["U003", "Meera", "Nair", "meera@aeride.local", "+91 90000 10003"], ["U004", "Arjun", "Menon", "arjun@aeride.local", "+91 90000 10004"], ["U005", "Divya", "Shah", "divya@aeride.local", "+91 90000 10005"],
  ] as const;
  await upsert("app_user", users.map(([user_id, first_name, last_name, email]) => ({ user_id, first_name, last_name, email })), "user_id");
  await upsert("user_phone", users.map(([user_id, , , , phone_number]) => ({ user_id, phone_number })), "user_id,phone_number");
  await upsert("auth_account", users.map(([user_id, , , email]) => ({ email, password_hash: hash, role: "PASSENGER", user_id, driver_id: null })), "email");

  const drivers = [
    ["D001", "Karthik", "R", "karthik@aeride.local", "ONLINE"], ["D002", "Sahana", "P", "sahana@aeride.local", "OFFLINE"], ["D003", "Mohan", "K", "mohan@aeride.local", "ONLINE"], ["D004", "Priya", "S", "priya@aeride.local", "OFFLINE"], ["D005", "Ravi", "V", "ravi@aeride.local", "OFFLINE"],
  ] as const;
  await upsert("driver", drivers.map(([driver_id, first_name, last_name, email, availability_status]) => ({ driver_id, first_name, last_name, email, availability_status, verification_status: "VERIFIED", is_active: true })), "driver_id");
  await upsert("driver_phone", drivers.map(([driver_id]) => ({ driver_id, phone_number: `+91 98888 ${driver_id.slice(1)}01` })), "driver_id,phone_number");
  await upsert("auth_account", drivers.map(([driver_id, , , email]) => ({ email, password_hash: hash, role: "DRIVER", user_id: null, driver_id })), "email");
  await upsert("auth_account", [{ email: "admin@aeride.local", password_hash: adminHash, role: "ADMIN", user_id: null, driver_id: null }], "email");

  const vehicles = [
    ["V001", "D001", "Sedan", "Honda City", 4, "TN01AB1001"], ["V002", "D002", "Hatchback", "Maruti Baleno", 4, "TN01AB1002"], ["V003", "D003", "SUV", "Kia Seltos", 6, "TN01AB1003"], ["V004", "D004", "Sedan", "Hyundai Verna", 4, "TN01AB1004"], ["V005", "D005", "Hatchback", "Tata Altroz", 4, "TN01AB1005"],
  ] as const;
  await upsert("vehicle", vehicles.map(([vehicle_id, driver_id, type, model, capacity, registration_number]) => ({ vehicle_id, driver_id, type, model, capacity, registration_number, is_active: true })), "vehicle_id");
  await upsert("vehicle_document", vehicles.map(([vehicle_id]) => ({ document_id: `DOC${vehicle_id.slice(1)}`, vehicle_id, issue_date: "2025-01-01", expiry_date: vehicle_id === "V005" ? "2026-10-01" : "2027-12-31", document_type: "RC" })), "document_id");

  const policies = [["FP001", "Hatchback", 45, 12], ["FP002", "Sedan", 65, 15], ["FP003", "SUV", 90, 20]] as const;
  await upsert("fare_policy", policies.map(([policy_id, vehicle_type, base_fare, per_km_rate]) => ({ policy_id, vehicle_type, base_fare, per_km_rate })), "policy_id");

  const routes = [["T001", "U001", "FP002", "Chennai Central", "Tidel Park", "COMPLETED", "D001", 11.4, 236], ["T002", "U001", "FP001", "Adyar", "Velachery", "COMPLETED", "D003", 7.2, 131.4], ["T003", "U002", "FP003", "Anna Nagar", "Airport", "IN_PROGRESS", "D001", 14.8, 386], ["T004", "U003", "FP002", "Mylapore", "Guindy", "CANCELLED", "D002", 8.1, 186.5], ["T005", "U004", "FP001", "Besant Nagar", "Sholinganallur", "REQUESTED", null, 9.5, 159]] as const;
  for (const [trip_id, user_id, policy_id, pickup_location, drop_location, status, driver_id, distance_km, estimated_fare] of routes) {
    const created = daysAgo(status === "REQUESTED" ? 0 : 10);
    await upsert("trip", [{ trip_id, user_id, policy_id, pickup_location, drop_location, booking_date: dateOnly(created), booking_time: created.toISOString().slice(11, 19), requested_at: created.toISOString(), status, distance_km, estimated_fare, final_fare: status === "COMPLETED" ? estimated_fare : null, completed_at: status === "COMPLETED" ? daysAgo(2).toISOString() : null, cancelled_at: status === "CANCELLED" ? daysAgo(4).toISOString() : null }], "trip_id");
    if (driver_id) await upsert("assigned_to", [{ trip_id, driver_id }], "trip_id,driver_id");
    await upsert("trip_event", [{ event_id: `SEED-${trip_id}`, trip_id, event_type: "SEED_SNAPSHOT", new_status: status }], "event_id");
    if (status === "COMPLETED") await upsert("payment", [{ payment_id: `PAY${trip_id.slice(1)}`, user_id, driver_id, trip_id, payment_date: dateOnly(daysAgo(2)), payment_method: trip_id === "T002" ? "UPI" : "CARD", amount: estimated_fare, status: "PAID", transaction_reference: `SEED-${trip_id}` }], "payment_id");
  }
  await upsert("review", [{ review_id: "R001", trip_id: "T001", rating: 5, comment: "Quiet, quick, and thoughtfully handled." }, { review_id: "R002", trip_id: "T002", rating: 4, comment: "Smooth ride across the city." }], "review_id");
  console.log("AERIDE Supabase seed complete");
}

main().catch((error) => { console.error(error); process.exit(1); });
