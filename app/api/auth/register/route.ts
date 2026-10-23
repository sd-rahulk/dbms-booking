import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { getSupabaseAdmin, supabaseErrorMessage } from "@/lib/supabase";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { userId, firstName, lastName, email, password, phone } = parsed.data;
  try {
    const { data: account, error } = await getSupabaseAdmin().rpc("register_passenger", {
      p_user_id: userId,
      p_first_name: firstName,
      p_last_name: lastName || null,
      p_email: email.toLowerCase(),
      p_phone: phone,
      p_password_hash: await hashPassword(password),
    });
    if (error || !account) throw error ?? new Error("Registration failed.");
    createSession({ accountId: account.account_id, email: account.email, role: "PASSENGER", userId: account.user_id });
    return NextResponse.json({ redirect: "/dashboard" }, { status: 201 });
  } catch (error) {
    const detail = supabaseErrorMessage(error, "");
    const message = /duplicate|unique|already exists/i.test(detail) ? "That ID or email is already in use." : "Registration failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
