// ground-ladder.js — where a sentence stands, read off the whole cube,
// unconsciously (P115). Pure.
//
// User direction (2026-09-05): "it's not well cited … if the model is
// saying it itself, cite the model name", then "have it fully leverage the
// cube unconsciously". A sentence's ground is not one bit (material /
// model): it is the highest rung a ladder of terrains can place it on, and
// every rung is something the instrument already computes. The ladder,
// top down, each rung its cell (the canon stays backstage — the reader
// sees plain words and addresses, never a cell):
//
//   bound      CON·Figure  (Link)     the relation tier bound a claim on it → the edge's own byte address
//   witnessed  EVA·Figure  (Lens)     the sentence witness pointed at a passage that states it → that passage
//   recorded   SYN·Figure  (Link/Network) its claim is a note on the ledger → the note's witnesses, by source
//   derived    SYN·Pattern (Paradigm) it states a fact derived on the record → the premises' ids
//   contested  CON·Figure·CONTESTED   its claim is under a live dispute → both sides, named
//   named      SIG·Ground  (Entity)   its names resolve to referents the material establishes, the claim does not → where they are established
//   self       the mouth              nothing read places it: it is the model's own testimony, cited by name (P39: self:model is a witness with a name)
//
// A rung is a finding only when its organ REACHED the sentence (THE-NULL-
// STATES law 3): a witness that was never asked is not a refusal, and the
// ladder says which rungs were skipped.
const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const toks = (t) => fold(t).replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter((w) => w.length > 2);
const sourceOf = (w) => String(w ?? "").split("~")[0];
const claimKey = (c) => `${fold(c.end1 ?? c.subject)}|${fold(c.label ?? c.verb)}|${fold(c.end2 ?? c.object)}`;

export const TIERS = Object.freeze(["bound", "witnessed", "recorded", "derived", "contested", "named", "self"]);
export const CELL_OF = Object.freeze({ bound: "CON·Figure", witnessed: "EVA·Figure", recorded: "SYN·Figure", derived: "SYN·Pattern", contested: "CON·Figure·CONTESTED", named: "SIG·Ground", self: "self:model" });

