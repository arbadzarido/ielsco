# Redirect ielsco.com/events/gif → gif.ielsco.com (after go-live only)

**Applied 21 Nov 2026** (founder request, after gif.ielsco.com went live): `/events/gif` → `https://gif.ielsco.com` (308) in
`next.config.ts`; header, footer, home, Events, Products and the dashboard link to gif.ielsco.com; `GIF_REGISTER_URL` now
points at `https://gif.ielsco.com/apply` (src/lib/gif-summer-2027.ts). The GIF 2026 subpages stay.

Original plan (kept for reference): redirect only after gif.ielsco.com is confirmed live and working.

Go-live checklist (all must pass first):
1. `https://gif.ielsco.com/api/health` returns `{"ok":true, "db":true, ...}`.
2. Home, /apply, /login, /portal, /refund-policy load on desktop and phone.
3. A sandbox payment completes and shows a receipt; an email code arrives.

Then, in the main app (`next.config.ts`, inside `redirects()` → `main` host rules), add:

```ts
{ source: "/events/gif", destination: "https://gif.ielsco.com", permanent: true, has: main },
```

Keep the GIF 2026 subpages (`/events/gif/batch2`, `/itinerary`, `/mentoring`, `/project`, `/talk`,
`/timeline-adjustment`) where they are: they document GIF 2026. Also update `src/lib/gif-summer-2027.ts`:
`GIF_REGISTER_URL = "https://gif.ielsco.com/apply"` (it still points at the old Google Form, used by the IELSco
dashboard GIF banner and card). The old page's USD 800 Early Bird text then disappears with the redirect.
