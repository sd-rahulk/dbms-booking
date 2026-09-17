import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { availabilitySchema } from "@/lib/validators";
export async function POST(request: Request) {
  const session = await getSession(); if (!session?.driverId) return NextResponse.json({ error: "Driver sign in required." }, { status: 401 });
  const parsed = availabilitySchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const driver = await db.driver.update({ where: { driverId: session.driverId }, data: { availabilityStatus: parsed.data.status } });
  return NextResponse.json({ status: driver.availabilityStatus });
}
