// thea.js — SYN · Structure · Generate. The arranger: she never detects.
// She MAY invent — a transition, a smoothing, a bridge her givens need but
// do not state — and LOGOS restricts: an invention lands iff it does not
// turn the argument back on itself (no claim cycle over what stands plus
// what she would add). Without a logos checker handed in, no invention
// lands: invention without logos is a gap, never prose.
//
// Everything else she produces is a synthesis of material someone else
// already gathered and handed to her — passages, prior parts, retrieved
// evidence.
//
// Two grains, two jobs, never blurred:
//
//   FIGURE (Making — SYN·Figure·Link) — given one part's own retrieved
//   passages and nothing else, write that part. Every claim in it must trace
//   to a passage handed here; if the passages don't support something the
//   part would need, that is a named gap, never a bridge. She does not see
//   other parts, other drafts, or the shape of the whole.
//
//   PATTERN (Composing — SYN·Pattern·Network) — given several already-written
//   parts, each already checked against its own sources, join them into one
//   coherent whole under headings. Transitions smoothed and ordering resolved,
//   but no claim introduced that doesn't already exist in one of the handed
//   parts, and no part's disclosed gap silently dropped.
//
// What is never her job, at either grain: deciding whether a candidate is
// worth keeping (CON, Wilson's), splitting material into specialized readings
// (SEG, Wilson's), or re-grounding a failed search at a lower level (REC,
// also Wilson's). Asked any of those, she refuses: the request belongs to
// the swarm, not to her.
//
// SYN·Ground (Cultivating·Field) is declared but unbuilt: no caller yet asks
// her to compose a frame before any part exists. Such a request is a new kind
// of request, not an extension of Figure or Pattern work.
//
// PURE. No imports, no model calls, no retrieval. Support between a line and
// a passage is checked mechanically (shared content tokens), injectable for
// callers with a stronger organ. Soundness of an invention is checked by an
// injected logos organ (logos.js's own `logos(notes)` shape: flat
// {end1,label,end2} notes -> found cycles), never re-derived here. Output
// is only the composed material plus disclosed gaps — never a schema, never
// a verdict, never a confidence claim.

export const CELL_FIGURE = Object.freeze({
  op: "SYN", grain: "Figure", mode: "Generate", domain: "Structure",
  terrain: "Link", stance: "Making",
});

export const CELL_PATTERN = Object.freeze({
  op: "SYN", grain: "Pattern", mode: "Generate", domain: "Structure",
  terrain: "Network", stance: "Composing",
});

// Declared but unbuilt — no caller invokes this; kept so the address exists.
export const CELL_GROUND = Object.freeze({
  op: "SYN", grain: "Ground", mode: "Generate", domain: "Structure",
  terrain: "Field", stance: "Cultivating", built: false,
});

export const THEA_REFUSALS = Object.freeze({
  // The swarm's jobs, refused here with the owner named.
  KEEP_DECISION: "keep_decision", // CON, Wilson's: worth keeping
  SPLIT_READINGS: "split_readings", // SEG, Wilson's: split into readings
  REGROUND_SEARCH: "reground_search", // REC, Wilson's: re-ground at lower level
  // Her own unbuilt grain.
  GROUND_UNBUILT: "ground_unbuilt", // SYN·Ground: frame before any part
  // Figure/Pattern input failures, typed so a caller can repair.
  NO_PASSAGES: "no_passages",
  UNSUPPORTED_LINE: "unsupported_line",
  NO_PARTS: "no_parts",
  UNKNOWN_BACK_REF: "unknown_back_ref",
  // Invention under logos: typed so a caller can repair.
  NO_LOGOS: "no_logos", // invention offered but no soundness checker handed in
  LOGOS_REFUSAL: "logos_refusal", // invention turns the argument back on itself
  LOGOS_ERROR: "logos_error", // the checker itself failed — fail closed, never land on an unchecked invention
  UNDECLARED_CONTENT: "undeclared_content", // invention states what its edges never declare — logos cannot restrict what it cannot see
  UNGROUNDED: "ungrounded", // invention names no premises, or premises not yet standing — derivation runs in dependency order, never free
});

const STOP = new Set(
  "a,an,the,and,or,but,of,to,in,on,for,with,as,at,by,from,is,are,was,were,be,been,it,its,this,that,these,those,there,their,they,he,she,we,you,i,not,no,do,does,did,have,has,had,will,would,can,could,should,may,might".split(","),
);

const norm = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function contentTokens(t) {
  return norm(t).split(/[^a-z0-9\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u4e00-\u9fff]+/u)
    .filter((w) => w && w.length > 2 && !STOP.has(w));
}

/** Default mechanical support: a line and a passage share at least two
 * content tokens. One shared word — usually a bare name — is presence, not
 * support (the referent-model gap: "Hamlin invented the telegraph" shares
 * "Hamlin" with a passage about Hamlin chairing the Senate and is backed by
 * nothing). The floor of 2 is structural, reused from admission's and
 * binding's own minimum, never tuned to a specimen. Widening or narrowing
 * this is a caller decision, never done silently. */
