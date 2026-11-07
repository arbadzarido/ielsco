# Company OS end-to-end test

Real browser (Playwright/Chromium) against a production build, a real Postgres 16 with every Company OS migration, and
`gateway.mjs`, a local stand-in for Supabase Auth + PostgREST that runs every query as the JWT's role with
`request.jwt.claims` set, so RLS and the security-definer functions are the real ones. Google is simulated: the test
tells the gateway which identity (email, verified, MFA) the next "Continue with Google" returns. The gateway also
stands in for Google OAuth (it refuses unregistered redirect URIs), Google Calendar (etags, If-Match → 412) and Gemini
(the test queues each answer, as text and function calls). The app only uses these stand-ins when `OS_GOOGLE_OAUTH_BASE`
and `OS_GEMINI_BASE` are set, and ignores both on Vercel.

```bash
# 1. Database
sudo -u postgres psql -c "create database os_e2e"
sudo -u postgres psql -d os_e2e -f tests/e2e/company-os/setup-db.sql
for f in 20261107000000_company_os_foundation.sql 20261107010000_company_os_access.sql \
         20261108000000_company_os_work.sql 20261108010000_company_os_kpi_timeline_data.sql \
         20261108020000_company_os_drive_connection.sql 20261109000000_company_os_calendar_ai.sql; do
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d os_e2e -f supabase/migrations/$f; done

# 2. Gateway (prints the anon / service keys with --keys)
KEYS=$(node tests/e2e/company-os/gateway.mjs --keys)
node tests/e2e/company-os/gateway.mjs &

# 3. App
# next.config.ts pins the production project unless IELSCO_LOCAL_SUPABASE_* are set, so use those.
export IELSCO_LOCAL_SUPABASE_URL=http://localhost:54399
export IELSCO_LOCAL_SUPABASE_ANON_KEY=$(echo "$KEYS" | node -pe 'JSON.parse(require("fs").readFileSync(0)).anon')
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$KEYS" | node -pe 'JSON.parse(require("fs").readFileSync(0)).service')
npx next build && OS_GOOGLE_CLIENT_ID=e2e-client.apps.googleusercontent.com OS_GOOGLE_CLIENT_SECRET=e2e-client-secret \
  OS_GOOGLE_OAUTH_BASE=http://localhost:54399/__google OS_GEMINI_BASE=http://localhost:54399/__gemini \
  TRUSTED_HOSTS=os.localhost OS_SIGNIN_RATE_LIMIT=1000 GEMINI_API_KEY=fake-e2e-key npx next start -p 3000 &

# 4. Test (Chromium resolves os.localhost to 127.0.0.1)
E2E_ANON_KEY=$IELSCO_LOCAL_SUPABASE_ANON_KEY node tests/e2e/company-os.e2e.mjs /tmp/os-shots
```
