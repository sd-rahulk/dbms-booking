import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const session = await getSession(); if (!session || session.role !== "ADMIN") redirect("/auth"); return <AppShell role="ADMIN" name="AERIDE admin">{children}</AppShell>; }