export function defaultSupports(lineText, passageText) {
  const line = new Set(contentTokens(lineText));
  if (line.size < 2) return false;
  let shared = 0;
  for (const w of contentTokens(passageText)) {
    if (line.has(w) && ++shared >= 2) return true;
  }
  return false;
}

/**
 * tryInvents({ invents, standing, given, soundCheck }) — the one place
 * invention is admitted, both grains. Derivation runs in DEPENDENCY ORDER,
 * never as post-processing: nothing is generated and then filtered. Each
 * invent is { text, edges: [...], restsOn: [...], standpoint } and lands
 * iff, in order:
 *
 *   (1) coverage — every content token of its text appears in its edges
 *       (UNDECLARED_CONTENT gap otherwise; logos cannot restrict what it
 *       cannot see);
 *   (2) premises — a content-bearing invention names what it rests on, and
 *       every named premise already stands: a handed given (passage ref,
 *       part id), a standing edge (e<N>), or an earlier-landed invention
 *       (i<N>). Nothing resting on nothing, nothing resting on what has
 *       not yet landed (UNGROUNDED gap either way);
 *   (3) judgment — `soundCheck` over standing+edges finds no cycle
 *       (LOGOS_REFUSAL), the checker having run at all (NO_LOGOS without
 *       one, LOGOS_ERROR on failure — fail closed).
 *
 * Contentless tissue ("And so.") derives nothing and needs no premises;
 * gates (1) and (3) still run.
 *
 * The archons seated here, each at its own step and never another's:
 *   Thea (SYN) — arranges; owns this module and the mark prose carries.
 *   Minos (EVA) — judges; `soundCheck` is his seat (logos.js's organ).
 *     Thea never judges her own inventions and Minos never arranges.
 *   Mahavira (DEF) — keeps standpoints apart; every invention carries the
 *     standpoint it speaks from (default: the arranger's own), rendered
 *     in its mark, so an invention never merges into an unattributed voice.
 * Camillus (REC) has no seat here: nothing is conceded on this path.
 */
export function tryInvents({ invents = [], standing = [], given = [], soundCheck = null } = {}) {
  const landed = [];
  const gaps = [];
  const available = new Set([...(given ?? [])].map(String));
  const notes = [...standing];
  notes.forEach((_, i) => available.add(`e${i}`));
  let inventedCount = 0;
  for (const inv of invents ?? []) {
    const text = String(inv?.text ?? "").trim();
    if (!text) continue;
    const edges = [...(inv?.edges ?? [])];
    const standpoint = String(inv?.standpoint ?? "").trim() || "arranger";
    const said = contentTokens(text);
    // (1) Coverage: the edges must declare everything the text states.
    // Same mechanical token discipline as defaultSupports (shared
    // contentTokens, never a second vocabulary) — a caller that will not
    // say what the invention claims, in edges, has not handed logos
    // anything to restrict.
    const declared = new Set(contentTokens(edges.map((e) => [e?.end1, e?.label, e?.end2].map((x) => String(x ?? "")).join(" ")).join(" ")));
    const undeclared = said.filter((w) => !declared.has(w));
    if (undeclared.length) {
      gaps.push({ name: THEA_REFUSALS.UNDECLARED_CONTENT, detail: `invention states what its edges never declare: ${undeclared.join(", ")}`, line: text });
      continue;
    }
    // (2) Premises: what it rests on must already stand.
    const restsOn = [...(inv?.restsOn ?? [])].map(String);
    if (said.length && !restsOn.length) {
      gaps.push({ name: THEA_REFUSALS.UNGROUNDED, detail: "invention rests on nothing — derivation runs in dependency order, never free", line: text });
      continue;
    }
    const missing = restsOn.filter((id) => !available.has(id));
    if (missing.length) {
      gaps.push({ name: THEA_REFUSALS.UNGROUNDED, detail: `rests on what has not yet landed: ${missing.join(", ")}`, line: text });
      continue;
    }
    // (3) Judgment: Minos's seat.
    if (typeof soundCheck !== "function") {
      gaps.push({ name: THEA_REFUSALS.NO_LOGOS, detail: "invention offered but no logos checker handed in — invention without logos is a gap, never prose", line: text });
      continue;
    }
    let cycles = null;
    let checkerFailed = false;
    try {
      cycles = soundCheck([...notes, ...edges]);
    } catch {
      checkerFailed = true;
    }
    if (checkerFailed) {
      gaps.push({ name: THEA_REFUSALS.LOGOS_ERROR, detail: "logos checker failed — fail closed: nothing lands on an unchecked invention", line: text });
      continue;
    }
    if (cycles?.length) {
      gaps.push({ name: THEA_REFUSALS.LOGOS_REFUSAL, detail: "invention turns the argument back on itself", line: text });
      continue;
    }
    const id = `i${inventedCount++}`;
    landed.push({ text, edges, restsOn, standpoint, id });
    available.add(id);
    for (const e of edges) { available.add(`e${notes.length}`); notes.push(e); }
  }
  return { landed, gaps };
}

