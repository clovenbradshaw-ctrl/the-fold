// holograph.js — the conversation as the record holds it, DRAWN. Pure.
//
// User direction (2026-09-08): "have it connected more to the holograph (it
// should know it's about batman just from discourse history even if it's
// not stated)" … "let's be able to visually see the holograph."
//
// THE-HOLOGRAPH (eoreader7 docs) §1: the record is the object; what anyone
// is handed is a small addressed pattern computed from it, every part
// pointing at the whole. This module draws that pattern for one
// conversation: the WHOLE at the centre; around it the REFERENTS the
// conversation has established — what its questions asked about (the
// subject and fill loops' own declared ends), what its answers named (the
// injected `namesIn` over each answer, never a word list here), what the
// record declared a gap over; on each referent, the LOOPS that stand on it
// as marks (a reopened loop drawn as rings — the spiral, literally), and the
// gaps as hollow marks. A referent is an address: `expandReferent` re-expands
// it to every turn, loop, note and gap that holds it (§1's first property,
// as a door the record opens — never something a mouth does).
//
// THE LEVEL IT STANDS ON (user, 2026-09-08): "holon levels within levels —
// there's an entity-to-paradigm loop on the level of textual characters all
// the way up, then on the level of actual concepts being expressed via
// words it's another loop; let's be on that second level." So a referent
// here is a BEING the reading established — the injected `index` (cast.js's
// referent index, built by the caller with the organ's own recurrence
// floor), resolved by identity, never a capitalised run: a capitalised run
// is only ever a CANDIDATE the index vetoes (P170's rule; "Fighting" at the
// head of a verse line is not a being). The one exception is an end a
// question DECLARED — the subject or the void's anchor — which is on the
// record by the question's own words whether or not any reading has met it
// yet, and is drawn as declared. Without an index nothing is a referent but
// the declared ends: an absent organ is an absence, never a guess.
//
// Three walls. Nothing here reads meaning. Weight is a COUNT of turns and
// loops, never a score. And the layout is by declared rule (weight order on
// a ring), never "most interesting first" (FOLD-CONSTITUTION III.1). Past
// the drawing's cap the rest is counted, so a novel's cast of hundreds draws
// its top and says how many more it holds.
//
// NO CIRCLE (user, 2026-09-08: "don't need to nest as circle, we're just
// able to drill"): the holograph is rows at a rung, and a row DRILLS into
// its parts — a referent into its loops, turns and places; a turn into its
// spans; a loop into its trail; a place into the bytes (a door). Every row
// is plain words; the rung's name is the only canon on screen, by the
// user's own ask. Data → rows, both pure; the page draws the rows.

import { lineFor, stateWord, trailLine } from "./loops.js";

