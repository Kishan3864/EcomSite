"use client";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * normal error boundary cannot render because there is no layout left to render
 * it into. It has to supply its own <html> and <body>, and cannot rely on the
 * app's fonts or CSS variables having loaded, so the styling here is inline and
 * self-contained on purpose.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f5f1",
          color: "#191714",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0, letterSpacing: "-0.02em" }}>
            The site is temporarily unavailable
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#55504a", lineHeight: 1.7 }}>
            We are already looking at it. Please try again in a few minutes.
          </p>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#9c968b" }}>
              Reference {error.digest}
            </p>
          )}
          {/* A plain anchor, not next/link: this boundary catches a failure in
              the root layout, where the router may itself be the thing that
              broke. A full document load is the only reliable way out. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "1.5rem",
              padding: "0.75rem 2rem",
              background: "#0d0c0a",
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Reload
          </a>
        </div>
      </body>
    </html>
  );
}