/**
 * composeFigure({ part, passages, lines, needs, supportsLine, invents, soundCheck }) — FIGURE grain.
 *
 *   part     the part's name (a label for the section, not a claim)
 *   passages [{ ref, text }] — this part's OWN retrieved passages, and nothing else
 *   lines    [{ text, backs: [ref], edges }] — candidate sentences with the passages
 *            the caller says back each one; `edges` (optional) is the line's own
 *            arrangement reading, carried as standing for logos
 *   needs    [{ name, detail }] — things the part would need that the caller
 *            already knows are missing; carried as gaps, never bridged
 *   supportsLine(lineText, passageText) -> bool — injected organ, default above
 *   invents  [{ text, edges, restsOn, standpoint }] — what she would add
 *            that nothing handed states; lands only in dependency order
 *            under soundCheck (above), marked invented with its standpoint
 *            in prose. restsOn names premises: passage refs (figure) or
 *            part ids (pattern), standing edges (e<N>), earlier inventions
 *            (i<N>).
 *   soundCheck(notes) -> cycles — injected logos organ (logos.js's shape);
 *            absent, every invent is a NO_LOGOS gap
 *
 * Returns { text, sentences, gaps, refused }. A line lands iff every ref in
 * its backs names a handed passage AND at least one backing passage
 * mechanically supports it. Anything else becomes a named gap. She sees no
 * other part here — the signature has nowhere to put one.
 */
export function composeFigure({ part = "", passages = [], lines = [], needs = [], supportsLine = defaultSupports, invents = [], soundCheck = null } = {}) {
  const gaps = [];
  if (!passages?.length) {
    return {
      text: "", sentences: [], gaps: [...(needs ?? [])],
      refused: { type: THEA_REFUSALS.NO_PASSAGES, detail: "figure needs this part's own passages; none were handed" },
    };
  }
  const byRef = new Map(passages.map((p) => [String(p?.ref ?? ""), p]));
  const sentences = [];
  for (const line of lines ?? []) {
    const text = String(line?.text ?? "").trim();
    if (!text) continue;
    const backs = [...(line?.backs ?? [])].map(String);
    const unknown = backs.filter((r) => !byRef.has(r));
    if (unknown.length) {
      gaps.push({ name: THEA_REFUSALS.UNKNOWN_BACK_REF, detail: `no handed passage names ${unknown.join(", ")}`, line: text });
      continue;
    }
    const held = backs.length
      ? backs.map((r) => byRef.get(r)).filter(Boolean)
      : [...byRef.values()];
    let ok = false;
    try {
      ok = held.some((p) => supportsLine(text, String(p?.text ?? "")));
    } catch { ok = false; }
    if (!ok) {
      gaps.push({ name: THEA_REFUSALS.UNSUPPORTED_LINE, detail: "no handed passage carries this line's words", line: text });
      continue;
    }
    sentences.push({ text, backs, edges: [...(line?.edges ?? [])] });
  }
  for (const n of needs ?? []) gaps.push({ name: String(n?.name ?? "need"), detail: String(n?.detail ?? "") });
  // Invention under logos: standing is what landed sentences already state;
  // givens are this part's own passage refs — what an invention may rest on.
  const standing = sentences.flatMap((s) => s.edges);
  const { landed, gaps: inventGaps } = tryInvents({ invents, standing, given: [...byRef.keys()], soundCheck });
  for (const g of inventGaps) gaps.push(g);
  const inventedLines = landed.map((l) => `${l.text} [invented — ${l.standpoint} — logos-clear]`);
  const body = [...sentences.map((s) => s.text), ...inventedLines].join(" ");
  const gapLines = gaps.map((g) => `[gap: ${g.name} — ${g.detail}]`);
  const text = [body, ...gapLines].filter(Boolean).join("\n");
  return { text, sentences, gaps, refused: null, part, invented: landed };
}

/**
 * composePattern({ parts, order, headingOf, invents, soundCheck }) — PATTERN grain.
 *
 *   parts [{ id, heading, text, gaps, edges }] — already-written,
 *           already-checked parts. Their texts are the ONLY claim source;
 *           their `edges` (optional) are what stands for logos.
 *   order [id] — the caller's declared order; absent, given order stands and
 *           says so. Resolving order never adds or drops a claim.
 *   headingOf(part) -> string — injected heading render, default below.
 *   invents [{ text, edges, restsOn, standpoint }] — transitions/smoothing
 *           nothing handed states; lands only in dependency order under
 *           soundCheck (restsOn: part ids, e<N>, i<N>), marked invented
 *           with its standpoint in prose.
 *   soundCheck(notes) -> cycles — injected logos organ; absent, every
 *           invent is a NO_LOGOS gap.
 *
 * Returns { text, sections, gaps, refused, invented }. The whole is
 * concatenation of the parts' own texts under headings plus their gap
 * lines plus logos-clear inventions, nothing else: every part's gaps ride
 * along.
 */
export function headingOfDefault(part, i) {
  return String(part?.heading ?? part?.id ?? `part ${i + 1}`);
}

