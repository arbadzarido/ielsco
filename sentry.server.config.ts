// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://36e36fb83eb667eff77e53726119b94d@o4511011940794368.ingest.de.sentry.io/4511011942432848",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1, // cost: 100% sampling made every request send a trace through the /monitoring tunnel (a function invocation each)

  // Enable logs to be sent to Sentry
  enableLogs: false, // cost: structured logs are not read anywhere; errors still reported in full

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
