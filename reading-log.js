// reading-log.js — the holograph's address book as a PROJECTION OF THE
// READING'S OWN LOG, never a second reading. THE-HOLOGRAPH.md §7 names the
// law: the constitutional reader (READING-SPEC S1) writes `Encounter@1` (a
// sentence with its absolute byte anchor and its modality), `EOMention@1`
// (this mention → that referent, at this encounter), and `EOReferent@1`
// (the being: its surfaces and provenance, admitted under the Born gate,
// its address given at birth — S80). Everything here is a fold over those
// entries. No text is scanned, no case is read, no regex names a being:
// what the reader established is what exists (P38), in whatever script or
// medium the adapter that wrote the entries reads (S6, S16, S34–S39).
//
//   readingIndexFromLog(entries, organs)  → { referents, resolve, represent,
//       resolveIn, vocabulary, mentions } — the identity face the loops and
//       blocks resolve through. `resolve(name)` matches a name against the
//       referents' OWN surfaces under the session's fold (diaNorm) and the
//       coreference organ (namesCorefer) — the same two organs cast.js
//       resolves with; `resolveIn(text)` does it for every token run of a
//       text with no case anywhere (a Hebrew question and an English one go
//       through the same line); `vocabulary` is every token the reader
//       encountered, the material's own, for the absence bar.
//   mentionBookFromLog(entries)           → the address book activation
//       retrieval reads: one row per encounter that carries a mention, its
//       referent ids, its absolute range; byId: referent → rows.
//   stepChunks(reader, chunks, …)         → feeds a run of chunks to the
//       constitutional reader as encounters (the adapter's own
//       `textEncounters`, offset = the chunk's absolute start), under a
//       declared budget, and hands back the log entries that landed so a
//       caller can persist them append-only (S25).
//
// Pure. The reader, the encounter adapter, diaNorm and namesCorefer are
// injected (the cast.js posture). Nothing here waits on the relation reader.
import { tokenize } from "./source.js";

const isEncounter = (e) => e?.schema === "Encounter@1";
const isMention = (e) => e?.schema === "EOMention@1";
const isReferent = (e) => e?.schema === "EOReferent@1";
const isOccurrence = (e) => e?.schema === "EOReferentOccurrence@1";

/**
 * Fold the log once: referents by id (surfaces unioned), encounters in
 * order, mentions per encounter. The reading's entries live in the FOLD —
 * each step's `Observation@1` carries `graphEntries`, and `EOReferent@1` /
 * `EOMention@1` land there at the perceiver's refresh — so the fold is
 * reconstructed from the log by the kernel's own `reconstruct` (injected;
 * `kernel/fold.js`) and its `graphEntries` are read beside the log's
 * top-level `Encounter@1` rows. A material shorter than the refresh cadence
 * has no referents yet: that is the reader's own state, reported as such.
 */
