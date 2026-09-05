// corroboration-report.js — the /corroborate door's report, rendered as
// lines. Pure, so the render is tested against the organ's real return
// shape instead of the shape app.js once assumed.
//
// WHY THIS FILE EXISTS. corroborateLedger (eoreader7 organs/corroboration.js)
// returns `standings` as a KEYED object — {settled, contested, disconfirmed,
// thin}, each a list of note ids (the walk's own askValue verdicts) — and
// `contradicted` entries that are LANDED disputes since P88 (each carries
// `disputeId` / `landed` / `refused`). app.js's render called
// `report.standings.filter(...)` and printed "contradicted (reported, never
// landed)": the door threw right after the ledger was written back, and the
// one live path that lands a contest read as a crash (Pass 15, 2026-09-05).
// A render the organ's own tests never reach is P41 one level up — the
// caller's assumption wearing the organ's face — so the lines are built here
// and pinned by corroboration-report.test.mjs against that shape.

const n = (x) => (Array.isArray(x) ? x.length : 0);

/**
 * @param {object} report — corroborateLedger's return value
 * @param {{maxAsks:number, sourceCount:number}} ctx
 * @returns {{lines:string[], settled:number, landed:number, refused:number}}
 */
export function corroborationLines(report, { maxAsks, sourceCount }) {
  const standings = report?.standings && !Array.isArray(report.standings) ? report.standings : {};
  const settled = n(standings.settled);
  const contested = n(standings.contested);
  const disconfirmed = n(standings.disconfirmed);
  const contradicted = Array.isArray(report?.contradicted) ? report.contradicted : [];
  const landed = contradicted.filter((c) => c.landed).length;
  const refused = contradicted.filter((c) => c.refused).length;
  const attested = Array.isArray(report?.attested) ? report.attested : [];
  const lines = [
    `corroboration: ${report?.asks ?? 0} of ${maxAsks} ask(s) spent across ${sourceCount} source(s).`,
    `attested: ${attested.length} · contradicted: ${contradicted.length} (landed as disputes: ${landed}${refused ? `, refused by the act: ${refused}` : ""}) · skipped without an ask (no co-presence): ${report?.skippedNoCopresence ?? 0}.`,
    settled
      ? `notes now settled at the walk's own floor: ${settled}${contested ? ` · contested (ran out before a third source): ${contested}` : ""}${disconfirmed ? ` · disconfirmed: ${disconfirmed}` : ""}.`
      : `no note settled this walk — a measured outcome, not a failure to walk${contested ? ` · contested: ${contested}` : ""}${disconfirmed ? ` · disconfirmed: ${disconfirmed}` : ""}.`,
  ];
  for (const a of attested.slice(0, 6)) lines.push(`  ✓ ${a.note?.id ?? a.noteId ?? "?"} — witnessed by ${a.source ?? a.ref ?? "?"}`);
  for (const c of (Array.isArray(report?.contests) ? report.contests : []).slice(0, 4))
    lines.push(`  ⇄ contested: ${c.noteId} (stating: ${(c.stating ?? []).join(", ") || "—"} · contradicting: ${(c.contradicting ?? []).join(", ") || "—"})`);
  return { lines, settled, landed, refused };
}
