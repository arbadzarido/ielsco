import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="section">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="eyebrow">404</div>
        <h1 style={{ fontSize: 48 }}>This page isn&rsquo;t here.</h1>
        <p className="lead" style={{ margin: "16px 0 24px" }}>It may have moved. Start from the home page or the FAQ.</p>
        <div className="btn-row"><Link className="btn btn-primary" href="/">Home</Link><Link className="btn btn-secondary" href="/faq">FAQ</Link></div>
      </div>
    </main>
  );
}
