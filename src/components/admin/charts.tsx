"use client";

import { useId, useMemo, useState } from "react";
import { cn, formatINR } from "@/lib/utils";

/**
 * Dashboard charts, hand-drawn in SVG.
 *
 * Every chart is a single series in one hue with direct labels, so there is
 * no categorical palette to keep consistent. Marks are thin, the grid is
 * recessive, text uses ink tokens, and a hover tooltip is always present —
 * the same rules the storefront's own micro-charts follow.
 */

export interface TrendPoint {
  label: string;
  value: number;
  count?: number;
}

const MARK = "#2c837c";
const MARK_SOFT = "rgba(44,131,124,0.12)";

export function TrendChart({
  points,
  height = 220,
  format = "money",
  className,
}: {
  points: TrendPoint[];
  height?: number;
  format?: "money" | "count";
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  const W = 720;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 28, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(1, ...points.map((p) => p.value));
  const niceMax = niceCeil(max);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const xy = useMemo(
    () =>
      points.map((p, i) => ({
        x: PAD.left + i * stepX,
        y: PAD.top + innerH - (p.value / niceMax) * innerH,
      })),
    [points, stepX, innerH, niceMax, PAD.left, PAD.top],
  );

  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = xy.length
    ? `${line} L${xy[xy.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xy[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`
    : "";

  const fmt = (v: number) => (format === "money" ? formatINR(v) : v.toLocaleString("en-IN"));
  const gridSteps = 4;
  // Roughly six labels across, and never one crowding the forced last label.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const showLabel = (i: number) =>
    i === points.length - 1 || (i % labelEvery === 0 && points.length - 1 - i >= Math.ceil(labelEvery / 2));

  if (points.length === 0) {
    return <p className="py-10 text-center text-[13px] text-ink-400">No data for this range.</p>;
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Trend over time"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round((x - PAD.left) / stepX);
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MARK} stopOpacity="0.22" />
            <stop offset="100%" stopColor={MARK} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid + axis labels */}
        {Array.from({ length: gridSteps + 1 }, (_, i) => {
          const y = PAD.top + (innerH / gridSteps) * i;
          const v = niceMax - (niceMax / gridSteps) * i;
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e8e6e1" strokeWidth="1" />
              <text x={W - PAD.right} y={y - 4} textAnchor="end" fontSize="10" fill="#a1a19a">
                {format === "money" ? compactMoney(v) : Math.round(v).toLocaleString("en-IN")}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke={MARK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Last point direct label */}
        {xy.length > 0 && (
          <g>
            <circle cx={xy[xy.length - 1].x} cy={xy[xy.length - 1].y} r="4" fill={MARK} stroke="#fff" strokeWidth="2" />
          </g>
        )}

        {/* X labels */}
        {points.map((p, i) =>
          showLabel(i) ? (
            <text
              key={p.label + i}
              x={xy[i].x}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              fontSize="10"
              fill="#77776f"
            >
              {p.label}
            </text>
          ) : null,
        )}

        {/* Hover crosshair */}
        {hover != null && (
          <g>
            <line x1={xy[hover].x} x2={xy[hover].x} y1={PAD.top} y2={PAD.top + innerH} stroke="#cdcdc7" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={xy[hover].x} cy={xy[hover].y} r="5" fill="#fff" stroke={MARK} strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[11.5px] shadow-md"
          style={{
            left: `${(xy[hover].x / W) * 100}%`,
            top: Math.max(0, (xy[hover].y / H) * 100 - 18) + "%",
          }}
        >
          <p className="text-ink-500">{points[hover].label}</p>
          <p className="font-semibold tabular-nums text-ink-950">{fmt(points[hover].value)}</p>
          {points[hover].count != null && (
            <p className="tabular-nums text-ink-500">{points[hover].count} orders</p>
          )}
        </div>
      )}
    </div>
  );
}

export function BarList({
  rows,
  format = "money",
  className,
  emptyText = "Nothing yet.",
}: {
  rows: { label: string; value: number; hint?: string; href?: string }[];
  format?: "money" | "count" | "percent";
  className?: string;
  emptyText?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const fmt = (v: number) =>
    format === "money" ? formatINR(v) : format === "percent" ? `${v}%` : v.toLocaleString("en-IN");

  if (rows.length === 0) return <p className="py-6 text-center text-[13px] text-ink-400">{emptyText}</p>;

  return (
    <ul className={cn("space-y-2.5", className)}>
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${fmt(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate text-ink-800">
              {r.href ? (
                <a href={r.href} className="hover:text-brand-700 hover:underline">
                  {r.label}
                </a>
              ) : (
                r.label
              )}
              {r.hint && <span className="ml-1.5 text-ink-400">{r.hint}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-950">{fmt(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: MARK_SOFT }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, backgroundColor: MARK }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
}

function compactMoney(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${Math.round(v)}`;
}