export function foldReading(entries = [], { reconstruct = null, diaNorm = null, namesCorefer = null, surfaceIndex = null, surfacesIn = null } = {}) {
  const referents = new Map(); const encounters = new Map(); const mentions = []; const occurrences = [];
  let order = 0;
  let graph = [];
  if (typeof reconstruct === "function") { try { graph = reconstruct(entries)?.graphEntries ?? []; } catch { graph = []; } }
  else for (const e of entries ?? []) if (e?.schema === "Observation@1") graph.push(...(e.graphEntries ?? []));
  for (const e of [...(entries ?? []), ...graph]) {
    if (isReferent(e)) {
      const r = referents.get(e.id) ?? { id: e.id, surfaces: new Set(), provenance: [], fedBy: new Set() };
      for (const s of e.surfaces ?? []) r.surfaces.add(String(s));
      for (const p of e.provenance ?? []) r.provenance.push(p);
      for (const f of e.fedBy ?? []) r.fedBy.add(String(f));
      referents.set(e.id, r);
    } else if (isEncounter(e)) {
      const key = encounterKey(e);
      if (!encounters.has(key)) encounters.set(key, { key, source: e.source, modality: e.modality ?? null, start: Number(e.anchor?.start), end: Number(e.anchor?.end), text: String(e.material ?? ""), sequencePosition: e.sequencePosition ?? null, order: order++, ids: new Set() });
    } else if (isMention(e)) mentions.push(e);
    else if (isOccurrence(e)) occurrences.push(e);
  }
  // A mention names its encounter by ref (`encounterRef`) — match on the key the encounter itself carries, else on anchor + source.
  const byRef = new Map(); const bySeq = new Map();
  for (const enc of encounters.values()) { byRef.set(enc.key, enc); if (enc.sequencePosition != null) { byRef.set(`${enc.source}:${enc.sequencePosition}`, enc); bySeq.set(Number(enc.sequencePosition), enc); } }
  const encounterOf = (ref, anchor, source) => {
    const r = String(ref ?? "");
    return byRef.get(r) ?? (anchor ? byRef.get(`${source}#${anchor.start}-${anchor.end}`) : null) ?? (/:(\d+)$/.test(r) ? bySeq.get(Number(r.match(/:(\d+)$/)[1])) : null) ?? null;
  };
  // EOMention@1 is the reader's own occurrence-level answer (written for a referent already established at the step); it always attaches.
  for (const m of mentions) { const enc = encounterOf(m.encounterRef, m.anchor, m.source); if (enc && m.referent) enc.ids.add(m.referent); }
  // A being's birth records the mentions that FED it (P160's feeder links: `mention:<sequence>:<slug>`) — the sentences it stood in before it was born, which a causal read could not mention at the time. The reader's own record, read off.
  let fed = 0;
  for (const r of referents.values()) for (const f of r.fedBy) { const m = /^mention:(\d+):/.exec(f); if (!m) continue; const enc = bySeq.get(Number(m[1])); if (enc && !enc.ids.has(r.id)) { enc.ids.add(r.id); fed += 1; } }
  // EOReferentOccurrence@1 is every surface the reader saw, from the first sentence, before any refresh. It attaches at TYPE level only when its surface names exactly ONE referent — an ambiguous surface is the occurrence layer's question (S17-type, S11) and is counted as a gap, never guessed.
  // Resolution is the same two organs the index resolves with: the session's fold for an exact surface, then the coreference organ against each referent's own surfaces ("Rodion Raskolnikov" against "Raskolnikov").
  const foldKey = (t) => (typeof diaNorm === "function" ? diaNorm(String(t ?? "")) : String(t ?? "")).toLowerCase().replace(/\s+/g, " ").trim();
  const surfaceIds = new Map();
  for (const r of referents.values()) for (const s of r.surfaces) { const k = foldKey(s); if (!surfaceIds.has(k)) surfaceIds.set(k, new Set()); surfaceIds.get(k).add(r.id); }
  const memo = new Map();
  const idsOfSurface = (surface) => {
    const k = foldKey(surface); if (!k) return new Set();
    if (memo.has(k)) return memo.get(k);
    let ids = surfaceIds.get(k);
    if ((!ids || !ids.size) && typeof namesCorefer === "function") { ids = new Set(); for (const r of referents.values()) for (const s of r.surfaces) { try { if (namesCorefer(String(surface), String(s))) { ids.add(r.id); break; } } catch {} } }
    ids = ids ?? new Set(); memo.set(k, ids); return ids;
  };
  let ambiguous = 0, unresolved = 0;
  for (const o of occurrences) {
    const enc = encounterOf(o.encounterRef, o.anchor, o.source); if (!enc) continue;
    let ids = idsOfSurface(o.surface ?? o.exactSurface); if (!ids.size && o.canonicalSurface) ids = idsOfSurface(o.canonicalSurface);
    if (!ids.size) { unresolved += 1; continue; }
    if (ids.size > 1) { ambiguous += 1; continue; }
    enc.ids.add([...ids][0]);
  }
  // The sentences a being stood in BEFORE its birth are in no log entry — a
  // causal reader cannot mention a being it has not yet established (S3),
  // and the log says so. The reader's own per-sentence surface matcher
  // (`surfaceIndex`/`surfacesIn`, recursive.js — the organ the perceiver
  // itself locates surfaces with; the session's fold, no case) is run over
  // the reader's own referent surfaces to locate them; an unambiguous
  // surface attaches, an ambiguous one is a counted gap. This is the
  // reader's organ over the reader's referents — a projection, not a scan
  // with a rule of its own.
  let located = 0;
  if (typeof surfaceIndex === "function" && typeof surfacesIn === "function" && referents.size) {
    const all = [...new Set([...referents.values()].flatMap((r) => [...r.surfaces]))];
    let sidx = null; try { sidx = surfaceIndex(all); } catch { sidx = null; }
    if (sidx) for (const enc of encounters.values()) {
      let present = []; try { present = surfacesIn(enc.text, sidx) ?? []; } catch { present = []; }
      for (const sf of present) { const ids = idsOfSurface(sf); if (ids.size === 1) { const id = [...ids][0]; if (!enc.ids.has(id)) { enc.ids.add(id); located += 1; } } else if (ids.size > 1) ambiguous += 1; }
    }
  }
  return { referents, encounters: [...encounters.values()].sort((a, b) => a.order - b.order), mentions, occurrences: occurrences.length, ambiguous, unresolved, fed, located };
}
const encounterKey = (e) => e?.anchor && Number.isFinite(Number(e.anchor.start)) ? `${e.source}#${e.anchor.start}-${e.anchor.end}` : `${e.source}:${e.sequencePosition}`;

/**
 * The identity face over the reading. `resolve(name)`: a referent whose own
 * surface equals the name under the fold, or corefers with it by the
 * injected organ; `resolveIn(text)`: every token run of `text` (up to the
 * longest surface, first token indexed) resolved the same way — no case.
 */