export function composePattern({ parts = [], order = null, headingOf = headingOfDefault, invents = [], soundCheck = null } = {}) {
  if (!parts?.length) {
    return {
      text: "", sections: [], gaps: [],
      refused: { type: THEA_REFUSALS.NO_PARTS, detail: "pattern needs already-written parts; none were handed" },
    };
  }
  const byId = new Map(parts.map((p) => [String(p?.id ?? ""), p]));
  let seq = [...parts];
  let orderNote = "given order";
  if (Array.isArray(order) && order.length) {
    const known = order.map(String).filter((id) => byId.has(id));
    const rest = seq.filter((p) => !known.includes(String(p?.id ?? "")));
    seq = [...known.map((id) => byId.get(id)), ...rest];
    orderNote = `declared order: ${known.join(", ")}`;
  }
  const sections = seq.map((p, i) => {
    const heading = String(headingOf(p, i) ?? "");
    const text = String(p?.text ?? "");
    const gaps = [...(p?.gaps ?? [])].map((g) => ({ ...g, part: String(p?.id ?? "") }));
    return { id: String(p?.id ?? ""), heading, text, gaps };
  });
  const gaps = sections.flatMap((s) => s.gaps);
  // Invention under logos: standing is what the handed parts already state;
  // givens are the part ids — what an invention may rest on, in order.
  const standing = seq.flatMap((p) => [...(p?.edges ?? [])]);
  const { landed, gaps: inventGaps } = tryInvents({ invents, standing, given: seq.map((p) => String(p?.id ?? "")), soundCheck });
  for (const g of inventGaps) gaps.push(g);
  const blocks = sections.map((s) => {
    const gapLines = s.gaps.map((g) => `[gap (${s.id}): ${g.name} — ${g.detail}]`);
    return [`## ${s.heading}`, s.text, ...gapLines].filter(Boolean).join("\n");
  });
  for (const l of landed) blocks.push(`${l.text} [invented — ${l.standpoint} — logos-clear]`);
  for (const g of inventGaps) blocks.push(`[gap (whole): ${g.name} — ${g.detail}]`);
  return { text: blocks.join("\n\n"), sections, gaps, refused: null, orderNote, invented: landed };
}

/**
 * refuseSwarm(kind) — CON/SEG/REC requests belong to the swarm, not to her.
 * kind: "keep" | "split" | "reground". Returns a typed refusal naming the owner.
 */
export function refuseSwarm(kind) {
  const table = {
    keep: { type: THEA_REFUSALS.KEEP_DECISION, owner: "CON (Wilson's)", detail: "deciding whether a candidate is worth keeping belongs to the swarm, not to Thea" },
    split: { type: THEA_REFUSALS.SPLIT_READINGS, owner: "SEG (Wilson's)", detail: "splitting material into specialized readings belongs to the swarm, not to Thea" },
    reground: { type: THEA_REFUSALS.REGROUND_SEARCH, owner: "REC (Wilson's)", detail: "re-grounding a failed search at a lower level belongs to the swarm, not to Thea" },
  };
  return table[String(kind ?? "").toLowerCase()] ?? { type: "unknown_request", owner: "swarm", detail: "not a Figure or Pattern arrangement" };
}

/**
 * THE NINE MUSES — her hands, not her rivals. Each is one arrangement
 * subtask with its own typed output, all inside SYN discipline: no muse
 * detects (CON/SEG/REC stay refused), no muse invents free of logos.
 * All nine share her two cells (Figure/Making, Pattern/Composing); they are
 * roles within a cell, never new cells. Genuine benefit, measured in the
 * probe: each subtask independently testable, each failure a typed gap
 * naming which hand failed — a monolith reports "pattern failed", nine
 * hands report which step. A caller may invoke any hand alone or run the
 * whole dance via museWeave (Urania last, always).
 */
export const MUSES = Object.freeze([
  { name: "Calliope", classical: "epic poetry", task: "order", detail: "declare the sequence of parts; resolving order never adds or drops a claim" },
  { name: "Clio", classical: "history", task: "head", detail: "render each part's heading with its provenance; headings label, never argue" },
  { name: "Polyhymnia", classical: "sacred hymn, silence", task: "gap", detail: "name what is missing as a typed gap; silence is scored, never smoothed over" },
  { name: "Euterpe", classical: "lyric song", task: "transit", detail: "transitions between sections from structure alone (shared ends, standing drop, contested) — never from meaning" },
  { name: "Terpsichore", classical: "dance", task: "flow", detail: "carry each part's sentences in their given movement; she sequences, never rewrites" },
  { name: "Erato", classical: "love poetry, bridging", task: "bridge", detail: "the only hand that may add a thread — a logos-clear bridge, marked invented, or a gap" },
  { name: "Melpomene", classical: "tragedy", task: "withhold", detail: "refuse the unsupported openly; what cannot be carried is named, never quietly dropped" },
  { name: "Thalia", classical: "comedy, abundance", task: "cover", detail: "report the abundance honestly: earned vs withheld counts with reasons named" },
  { name: "Urania", classical: "heavens, the whole", task: "assemble", detail: "weave all hands into one whole under headings; last always, adds nothing herself" },
]);

