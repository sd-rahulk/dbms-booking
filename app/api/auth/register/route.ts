import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { userId, firstName, lastName, email, password, phone } = parsed.data;
  try {
    const account = await db.$transaction(async (tx) => {
      const user = await tx.appUser.create({ data: { userId, firstName, lastName, email: email.toLowerCase(), phones: { create: { phoneNumber: phone } } } });
      return tx.authAccount.create({ data: { email: email.toLowerCase(), passwordHash: await hashPassword(password), role: "PASSENGER", userId: user.userId } });
    });
    createSession({ accountId: account.accountId, email: account.email, role: account.role as "PASSENGER" | "DRIVER" | "ADMIN", userId: account.userId ?? undefined });
    return NextResponse.json({ redirect: "/dashboard" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique") ? "That ID or email is already in use." : "Registration failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
