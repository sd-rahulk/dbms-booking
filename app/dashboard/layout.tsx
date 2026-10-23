import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { getDriverOrUserName } from "@/lib/supabase-data";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(); if (!session) redirect("/auth");
  let name = session.email;
  const displayName = await getDriverOrUserName(session);
  if (displayName) name = displayName;
  return <AppShell role={session.role} name={name}>{children}</AppShell>;
}
