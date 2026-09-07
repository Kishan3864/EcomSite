/** Social marks, drawn inline — lucide no longer ships brand glyphs. */

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
} as const;

export function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M17.53 3h3.02l-6.6 7.55L21.7 21h-6.06l-4.75-6.2L5.46 21H2.44l7.05-8.07L2.3 3h6.21l4.29 5.67L17.53 3Zm-1.06 16.2h1.67L7.6 4.71H5.81l10.66 14.49Z" />
    </svg>
  );
}

export function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M21.58 7.2a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.51 2.51 0 0 0 2.42 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .42 4.8 2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.78A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.42-4.8ZM10 15.02V8.98L15.2 12 10 15.02Z" />
    </svg>
  );
}

/* Payment marks used on the checkout and footer trust rows. */

export function UpiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 20" className={className} aria-label="UPI" role="img">
      <path d="M2 2h6l-4 16H-2L2 2Z" fill="#2c837c" />
      <path d="M9 2h6l-4 16H5L9 2Z" fill="#ee9014" />
      <text
        x="19"
        y="15"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
      >
        UPI
      </text>
    </svg>
  );
}
