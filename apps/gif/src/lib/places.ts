// Destination and campus photography for GIF Summer 2027.
// Every photo is a genuine photograph from Wikimedia Commons under a Creative Commons licence (or CC0), downloaded on
// 21 Nov 2026, resized and converted to WebP (Wat Arun also cropped). Attribution is shown on /photo-credits and in
// docs/gif-platform/PHOTO-CREDITS.md; CC BY-SA images keep their licence (the adapted files are shared under it too).
// Campus photos are campus references only: they do not mean a visit, partnership or endorsement is confirmed.

export type Credit = { author: string; license: string; licenseUrl: string; source: string; title: string; changes: string };
export type Place = { key: string; src: string; w: number; h: number; alt: string; credit: Credit; focus?: string };

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
const BY_4 = { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" };
const BY_2 = { license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" };
const RESIZED = "Resized and converted to WebP; shown in black and white with a dark overlay on the site.";

export const PLACES = {
  marinaBay: { key: "marinaBay", src: "/places/singapore-marina-bay-dusk.webp", w: 1920, h: 723,
    alt: "Marina Bay, Singapore, at dusk: Marina Bay Sands on the left and the Central Business District skyline across the water",
    credit: { author: "Benh LIEU SONG", ...BY_SA_4, source: commons("Singapore_Marina_Bay_Dusk_2018-02-27.jpg"), title: "Singapore Marina Bay Dusk 2018-02-27", changes: RESIZED } },
  cbdDusk: { key: "cbdDusk", src: "/places/singapore-cbd-dusk.webp", w: 1920, h: 1280,
    alt: "Singapore's Central Business District and Marina Bay at dusk, seen from above",
    credit: { author: "Basile Morin", ...BY_SA_4, source: commons("Skylines_of_the_Central_Business_District,_Singapore_at_dusk.jpg"), title: "Skylines of the Central Business District, Singapore at dusk", changes: RESIZED } },
  merlion: { key: "merlion", src: "/places/singapore-merlion.webp", w: 1920, h: 1280, focus: "22% 60%",
    alt: "The Merlion statue at Marina Bay, Singapore, at blue hour with the city lights behind",
    credit: { author: "Diego Delso", ...BY_SA_4, source: commons("Merli%C3%B3n,_Marina_Bay,_Singapur,_2023-08-18,_DD_42-44_HDR.jpg"), title: "Merlión, Marina Bay, Singapur, 2023-08-18, DD 42-44 HDR", changes: RESIZED } },
  petronas: { key: "petronas", src: "/places/kuala-lumpur-petronas-towers.webp", w: 1920, h: 1280,
    alt: "The Petronas Twin Towers rising above the Kuala Lumpur skyline at dusk",
    credit: { author: "James Kerwin", ...BY_2, source: commons("The_Twins_SE_Asia_2019_(49171985716).jpg"), title: "The Twins SE Asia 2019", changes: RESIZED } },
  watArun: { key: "watArun", src: "/places/bangkok-wat-arun-night.webp", w: 1075, h: 821,
    alt: "Wat Arun, the Temple of Dawn, lit up at night on the bank of the Chao Phraya River in Bangkok",
    credit: { author: "Jonashtand", ...BY_SA_4, source: commons("202307_Wat_Arun_at_night.jpg"), title: "202307 Wat Arun at night", changes: "Cropped to the temple, resized and converted to WebP; shown in black and white with a dark overlay on the site." } },
  nus: { key: "nus", src: "/places/campus-nus-university-town.webp", w: 1920, h: 1440,
    alt: "University Town at the National University of Singapore's Kent Ridge campus, seen across the trees",
    credit: { author: "Joshua Rommel Hayag Vargas", ...BY_SA_4, source: commons("University_Town_Skyline_from_Northwest_Kent_Ridge_Campus,_National_University_of_Singapore,_February_2020.jpg"), title: "University Town Skyline from Northwest Kent Ridge Campus, National University of Singapore, February 2020", changes: RESIZED } },
  um: { key: "um", src: "/places/campus-um-dewan-tunku-canselor.webp", w: 1920, h: 1301,
    alt: "Dewan Tunku Canselor, the hall of Universiti Malaya in Kuala Lumpur, at night",
    credit: { author: "PeaceSeekers", ...BY_4, source: commons("Dewan_Tunku_Canselor_at_night.jpg"), title: "Dewan Tunku Canselor at night", changes: RESIZED } },
  utm: { key: "utm", src: "/places/campus-utm-chancellor-building.webp", w: 1920, h: 1440,
    alt: "The Sultan Ibrahim Chancellor Building at Universiti Teknologi Malaysia, Skudai, with palm trees in front",
    credit: { author: "Chongkian", ...BY_SA_4, source: commons("Sultan_Ibrahim_Chancellor_Building.jpg"), title: "Sultan Ibrahim Chancellor Building", changes: RESIZED } },
  chula: { key: "chula", src: "/places/campus-chulalongkorn-auditorium.webp", w: 1920, h: 1280,
    alt: "The white Thai-style Chulalongkorn University Auditorium in Bangkok on a sunny day",
    credit: { author: "Supanut Arunoprayote", ...BY_SA_4, source: commons("Chulalongkorn_University_Auditorium.jpg"), title: "Chulalongkorn University Auditorium", changes: RESIZED } },
} satisfies Record<string, Place>;

// The route, in order. Flags are emoji (text), never images.
export const DESTINATIONS = [
  { country: "Singapore", flag: "🇸🇬", stop: "01", place: "Marina Bay", city: "Singapore", photo: PLACES.merlion,
    line: "Where the route begins: a global city, its universities and its startup scene." },
  { country: "Malaysia", flag: "🇲🇾", stop: "02", place: "Petronas Twin Towers", city: "Kuala Lumpur", photo: PLACES.petronas,
    line: "The middle of the route: a fast-growing capital where tradition meets technology." },
  { country: "Thailand", flag: "🇹🇭", stop: "03", place: "Wat Arun", city: "Bangkok", photo: PLACES.watArun,
    line: "The end of the route: a creative, entrepreneurial city on the Chao Phraya River." },
] as const;

// Campus references, keyed by the university name used in cohort settings (settings.universities). Shown with the
// planned/confirmed status from settings, never as a partnership. Official logos are deliberately not used: see
// docs/gif-platform/PHOTO-CREDITS.md ("University logos").
export const CAMPUS_PHOTOS: Record<string, Place> = {
  "National University of Singapore (NUS)": PLACES.nus,
  "Universiti Malaya": PLACES.um,
  "Universiti Teknologi Malaysia (UTM)": PLACES.utm,
  "Chulalongkorn University": PLACES.chula,
};

export const ALL_CREDITS: Place[] = Object.values(PLACES);
