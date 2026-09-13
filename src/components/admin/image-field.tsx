"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "@/components/ui/image";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { inputCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * One image on an admin form: upload it, or paste a URL. Either way the form
 * only ever carries the URL, so every action behind these forms is unchanged.
 *
 * Uploading was the missing half. A URL is fine for a stock photograph, and
 * useless for the picture of the thing actually on the shelf — the owner has
 * that on their phone, not on a public web address. The file goes to
 * /api/admin/media the moment it is chosen, so the preview and the saved URL
 * are settled while the rest of the form is still being filled in.
 *
 * Removing clears the field. The file itself stays in the library at
 * /admin/media, which is where anything is deleted for good — a picture is
 * often used in more than one place, and unpicking it from a form is not a
 * reason to destroy it everywhere.
 */

const ASPECT = {
  wide: "aspect-[16/9]",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
} as const;

export function ImageField({
  name,
  value,
  onChange,
  alt = "",
  aspect = "wide",
  className,
  urlPlaceholder = "https://… or upload a file",
}: {
  /** Renders a hidden input, for forms that read this straight from FormData. */
  name?: string;
  value: string;
  onChange: (url: string) => void;
  /** Sent with the upload so the library remembers what the picture shows. */
  alt?: string;
  aspect?: keyof typeof ASPECT;
  className?: string;
  urlPlaceholder?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const shown = value.trim();
  const usable = /^https?:\/\//i.test(shown) || shown.startsWith("/");

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      if (alt) body.append("alt", alt);
      const res = await fetch("/api/admin/media", { method: "POST", body, credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "That upload did not go through. Try again.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("That upload did not go through. Check the connection and try again.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files?.[0]);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {name && <input type="hidden" name={name} value={shown} />}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden border border-dashed bg-ink-50 transition-colors",
          ASPECT[aspect],
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-200",
        )}
      >
        {usable ? (
          <Image
            src={shown}
            alt=""
            fill
            sizes="320px"
            className="object-cover"
            unoptimized={!shown.startsWith("/")}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-ink-400">
            <ImageOff size={20} />
            <span className="text-[11.5px]">
              {dragging ? "Drop to upload" : "No image — upload one or paste a URL"}
            </span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink-950/60 text-[12px] font-medium text-white">
            <Loader2 size={15} className="animate-spin" /> Uploading…
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 border border-ink-300 bg-surface px-3 text-[12px] font-semibold text-ink-900 transition-colors hover:border-ink-950 hover:bg-ink-50 disabled:opacity-50"
        >
          <Upload size={13} /> {usable ? "Replace" : "Upload"}
        </button>
        {usable && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              onChange("");
            }}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 border border-ink-200 px-3 text-[12px] font-medium text-ink-600 transition-colors hover:border-sale-400 hover:text-sale-600 disabled:opacity-50"
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
        <span className="text-[11px] text-ink-400">JPG, PNG or WebP · up to 8 MB</span>
      </div>

      <input
        type="text"
        value={shown}
        onChange={(e) => onChange(e.target.value)}
        placeholder={urlPlaceholder}
        aria-label="Image address"
        className={inputCls}
      />

      {error && <p className="text-[12px] text-sale-600">{error}</p>}
    </div>
  );
}
