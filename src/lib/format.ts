import { SOURCE_ZONE, formatDate, formatDateTime } from "@/lib/time/zone";

export const idr = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// Date / date-time in a given IANA zone (defaults to IELSco's official zone, Asia/Jakarta). Member-facing pages pass
// the viewer's zone from useViewerZone(); the WIB default stays for internal admin screens and server-side text.
export const dateIn = (d: string | Date, zone: string = SOURCE_ZONE, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  formatDate(d, zone, opts);

/** "Wed 11 Nov · 19:00 WIB": always labelled with the zone. */
export const dateTimeIn = (d: string | Date, zone: string = SOURCE_ZONE) => formatDateTime(d, zone);

/** Official-zone (WIB) helpers, for admin screens and fixed text. */
export const dateWib = (d: string | Date, opts?: Intl.DateTimeFormatOptions) => dateIn(d, SOURCE_ZONE, opts);
export const dateTimeWib = (d: string | Date) => dateTimeIn(d, SOURCE_ZONE);