/** Capitalised runs in a sentence — the names it uses (never a referent by itself; resolution is the index's). */
export function namesIn(sentence) {
  const out = [];
  const text = String(sentence ?? "");
  for (const m of text.matchAll(/(?:^|[^\p{L}])((?:\p{Lu}[\p{L}\p{N}'’.-]*)(?:\s+(?:of|the|de|von|van|and|&)?\s*\p{Lu}[\p{L}\p{N}'’.-]*)*)/gu)) {
    // a sentence-initial function word is not part of the name it precedes
    const n = m[1].trim().replace(/[.,;:]+$/, "").replace(/^(?:The|This|That|These|Those|It|In|On|At|By|For|From|With|As|A|An|And|But|Or|So|If|When|While|Their|Its|His|Her|They|He|She|We|You|I)\s+/, "");
    if (!(n.length > 2) || /^(The|This|That|These|Those|It|In|On|At|By|For|From|With|As|A|An|And|But|Or|So|If|When|While|Their|Its|His|Her|They|He|She|We|You|I)$/.test(n)) continue;
    // ONE capitalised word at the start of a sentence, or inside a quoted
    // title, is capitalisation — not evidence of a name (L2: capitalisation
    // is a differentiator, never the primary signal). Measured 2026-09-05:
    // "Some", "Trust", "Want", "Believe" reached the footnotes as names.
    // A single-token name counts only mid-sentence and outside quotes.
    if (!/\s/.test(n)) {
      const at = m.index + m[0].indexOf(n);
      const before = text.slice(0, at);
      const sentenceInitial = /(^|[.!?]\s*["“”']*\s*)$/.test(before);
      // inside quotes when an odd number of quote marks precede it
      const quotedTitle = ((before.match(/["“”]/g) ?? []).length % 2) === 1;
      if (sentenceInitial || quotedTitle) continue;
    }
    out.push(n);
  }
  return [...new Set(out)];
}

/** The passage (by ref) whose folded text contains `needle`, or null. */
function passageHolding(needle, passages) {
  const f = fold(needle);
  if (!f) return null;
  for (const p of passages ?? []) if (fold(p.text ?? "").includes(f)) return p.ref ?? null;
  return null;
}

/**
 * groundOf(sentence, ctx) → { tier, cell, addresses, phrase, detail, reached }
 * ctx: { claims, witness, notes, derived, disputes, passages, resolveName, model }
 */
export function groundOf(sentence, ctx = {}) {
  const { claims = [], witness = null, notes = [], derived = [], disputes = null, passages = [], resolveName = null, model = null } = ctx;
  const mine = claims.filter((c) => c.sentence === sentence);
  const reached = { relation: mine.length > 0, witness: Boolean(witness && witness.witness !== "skipped"), ledger: notes.length > 0, index: typeof resolveName === "function" };
  // 1. bound
  const bound = mine.filter((c) => c.verdict === "bound");
  if (bound.length) {
    const addresses = [...new Set(bound.flatMap((c) => (c.spans?.length ? c.spans.map((sp) => sp.ref ? `${sp.ref}` : null) : c.refs ?? [])).filter(Boolean))];
    const contested = disputes && bound.some((c) => disputes.has(claimKey(c)));
    if (contested) return { tier: "contested", cell: CELL_OF.contested, addresses, phrase: "stated, and disputed", detail: `bound to ${addresses.join(", ")}; under a live dispute on the record`, reached };
    return { tier: "bound", cell: CELL_OF.bound, addresses, phrase: "stated at", detail: `the relation tier bound ${bound.length} claim(s) to the source's bytes`, reached };
  }
  // 2. witnessed
  if (witness?.witness === "states") {
    const ref = witness.span?.ref ?? passageHolding(witness.decider, passages);
    return { tier: "witnessed", cell: CELL_OF.witnessed, addresses: ref ? [ref] : [], phrase: "a passage states this", detail: witness.decider ? `the witness pointed at: “${String(witness.decider).slice(0, 120)}”` : "the witness pointed at a passage", reached };
  }
  // 3. recorded / 5. contested — the sentence's claims (any verdict) matched to notes on the ledger
  const keys = new Set(mine.map(claimKey));
  const onRecord = notes.filter((n) => keys.has(claimKey(n)));
  if (onRecord.length) {
    const witnesses = [...new Set(onRecord.flatMap((n) => (n.witnesses ?? []).map(sourceOf)))];
    const disputed = onRecord.filter((n) => (n.disputedBy?.length ?? 0) > 0);
    if (disputed.length) return { tier: "contested", cell: CELL_OF.contested, addresses: witnesses, phrase: "on the record, and disputed", detail: `disputed by ${[...new Set(disputed.flatMap((n) => n.disputedBy))].join(", ")}`, reached };
    const sources = new Set(witnesses.map((w) => w.split("#")[0]));
    return { tier: "recorded", cell: CELL_OF.recorded, addresses: witnesses, phrase: sources.size >= 2 ? `on the record from ${sources.size} sources` : "on the record from one source", detail: `${onRecord.length} note(s), ${witnesses.length} witness address(es)`, reached };
  }
  // 4. derived
  const st = new Set(toks(sentence));
  const dv = derived.filter((d) => toks(d.subject ?? d.end1).every((w) => st.has(w)) && toks(d.object ?? d.end2).every((w) => st.has(w)) && toks(d.verb ?? d.label).some((w) => st.has(w)));
  if (dv.length) return { tier: "derived", cell: CELL_OF.derived, addresses: dv.flatMap((d) => d.premises ?? []), phrase: "derived on the record", detail: `follows from ${dv[0].premises?.length ?? "?"} earlier claim(s), stated by no source`, reached };
  // 6. named
  if (typeof resolveName === "function") {
    const names = namesIn(sentence);
    const established = [];
    for (const nm of names) { let ids; try { ids = resolveName(nm); } catch { ids = null; } if (ids && (ids.size ?? ids.length ?? 0) > 0) { const ref = passageHolding(nm, passages); established.push({ name: nm, ref }); } }
    if (established.length) return { tier: "named", cell: CELL_OF.named, addresses: [...new Set(established.map((e) => e.ref).filter(Boolean))], phrase: "names established, claim not", detail: `${established.map((e) => e.name).join(", ")} resolve to referents the material establishes; the claim itself was not placed`, names: established.map((e) => e.name), reached };
  }
  // 7. self
  const refused = witness?.witness === "refused";
  return { tier: "self", cell: CELL_OF.self, addresses: [], phrase: model ? `${model}` : "the model", detail: refused ? "the witness was asked and no passage states it; this is the model's own testimony" : reached.witness ? "no rung placed it; the model's own testimony" : "no rung placed it and the witness was not asked (budget); the model's own testimony, unexamined", refused, reached };
}

/** The reader's line for a ground, plain words and addresses. */
export function groundLine(g) {
  if (!g) return "";
  if (g.tier === "self") return `${g.phrase}${g.refused ? " — no source states this" : ""}`;
  return `${g.phrase}${g.addresses?.length ? ` ${g.addresses.slice(0, 3).join(", ")}${g.addresses.length > 3 ? ` (+${g.addresses.length - 3})` : ""}` : ""}`;
}
