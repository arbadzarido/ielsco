# Mayar retirement (IELSco subscriptions), 2026-10-17

IELSco is a Community & Opportunities platform; IELS Lounge and the Explorer / Insider / Visionary subscription tiers are
retired. Elco AI is a separate product and will use Midtrans for its own subscriptions.

## Done in the code (Release 2)

- Removed every IELSco checkout path to Mayar: pricing modal, upgrade prompts, tier badges, membership settings page,
  IELS Lounge page and its "Join" CTA, the old GIF dashboard's Lounge checkout.
- Legacy routes redirect instead of 404 so saved links keep working:
  `/iels-lounge` → `/circle`, `/dashboard/settings/membership` → `/dashboard/settings`,
  `/dashboard/goals/**` → `/dashboard/my-goals`, `/dashboard/portfolio` → `/dashboard/profile`,
  `/dashboard/learning` → `/dashboard/my-learning`, `/dashboard/learning/library` → `/dashboard/explore`,
  `/dashboard/gif/old` → `/dashboard/gif`.
- Course packages no longer bundle "IELS Lounge Premium"; prices shown everywhere are sessions × Rp90,000 (the public
  course modal already showed this).
- `supabase/functions/mayar-webhook` source removed and the function is no longer declared in `supabase/config.toml`,
  so the Supabase GitHub integration never redeploys it (it deploys only functions declared there).
- No database data was changed. `memberships` / `transactions` rows stay for records; nothing in the app reads tiers to
  gate features any more.

## Still live in production (manual, owner only)

1. **Mayar dashboard**: deactivate the products `insider-iels-lounge-premium` and `visionary-iels-lounge-exclusive`
   (both checked 2026-10-17: open, price shown as "Gratis") and remove the webhook URL. The `iels-lounge-premium`
   product page already returns 404.
2. **Supabase → Edge Functions → `mayar-webhook`**: delete it after step 1. It currently accepts unauthenticated
   requests (no JWT verification) and can write `memberships` / `transactions` rows for any registered email.
3. If any customer still has an active recurring Mayar bill, cancel it in Mayar before step 2.
