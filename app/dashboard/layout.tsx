import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(); if (!session) redirect("/auth");
  let name = session.email;
  if (session.role === "PASSENGER" && session.userId) { const user = await db.appUser.findUnique({ where: { userId: session.userId } }); name = user ? `${user.firstName} ${user.lastName ?? ""}` : name; }
  if (session.role === "DRIVER" && session.driverId) { const driver = await db.driver.findUnique({ where: { driverId: session.driverId } }); name = driver ? `${driver.firstName} ${driver.lastName ?? ""}` : name; }
  return <AppShell role={session.role} name={name}>{children}</AppShell>;
}
