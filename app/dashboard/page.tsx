import { getSession } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";
export default async function DashboardPage() { const session = await getSession(); return <DashboardClient role={session?.role ?? "PASSENGER"} />; }
