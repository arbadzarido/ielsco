// Concise display name: the first two words ("Nadia Putri Rahma" -> "Nadia Putri"), the single word if there is only
// one, or the fallback when the name is missing. An email address is shortened to its local part.
export function shortName(full: string | null | undefined, fallback = "IELS member"): string {
  const clean = (full || "").replace(/@.*$/, "").replace(/\s+/g, " ").trim();
  if (!clean || clean === "Learner") return fallback;
  return clean.split(" ").slice(0, 2).join(" ");
}