const foldText = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/’/g, "'").replace(/'s\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The turns of a history: one per user message, with the answer that followed. */
export function turnsOf(history = []) {
  const turns = [];
  let cur = null;
  for (const h of history) {
    if (h?.role === "user") { cur = { n: turns.length + 1, asked: String(h.content ?? ""), answer: "" }; turns.push(cur); }
    else if (h?.role === "assistant" && cur) cur.answer = `${cur.answer}${cur.answer ? "\n" : ""}${String(h.content ?? "")}`;
  }
  return turns;
}

/**
 * holographOf({ history, loops, voids, namesIn, convo }) → the model.
 * `loops` are loops.js's folded loops (already filtered to the conversation
 * by the caller, or filtered here by `convo`); `voids` the record's live
 * voids in SVO face ({ id, subject, verb, object, scope }).
 */
/**
 * THE NINE TERRAINS, as the VERTICAL axis (user, 2026-09-08: "a vertical
 * toggle to go from entities to paradigms" → "the 9 terrains"). Bottom to
 * top: Existence (Void, Entity, Kind), Structure (Field, Link, Network),
 * Interpretation (Atmosphere, Lens, Paradigm) — the cube's own
 * TERRAIN_BY_DOMAIN read domain-major, grain within. Each rung is a
 * projection of the same record at the cursor; each stands in for the one
 * below it (THE-HOLOGRAPH §1.2). Named here by the user's explicit ask; the
 * plain reading rides each rung so a reader who never met the canon still
 * knows what the picture shows.
 */
export const LEVELS = Object.freeze([
  Object.freeze({ key: "void", domain: "existence", reads: "what is still empty — the loops each turn opened and has not closed, and the gaps declared on the record" }),
  Object.freeze({ key: "entity", domain: "existence", reads: "who and what is there — the referents the questions asked about and the answers named" }),
  Object.freeze({ key: "kind", domain: "existence", reads: "what kinds of thing are in play — asked about, named by an answer, or declared a gap" }),
  Object.freeze({ key: "field", domain: "structure", reads: "the extent — every turn's spans: the sentences it said and the places in the material it stood on" }),
  Object.freeze({ key: "link", domain: "structure", reads: "what binds question to record — the loops on each referent, and what closed them" }),
  Object.freeze({ key: "network", domain: "structure", reads: "how the referents compose — which of them share a turn" }),
  Object.freeze({ key: "atmosphere", domain: "interpretation", reads: "where each referent stands — open, closed, could not close, gaps — in one line" }),
  Object.freeze({ key: "lens", domain: "interpretation", reads: "what is said about each referent — the line its latest closed loop left" }),
  Object.freeze({ key: "paradigm", domain: "interpretation", reads: "what recurs — referents met on more than one turn, loops that went round again" }),
]);

const sentencesOf = (text, splitSentences) => {
  if (typeof splitSentences === "function") { try { return splitSentences(String(text ?? "")).map((x) => String(x?.text ?? x)).filter((x) => x.trim()); } catch { /* fall through */ } }
  return String(text ?? "").split(/\n+|(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
};

export function holographOf({ history = [], loops = [], voids = [], namesIn = null, index = null, sources = [], convo = null, throughTurn = null, records = [], splitSentences = null } = {}) {
  // The cursor's reach: the turns at or before the one the cursor's act
  // belongs to. `loops` arrive already folded at the cursor by the caller.
  // Each turn carries its SPANS: the sentences it said (addressed turn:N#k)
  // and the places in the material its checked answer stood on (the
  // records' own refs, when the caller hands them).
  const turns = turnsOf(history).filter((t) => throughTurn == null || t.n <= throughTurn).map((t) => {
    const said = sentencesOf(t.answer, splitSentences).map((text, k) => ({ at: `turn:${t.n}#${k + 1}`, text }));
    const refs = (records ?? []).filter((r) => r?.turn === t.n).flatMap((r) => r.refs ?? []);
    return { ...t, spans: said, refs: [...new Set(refs)] };
  });
  const mine = convo != null ? loops.filter((l) => l.convo === convo) : loops;
  const refs = new Map();
  // A referent node is keyed by the INDEX's id where the index resolves the
  // surface, and by the folded surface only for a declared end the index
  // never established (`declared: true`, drawn as such).
  const resolveIds = (name) => { try { const r = index?.resolve?.(name); return r instanceof Set ? [...r] : [...(r ?? [])]; } catch { return []; } };
  const represent = (id) => { try { return index?.represent?.(id) ?? null; } catch { return null; } };
  const node = (key, name, declared) => {
    if (!refs.has(key)) refs.set(key, { key, name: String(name).trim(), declared, asked: new Set(), said: new Set(), loops: new Set(), voids: new Set(), notes: [], mentions: 0 });
    return refs.get(key);
  };
  // A surface → the nodes it names: the index's beings, or (for a declared
  // end only) a node under its own folded surface.
  const at = (surface, { declare = false } = {}) => {
    const ids = resolveIds(surface);
    if (ids.length) return ids.map((id) => node(`id:${id}`, represent(id) ?? surface, false));
    if (!declare) return [];
    const key = foldText(surface);
    return key ? [node(`declared:${key}`, surface, true)] : [];
  };
  const names = (text) => (typeof namesIn === "function" ? namesIn(String(text ?? "")) : []);
  // What the questions asked about, and what the answers named — CANDIDATES
  // from the names organ, each vetoed by the index.
  for (const t of turns) {
    for (const n of names(t.asked)) for (const r of at(n)) r.asked.add(t.n);
    for (const n of names(t.answer)) for (const r of at(n)) r.said.add(t.n);
  }
  // What the loops declared as their ends — on the record by the question's
  // own words, kept even when no reading established them.
  for (const l of mine) {
    const ends = [];
    if (l.kind === "subject" && l.meta?.subject?.phrase) ends.push(l.meta.subject.phrase);
    if (l.kind === "fill" && l.meta?.anchor) ends.push(l.meta.anchor);
    if (l.kind === "absent") { const m = /"([^"]+)"/.exec(l.asks ?? ""); if (m) ends.push(m[1]); }
    for (const e of ends) for (const r of at(e, { declare: true })) { r.loops.add(l.id); if (l.turn != null) r.asked.add(l.turn); }
  }
  // The material's own beings: every referent the index established, with
  // its mention count — so a novel's cast is on the holograph whether or not
  // the conversation has reached it yet.
  if (index?.referents) {
    const counts = new Map();
    for (const e of index.events ?? []) counts.set(e.referent_id, (counts.get(e.referent_id) ?? 0) + 1);
    for (const id of index.referents) { const r = node(`id:${id}`, represent(id) ?? String(id), false); r.mentions = counts.get(id) ?? 0; }
  }
  // Every other loop attaches to the referents its own words hold; a loop
  // holding none attaches to the whole.
  const whole = { loops: new Set(), notes: [] };
  for (const l of mine) {
    const hay = foldText([l.asks, l.closesOn, l.line, ...(l.evidence ?? []).map((e) => e.note)].filter(Boolean).join(" "));
    let held = false;
    for (const r of refs.values()) {
      if (r.loops.has(l.id)) { held = true; continue; }
      if (r.key && hay.includes(r.key)) { r.loops.add(l.id); held = true; }
    }
    if (!held) whole.loops.add(l.id);
    for (const e of l.evidence ?? []) if (e.prompt && e.note) (held ? [...refs.values()].filter((r) => r.loops.has(l.id)) : [whole]).forEach((r) => r.notes.push({ loop: l.id, asks: l.asks, note: e.note, turn: e.turn ?? null }));
  }
  // The gaps the record declared, on their own end.
  for (const v of voids ?? []) { const held = at(v.subject ?? v.end1, { declare: true }); if (held.length) for (const r of held) r.voids.add(v.id); else whole.loops.add(v.id); }
  const byId = new Map(mine.map((l) => [l.id, l]));
  const referents = [...refs.values()].map((r) => Object.freeze({
    key: r.key, name: r.name, declared: r.declared, mentions: r.mentions,
    asked: Object.freeze([...r.asked].sort((a, b) => a - b)),
    said: Object.freeze([...r.said].sort((a, b) => a - b)),
    loops: Object.freeze([...r.loops].map((id) => byId.get(id)).filter(Boolean)),
    voids: Object.freeze([...r.voids].map((id) => (voids ?? []).find((v) => v.id === id)).filter(Boolean)),
    notes: Object.freeze(r.notes),
    weight: r.asked.size * 2 + r.said.size + r.loops.size + r.voids.size,
    // What the conversation touched comes first, by weight; the rest of the
    // material's cast follows by how often the reading met it.
  })).sort((a, b) => (b.weight - a.weight) || (b.mentions - a.mentions) || a.name.localeCompare(b.name));
  return Object.freeze({
    convo, throughTurn, turns: Object.freeze(turns), referents: Object.freeze(referents),
    whole: Object.freeze({ loops: Object.freeze([...whole.loops].map((id) => byId.get(id)).filter(Boolean)), notes: Object.freeze(whole.notes) }),
    voids: Object.freeze([...(voids ?? [])]),
    sources: Object.freeze((sources ?? []).map((x) => ({ name: x.name, bytes: Number(x.bytes) || 0, read: Number(x.read) || 0, total: Number(x.total) || 0 }))),
    records: Object.freeze((records ?? []).map((r) => ({ turn: r.turn, refs: [...(r.refs ?? [])] }))),
  });
}

/** What recurs — the paradigm level: referents met on more than one turn, loops that went round again (ring > 1), and a kind of loop the conversation keeps opening. Counted, never scored. */
export function paradigmsOf(model) {
  const referents = model.referents.filter((r) => new Set([...r.asked, ...r.said]).size >= 2);
  const all = [...model.referents.flatMap((r) => r.loops), ...model.whole.loops].filter((l, j, arr) => arr.findIndex((x) => x.id === l.id) === j);
  const again = all.filter((l) => (l.ring ?? 1) > 1);
  const kinds = new Map();
  for (const l of all) { const k = kinds.get(l.kind) ?? new Set(); for (const t of l.touched ?? []) k.add(t); kinds.set(l.kind, k); }
  const recurringKinds = [...kinds.entries()].filter(([, ts]) => ts.size >= 2).map(([kind, ts]) => ({ kind, turns: ts.size }));
  return Object.freeze({ referents: Object.freeze(referents), again: Object.freeze(again), kinds: Object.freeze(recurringKinds) });
}

/** One line per referent (and one for the whole) — where each stands, counted, never scored. */
export function standingLines(model) {
  const line = (loops, voids) => {
    const st = {};
    for (const l of loops) st[l.state] = (st[l.state] ?? 0) + 1;
    const bits = [st.open ? `${st.open} open` : null, st.contested ? `${st.contested} contested` : null, st.refused ? `${st.refused} could not close` : null, st.closed ? `${st.closed} closed` : null, st.waived ? `${st.waived} set aside` : null, voids?.length ? `${voids.length} gap${voids.length === 1 ? "" : "s"}` : null].filter(Boolean);
    return bits.length ? bits.join(" · ") : "nothing owed";
  };
  return Object.freeze({
    whole: line(model.whole.loops, []),
    referents: Object.freeze(model.referents.map((r) => Object.freeze({ name: r.name, line: line(r.loops, r.voids), asked: r.asked.length, said: r.said.length }))),
  });
}

const witnessLineOf = (l) => { const w = l?.witness; if (!w) return ""; if (w.line) return w.line; if (w.value != null) return `${w.value}${w.source ? ` — from ${w.source}` : ""}`; if (Array.isArray(w.addresses)) return w.addresses.length ? `backed by ${w.addresses.length} place${w.addresses.length === 1 ? "" : "s"} in the material` : "checked"; return ""; };

/** Everything the record holds about one referent — the part re-expanded. */
export function expandReferent(model, name) {
  const key = foldText(name);
  return model?.referents?.find((r) => r.key === key || r.key.includes(key) || key.includes(r.key)) ?? null;
}


/** A row of the holograph: what it is (`kind`), its words (`title`, `meta`, `line`), the address it can re-expand to (`at`), and its parts (`drill`, lazily). */
const row = (o) => Object.freeze({ kind: "row", meta: null, line: null, at: null, state: null, drill: null, ...o });
const turnRow = (t, { convo = null } = {}) => row({ kind: "turn", key: `turn:${t.n}`, title: `turn ${t.n}`, meta: t.asked.length > 80 ? `${t.asked.slice(0, 77)}…` : t.asked, line: t.answer ? (t.answer.length > 160 ? `${t.answer.slice(0, 157)}…` : t.answer) : "no answer yet", drill: () => t.spans.map((sp) => row({ kind: "span", key: sp.at, title: sp.text, at: sp.at })).concat(t.refs.map((ref) => row({ kind: "place", key: `${t.n}:${ref}`, title: ref, meta: "a place in the material this answer stood on", at: ref }))) });
const loopRow = (l) => row({ kind: "loop", key: l.id, title: l.asks, meta: stateWord(l), line: lineFor(l), state: l.state, drill: () => l.history.map((h, i) => row({ kind: "step", key: `${l.id}#${i}`, title: trailLine(h, { showTurn: true }) })) });
const placeRows = (r, places) => (places ?? []).filter((c) => c).map((c) => row({ kind: "place", key: `${r.key}:${c.ref}`, title: c.ref, meta: c.text ? (c.text.length > 120 ? `${c.text.slice(0, 117)}…` : c.text) : null, at: c.ref }));
const referentRow = (r, model, { placesOf = null } = {}) => row({
  kind: "referent", key: r.key, title: r.name,
  meta: [r.declared ? "declared by a question, not yet met by the reading" : null, r.asked.length ? `asked about on turn${r.asked.length === 1 ? "" : "s"} ${r.asked.join(", ")}` : null, r.said.length ? `named in the answer on turn${r.said.length === 1 ? "" : "s"} ${r.said.join(", ")}` : null, r.mentions ? `met ${r.mentions} time${r.mentions === 1 ? "" : "s"} by the reading` : null].filter(Boolean).join(" · ") || null,
  line: r.loops.length || r.voids.length ? [r.loops.length ? `${r.loops.length} loop${r.loops.length === 1 ? "" : "s"}` : null, r.voids.length ? `${r.voids.length} gap${r.voids.length === 1 ? "" : "s"} on the record` : null].filter(Boolean).join(" · ") : null,
  drill: () => [
    ...r.loops.map(loopRow),
    ...r.voids.map((v) => row({ kind: "gap", key: v.id, title: `${v.subject} — ${v.verb} → ?`, meta: "declared a gap on the record; the first arrival that fills it closes it", state: "open" })),
    ...r.notes.map((n, i) => row({ kind: "note", key: `${r.key}:note:${i}`, title: `you added: “${n.note}”`, meta: `on ${n.asks}${n.turn != null ? ` · turn ${n.turn}` : ""}` })),
    ...model.turns.filter((t) => r.asked.includes(t.n) || r.said.includes(t.n)).map((t) => turnRow(t)),
    ...placeRows(r, typeof placesOf === "function" ? placesOf(r) : []),
  ],
});

/**
 * rowsFor(model, level, { placesOf }) → the rows at one rung. `placesOf(r)`
 * is the caller's: the passages in the material that hold a referent
 * ({ref, text}), each a door to the bytes.
 */
export function rowsFor(model, level, { placesOf = null } = {}) {
  const key = (t) => (model.convo != null ? `${model.convo}:${t}` : String(t));
  const allLoops = [...model.referents.flatMap((r) => r.loops), ...model.whole.loops].filter((l, j, arr) => arr.findIndex((x) => x.id === l.id) === j);
  const ref = (r) => referentRow(r, model, { placesOf });
  switch (level) {
    case "void": {
      const rows = model.turns.map((t) => {
        const open = allLoops.filter((l) => (l.touched ?? []).includes(key(t.n)) && (l.state === "open" || l.state === "contested"));
        return row({ kind: "turn", key: `turn:${t.n}`, title: `turn ${t.n} — ${t.asked.length > 70 ? `${t.asked.slice(0, 67)}…` : t.asked}`, meta: open.length ? `${open.length} still open` : "nothing still open", state: open.length ? "open" : "closed", drill: open.length ? () => open.map(loopRow) : null });
      });
      const gaps = model.voids.map((v) => row({ kind: "gap", key: v.id, title: `${v.subject} — ${v.verb} → ?`, meta: "a gap declared on the record", state: "open" }));
      return rows.length || gaps.length ? [...rows, ...gaps] : [row({ kind: "empty", key: "empty", title: "nothing yet" })];
    }
    case "entity":
      return model.referents.length ? model.referents.map(ref) : [row({ kind: "empty", key: "empty", title: "no one is here yet — ask about something, or attach material" })];
    case "kind": {
      const kindOf = (r) => (r.declared ? "declared by a question" : r.voids.length ? "a gap on the record" : r.asked.length ? "asked about" : "named by an answer");
      const groups = new Map();
      for (const r of model.referents) { const k = kindOf(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
      return groups.size ? [...groups.entries()].map(([k, rs]) => row({ kind: "group", key: `kind:${k}`, title: k, meta: `${rs.length}`, drill: () => rs.map(ref) })) : [row({ kind: "empty", key: "empty", title: "nothing yet" })];
    }
    case "field": {
      const srcs = model.sources.map((src) => row({ kind: "source", key: `src:${src.name}`, title: src.name, meta: `${src.bytes.toLocaleString()} bytes${src.total ? ` · ${src.read} of ${src.total} parts read` : " · not read yet"}`, drill: () => { const cited = model.records.flatMap((rc) => rc.refs.filter((x) => String(x).startsWith(`${src.name}#`)).map((x) => ({ ref: x, turn: rc.turn }))); return cited.length ? cited.map((c) => row({ kind: "place", key: `${src.name}:${c.ref}`, title: c.ref, meta: `cited on turn ${c.turn}`, at: c.ref })) : [row({ kind: "empty", key: `${src.name}:none`, title: "no answer has cited into it yet" })]; } }));
      const turns = model.turns.map((t) => turnRow(t));
      return srcs.length || turns.length ? [...srcs, ...turns] : [row({ kind: "empty", key: "empty", title: "nothing attached and nothing said yet" })];
    }
    case "link": {
      const rows = model.referents.filter((r) => r.loops.length || r.voids.length).map((r) => row({ kind: "referent", key: r.key, title: r.name, meta: `${r.loops.length} loop${r.loops.length === 1 ? "" : "s"}${r.voids.length ? ` · ${r.voids.length} gap${r.voids.length === 1 ? "" : "s"}` : ""}`, drill: () => [...r.loops.map(loopRow), ...r.voids.map((v) => row({ kind: "gap", key: v.id, title: `${v.subject} — ${v.verb} → ?`, meta: "a gap on the record", state: "open" }))] }));
      if (model.whole.loops.length) rows.push(row({ kind: "whole", key: "whole", title: "this conversation as a whole", meta: `${model.whole.loops.length} loop${model.whole.loops.length === 1 ? "" : "s"} on no one referent`, drill: () => model.whole.loops.map(loopRow) }));
      return rows.length ? rows : [row({ kind: "empty", key: "empty", title: "no loops yet" })];
    }
    case "network": {
      const turnsOfRef = (r) => new Set([...r.asked, ...r.said]);
      const pairs = [];
      for (let i = 0; i < model.referents.length; i += 1) for (let j = i + 1; j < model.referents.length; j += 1) {
        const a = model.referents[i], b = model.referents[j];
        const shared = [...turnsOfRef(a)].filter((t) => turnsOfRef(b).has(t));
        if (shared.length) pairs.push(row({ kind: "pair", key: `${a.key}&${b.key}`, title: `${a.name} & ${b.name}`, meta: `share turn${shared.length === 1 ? "" : "s"} ${shared.join(", ")}`, drill: () => model.turns.filter((t) => shared.includes(t.n)).map((t) => turnRow(t)) }));
      }
      return pairs.length ? pairs : [row({ kind: "empty", key: "empty", title: model.referents.length > 1 ? "no two of them share a turn yet" : "not enough here to share a turn" })];
    }
    case "atmosphere": {
      const st = standingLines(model);
      return [row({ kind: "whole", key: "whole", title: "this conversation", meta: st.whole, drill: model.whole.loops.length ? () => model.whole.loops.map(loopRow) : null }), ...st.referents.map((x) => { const r = model.referents.find((rr) => rr.name === x.name); return row({ kind: "referent", key: r.key, title: r.name, meta: x.line, drill: r.loops.length ? () => r.loops.map(loopRow) : null }); })];
    }
    case "lens":
      return model.referents.length ? model.referents.map((r) => { const closed = [...r.loops].filter((l) => l.state === "closed").sort((p, q) => (q.closedAt ?? 0) - (p.closedAt ?? 0)); const latest = closed[0] ?? null; return row({ kind: "referent", key: r.key, title: r.name, meta: latest ? latest.asks : r.loops.length ? `${r.loops.length} loop${r.loops.length === 1 ? "" : "s"}, none closed yet` : "nothing said of it yet", line: latest ? lineFor(latest) : null, drill: closed.length ? () => closed.map(loopRow) : null }); }) : [row({ kind: "empty", key: "empty", title: "nothing said of anyone yet" })];
    case "paradigm": {
      const P = paradigmsOf(model);
      const rows = [
        ...P.referents.map((r) => row({ kind: "referent", key: r.key, title: r.name, meta: `on ${new Set([...r.asked, ...r.said]).size} turns`, drill: () => ref(r).drill() })),
        ...P.again.map((l) => row({ kind: "loop", key: l.id, title: l.asks, meta: `went round ${l.ring} times`, line: lineFor(l), state: l.state, drill: loopRow(l).drill })),
        ...P.kinds.map((k) => row({ kind: "kind", key: `kind:${k.kind}`, title: `a "${k.kind}" loop keeps opening`, meta: `on ${k.turns} turns` })),
      ];
      return rows.length ? rows : [row({ kind: "empty", key: "empty", title: "nothing recurs yet — one turn has no pattern to show" })];
    }
    default:
      return [];
  }
}
