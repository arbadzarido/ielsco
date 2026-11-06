import Link from "next/link";

// Full-page notice for the Company OS gate (setup missing, check failed). Shows no internal data.
export function OsNotice({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4" data-testid="os-notice">
      <div className="w-full max-w-md rounded-2xl border border-[#E3E7ED] bg-white p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#577E90]">Company OS</p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-lg text-[#1B2A3C]/70">{body}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/os" className="rounded-full bg-[#1B2A3C] px-5 py-2.5 font-semibold text-white">Try again</Link>
          <form action="/os/auth/signout" method="post">
            <button type="submit" className="rounded-full border border-[#E3E7ED] px-5 py-2.5 font-semibold">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}
