import { Lock, ShieldCheck } from "lucide-react";
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
          <div className="mt-8 flex items-center gap-2">
            <span className="rounded-md bg-brand-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white">
              Admin
            </span>
            <span className="text-[12px] text-ink-500">Store management</span>
          </div>
          <h1 className="mt-3 font-display text-[30px] leading-[1.08] tracking-[-0.03em] text-ink-950">
            Sign in to run the store
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            Orders, catalogue, customers and marketing — one place for the whole team.
          </p>

          <div className="mt-8">
            <AdminLoginForm next={next} />
          </div>

          <p className="mt-8 flex items-center gap-1.5 text-[11.5px] text-ink-400">
            <Lock size={11} /> Sessions expire after 12 hours. Every action is logged.
          </p>
        </div>
      </div>

      <div className="peacock-surface hidden flex-col justify-between p-12 lg:flex">
        <div />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">Mayura Admin</p>
          <h2 className="mt-3 max-w-md font-display text-[34px] leading-[1.1] tracking-[-0.025em] text-white">
            Everything a customer sees is decided in here.
          </h2>
          <ul className="mt-6 space-y-2.5">
            {[
              "Live orders with one-click status updates and tracking events",
              "Catalogue edits that reach the storefront within seconds",
              "Coupons, banners and inventory, with an audit trail",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[14px] text-white/75">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold-400" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-white/35">{BRAND.legalName}</p>
      </div>
    </div>
  );
}
