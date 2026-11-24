# GIF Summer 2027: brand colours, destination photography and campus references

## Colour identity (apps/gif only)

IELSco provides the design language (Poppins / Plus Jakarta Sans, spacing, cards, pill buttons, header and footer). GIF adds
its own colour identity, defined as `--gif-*` tokens in `apps/gif/src/app/globals.css`. The main IELSco site and Elco are not
affected (separate apps).

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--gif-amber` | `#B8862E` | Brand amber: rules, icons, timeline keys, large figures, gradient glow | 3.2:1 on white and on Nightfall: decorative / large only |
| `--gif-amber-ink` | `#8C6420` | Amber text on light backgrounds (eyebrows, accent word, numbering) | 5.3:1 on white |
| `--gif-amber-soft` | `#E0B865` | Amber text on Nightfall | 5.6:1 on `#304156`, 7.7:1 on `#1F2B3A` |
| `--gif-amber-wash` / `--gif-amber-line` | `#FBF5E9` / `#EAD9B8` | Deadline strip, numbered chips, open FAQ | — |
| `--gif-nightfall` | `#304156` | Primary (buttons, active nav, dark bands); practically IELSco navy `#2F4157` | white 10.4:1 |
| `--gif-nightfall-mid` / `-deep` | `#26354A` / `#1F2B3A` | Gradient depth | — |
| `--gif-mist` | `#C8D2DD` | Secondary text on Nightfall | 6.8:1 |

Gradients: `--gif-grad-night` (160°, Nightfall → deep Nightfall), `--gif-glow-amber` (soft radial amber, 26% max), and
`--gif-photo-veil` (photo overlay to 92% Nightfall). There are no amber buttons, because a 16px label would fail WCAG AA.

## Photographs

All destination and campus photographs are genuine photographs from Wikimedia Commons, downloaded on 21 Nov 2026 as 1920px
renditions and converted to WebP (`apps/gif/public/places`). Changes: resized and converted, Wat Arun cropped to the temple, and
(since 25 Nov 2026) shown in black and white with a dark overlay on the site (CSS filter; the files keep their colour). Adapted CC BY-SA photographs remain under CC BY-SA. Attribution is shown on the photo,
on `/photo-credits`, and below.

| File | Subject | Author | Licence | Source |
|---|---|---|---|---|
| singapore-marina-bay-dusk.webp | Marina Bay at dusk (home hero) | Benh LIEU SONG | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Singapore_Marina_Bay_Dusk_2018-02-27.jpg) |
| singapore-cbd-dusk.webp | Singapore CBD at dusk (closing call to action) | Basile Morin | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Skylines_of_the_Central_Business_District,_Singapore_at_dusk.jpg) |
| singapore-merlion.webp | Merlion, Marina Bay | Diego Delso | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Merli%C3%B3n,_Marina_Bay,_Singapur,_2023-08-18,_DD_42-44_HDR.jpg) |
| kuala-lumpur-petronas-towers.webp | Petronas Twin Towers at dusk | James Kerwin | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:The_Twins_SE_Asia_2019_(49171985716).jpg) |
| bangkok-wat-arun-night.webp | Wat Arun at night (cropped) | Jonashtand | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:202307_Wat_Arun_at_night.jpg) |
| campus-nus-university-town.webp | NUS University Town, Kent Ridge | Joshua Rommel Hayag Vargas | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:University_Town_Skyline_from_Northwest_Kent_Ridge_Campus,_National_University_of_Singapore,_February_2020.jpg) |
| campus-um-dewan-tunku-canselor.webp | Dewan Tunku Canselor, Universiti Malaya | PeaceSeekers | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Dewan_Tunku_Canselor_at_night.jpg) |
| campus-utm-chancellor-building.webp | Sultan Ibrahim Chancellor Building, UTM | Chongkian | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Sultan_Ibrahim_Chancellor_Building.jpg) |
| campus-chulalongkorn-auditorium.webp | Chulalongkorn University Auditorium | Supanut Arunoprayote | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Chulalongkorn_University_Auditorium.jpg) |

The UTM photo is in the data set (`CAMPUS_PHOTOS`) but appears only if UTM is added to `settings.universities`. The
planned-engagement list is a content decision and was not changed. The GIF 2026 delegate photos are IELSco's own.

## University logos: not used

Official logos of NUS, Universiti Malaya, UTM and Chulalongkorn University are deliberately **not** used.

- Every campus visit is still "Planned engagement". A university's official mark next to a programme reads as partnership or
  endorsement.
- University brand guidelines generally limit use of the logo to the university and its approved partners, so using it
  requires the institution's permission.

Campuses are therefore shown with independent photographs and the wording "Planned engagement · subject to confirmation". Once
a university confirms in writing **and** grants permission to use its logo, add the official file supplied by that university
(unmodified, with its clear-space rules) and change its status to `confirmed` in Admin → Content.