/** Calliope — order parts by declared ids; unknown ids ignored, rest keep given order. */
export function museOrder(parts = [], order = null) {
  const byId = new Map(parts.map((p) => [String(p?.id ?? ""), p]));
  if (!Array.isArray(order) || !order.length) return { seq: [...parts], orderNote: "given order" };
  const known = order.map(String).filter((id) => byId.has(id));
  const rest = parts.filter((p) => !known.includes(String(p?.id ?? "")));
  return { seq: [...known.map((id) => byId.get(id)), ...rest], orderNote: `declared order: ${known.join(", ")}` };
}

/** Clio — headings for each part in sequence. */
export function museHead(seq = [], headingOf = headingOfDefault) {
  return seq.map((p, i) => String(headingOf(p, i) ?? ""));
}

/** Polyhymnia — collect every part's gaps, tagged with their part. */
export function museGap(seq = []) {
  return seq.flatMap((p) => [...(p?.gaps ?? [])].map((g) => ({ ...g, part: String(p?.id ?? "") })));
}

/** Euterpe — structural transition between two neighbours.
 *
 * Aristotle's giver (Poetics Ch.10–11, 1452a): mythos IS the arrangement of
 * incidents, and its two load-bearing turns are peripeteia (reversal of
 * fortune) and anagnorisis (recognition — ignorance into knowledge). Both
 * read here off structure alone, never meaning: reversal is the same end
 * whose standing falls; recognition is a gap the previous part disclosed
 * that the next part takes up in its own words (≥2 shared content tokens
 * with the gap's line or detail — the support floor, reused, never tuned).
 * Probability-or-necessity (Ch.9) is the bond throughout: a shared end is
 * the necessity half, a caller-declared order the probability half.
 *
 * Rich keys degrade via TRANSIT_FALLBACK to compose.js's closed TRANSITIONS
 * vocabulary, so a caller on that vocabulary keeps working byte-identically.
 */
export const TRANSIT_FALLBACK = Object.freeze({
  open: "open", reversal: "intoContested", recognition: "outOfContested",
  sameSubject: "sameSubject", intoSingle: "intoSingle", newSubject: "newSubject",
  intoContested: "intoContested", outOfContested: "outOfContested",
});

export function museTransit(prev = null, next = null, { tokensOf = contentTokens } = {}) {
  const tok = typeof tokensOf === "function" ? tokensOf : contentTokens;
  const endOf = (x) => String(x?.claim?.end1 ?? x?.end1 ?? "").trim().toLowerCase();
  const caseOf = (x) => String(x?.merged?.case ?? x?.case ?? "").toUpperCase();
  const standingOf = (x) => String(x?.merged?.standing ?? x?.standing ?? "");
  const textOf = (x) => String(x?.text ?? x?.claim?.text ?? "");
  if (!prev) return "open";
  if (caseOf(next) === "DISAGREE" && caseOf(prev) !== "DISAGREE") return "intoContested";
  if (caseOf(prev) === "DISAGREE" && caseOf(next) !== "DISAGREE") return "outOfContested";
  const sameEnd = endOf(prev) && endOf(prev) === endOf(next);
  const fell = standingOf(prev) === "corroborated" && standingOf(next) === "single";
  // Peripeteia: the same thing, its fortune turned (Oedipus keeps his name).
  if (sameEnd && fell) return "reversal";
  // Anagnorisis: the next part speaks of what the previous part named as missing.
  const gapWords = new Set((prev?.gaps ?? []).flatMap((g) => tok(`${g?.line ?? ""} ${g?.detail ?? ""}`)));
  if (gapWords.size) {
    let shared = 0;
    for (const w of tok(textOf(next))) {
      if (gapWords.has(w) && ++shared >= 2) return "recognition";
    }
  }
  if (sameEnd) return "sameSubject";
  if (fell) return "intoSingle";
  return "newSubject";
}

/** Terpsichore — the movement inside a part: its sentences, untouched, in given order. */
export function museFlow(part = null) {
  return [...(part?.sentences ?? [])].map((s) => (typeof s === "string" ? s : String(s?.text ?? ""))).filter(Boolean);
}

/** Terpsichore's diagnostic, after Vonnegut's 4th rule for fiction ("every
 * sentence must reveal character or advance the action" — giver: "Bagombo
 * Snuff Box" lecture notes, the rule as craft): a sentence that shares no
 * content token with either neighbour neither continues nor is continued —
 * it stands alone in the dance. Structural only (shared tokens, never what
 * they mean), a REPORT never a refusal: { pairs, knit, loners }. */
