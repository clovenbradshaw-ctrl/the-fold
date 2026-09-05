// answer-record.js — the AnswerRecord (Pass 19, P100). Pure.
//
// One record per turn: what the mouth was HANDED (the passages retrieved and
// the ledger's unread extent), what it SAID (every relation claim read off
// the answer with the verdict the material gave it, byte-addressed where it
// bound), what it said that nothing backs (`unsupported` — contradicted or
// fabricated; `unbacked` — asserted, unbound), and the reader's own identity
// (frame, recipe, model, the sources' hashes, the constitution's hash). The
// product assay (eoreader7 lib/product-assay.mjs) builds the same shape
// headless; this is the live turn's.
//
// The record is what a model swap must leave alike in its CLAIMS: two mouths
// over one record may phrase differently, but the set of record-backed
// claims they make, and the count of claims nothing backs (which must be 0),
// is the thing compared — `claimKey` is the identity the diff compares on.

export const ANSWER_RECORD_SCHEMA = "EOAnswerRecord@1";

// EVERY ∅ CITES ITS VOID (Pass 25 of the null experiments, P106). A sentence
// the answer asserts and nothing backs is an ABSENCE; an absence is honest
// when a void the reader DECLARED (kernel/notes.js S70 — scope, cursor,
// reached) is in scope for it, and a leak (P54: "there is no mention of
// anything else") when none is. The match is mechanical and token-level:
// every token of the void's first end and of its label appears in the
// sentence, folded. Nothing here reads meaning; a void in scope is a fact
// about the record, not a verdict on the sentence.
const fold = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f\u0591-\u05c7\u064b-\u0652]/g, "").toLowerCase();
const toks = (t) => new Set(fold(t).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1));
/** The open void in scope for a sentence, or null. `voids` are foldVoids rows (SVO or neutral names). */
export function voidInScope(sentence, voids = [], { question = "" } = {}) {
  const st = toks(sentence);
  if (!st.size) return null;
  // The first end may be named by the QUESTION the sentence answers — an
  // absence written back to "who was X's director?" says "the director"
  // and points at X anaphorically. The label must be in the sentence itself.
  const qt = toks(question);
  for (const v of voids ?? []) {
    const e1 = [...toks(v.end1 ?? v.subject)], lb = [...toks(v.label ?? v.verb)];
    if (!e1.length || !lb.length) continue;
    const anchored = e1.every((w) => st.has(w)) || (qt.size > 0 && e1.every((w) => qt.has(w)));
    if (anchored && lb.every((w) => st.has(w))) return v;
  }
  return null;
}
/**
 * Absences with their citation: each sentence the WITNESS refused — asked
 * whether any passage states it, and none was pointed at — and the declared
 * void in scope for it, if any. Only the witness's refusal makes an absence:
 * an `unbacked` claim is content nothing backs (a different leak, counted
 * apart as `unbacked`), and the instrument's own finding strings ("the
 * material never says …") are not the mouth's sentences — measured
 * (absence-leak.mjs, 2026-09-05): counting them here made every absence
 * "cite none" by construction.
 */
export function absencesOf({ witness = [], voids = [], question = "" } = {}) {
  const seen = new Set();
  const out = [];
  const add = (sentence, how) => {
    const s = typeof sentence === "string" ? sentence : (sentence?.sentence ?? sentence?.text ?? "");
    if (!s || seen.has(s)) return;
    seen.add(s);
    const v = voidInScope(s, voids, { question });
    out.push({ sentence: s, how, void: v ? (v.id ?? null) : null, ...(v?.scope ? { scope: { sources: v.scope.sources?.length ?? null, read: v.scope.read ?? null, total: v.scope.total ?? null } } : {}) });
  };
  for (const w of witness ?? []) if (w?.witness === "refused") add(w.sentence, "witness-refused");
  return out;
}

/** The identity a claim is compared on across models: its neutral arrangement, folded. */
export const claimKey = (c) => `${String(c.end1 ?? c.subject ?? "").toLowerCase().trim()}|${String(c.label ?? c.verb ?? "").toLowerCase().trim()}|${String(c.end2 ?? c.object ?? "").toLowerCase().trim()}`;

/**
 * @param {object} turn — { question, answer, model, frame, recipe, sections, unsupported, unbacked, unread, sources, constitution, cursor }
 * @returns {object} the record
 */
