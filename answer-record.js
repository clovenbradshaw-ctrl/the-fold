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

/** The identity a claim is compared on across models: its neutral arrangement, folded. */
export const claimKey = (c) => `${String(c.end1 ?? c.subject ?? "").toLowerCase().trim()}|${String(c.label ?? c.verb ?? "").toLowerCase().trim()}|${String(c.end2 ?? c.object ?? "").toLowerCase().trim()}`;

/**
 * @param {object} turn — { question, answer, model, frame, recipe, sections, unsupported, unbacked, unread, sources, constitution, cursor }
 * @returns {object} the record
 */
export function answerRecord({ question, answer = "", model = null, frame = null, recipe = null, sections = [], unsupported = [], unbacked = [], unread = [], sources = [], constitution = null, cursor = null } = {}) {
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
  return `answer record · ${r.claims.length} claim(s)${bits.length ? ` (${bits.join(", ")})` : ""} · ${r.unsupported.length} unsupported · ${r.unbacked.length} unbacked · retrieved ${r.retrieved.length} · recipe ${String(r.recipe ?? "none").slice(0, 12)}${r.unread?.length ? ` · still reading ${r.unread.map((u) => `${u.name} ${u.read}/${u.total}`).join(", ")}` : ""}`;
}
