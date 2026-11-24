# GIF colour system (from 24 November 2026)

This replaces the amber/nightfall treatment (and the older maroon) on gif.ielsco.com and on the GIF pieces of ielsco.com
(the GIF feature, the recruitment popup and the `/dashboard/gif` workspace). IELSco's own design language is unchanged:
type, spacing, cards, pill buttons, header and footer.

| Token | Hex | Use |
|---|---|---|
| Sky blue (primary accent) | `#5BC2E7` | Fills, bars, rules, status dots, CTA buttons with deep text. Text only on dark surfaces. |
| Sky ink | `#176A8C` | Sky-blue text and links on white. |
| Sky soft | `#8FD6F0` | Sky text and eyebrows on the gradient or deep surfaces. |
| Sky wash / line | `#EAF6FB` / `#C6E7F4` | Light panels, badges, table headers, borders. |
| Signature gradient | `#3E9396` → `#102129`, 135° | Hero, programme bands, Super Early Bird card, Grand Finale, prize highlight. |
| Teal ink | `#2B7477` | Teal text on white (kickers, labels); white text on teal chips. |
| Deep | `#102129` | Headings, body ink, primary buttons, dark surfaces. |
| White | `#FFFFFF` | Page surface. |
| Coral | `#E56668` | IELSco error and alert states only, never a GIF accent. |

## Contrast (WCAG 2.1 AA)

| Pair | Ratio | Rule |
|---|---|---|
| Sky `#5BC2E7` on white | 2.0:1 | Never text; fills and rules only. |
| Sky on deep `#102129` | 8.1:1 | OK for text. |
| Deep on sky (sky buttons) | 8.1:1 | OK for button labels. |
| Sky ink `#176A8C` on white | 6.0:1 | OK for text and links. |
| Sky soft `#8FD6F0` on deep | 10.3:1 | OK for text. |
| White on teal `#3E9396` | 3.6:1 | Large text only. Small text sits on the deep half of the gradient or under a veil. |
| White on deep | 16.5:1 | OK. |
| Teal ink `#2B7477` on white | 5.4:1 | OK. |

The sky-blue value is not formally documented in the IELSco brand assets the repo can see. `#5BC2E7` was chosen to sit
beside the gradient's teal and to read as clear sky blue, so please confirm it against the official brand guide (Figma
was out of scope for this change). The code tokens live in `apps/gif/src/app/globals.css` (GIF brand layer); ielsco.com
uses the same values as constants in `src/components/gif-public/*` and `src/app/dashboard/gif/page.tsx`.

## Logos

Use the official files only: `apps/gif/public/brand/gif-logo.png` (and the white/navy icons) and the IELSco wordmarks. On
the gradient or a photo the GIF logo is shown in white (CSS invert); it is never recoloured, redrawn or stretched.