export function answerRecord({ question, answer = "", model = null, frame = null, recipe = null, sections = [], unsupported = [], unbacked = [], unread = [], sources = [], constitution = null, cursor = null, voids = [], witness = [] } = {}) {
  const claims = [];
  const retrieved = [];
  for (const s of sections ?? []) {
    for (const p of s?.passages ?? []) if (p?.ref && !retrieved.includes(p.ref)) retrieved.push(p.ref);
    for (const c of s?.relations?.claims ?? []) {
      claims.push({
        key: claimKey(c),
        end1: c.end1 ?? c.subject ?? null, label: c.label ?? c.verb ?? null, end2: c.end2 ?? c.object ?? null,
        verdict: c.verdict ?? "unheard", polarity: c.polarity ?? "+",
        refs: [...new Set(c.refs ?? [])],
        spans: (c.spans ?? []).map((sp) => ({ ref: sp.ref ?? null, start: sp.start ?? null, end: sp.end ?? null })),
        ...(c.reason ? { reason: c.reason } : {}),
      });
    }
  }
  const tally = {};
  for (const c of claims) tally[c.verdict] = (tally[c.verdict] ?? 0) + 1;
  const absences = absencesOf({ witness, voids, question });
  return {
    schema: ANSWER_RECORD_SCHEMA,
    cursor,
    question: String(question ?? ""),
    model, recipe, frame,
    retrieved,
    unread: (unread ?? []).map((u) => ({ name: u.name, read: u.read, total: u.total })),
    claims,
    tally,
    unsupported: (unsupported ?? []).map((u) => (typeof u === "string" ? u : (u?.sentence ?? u?.text ?? JSON.stringify(u)))).slice(0, 50),
    unbacked: (unbacked ?? []).map((u) => (typeof u === "string" ? u : (u?.sentence ?? u?.text ?? JSON.stringify(u)))).slice(0, 50),
    sources: (sources ?? []).map((s) => ({ name: s.name, sha256: s.sha256 ?? null, bytes: s.bytes ?? null })),
    // Absences and their citations (P106): an absence citing a declared void
    // is honest; one citing none is the mouth declaring emptiness — counted,
    // never absorbed.
    absences: absences.slice(0, 50),
    absenceTally: { citingVoid: absences.filter((a) => a.void).length, citingNone: absences.filter((a) => !a.void).length },
    voidsOpen: (voids ?? []).length,
    constitution,
    answer: { chars: String(answer ?? "").length },
  };
}

/** The record-backed claim set and the count of claims nothing backs — what a model swap compares. */
export function claimSets(record) {
  const bound = new Set((record?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => c.key));
  const contradicted = new Set((record?.claims ?? []).filter((c) => c.verdict === "contradicted").map((c) => c.key));
  return { bound, contradicted, unsupported: record?.unsupported?.length ?? 0, unbacked: record?.unbacked?.length ?? 0 };
}

/** Diff two records' claim sets: shared record-backed claims, each side's own, and whether either side said anything nothing backs. */
export function diffRecords(a, b) {
  const A = claimSets(a), B = claimSets(b);
  const shared = [...A.bound].filter((k) => B.bound.has(k));
  return {
    shared,
    onlyA: [...A.bound].filter((k) => !B.bound.has(k)),
    onlyB: [...B.bound].filter((k) => !A.bound.has(k)),
    nothingBacks: { a: A.unsupported + A.unbacked, b: B.unsupported + B.unbacked },
    contradicted: { a: [...A.contradicted], b: [...B.contradicted] },
    sameRecordBackedSet: A.bound.size === B.bound.size && shared.length === A.bound.size,
  };
}

/** One line for the thinking panel. */
export function answerRecordLine(r) {
  const t = r?.tally ?? {};
  const bits = Object.entries(t).map(([v, n]) => `${n} ${v}`);
  const abs = r.absenceTally ? ` · absences ${r.absenceTally.citingVoid + r.absenceTally.citingNone} (${r.absenceTally.citingVoid} cite a declared gap, ${r.absenceTally.citingNone} cite none)` : "";
  return `answer record · ${r.claims.length} claim(s)${bits.length ? ` (${bits.join(", ")})` : ""} · ${r.unsupported.length} unsupported · ${r.unbacked.length} unbacked${abs} · retrieved ${r.retrieved.length} · recipe ${String(r.recipe ?? "none").slice(0, 12)}${r.unread?.length ? ` · still reading ${r.unread.map((u) => `${u.name} ${u.read}/${u.total}`).join(", ")}` : ""}`;
}