export function museKnit(sentences = [], { tokensOf = contentTokens } = {}) {
  const tok = typeof tokensOf === "function" ? tokensOf : contentTokens;
  const toks = sentences.map((s) => new Set(tok(typeof s === "string" ? s : s?.text ?? "")));
  let sharing = 0;
  const loners = [];
  for (let i = 0; i < toks.length; i++) {
    const left = i > 0 && [...toks[i]].some((w) => toks[i - 1].has(w));
    const right = i < toks.length - 1 && [...toks[i]].some((w) => toks[i + 1].has(w));
    if (i < toks.length - 1 && ([...toks[i]].some((w) => toks[i + 1].has(w)))) sharing++;
    if (toks.length > 1 && !left && !right) loners.push(i);
  }
  const pairs = Math.max(0, toks.length - 1);
  return { pairs, sharing, knit: pairs ? sharing / pairs : 1, loners };
}

/** Calliope + Thalia, after Vonnegut (shapes-of-stories lecture, giver;
 * organ reuse: eoreader7/native/organs/vonnegut.js owns the real
 * conviction curve — index-resolved propositions, cumulative understanding.
 * This is its token-level shadow for callers with no index: per-section
 * counts of NEW content tokens, cumulative curve, shape read off that.
 * fortuneOf(sectionText, seenSet) -> newCount, injectable; the default
 * counts unseen content tokens. Shape vocabulary matches vonnegut.js so a
 * caller can swap the real organ in without renaming anything downstream.
 * Disclosed: on a cumulative curve fortune never falls, so from-bad-to-
 * worse is unreachable here — it needs vonnegut.js's own conviction
 * levels, injected, not this default. */
export function museArc(sectionTexts = [], { fortuneOf = null, tokensOf = contentTokens } = {}) {
  const tok = typeof tokensOf === "function" ? tokensOf : contentTokens;
  const seen = new Set();
  const hasFortune = typeof fortuneOf === "function";
  const fresh = sectionTexts.map((t) => {
    const text = String(t ?? "");
    let n = 0;
    try {
      if (hasFortune) n = fortuneOf(text, seen);
      else for (const w of tok(text)) if (!seen.has(w)) { seen.add(w); n++; }
    } catch { n = 0; }
    if (hasFortune) for (const w of tok(text)) seen.add(w);
    return n;
  });
  const curve = [];
  let acc = 0;
  for (const n of fresh) { acc += n; curve.push(acc); }
  const totalNew = acc;
  const start = curve[0] ?? 0;
  const end = curve[curve.length - 1] ?? 0;
  let shape = "mixed";
  let basis = `token-arc: ${totalNew} new token(s), start ${start}, end ${end} — mixed, no classic shape`;
  if (curve.length < 2 || totalNew === 0) {
    shape = "flatline";
    basis = `Vonnegut: flatline — the whole carries nothing new (${totalNew} new tokens). "Which way is up": it argues nothing its givens support.`;
  } else if (curve.slice(1).every((c, i) => c >= curve[i]) && end > start + 1 && totalNew >= 2) {
    shape = start === 0 ? "man-in-hole" : "rags-to-riches";
    basis = shape === "man-in-hole"
      ? `Vonnegut: man-in-hole (token shadow) — the opening states nothing new, the body climbs to ${end}. Surprise, then understanding.`
      : `Vonnegut: rags-to-riches (token shadow) — a steady climb ${start} → ${end}. Each section adds.`;
  }
  return { fresh, curve, shape, basis, start, end, totalNew };
}

/** Calliope orders by a caller-DECLARED Vonnegut arc: the arc is the order's
 * giver, named on orderNote, never a silent imposition. rags-to-riches sorts
 * ascending freshness, man-in-hole puts the stalest first then climbs.
 * A flat diet (no arc to trace) refuses no_arc and keeps given order — a
 * guessed arc is an argument nobody made. */
export function museShapeOrder(parts = [], shape = "rags-to-riches", { fortuneOf = null, tokensOf = contentTokens } = {}) {
  const arc = museArc(parts.map((p) => String(p?.text ?? "")), { fortuneOf, tokensOf });
  if (arc.totalNew === 0) {
    return { seq: [...parts], orderNote: "given order", arc, refused: { type: "no_arc", detail: "nothing new anywhere — no arc to trace, order unimposed" } };
  }
  const scored = parts.map((p, i) => ({ p, n: arc.fresh[i] }));
  if (shape === "man-in-hole") scored.sort((a, b) => a.n - b.n);
  else scored.sort((a, b) => a.n - b.n);
  return { seq: scored.map((s) => s.p), orderNote: `declared arc: ${shape} (${arc.basis})`, arc, refused: null };
}

/** Urania's unity check, after Aristotle (Poetics Ch.7–8: the whole must be
 * ONE action — giver). A part sharing no content token with any other part
 * is apart: named as a gap, never dropped, never force-joined. P2's word. */
export function museUnity(seq = [], { tokensOf = contentTokens } = {}) {
  const tok = typeof tokensOf === "function" ? tokensOf : contentTokens;
  const toks = seq.map((p) => new Set(tok(String(p?.text ?? ""))));
  const gaps = [];
  seq.forEach((p, i) => {
    if (toks[i].size === 0) return;
    const touches = toks.some((t, j) => j !== i && [...toks[i]].some((w) => t.has(w)));
    if (!touches) gaps.push({ name: "apart", part: String(p?.id ?? ""), detail: "this part shares no words with any other part — one action unmet, carried apart not dropped" });
  });
  return gaps;
}

