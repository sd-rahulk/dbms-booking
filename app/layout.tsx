import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AERIDE — Every journey, beautifully connected",
  description: "A production-grade academic ride-sharing management system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