export function readingIndexFromLog(entries = [], { diaNorm, namesCorefer, reconstruct = null, surfaceIndex = null, surfacesIn = null } = {}) {
  if (typeof diaNorm !== "function") throw new TypeError("readingIndexFromLog: diaNorm (the session's fold) is injected");
  const { referents, encounters, mentions } = foldReading(entries, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
  const norm = (t) => diaNorm(String(t ?? "")).toLowerCase().trim();
  const bySurface = new Map(); const byFirst = new Map(); let longest = 1;
  for (const r of referents.values()) for (const s of r.surfaces) {
    const n = norm(s); if (!n) continue;
    if (!bySurface.has(n)) bySurface.set(n, new Set()); bySurface.get(n).add(r.id);
    const toks = n.split(/\s+/); longest = Math.max(longest, toks.length);
    if (!byFirst.has(toks[0])) byFirst.set(toks[0], new Set()); byFirst.get(toks[0]).add(r.id);
  }
  const resolve = (name) => {
    const n = norm(name); if (!n) return new Set();
    const exact = bySurface.get(n); if (exact?.size) return new Set(exact);
    const out = new Set();
    if (typeof namesCorefer === "function") for (const r of referents.values()) for (const s of r.surfaces) { try { if (namesCorefer(String(name), String(s))) { out.add(r.id); break; } } catch {} }
    return out;
  };
  const resolveIn = (text) => {
    const toks = norm(text).split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean);
    const out = new Set();
    for (let i = 0; i < toks.length; i++) {
      if (!byFirst.has(toks[i])) continue;
      for (let j = Math.min(toks.length, i + longest); j > i; j--) { const run = toks.slice(i, j).join(" "); const hit = bySurface.get(run); if (hit?.size) { for (const id of hit) out.add(id); break; } }
    }
    return out;
  };
  const represent = (id) => { const r = referents.get(id); if (!r) return id; let best = ""; for (const s of r.surfaces) if (s.length > best.length) best = s; return best || id; };
  const vocabulary = new Set(); for (const enc of encounters) for (const t of tokenize(enc.text)) vocabulary.add(t);
  return Object.freeze({ referents: new Set(referents.keys()), resolve, resolveIn, represent, vocabulary, mentions: mentions.length, encounters: encounters.length, caseless: true, basis: "readingIndexFromLog: EOReferent@1 surfaces under the session's fold + namesCorefer; no case, no scan" });
}

/** The address book: one row per encounter carrying a mention, in reading order; byId: referent → rows. Same shape activation-retrieval.js reads. */
export function mentionBookFromLog(entries = [], { reconstruct = null, diaNorm = null, namesCorefer = null, surfaceIndex = null, surfacesIn = null } = {}) {
  const f = foldReading(entries, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
  const { encounters } = f;
  const sentences = []; const byId = new Map(); const gaps = [];
  for (const enc of encounters) {
    if (!enc.ids.size) continue;
    if (!Number.isFinite(enc.start) || !Number.isFinite(enc.end)) { gaps.push({ key: enc.key, reason: "encounter without an anchor" }); continue; }
    const row = { ref: `${enc.source}#${enc.start}-${enc.end}`, source: enc.source, start: enc.start, end: enc.end, text: enc.text, ids: enc.ids, order: sentences.length, modality: enc.modality };
    sentences.push(row);
    for (const id of enc.ids) { if (!byId.has(id)) byId.set(id, []); byId.get(id).push(row.order); }
  }
  return { sentences, byId, gaps, referents: byId.size, located: f.located, ambiguous: f.ambiguous, basis: "mentionBookFromLog: EOMention@1 + the referent's feeders + the reader's own surface matcher over its referents' surfaces, over Encounter@1 anchors" };
}

/**
 * stepChunks(reader, chunks, { textEncounters, cursor, budgetMs }) → { cursor, read, entries, ms }
 * Feeds chunks[cursor…] to the reader as encounters (source = the chunk's
 * own source name, offset = its absolute start, so every anchor is the
 * file's own address) until the budget is spent; returns the log entries
 * that landed since `reader.getLog().length` was `logLength` — the caller
 * persists them append-only. A budget of 0 reads everything handed.
 */
export async function stepChunks(reader, chunks = [], { textEncounters, cursor = 0, budgetMs = 0, logLength = null, sequence = null } = {}) {
  if (!reader?.step || typeof textEncounters !== "function") throw new TypeError("stepChunks: a reader with step() and the adapter's textEncounters are injected");
  const t0 = Date.now(); let i = cursor; const before = logLength ?? reader.getLog().length;
  // The reader's encounter identity is its SEQUENCE POSITION, and textEncounters numbers a text from 0 — feeding chunk by chunk without a running count gives every chunk's first sentence the same position and the reader's own mention references collide across chunks (found 2026-09-07). The count runs across the whole material, as it does when the reference driver feeds the text in one call.
  let seq = sequence ?? (reader.getLog().filter((e) => e?.schema === "Encounter@1").length);
  while (i < chunks.length && (!budgetMs || Date.now() - t0 < budgetMs)) {
    const c = chunks[i];
    const source = c.source ?? String(c.ref ?? "").split("#")[0];
    for (const e of textEncounters(String(c.text ?? ""), { source, offset: Number(c.start) || 0 })) await reader.step({ ...e, sequencePosition: seq++ });
    i += 1;
  }
  const log = reader.getLog();
  return { cursor: i, read: i - cursor, entries: log.slice(before), logLength: log.length, sequence: seq, ms: Date.now() - t0 };
}
