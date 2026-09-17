import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`group inline-flex items-center gap-2 ${light ? "text-ivory" : "text-charcoal"}`} aria-label="AERIDE home">
    <span className="relative flex h-8 w-8 items-center justify-center border border-current"><span className="absolute h-3 w-3 rounded-full border-[1.5px] border-current" /><span className="h-px w-6 rotate-45 bg-current transition-transform group-hover:rotate-0" /></span>
    <span className="text-sm font-bold tracking-[.24em]">AERIDE</span>
  </Link>;
}
