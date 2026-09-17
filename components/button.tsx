import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cn("inline-flex min-h-11 items-center justify-center gap-2 px-5 text-xs font-bold uppercase tracking-[.12em] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50", { "bg-charcoal text-ivory hover:bg-amber hover:text-charcoal": variant === "primary", "border border-charcoal bg-transparent hover:bg-charcoal hover:text-ivory": variant === "secondary", "px-2 text-ash hover:text-charcoal": variant === "ghost", "bg-[#9a3f2e] text-ivory hover:bg-[#7e3023]": variant === "danger" }, className)} {...props} />;
}