/** Erato — bridge threads: dependency-ordered inventions land marked with
 * their standpoint, the rest become gaps. `given` names what a bridge may
 * rest on (passage refs, part ids). */
export function museBridge({ invents = [], standing = [], given = [], soundCheck = null } = {}) {
  return tryInvents({ invents, standing, given, soundCheck });
}

/** Melpomene — withhold what the support check refuses; returns { kept, withheld }. */
export function museWithhold(lines = [], supportsLine = defaultSupports, passages = []) {
  const byRef = new Map(passages.map((p) => [String(p?.ref ?? ""), p]));
  const kept = [];
  const withheld = [];
  for (const line of lines ?? []) {
    const text = String(line?.text ?? "").trim();
    if (!text) continue;
    const backs = [...(line?.backs ?? [])].map(String);
    const unknown = backs.filter((r) => !byRef.has(r));
    if (unknown.length) { withheld.push({ name: THEA_REFUSALS.UNKNOWN_BACK_REF, detail: `no handed passage names ${unknown.join(", ")}`, line: text }); continue; }
    const held = backs.length ? backs.map((r) => byRef.get(r)).filter(Boolean) : [...byRef.values()];
    let ok = false;
    try { ok = held.some((p) => supportsLine(text, String(p?.text ?? ""))); } catch { ok = false; }
    if (!ok) withheld.push({ name: THEA_REFUSALS.UNSUPPORTED_LINE, detail: "no handed passage carries this line's words", line: text });
    else kept.push(line);
  }
  return { kept, withheld };
}

/** Thalia — abundance honestly counted: earned vs withheld with reasons. */
export function museCover({ given = 0, composed = 0, withheld = [] } = {}) {
  const byReason = {};
  for (const w of withheld ?? []) byReason[w.reason ?? w.name] = (byReason[w.reason ?? w.name] ?? 0) + 1;
  const reasons = Object.entries(byReason).map(([r, n]) => `${n} ${r}`).join(", ");
  return `composed ${composed} of ${given}` + (withheld?.length ? `; ${withheld.length} withheld (${reasons})` : "; none withheld");
}

/** Urania — assemble the whole: ordered sections under Clio headings, Euterpe
 * transitions noted per section, Polyhymnia gaps riding along, Erato bridges
 * appended marked, Thalia coverage closed. Adds no claim herself. */
export function museAssemble({ parts = [], order = null, headingOf = headingOfDefault, invents = [], soundCheck = null, tokensOf = contentTokens, fortuneOf = null } = {}) {
  const { seq, orderNote } = museOrder(parts, order);
  const headings = museHead(seq, headingOf);
  const gaps = museGap(seq);
  const standing = seq.flatMap((p) => [...(p?.edges ?? [])]);
  const { landed, gaps: bridgeGaps } = museBridge({ invents, standing, given: seq.map((p) => String(p?.id ?? "")), soundCheck });
  const sections = seq.map((p, i) => ({
    id: String(p?.id ?? ""), heading: headings[i], text: String(p?.text ?? ""),
    transition: museTransit(seq[i - 1] ?? null, p, { tokensOf }),
    gaps: [...(p?.gaps ?? [])].map((g) => ({ ...g, part: String(p?.id ?? "") })),
  }));
  const blocks = sections.map((s) => {
    const gapLines = s.gaps.map((g) => `[gap (${s.id}): ${g.name} — ${g.detail}]`);
    return [`## ${s.heading}`, s.text, ...gapLines].filter(Boolean).join("\n");
  });
  for (const l of landed) blocks.push(`${l.text} [invented — ${l.standpoint} — logos-clear]`);
  for (const g of bridgeGaps) blocks.push(`[gap (whole): ${g.name} — ${g.detail}]`);
  // Urania's unity: one action or apart — Aristotle, Poetics Ch.7–8.
  const unityGaps = museUnity(seq, { tokensOf });
  for (const g of unityGaps) blocks.push(`[gap (${g.part}): ${g.name} — ${g.detail}]`);
  const allGaps = [...gaps, ...bridgeGaps, ...unityGaps];
  const arc = museArc(sections.map((s) => s.text), { fortuneOf, tokensOf });
  const coverage = museCover({ given: parts.length, composed: sections.length, withheld: allGaps });
  const assembled = {
    text: blocks.join("\n\n"), sections, gaps: allGaps, orderNote,
    invented: landed, arc, coverage,
  };
  // EOT: every hand's tuples over the same dance — the primitives, so a
  // downstream reader (logos, grid, eot reasoning) can take any of it.
  const eot = [
    ...eotOf("order", { seq, orderNote }),
    ...eotOf("head", { sections }),
    ...eotOf("gap", { gaps: allGaps }),
    ...eotOf("transit", { sections }),
    ...eotOf("cover", { whole: "whole", coverage, shape: arc.shape }),
    ...eotOf("assemble", { sections, orderNote }),
  ];
  return { ...assembled, eot };
}

