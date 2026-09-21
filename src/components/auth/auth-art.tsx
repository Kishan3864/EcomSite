import { Heart, MapPin, Package, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The decorative cluster on the sign-in panel: a glass order card and a few
 * floating icon tiles, built from lucide glyphs (no drawn illustration).
 * Hidden from assistive tech; the panel's heading and list carry the meaning.
 * Collapses on short windows so the panel's copy never gets squeezed.
 */
export function AuthArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-64 w-full max-w-sm [@media(max-height:780px)]:hidden",
        className,
      )}
    >
      {/* Soft glow behind the card */}
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-300/40 blur-3xl" />

      {/* The order card */}
      <div className="glass edge-glow absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <Package size={20} />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2 w-24 rounded-full bg-ink-800/80" />
            <div className="h-1.5 w-32 rounded-full bg-ink-300" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-1.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  i < 3 ? "bg-brand-600" : "bg-ink-200",
                )}
              />
              {i < 3 && (
                <span className={cn("h-0.5 flex-1 rounded-full", i < 2 ? "bg-brand-400" : "bg-ink-200")} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="h-1.5 w-20 rounded-full bg-ink-200" />
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-gold-400 px-2.5 text-ink-950">
            <Truck size={14} />
          </span>
        </div>
      </div>

      {/* Floating tiles */}
      <span className="glass absolute left-2 top-4 flex h-12 w-12 items-center justify-center rounded-2xl text-sale-600 shadow-lg motion-safe:animate-float">
        <Heart size={20} />
      </span>
      <span className="glass absolute right-4 top-0 flex h-11 w-11 items-center justify-center rounded-2xl text-brand-700 shadow-lg motion-safe:animate-float [animation-delay:-2s]">
        <MapPin size={18} />
      </span>
      <span className="glass absolute bottom-2 left-8 flex h-11 w-11 items-center justify-center rounded-2xl text-brand-700 shadow-lg motion-safe:animate-float [animation-delay:-4s]">
        <RotateCcw size={18} />
      </span>
      <span className="glass absolute bottom-6 right-0 flex h-12 w-12 items-center justify-center rounded-2xl text-gold-600 shadow-lg motion-safe:animate-float [animation-delay:-1s]">
        <ShieldCheck size={20} />
      </span>
    </div>
  );
}
