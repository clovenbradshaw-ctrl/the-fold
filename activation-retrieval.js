// activation-retrieval.js — retrieval as ACTIVATION over the reading, not a
// string matcher over containers. THE-HOLOGRAPH.md §6 is the theory; this is
// the organ. Pure: the referent index, the sentence splitter and the
// measurement organ are injected (the cast.js posture).
//
// THE ADDRESS BOOK. `mentionBook(chunks, index)` walks every chunk's
// sentences once and records, for every referent the index establishes,
// the addresses of the sentences it stands in — absolute byte ranges that
// self-verify against the chunk's own text (P5.2). It is a projection of
// the index and costs seconds on a novel; nothing here waits on the
// relation reader's full admission.
//
// THE ACTIVATION. A question activates referents (its own through the
// index; the last answer's when it names none — resolutions.js's
// activeReferents). Hop 0 is every sentence an active referent stands in.
// Hop 1 is the referents those sentences co-mention, plus the other ends of
// the ledger's notes whose one end is active, and then THEIR sentences.
// Rows are ranked by hop, then by how many active referents they carry,
// then by document order, and cut where showing one more changes nothing
// about the reach — dmdWindow at the sentence grain, reach = the active and
// hop-1 referents the shown sentences carry (resolutions.js::dmdCut).
//
// THE FALLBACK. A question that resolves to no referent, or one whose
// referents stand in no sentence, gets the term retriever it always had,
// and the result says `basis: "surface"`. Nothing is silently mixed.
//
// WHAT IS HANDED. The passages returned are SENTENCES in the chunk shape
// (`ref`, `source`, `start`, `end`, `text`), so every downstream organ —
// the snip walls, the grounding checks, cite.js — reads them as material.
// The mouth gets the sentences verbatim, address-free (firewall.js); the
// record keeps the addresses. The chunk survives only as the paragraph the
// writer chose, an address container, never a retrieval unit.
import { referentsOf } from "./dialogue.js";
import { activeReferents, dmdCut } from "./resolutions.js";

// THE GRAIN OF A SENTENCE IS THE ACT. Reach by referent alone hands ONE
// sentence about Porfiry and cuts the next, which says something different
// about him (measured 2026-09-07 in the turn test). So when a reader is
// injected, a shown sentence's reach includes the acts it states about the
// active referents (the relation reader's own labels — the same claims the
// Lens block lists), and a sentence adds reach only when it carries an act no
// shown sentence carries. Without a reader the reach is referents only, and
// the result says so.
//
// SENTENCE_CEILING is a declared budget (P9), not a measurement: the reader
// is run over at most this many candidate sentences per hop, so a referent
// that stands in a thousand sentences never costs a thousand reads at a
// turn. The cut inside the ceiling is measured; the ceiling itself is
// declared and carried on the result.
export const SENTENCE_CEILING = 24;
const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const resolveIds = (index, name) => { try { const r = index?.resolve?.(String(name ?? "")); return r instanceof Set ? r : new Set(r ?? []); } catch { return new Set(); } };

/**
 * mentionBook(chunks, index, { splitSentences }) → { sentences, byId, gaps }
 * One row per sentence that mentions an established referent; `byId` maps a
 * referent id to the indexes of its sentences in document order. A sentence
 * whose text does not read back from its own byte range is a typed gap,
 * never a row (P5.2).
 */
export function mentionBook(chunks = [], index, { splitSentences } = {}) {
  if (typeof splitSentences !== "function") throw new TypeError("mentionBook: splitSentences is injected");
  const sentences = []; const byId = new Map(); const gaps = [];
  for (const c of chunks ?? []) {
    const text = String(c?.text ?? ""); if (!text.trim()) continue;
    let sents = []; try { sents = splitSentences(text); } catch { continue; }
    for (const s of sents) {
      const st = String(s?.text ?? ""); const off = Number(s?.offset ?? -1);
      if (!st.trim() || off < 0) continue;
      if (text.slice(off, off + st.length) !== st) { gaps.push({ ref: c.ref, offset: off, reason: "sentence does not read back from its offset" }); continue; }
      const ids = referentsOf(st, index).ids;
      if (!ids.size) continue;
      const start = (Number(c.start) || 0) + off, end = start + st.length;
      const row = { ref: `${c.source ?? String(c.ref ?? "").split("#")[0]}#${start}-${end}`, source: c.source ?? String(c.ref ?? "").split("#")[0], chunkRef: c.ref, start, end, text: st, ids, order: sentences.length };
      sentences.push(row);
      for (const id of ids) { if (!byId.has(id)) byId.set(id, []); byId.get(id).push(row.order); }
    }
  }
  return { sentences, byId, gaps, referents: byId.size };
}

/**
 * activate({ question, transcript, index, book, notes, dmdWindow }) →
 * { passages, basis, active, hop1, window, why }
 */
