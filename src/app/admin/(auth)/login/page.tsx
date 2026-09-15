import { Lock } from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { AdminLoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Logo href="/" />
          <div className="mt-8 flex items-center gap-2.5">
            <span className="bg-ink-950 px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-white">
              Admin
            </span>
            <span className="text-[13px] text-ink-500">Store management</span>
          </div>
          <h1 className="mt-4 font-display text-[30px] leading-[1.08] tracking-[-0.03em] text-ink-950">
            Sign in to run the store
          </h1>
          <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.6] text-ink-600">
            Orders, catalogue, customers and marketing — one place for the whole team.
          </p>

          <div className="mt-8">
            <AdminLoginForm next={next} />
          </div>

          <p className="mt-8 flex items-center gap-2 border-t border-hairline pt-4 text-[13px] text-ink-500">
            <Lock size={12} className="shrink-0 text-ink-400" /> Sessions expire after{" "}
            <span className="tabular-nums">12</span> hours. Every action is logged.
          </p>
        </div>
      </div>

      <div className="deep-plane hidden flex-col justify-between p-12 lg:flex">
        <div />
        <div>
          <span className="eyebrow eyebrow-dark">WeekendCart Admin</span>
          <h2 className="mt-4 max-w-md font-display text-[34px] leading-[1.1] tracking-[-0.025em] text-white">
            Everything a customer sees is decided in here.
          </h2>
          {/* A ruled index rather than a column of gold ticks: aqua is spent
              on the eyebrow rule and nowhere else on this screen. */}
          <ul className="mt-7 max-w-md border-b border-white/15">
            {[
              "Live orders with one-click status updates and tracking events",
              "Catalogue edits that reach the storefront within seconds",
              "Banners, inventory and settings, with an audit trail",
            ].map((line) => (
              <li
                key={line}
                className="border-t border-white/15 py-3 text-[14px] leading-[1.55] text-white/75"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-white/40">{BRAND.legalName}</p>
      </div>
    </div>
  );
}
