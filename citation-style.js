// citation-style.js — a source's reference, formatted a declared way.
//
// User direction, 2026-09-09: "think through how to make an APA style
// citations document... or MLA, or several other standard versions we can
// toggle between." Pure and small on purpose: this formats a REFERENCE
// object into a line of text in a named style. It does not gather metadata
// (app.js's sourceMeta does that, against whatever this instrument actually
// knows about a source) and it never invents a field it was not given —
// the same discipline this whole instrument holds for a citation a MODEL
// might write (P20: a fabricated link never ships as a plain, working-
// looking citation), applied here to a field this renderer itself might be
// tempted to guess at (an author, a date) rather than disclose as absent.
//
// A REFERENCE, as handed in:
//   { name, title, author, site, url, accessedOn, kind }
//     name       the source's own name in this instrument (pasted.txt, a
//                filename, a host) — always present, the one field that
//                can never be missing since it is how the source is found.
//     title      the page/document's own title, when known.
//     author     a person or organization credited as author, when known.
//     site       the site or publication name (often the host), when known.
//     url        the address, when the source came from the web.
//     accessedOn a Date — when THIS instrument read it, not when it was
//                published. Supplied by the caller (app.js stamps it at
//                compose time), never invented here.
//     kind       "web" | "attached" — attached material (pasted, uploaded)
//                has no publisher and no date to cite; both styles below
//                have a real, standard way to say that, not a blank.
//
// Every field but `name` and `kind` may be null. A style formats what it
// has and names what it does not — "n.d." (no date) and an organizational
// author standing in for a personal one are both real, standard practice
// in every style below, not a workaround invented here.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), m: MONTHS[d.getMonth()], day: d.getDate() };
}

/** The organization/author APA and MLA both fall back to when a source
 *  names no person — the site itself, or failing that the source's own
 *  name in this instrument. Never blank: a reference with truly nothing
 *  to stand as its author is not a reference either style recognizes. */
function creditedAs(ref) {
  return ref.author ?? ref.site ?? ref.name;
}

/** APA (7th ed. shape) — Author. (Year, Month Day). Title. Site. URL
 *  Attached material (no publisher, no date) cites as unpublished —
 *  APA's own convention for material with no public existence to date. */
export function formatAPA(ref) {
  if (ref.kind === "attached") {
    return `${ref.name}. (n.d.). [Unpublished material attached to this conversation].`;
  }
  const who = creditedAs(ref);
  const d = fmtDate(ref.accessedOn);
  // A page's own PUBLISH date is not something this instrument ever
  // learns (only when it was read is known) — "n.d." is standard APA
  // practice for exactly that, never a workaround.
  const title = ref.title ?? ref.name;
  const site = ref.site && ref.site !== who ? ` ${ref.site}.` : "";
  const retrieved = d ? ` Retrieved ${d.m} ${d.day}, ${d.y}, from` : "";
  const url = ref.url ? ` ${ref.url}` : "";
  return `${who}. (n.d.). ${title}.${site}${retrieved}${url}`.replace(/\s+/g, " ").trim();
}

/** MLA (9th ed. shape) — "Title." Site, URL. Accessed Day Month Year. */
export function formatMLA(ref) {
  if (ref.kind === "attached") {
    return `"${ref.name}." Attached material, n.d.`;
  }
  const title = ref.title ?? ref.name;
  const site = ref.site ?? ref.url ?? "";
  const url = ref.url ? `, ${ref.url}` : "";
  const d = fmtDate(ref.accessedOn);
  const accessed = d ? ` Accessed ${d.day} ${d.m}. ${d.y}.` : "";
  return `"${title}." ${site}${url}.${accessed}`.replace(/\s+/g, " ").trim();
}

/** This instrument's own native address style — a source's name and, when
 *  it has one, its URL. Not a citation format so much as the honest floor
 *  every style above is dressing up: what this reader can actually name. */
export function formatPlain(ref) {
  return ref.url ? `${ref.name} — ${ref.url}` : ref.name;
}

export const CITATION_STYLES = Object.freeze({
  apa: { label: "APA", format: formatAPA },
  mla: { label: "MLA", format: formatMLA },
  plain: { label: "plain", format: formatPlain },
});

export const DEFAULT_CITATION_STYLE = "apa";

/** formatReference(ref, style) — style is a key of CITATION_STYLES; an
 *  unknown style is refused rather than silently falling back, so a typo
 *  in a caller is visible immediately. */
export function formatReference(ref, style) {
  const s = CITATION_STYLES[style];
  if (!s) throw new RangeError(`formatReference: unknown style "${style}" — one of ${Object.keys(CITATION_STYLES).join(", ")}`);
  return s.format(ref);
}
