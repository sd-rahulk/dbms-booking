import { HistoryClient } from "@/components/history-client";
import { getSession } from "@/lib/auth";
export default async function HistoryPage() { const session = await getSession(); return <HistoryClient role={session?.role ?? "PASSENGER"} />; }
