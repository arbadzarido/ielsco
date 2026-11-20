"use client";
import Link from "next/link";

// Shown by the route error boundaries when a page fails on the server (for example, the database is unreachable).
// The digest lets staff match the visitor's report with the function log line in Vercel.
export default function ServiceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="eyebrow">Something went wrong</div>
        <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)", marginBottom: 12 }}>This page is temporarily unavailable.</h1>
        <p className="lead" style={{ marginBottom: 24 }}>
          Your application and payments are safe. Please try again in a few minutes. If it keeps happening, email{" "}
          <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>{error.digest ? <> and mention reference <code>{error.digest}</code></> : null}.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link className="btn btn-secondary" href="/">Go to the homepage</Link>
        </div>
      </div>
    </section>
  );
}
