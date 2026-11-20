# Redirect ielsco.com/events/gif → gif.ielsco.com (after go-live only)

Founder decision: redirect only after gif.ielsco.com is confirmed live and working. **Not applied in this PR.**

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
