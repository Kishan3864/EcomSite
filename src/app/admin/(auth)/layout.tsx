import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · Mayura Admin",
  robots: { index: false, follow: false },
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
