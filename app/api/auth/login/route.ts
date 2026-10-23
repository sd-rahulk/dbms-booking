import { NextResponse } from "next/server";
import { createSession, verifyLogin } from "@/lib/auth";
import { supabaseErrorMessage } from "@/lib/supabase";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    const account = await verifyLogin(parsed.data.email, parsed.data.password);
    if (!account) return NextResponse.json({ error: "We couldn't match those credentials." }, { status: 401 });
    createSession({ accountId: account.accountId, email: account.email, role: account.role as "PASSENGER" | "DRIVER" | "ADMIN", userId: account.userId ?? undefined, driverId: account.driverId ?? undefined });
    return NextResponse.json({ role: account.role, redirect: account.role === "ADMIN" ? "/admin/explorer" : "/dashboard" });
  } catch (error) {
    return NextResponse.json({ error: supabaseErrorMessage(error, "Supabase is not configured.") }, { status: 503 });
  }
}
