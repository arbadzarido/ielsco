# Shared loading, error and empty states

These components are the IELSco port of the feedback system built for **Elco AI** (`frontend/src/components/feedback/*`, `ElcoActor`,
`lib/mascot/compose.js`, `lib/didYouMean.js`, `lib/loadingTips.js`). Same behaviour, same Elco poses and rig, same states; the look
(logo, colours, type, spacing) is IELSco's own. Keep the two in step: a change to a state or an act in one should be mirrored in the other.

| Piece | File | What it does |
| --- | --- | --- |
| `Skeleton*` | `feedback/Skeleton.tsx` | Shapes of the content that is coming (`SkeletonText/Card/List/Grid/Table/Stats/Page`) and `SkeletonRegion` (one polite "Loading" announcement). Server-safe. |
| `ElcoLoader` | `feedback/ElcoLoader.tsx` | Staged wait: the skeleton at 0 ms, Elco and "still working" after ~800 ms (floats over the page, so it never shifts the layout), a tip after ~2 s. No fake progress, no minimum display time. |
| `ErrorState` | `feedback/ErrorState.tsx` | `not_found`, `unavailable`, `network` (retries itself when the device is back online), `server`, `session` ("Sign in again"), `empty`, `search`. Also `SearchEmpty` ("Did you mean …?" + clear filters + ways on), `EmptyPanel`, `WayOut`. |
| `RouteError` | `feedback/RouteError.tsx` | Body of every `error.tsx`: classifies the error and offers Try again (`router.refresh()` + `reset()`). A failure is never shown as a 404. |
| `ElcoActor` | `brand/ElcoActor.tsx`, `brand/elco-actor.css` | The animated mascot (blink/glance scheduler, acts, still under `prefers-reduced-motion`). |
| rig | `lib/mascot/compose.ts` | Wraps the original SVG elements of each pose in part groups at runtime. The artwork is never redrawn. |
| `suggest()` | `lib/didYouMean.ts` | Damerau-Levenshtein typo suggestions from the page's own terms. |
| `classifyError()` | `lib/errorKind.ts` | offline / 401 / 404 / 403 / fetch failure / server, from fetch, Supabase and thrown errors. |
| tips | `lib/loadingTips.ts` | IELSco's tips (application advice, English, real IELSco features). Add only what the site's own pages already say. |

Assets: the official pose library lives in `public/images/elco/{poses,wear,kit}` (copied unchanged from Elco AI's `public/mascot`).
The older rig PNGs in `public/images/contents/mascot` still drive the landing-page mascot (`brand/ElcoCharacter.tsx`).
The robot is the shared mascot of IELSco and Elco AI; the retired owl is never used.

## Where they are used

* `app/**/loading.tsx` (dashboard sections use `DashboardLoading`: the real sidebar plus the shape of the page; public pages use
  `site/PublicLoading`), `app/error.tsx`, `app/dashboard/error.tsx`, `app/not-found.tsx` (`site/NotAvailable`), `app/dashboard/not-found.tsx`.
* `dashboard/PageStates.tsx` keeps its old names (`LoadingState`, `ErrorState`, `EmptyState`) on top of these, so every dashboard page that
  already used them gets the new states.
* Search with no results (`SearchEmpty`): opportunity board, jobs abroad, free resources, dashboard search, career applications admin.

## Rules

* A server or network failure is `error.tsx` / `ErrorState`, never `notFound()`. Data helpers return `null` for "no such record" and **throw**
  for a failed request (`getOpportunity`, `getProfessional`).
* Skeletons must match the real layout (same container, same hero spacing) so nothing jumps when the page arrives.
* Anything that moves respects `prefers-reduced-motion`.