export function activate({ question = "", transcript = [], index, book, notes = [], dmdWindow = null, read = null }) {
  if (!index || !book) return { passages: [], basis: "surface", active: [], hop1: [], window: 0, why: !index ? "no referent index" : "no mention book" };
  const act = activeReferents(question, transcript, index);
  const active = act.ids;
  if (!active.size) return { passages: [], basis: "surface", active: [], hop1: [], window: 0, why: "the question resolves to no referent" };
  const hop0 = new Set(); for (const id of active) for (const i of book.byId.get(id) ?? []) hop0.add(i);
  if (!hop0.size) return { passages: [], basis: "surface", active: [...active].sort(), hop1: [], window: 0, why: "the active referents stand in no sentence of the material" };
  // hop 1: co-mentioned in hop-0 sentences, and the other ends of notes touching an active referent
  const hop1 = new Set();
  for (const i of hop0) for (const id of book.sentences[i].ids) if (!active.has(id)) hop1.add(id);
  for (const n of notes ?? []) {
    const s = resolveIds(index, n.subject ?? n.end1), o = resolveIds(index, n.object ?? n.end2);
    const touches = [...s].some((id) => active.has(id)) || [...o].some((id) => active.has(id));
    if (!touches) continue;
    for (const id of [...s, ...o]) if (!active.has(id)) hop1.add(id);
  }
  const hop1Sentences = new Set(); for (const id of hop1) for (const i of book.byId.get(id) ?? []) if (!hop0.has(i)) hop1Sentences.add(i);
  const carries = (row, set) => [...row.ids].filter((id) => set.has(id)).length;
  const rows0 = [...hop0].map((i) => ({ ...book.sentences[i], hop: 0 })).sort((a, b) => carries(b, active) - carries(a, active) || carries(b, hop1) - carries(a, hop1) || a.order - b.order);
  const rows1 = [...hop1Sentences].map((i) => ({ ...book.sentences[i], hop: 1 })).sort((a, b) => carries(b, hop1) - carries(a, hop1) || a.order - b.order);
  const rows = [...rows0.slice(0, SENTENCE_CEILING), ...rows1.slice(0, SENTENCE_CEILING)];
  const acts = new Map(); // row order → the acts the reader hears in it about an active or hop-1 referent (memo; read once per row, never beyond the ceiling)
  const actsOf = (r) => {
    if (typeof read !== "function") return [];
    if (acts.has(r.order)) return acts.get(r.order);
    let out = [];
    try {
      for (const c of read(r.text)?.claims ?? []) {
        const ends = [...resolveIds(index, c.end1 ?? c.subject), ...resolveIds(index, c.end2 ?? c.object)];
        const on = ends.filter((id) => active.has(id) || hop1.has(id));
        const label = fold(c.label ?? c.verb);
        if (label && on.length) for (const id of on) out.push(`${id}|${label}`);
      }
    } catch { out = []; }
    out = [...new Set(out)]; acts.set(r.order, out); return out;
  };
  const reachOf = (r) => [...r.ids].filter((id) => active.has(id)).map((id) => `0:${id}`).concat([...r.ids].filter((id) => hop1.has(id)).map((id) => `1:${id}`), actsOf(r));
  const cut = dmdCut(rows, new Set([...active, ...hop1]), { dmdWindow, reachOf });
  const passages = cut.rows.map((r) => ({ ref: r.ref, source: r.source, chunkRef: r.chunkRef, start: r.start, end: r.end, text: r.text, hop: r.hop, ids: [...r.ids].sort() }));
  return { passages, basis: "activation", grain: typeof read === "function" ? "act" : "referent", ceiling: SENTENCE_CEILING, active: [...active].sort(), activeBasis: act.basis, hop1: [...hop1].sort(), window: cut.window, cutBasis: cut.basis, hop0Count: hop0.size, hop1Count: hop1Sentences.size, why: `${hop0.size} sentence(s) carry the active referent(s), ${hop1Sentences.size} more carry what they stand with; ${cut.window} handed` };
}

/**
 * makeActivationRetrieval({ index, book, notes, transcript, dmdWindow, fallback })
 * → the `retrieveWith(chunks, question, limit, folded)` the turn takes.
 * `notes` and `transcript` may be functions (read at call time — the
 * ledger and the transcript grow as the conversation goes). The returned
 * array carries `basis`, `active`, `hop1`, `window`, `why` as properties so
 * the turn can record what retrieval did.
 */
export function makeActivationRetrieval({ index, book, notes = [], transcript = [], dmdWindow = null, fallback = null, read = null } = {}) {
  const live = (v) => (typeof v === "function" ? v() : v) ?? [];
  return function retrieveByActivation(chunks, question, limit, folded) {
    const r = activate({ question, transcript: live(transcript), index, book, notes: live(notes), dmdWindow, read });
    let out;
    if (r.passages.length) out = r.passages;
    else { out = typeof fallback === "function" ? [...(fallback(chunks, question, limit, folded) ?? [])] : []; r.basis = "surface"; r.why = `${r.why}; term retrieval stood in`; }
    Object.defineProperty(out, "retrieval", { value: { basis: r.basis, grain: r.grain ?? null, ceiling: r.ceiling ?? null, active: r.active, activeBasis: r.activeBasis ?? null, hop1: r.hop1, window: r.window, cutBasis: r.cutBasis ?? null, hop0Count: r.hop0Count ?? 0, hop1Count: r.hop1Count ?? 0, why: r.why }, enumerable: false });
    return out;
  };
}