/**
 * EOT — the primitives, so they can do anything. Every hand projects its
 * work into EOT tuples — [op, grain, subject, predicate, object, meta] —
 * the shape legacy reasoning/eot.js::normalizeEotTuple already reads
 * (declared op+grain, terrain/stance derived via cellOf, content never
 * classified here). op is always SYN: an arranger declares syntheses, never
 * detections. Grain follows the hand (MUSE_GRAIN): Terpsichore and
 * Melpomene work the Figure, the rest the Pattern. `witness` is always the
 * givens the act rested on; `meta.muse` names the hand, so a downstream
 * reader can tell Calliope's order from Erato's bridge without reparsing
 * prose. Because the tuples are ordinary {end1,label,end2}-shaped notes,
 * Erato's soundCheck can read Urania's output as standing — muses feeding
 * muses, the loop closed, no new machinery.
 */
export const MUSE_GRAIN = Object.freeze({
  order: "Pattern", head: "Pattern", gap: "Pattern", transit: "Pattern",
  flow: "Figure", bridge: "Pattern", withhold: "Figure", cover: "Pattern",
  assemble: "Pattern",
});

const eot = (muse, grain, subject, predicate, object, witness, extra = {}) => Object.freeze({
  op: "SYN", grain, subject, predicate, object,
  witness: witness ?? null, meta: Object.freeze({ muse, ...extra }),
});

/** eotOf(hand, payload) — one hand's work as EOT tuples. Pure projection:
 * nothing checked, nothing decided; a tuple restates an act already done. */
export function eotOf(hand, payload = {}) {
  const m = String(hand ?? "").toLowerCase();
  const W = payload.witness ?? null;
  switch (m) {
    case "calliope":
    case "order": {
      const seq = [...(payload.seq ?? [])];
      const out = [];
      for (let i = 0; i + 1 < seq.length; i++) {
        out.push(eot("Calliope", "Pattern",
          String(seq[i]?.id ?? `part-${i}`), "precedes", String(seq[i + 1]?.id ?? `part-${i + 1}`),
          W ?? String(payload.orderNote ?? "order")));
      }
      return out;
    }
    case "clio":
    case "head":
      return [...(payload.sections ?? [])].map((s, i) => eot("Clio", "Pattern",
        String(s?.id ?? `part-${i}`), "headed", String(s?.heading ?? ""), W));
    case "polyhymnia":
    case "gap":
      return [...(payload.gaps ?? [])].map((g) => eot("Polyhymnia", "Pattern",
        String(g?.part ?? g?.line ?? "whole"), "leaves-open", String(g?.name ?? "gap"), W ?? String(g?.detail ?? "")));
    case "euterpe":
    case "transit":
      return [...(payload.sections ?? [])].slice(1).map((s, i) => eot("Euterpe", "Pattern",
        String(payload.sections[i]?.id ?? ""), `transits-${s?.transition ?? "on"}`, String(s?.id ?? ""), W));
    case "terpsichore":
    case "flow":
    case "knit": {
      const ss = [...(payload.sentences ?? [])].map((s) => (typeof s === "string" ? s : String(s?.text ?? "")));
      const out = [];
      for (let i = 0; i + 1 < ss.length; i++) {
        out.push(eot("Terpsichore", "Figure", ss[i].slice(0, 48), "followed-by", ss[i + 1].slice(0, 48), W ?? String(payload.part ?? "")));
      }
      return out;
    }
    case "erato":
    case "bridge":
      return [...(payload.landed ?? [])].map((l) => eot("Erato", String(payload.grain ?? "Pattern"),
        String(l?.text ?? "").slice(0, 64), "bridges-on", [...(l?.restsOn ?? [])].join("+") || "standing", W));
    case "melpomene":
    case "withhold":
      return [...(payload.withheld ?? [])].map((h) => eot("Melpomene", "Figure",
        String(h?.line ?? "").slice(0, 64), "withheld-for", String(h?.name ?? "gap"), W ?? String(h?.detail ?? "")));
    case "thalia":
    case "cover":
    case "arc":
      return [eot("Thalia", "Pattern",
        String(payload.whole ?? "whole"), "covers", String(payload.coverage ?? ""),
        W ?? String(payload.shape ? `arc: ${payload.shape}` : "coverage"))];
    case "urania":
    case "assemble":
      return [...(payload.sections ?? [])].map((s) => eot("Urania", "Pattern",
        String(payload.whole ?? "whole"), "weaves", String(s?.id ?? ""), W ?? String(payload.orderNote ?? "")));
    default:
      return [];
  }
}

/**
 * composeGround(given) — SYN·Ground is declared but unbuilt. Any caller asking
 * for a frame before any part exists gets this typed refusal declaring what
 * was given to establish the frame from — never a frame invented free of it.
 */
export function composeGround(given = {}) {
  return {
    text: "", sections: [], gaps: [],
    refused: {
      type: THEA_REFUSALS.GROUND_UNBUILT,
      detail: "SYN·Ground (Cultivating) is declared but unbuilt: no caller yet asks for a frame before any part exists. This is a new kind of request, not an extension of Figure or Pattern work.",
      given,
    },
  };
}
