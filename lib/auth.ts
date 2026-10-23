import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "./supabase";

const COOKIE_NAME = "aeride_session";
const secret = () => process.env.SESSION_SECRET || "local-development-secret-change-me";

type Session = { accountId: string; email: string; role: "PASSENGER" | "DRIVER" | "ADMIN"; userId?: string; driverId?: string };

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export function createSession(session: Session) {
  const payload = encode(JSON.stringify({ ...session, nonce: randomBytes(8).toString("hex") }));
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  cookies().set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" });
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { return JSON.parse(decode(payload)) as Session; } catch { return null; }
}

export async function requireSession(role?: Session["role"]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (role && session.role !== role) throw new Error("FORBIDDEN");
  return session;
}

export async function verifyLogin(email: string, password: string) {
  const { data: account, error } = await getSupabaseAdmin().from("auth_account").select("*").eq("email", email.toLowerCase()).maybeSingle();
  if (error || !account || !(await bcrypt.compare(password, account.password_hash))) return null;
  return {
    accountId: account.account_id,
    email: account.email,
    passwordHash: account.password_hash,
    role: account.role,
    userId: account.user_id,
    driverId: account.driver_id,
  };
}

export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
