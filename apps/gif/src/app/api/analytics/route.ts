import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { CLIENT_EVENTS } from "@/lib/analytics";

// Browser events, sent only after the visitor allowed analytics (components/Client.tsx). No IP or account is stored:
// a random per-browser id, the path, and the country from the edge header.
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch { return new NextResponse(null, { status: 204 }); }
  const event = String(b.event ?? "");
  if (!(CLIENT_EVENTS as readonly string[]).includes(event)) return new NextResponse(null, { status: 204 });
  const sid = /^[0-9a-f-]{36}$/.test(String(b.sid ?? "")) ? String(b.sid) : null;
  const path = String(b.path ?? "").slice(0, 200).replace(/[?#].*$/, "");
  const pathway = ["fully_funded", "mentoring", "self_funded"].includes(String(b.pathway)) ? String(b.pathway) : null;
  const cc = req.headers.get("x-vercel-ip-country");
  await q(`insert into gif.analytics_events (cohort_id, event, session_id, path, pathway, country) select id, $1, $2, $3, $4, $5 from gif.cohorts where is_current`,
    [event, sid, path, pathway, cc && /^[A-Z]{2}$/.test(cc) ? cc : null]).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
