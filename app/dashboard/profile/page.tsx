import { getSession } from "@/lib/auth";
import { ProfileClient } from "@/components/profile-client";
export default async function ProfilePage() { const session = await getSession(); return <ProfileClient session={session} />; }
