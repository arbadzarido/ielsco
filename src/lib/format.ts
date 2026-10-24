export const idr = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const dateWib = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", ...opts }).format(typeof d === "string" ? new Date(d) : d);

export const dateTimeWib = (d: string | Date) =>
  `${dateWib(d, { weekday: "short", day: "numeric", month: "short" })} · ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(typeof d === "string" ? new Date(d) : d)} WIB`;
