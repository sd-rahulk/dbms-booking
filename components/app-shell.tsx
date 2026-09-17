"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Map, ShieldCheck, UserRound, WalletCards, Wrench, Terminal } from "lucide-react";
import { Logo } from "./logo";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["PASSENGER", "DRIVER", "ADMIN"] },
  { href: "/dashboard/book", label: "Book a ride", icon: Map, roles: ["PASSENGER"] },
  { href: "/dashboard/history", label: "Trip history", icon: WalletCards, roles: ["PASSENGER", "DRIVER"] },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound, roles: ["PASSENGER", "DRIVER"] },
  { href: "/admin/explorer", label: "DBMS Explorer", icon: ShieldCheck, roles: ["ADMIN"] },
  { href: "/admin/records", label: "Manage records", icon: Wrench, roles: ["ADMIN"] },
  { href: "/admin/sql-lab", label: "SQL Query Lab", icon: Terminal, roles: ["ADMIN"] },
];

export function AppShell({ children, role = "PASSENGER", name = "AERIDE member" }: { children: React.ReactNode; role?: string; name?: string }) {
  const pathname = usePathname(); const router = useRouter();
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }
  const visible = links.filter((link) => link.roles.includes(role));
  return <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[248px_1fr]">
    <aside className="hidden border-r border-line bg-[#f1efe8] lg:flex lg:flex-col">
      <div className="p-8"><Logo /></div>
      <div className="px-5"><p className="eyebrow mb-3 px-3">Workspace</p><nav className="space-y-1">{visible.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-3 text-sm transition ${pathname === href ? "bg-charcoal text-ivory" : "text-ash hover:bg-paper hover:text-charcoal"}`}><Icon size={16} strokeWidth={1.5} />{label}</Link>)}</nav></div>
      <div className="mt-auto border-t border-line p-5"><div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center bg-amber text-sm font-bold">{name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="eyebrow mt-1">{role.toLowerCase()}</p></div></div><button onClick={logout} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-ash hover:text-charcoal"><LogOut size={15} />Sign out</button></div>
    </aside>
    <main className="min-w-0"><div className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden"><Logo /><button onClick={logout} aria-label="Sign out"><LogOut size={18} /></button></div>{children}</main>
  </div>;
}
