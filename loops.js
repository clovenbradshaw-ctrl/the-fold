// loops.js — the loops a turn owes, on the record: each opened with what
// would close it, closed by a witness, reopened with a trigger. Pure.
//
// User direction (2026-09-08), verbatim: "when a user sends a message,
// instead of the pre-formatted message about filling slots or whatever, it
// should show as like cards essentially the tasks (let's call them 'loops')
// that need to be completed to get the answer, and loops get closed and
// they can 'spiral'."
//
// WHAT THIS REPLACES, AND WHY IT IS NOT A RENDERING CHANGE. The turn used to
// narrate itself in three live-only voices — the void's paragraphs, a run
// log, the model's own thinking — and threw all three away when the answer
// landed. A trace cannot close, cannot reopen, and cannot survive a reload,
// because nothing behind it is an object. So the change is one level down:
// a loop is a TASK on the kernel's task log (eoreader7 native/kernel/
// task-log.js — the same substrate the hyperlexicon, the grid and the
// metacognition ledger already are, record-log.js's own "same kind of
// thing"), and a card is a PROJECTION of that task (P159: the record is not
// the state; the fold is a projection of the log). The text on a card is
// derived from the loop, never the other way round, which is the rule
// void-narration.js already holds for itself: a narrator that paraphrases
// the arithmetic is a narrator that can come to disagree with it.
//
// THE DEFINITION. A loop is opened with a stated CLOSING CONDITION and a
// stated REOPENING CONDITION — void-loop.js's own `openLoop` refuses a loop
// with no closing condition, and that refusal is the definition of a card: a
// status line that cannot say what would close it is not a loop. A loop
// CLOSES on a witness the material or the instrument supplied (an address,
// a filler with its span, a count the check computed, a referent the index
// resolved) and never on the model saying so (L5; "the model is the mouth").
// Two witnesses that disagree leave it CONTESTED, never closed (the
// parliament rule: disagreement lands typed). A loop REOPENS with a trigger
// and a ring count, keeping every earlier closure in its timeline — that is
// the spiral: the same loop at a new ground, with what it earned carried
// (void-loop.js's `reshape` keeps its candidates; `descend` retracts
// nothing). Reopening is ORDERED: a loop reopened at an earlier cell of the
// chain reopens the closed loops after it in the same group, because a
// finding at an earlier cell is a constraint on every later one
// (turn-order.js, P134). That cascade is what makes this a spiral and not a
// to-do list, and it is landed as entries so the record shows it.
//
// THE FIRST CARD SET, and where each comes from — nothing here is authored
// by a model, and the two kinds a model DOES author (the plan's parts, the
// draft) say so on the card:
//   the void's nine cells      void-brief.js's declaration (P54/P105)
//   the fill loop              the brief's fillers, extent and standing
//   the plan and its parts     holon.js's progress callback
//   what nothing backs         the part's check (unsupported / open)
//   the premise, the address,  the part's own result rows (P170)
//     the position, the witness, the absent names
//   the obligations            the obligation ledger (/must)
// Every card is worded in the plain questions void-narration.js already
// asks ("how wide is it", "what kind of thing belongs in it"); no cell name,
// no terrain, no operator letter reaches a card (the canon stays backstage;
// `loops.test.mjs` pins the wall). The cell IS on the record, on the open
// entry, read off the cube through the injected `cellOf` — never restated.
//
// PURE, ORGANS INJECTED (the cast.js discipline): the task log and the cube
// arrive through `makeLoops({ taskLog, cellOf })`; the adapters below are
// plain functions of the brief, the progress event, the result and the
// obligation ledger, and return ACTS for the caller to land. No DOM, no
// I/O, no model.

import { CHAIN } from "./turn-order.js";
import { checkForm, checkGenre, draftText } from "./shape.js";

export const LOOP_SCHEMA = "EOLoop@1";

/** The acts a loop can receive. Closed class. */
export const ACTS = Object.freeze(["open", "evidence", "spend", "again", "close", "refuse", "contest", "waive", "reopen"]);
/** The states a loop can stand in. Closed class. */
export const STATES = Object.freeze(["open", "closed", "refused", "contested", "waived"]);

/** The grain each cell of a loop takes — the void's own nine, read off void-shape.js's VOID_OPERATORS table (the cube's reading, not this file's). */
export const GRAIN_BY_CELL = Object.freeze({ NUL: "Ground", SIG: "Figure", INS: "Pattern", SEG: "Ground", CON: "Figure", SYN: "Pattern", DEF: "Figure", EVA: "Figure", REC: "Pattern" });

/** The nine fields of a void, by the cell that declares each — void-loop.js's own FIELD_BY_OP, unchanged. */
export const CELL_BY_FIELD = Object.freeze({ slot: "NUL", anchor: "SIG", admits: "INS", extent: "SEG", relation: "CON", composition: "SYN", cardinality: "DEF", admission: "EVA", reopensOn: "REC" });

/**
 * What each cell of a void is asking, as a person would ask it. Giver:
 * void-narration.js's OPEN_QUESTIONS — the same questions in the same
 * voice, so the cards and the narration can never say two different things
 * about one cell. Keyed by field, not by letter, because the field is what
 * the reader is being told is open.
 */
export const CELL_ASKS = Object.freeze({
  slot: "what space this even is",
  anchor: "who or what it hangs on",
  admits: "what kind of thing belongs in it",
  extent: "how wide it is",
  relation: "what would tie something to it",
  composition: "how several answers would fit together, if there are several",
  cardinality: "how many it holds",
  admission: "what test something has to pass to count",
  reopensOn: "what would make me take all this back",
});

/** The words the canon keeps backstage. A card carrying any of these has leaked the record's notation into the reader's view (loops.test.mjs pins it). */
export const BACKSTAGE = /\b(NUL|SIG|INS|SEG|CON|SYN|DEF|EVA|REC)\b|[A-Za-z]·[A-Za-z]/;
/** The wider list the ADAPTERS' own wording is held to (loops.test.mjs): the terrains and stances too, which a model's part label may use as ordinary words but this file's authored strings may not. */
export const BACKSTAGE_WORDS = /\b(NUL|SIG|INS|SEG|CON|SYN|DEF|EVA|REC|Ground|Figure|Pattern|Void|Entity|Kind|Field|Link|Network|Lens|Paradigm|Clearing|Binding|Composing|Dissecting)\b/;

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, "-");
const rank = (cell) => CHAIN.indexOf(String(cell ?? "").toUpperCase());
const refuse = (type, detail, extra = {}) => Object.freeze({ ok: false, refused: Object.freeze({ type, detail, ...extra }) });

/** The key of one touch: a conversation and a turn in it. A bare turn (no conversation declared) keys as its number. */
export const turnKey = (convo, turn) => (turn == null ? null : convo != null ? `${convo}:${turn}` : String(turn));

/** A loop's id, minted from its kind and its own parts, folded. Stable across turns: the same question asked twice reaches the same loop. */
export const loopId = (kind, ...parts) => `loop:${kind}:${parts.map((p) => fold(p)).filter(Boolean).join("|")}`;

/** The key a void's loops share — the anchor and the head phrase, folded. */
export const voidKey = (anchor, label) => `${fold(anchor)}|${fold(label)}`;

// ── the ledger ──────────────────────────────────────────────────────────────

/**
 * makeLoops({ taskLog, cellOf }) — the organ, bound to the kernel's task log
 * and the cube. `taskLog` is { createTaskLog, append, ENTRY_KINDS,
 * OPERATOR_BASIS }; `cellOf(op, grain)` is the cube's own.
 */
export function makeLoops({ taskLog, cellOf = null } = {}) {
  if (!taskLog?.createTaskLog || !taskLog?.append || !taskLog?.ENTRY_KINDS || !taskLog?.OPERATOR_BASIS)
    throw new TypeError("makeLoops: the kernel's task log is injected — { createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS }");
  const { createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS } = taskLog;

  const cellFields = (op, grain) => {
    if (typeof cellOf !== "function") return {};
    const c = cellOf(op, grain);
    if (!c || c.gap) return { cell_gap: c?.gap ?? "no_cell", cell_reason: c?.reason ?? null };
    return { cell: `${c.op}·${c.grain}`, stance: c.stance, terrain: c.terrain, mode: c.mode, domain: c.domain };
  };

  const createLoopLog = () => createTaskLog();

  // A turn number repeats across conversations, so every act is stamped with
  // both, and the fold keys a touch by the pair (`turnKey`).
  const stamp = (fields, turn, convo = null) => ({ ...fields, ...(turn != null ? { turn } : {}), ...(convo != null ? { convo } : {}) });

  /** open — PROPOSE. An existing loop that stands closed is REOPENED with the trigger "asked again"; one still open is returned as is. */
  function open(log, { id, kind, cell, grain = null, asks, closesOn, reopensOn = null, by, authored = "instrument", group = null, turn = null, convo = null, part = null, voidId = null, note = null, evidence = [], line = null, meta = null } = {}) {
    if (!id || !kind || !asks || !closesOn || !by) return refuse("under_declared", "open: a loop names its id, its kind, what it asks, what would close it, and who opened it");
    if (rank(cell) < 0) return refuse("not_a_cell", `open: ${cell} is not a cell of the chain`);
    if (BACKSTAGE.test(asks) || BACKSTAGE.test(closesOn) || (reopensOn && BACKSTAGE.test(reopensOn))) return refuse("backstage_leak", "open: a card is worded for a reader — the cell is on the record, never in the words", { asks, closesOn });
    const prior = loopById(log, id);
    if (prior) {
      if (prior.state === "open" || prior.state === "contested") return Object.freeze({ ok: true, log, id, existing: true, noop: true });
      // Closed on THIS turn and named again by the same turn's later phase: the
      // same loop, not a new ask. Named on a LATER turn: asked again.
      if (turn != null && prior.closedKey === turnKey(convo, turn)) return Object.freeze({ ok: true, log, id, existing: true, noop: true });
      return reopen(log, id, { trigger: "asked again", turn, convo, by, cascade: false });
    }
    const g = grain ?? GRAIN_BY_CELL[cell.toUpperCase()];
    const next = append(log, {
      kind: ENTRY_KINDS.PROPOSE, task_id: id,
      operator: cell.toUpperCase(), operator_basis: authored === "model" ? OPERATOR_BASIS.PRODUCED : OPERATOR_BASIS.DECLARED, grain: g,
      ...cellFields(cell.toUpperCase(), g),
      description: asks,
      loop: true, act: "open", schema: LOOP_SCHEMA,
      ...stamp({ kindOf: kind, asks, closesOn, reopensOn, by, authored, group, part, voidId, note, line, meta, evidence: [...evidence] }, turn, convo),
    });
    return Object.freeze({ ok: true, log: next, id, existing: false });
  }

  const needOpen = (log, id, act) => {
    const l = loopById(log, id);
    if (!l) return refuse("unknown_loop", `${act}: no loop ${id} on the record`);
    if (l.state !== "open" && l.state !== "contested") return refuse("loop_" + l.state, `${act}: ${id} stands ${l.state} — reopen it first`, { state: l.state });
    return { ok: true, loop: l };
  };

  /** evidence — EVIDENCE. Something arrived for an open loop: a note, addresses, a void id it now stands on. */
  function evidence(log, id, { note = null, evidence: refs = [], voidId = null, turn = null, convo = null, by = null, prompt = false } = {}) {
    const chk = needOpen(log, id, "evidence"); if (!chk.ok) return chk;
    if (!note && !refs.length && !voidId) return refuse("nothing_arrived", "evidence: a note, an address, or a void id — an empty arrival is not an event");
    // `prompt`: the READER's own words on this loop, to be handed to the
    // mouth on the next turn (readerNotesFor) — never the instrument's.
    const next = append(log, { kind: ENTRY_KINDS.EVIDENCE, task_id: id, evidence: [...refs], loop: true, act: "evidence", ...stamp({ note, voidId, by, ...(prompt ? { prompt: true } : {}) }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /** spend — EVIDENCE. Budget spent on an open loop: asks, fetches. The person's own declaration (P9) is what it is measured against. */
  function spend(log, id, { asks = 0, fetches = 0, note = null, turn = null, convo = null } = {}) {
    const chk = needOpen(log, id, "spend"); if (!chk.ok) return chk;
    const next = append(log, { kind: ENTRY_KINDS.EVIDENCE, task_id: id, loop: true, act: "spend", ...stamp({ asks, fetches, note }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /** again — EVIDENCE. An open loop goes round once more, with its trigger: a correction round, a re-ask. The ring count rises; nothing closed. */
  function again(log, id, { trigger, turn = null, convo = null, by = null } = {}) {
    const chk = needOpen(log, id, "again"); if (!chk.ok) return chk;
    if (typeof trigger !== "string" || !trigger.trim()) return refuse("no_trigger", "again: going round again records its own reason — never a silent repeat");
    const next = append(log, { kind: ENTRY_KINDS.EVIDENCE, task_id: id, loop: true, act: "again", ...stamp({ trigger: trigger.trim(), by }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /** close — RESULT. Closed by a WITNESS: what the material or the instrument supplied. Refused without one. */
  function close(log, id, { witness, line = null, turn = null, convo = null, by = null } = {}) {
    const prior = loopById(log, id);
    if (prior?.state === "closed" && JSON.stringify(prior.witness) === JSON.stringify(witness ?? null)) return Object.freeze({ ok: true, log, id, noop: true });
    const chk = needOpen(log, id, "close"); if (!chk.ok) return chk;
    if (!witness || typeof witness !== "object" || !Object.keys(witness).length) return refuse("no_witness", "close: a loop closes on a witness — an address, a filler with its span, a count, a value with its source — never on its own say-so");
    const next = append(log, { kind: ENTRY_KINDS.RESULT, task_id: id, result: { closed: true, witness, line }, loop: true, act: "close", ...stamp({ witness, line, by }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /** refuse — RESULT. Could not close, and says why: a typed negative closure, never a silent one. */
  function refuseLoop(log, id, { reason, turn = null, convo = null, by = null } = {}) {
    const chk = needOpen(log, id, "refuse"); if (!chk.ok) return chk;
    if (typeof reason !== "string" || !reason.trim()) return refuse("no_reason", "refuse: a loop that cannot close says why");
    const next = append(log, { kind: ENTRY_KINDS.RESULT, task_id: id, result: { closed: false, reason: reason.trim() }, loop: true, act: "refuse", ...stamp({ reason: reason.trim(), by }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /** contest — EVIDENCE. Two witnesses disagree; the loop stands contested until a third settles it. Both sides are on the record. */
  function contest(log, id, { sides, turn = null, convo = null } = {}) {
    const chk = needOpen(log, id, "contest"); if (!chk.ok) return chk;
    if (!Array.isArray(sides) || sides.length < 2) return refuse("one_side", "contest: a contest names at least two witnesses that disagree");
    const next = append(log, { kind: ENTRY_KINDS.EVIDENCE, task_id: id, loop: true, act: "contest", ...stamp({ sides: sides.map((s) => ({ ...s })) }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /** waive — RESULT. Set aside by a NAMED person for a stated reason (obligation.js's own wall: an unattributed waiver is a deletion wearing a standing's clothes). */
  function waive(log, id, { because, by, turn = null, convo = null } = {}) {
    const chk = needOpen(log, id, "waive"); if (!chk.ok) return chk;
    if (!because?.trim?.() || !by?.trim?.()) return refuse("waiver_needs_names", "waive: a waiver carries a stated reason AND who waived");
    const next = append(log, { kind: ENTRY_KINDS.RESULT, task_id: id, result: { closed: false, waived: true, because, by }, loop: true, act: "waive", ...stamp({ because: because.trim(), by: by.trim() }, turn, convo) });
    return Object.freeze({ ok: true, log: next, id });
  }

  /**
   * reopen — SUPERSEDE under the same id. The earlier closure stays in the
   * timeline; the ring count rises; the trigger is required. With `cascade`
   * (the default), every CLOSED loop in the same group at a LATER cell is
   * reopened too, each with a trigger naming this one — a finding at an
   * earlier cell is a constraint on every later one (P134), so a closure
   * that stood on it no longer stands.
   */
  function reopen(log, id, { trigger, turn = null, convo = null, by = null, cascade = true } = {}) {
    const l = loopById(log, id);
    if (!l) return refuse("unknown_loop", `reopen: no loop ${id} on the record`);
    if (l.state === "open") return refuse("not_closed", `reopen: ${id} is already open — \`again\` is the act for going round once more`);
    if (typeof trigger !== "string" || !trigger.trim()) return refuse("no_trigger", "reopen: a re-zero records its own reason as `trigger` — never a silent concession");
    let next = append(log, { kind: ENTRY_KINDS.SUPERSEDE, task_id: id, loop: true, act: "reopen", ...stamp({ trigger: trigger.trim(), by, supersededAt: l.lastSeq }, turn, convo) });
    const cascaded = [];
    if (cascade && l.group) {
      for (const other of foldLoops(next)) {
        if (other.id === id || other.group !== l.group || other.rank <= l.rank || other.state !== "closed") continue;
        next = append(next, { kind: ENTRY_KINDS.SUPERSEDE, task_id: other.id, loop: true, act: "reopen", ...stamp({ trigger: `${trigger.trim()} — following the reopening of "${l.asks}"`, by, cascadedFrom: id, supersededAt: other.lastSeq }, turn, convo) });
        cascaded.push(other.id);
      }
    }
    return Object.freeze({ ok: true, log: next, id, cascaded: Object.freeze(cascaded) });
  }

  /** land — one act, dispatched by its `act`. The adapters below return acts in this shape. */
  function land(log, act) {
    const { act: a, id, ...rest } = act ?? {};
    switch (a) {
      case "open": return open(log, { id, ...rest });
      case "evidence": return evidence(log, id, rest);
      case "spend": return spend(log, id, rest);
      case "again": return again(log, id, rest);
      case "close": return close(log, id, rest);
      case "refuse": return refuseLoop(log, id, rest);
      case "contest": return contest(log, id, rest);
      case "waive": return waive(log, id, rest);
      case "reopen": return reopen(log, id, rest);
      default: return refuse("unknown_act", `land: ${JSON.stringify(a)} is not one of ${ACTS.join(", ")}`);
    }
  }

  /** landAll — every act in order; refusals are RETURNED, never thrown and never dropped (P57: turnedAway is not optional). */
  function landAll(log, acts) {
    let next = log ?? createLoopLog();
    const landed = [], turnedAway = [];
    for (const a of acts ?? []) {
      const r = land(next, a);
      if (r.ok) { next = r.log; if (!r.noop) landed.push({ act: a.act, id: r.id, ...(r.cascaded?.length ? { cascaded: r.cascaded } : {}) }); }
      else turnedAway.push({ act: a.act, id: a.id, ...r.refused });
    }
    return { log: next, landed, turnedAway };
  }

  return Object.freeze({ createLoopLog, open, evidence, spend, again, close, refuse: refuseLoop, contest, waive, reopen, land, landAll, foldLoops, loopById, cardsFor, orderLoops, lineFor, stateWord });
}

// ── the fold ────────────────────────────────────────────────────────────────

/**
 * foldLoops(log) → every loop, its state derived from its own entries in
 * seq order. Nothing is stored as state: ring, witness, trigger and the
 * timeline are all read off the entries, so two logs with the same entries
 * fold alike and a replayed record (record-log.js) folds to the same cards.
 */
export function foldLoops(log, { atSeq = null } = {}) {
  const byId = new Map();
  for (const e of log?.entries ?? []) {
    if (!e || e.loop !== true) continue;
    // THE CURSOR: the fold AS OF an act. Entries past it never happened yet
    // — the same scrub the folds pane and the reading's graph already have
    // (P156, P159: the record is not the state; the fold is a projection
    // of the log at a cursor).
    if (atSeq != null && e.seq > atSeq) continue;
    if (e.act === "open") {
      if (byId.has(e.task_id)) continue; // a second open under one id never happens through `open`; a replayed record that carries one is read once
      byId.set(e.task_id, {
        schema: LOOP_SCHEMA, id: e.task_id, kind: e.kindOf, cell: e.operator, rank: rank(e.operator), grain: e.grain ?? null,
        asks: e.asks, closesOn: e.closesOn, reopensOn: e.reopensOn ?? null, by: e.by, authored: e.authored ?? "instrument",
        group: e.group ?? null, part: e.part ?? null, voidId: e.voidId ?? null,
        turn: e.turn ?? null, convo: e.convo ?? null, openedKey: turnKey(e.convo ?? null, e.turn ?? null), meta: e.meta ?? null,
        ring: 1, state: "open", spent: { asks: 0, fetches: 0 },
        witness: null, line: e.line ?? null, reason: null, trigger: null, sides: null, waiver: null,
        evidence: e.evidence?.length || e.note ? [{ note: e.note ?? null, addresses: [...(e.evidence ?? [])], seq: e.seq, turn: e.turn ?? null }] : [],
        previous: [], history: [{ act: "open", seq: e.seq, turn: e.turn ?? null, note: e.note ?? null }],
        firstSeq: e.seq, lastSeq: e.seq, touched: new Set(e.turn != null ? [turnKey(e.convo ?? null, e.turn)] : []), closedAt: null, closedTurn: null, closedKey: null,
      });
      continue;
    }
    const l = byId.get(e.task_id);
    if (!l) continue;
    l.lastSeq = e.seq;
    if (e.turn != null) l.touched.add(turnKey(e.convo ?? null, e.turn));
    const h = { act: e.act, seq: e.seq, turn: e.turn ?? null };
    switch (e.act) {
      case "evidence":
        l.evidence.push({ note: e.note ?? null, addresses: [...(e.evidence ?? [])], seq: e.seq, turn: e.turn ?? null, by: e.by ?? null, prompt: e.prompt === true });
        if (e.voidId) l.voidId = e.voidId;
        h.note = e.note ?? null; h.addresses = [...(e.evidence ?? [])]; if (e.prompt === true) h.prompt = true; if (e.by) h.by = e.by;
        break;
      case "spend":
        l.spent = { asks: l.spent.asks + (Number(e.asks) || 0), fetches: l.spent.fetches + (Number(e.fetches) || 0) };
        h.asks = e.asks ?? 0; h.fetches = e.fetches ?? 0; h.note = e.note ?? null;
        break;
      case "again":
        l.ring += 1; l.trigger = e.trigger ?? null; h.trigger = e.trigger ?? null;
        break;
      case "close":
        l.state = "closed"; l.witness = e.witness ?? null; l.line = e.line ?? null; l.closedAt = e.seq; l.closedTurn = e.turn ?? null; l.closedKey = turnKey(e.convo ?? null, e.turn ?? null); l.reason = null; l.sides = null;
        h.witness = e.witness ?? null; h.line = e.line ?? null;
        break;
      case "refuse":
        l.state = "refused"; l.reason = e.reason ?? null; l.closedAt = e.seq; l.closedTurn = e.turn ?? null; l.closedKey = turnKey(e.convo ?? null, e.turn ?? null); l.sides = null;
        h.reason = e.reason ?? null;
        break;
      case "contest":
        l.state = "contested"; l.sides = (e.sides ?? []).map((s) => ({ ...s })); h.sides = l.sides;
        break;
      case "waive":
        l.state = "waived"; l.waiver = { because: e.because ?? null, by: e.by ?? null }; l.closedAt = e.seq; l.closedTurn = e.turn ?? null; l.closedKey = turnKey(e.convo ?? null, e.turn ?? null);
        h.because = e.because ?? null; h.by = e.by ?? null;
        break;
      case "reopen":
        l.previous.push({ state: l.state, witness: l.witness, line: l.line, reason: l.reason, waiver: l.waiver, seq: l.closedAt, turn: l.closedTurn });
        l.state = "open"; l.ring += 1; l.trigger = e.trigger ?? null; l.witness = null; l.line = null; l.reason = null; l.sides = null; l.waiver = null; l.closedAt = null; l.closedTurn = null; l.closedKey = null;
        h.trigger = e.trigger ?? null; if (e.cascadedFrom) h.cascadedFrom = e.cascadedFrom;
        break;
      default:
        break;
    }
    l.history.push(h);
  }
  return [...byId.values()].map((l) => Object.freeze({ ...l, touched: Object.freeze([...l.touched]), evidence: Object.freeze(l.evidence), previous: Object.freeze(l.previous), history: Object.freeze(l.history) }));
}

export const loopById = (log, id) => foldLoops(log).find((l) => l.id === id) ?? null;

/** The latest turn of `convo` that an act at or before `atSeq` belongs to — the turn a cursor reaches (null when none). */
export function turnAtSeq(log, atSeq, { convo = null } = {}) {
  let t = null;
  for (const e of log?.entries ?? []) {
    if (!e || e.loop !== true || e.turn == null) continue;
    if (atSeq != null && e.seq > atSeq) break;
    if (convo != null && e.convo !== convo) continue;
    if (t == null || e.turn > t) t = e.turn;
  }
  return t;
}

/** The chain's order first, then the order of opening — never "most interesting first" (III.1). */
export function orderLoops(loops) {
  return [...loops].sort((a, b) => (a.rank - b.rank) || (a.firstSeq - b.firstSeq));
}

/**
 * cardsFor(loops, { turn }) → the loops THIS turn touched — opened, fed,
 * closed or reopened — in the chain's order, each saying whether it was
 * carried in from an earlier turn. Loops still open from earlier turns and
 * untouched here are returned apart as `standing`, so a lane can say "N
 * still open from earlier" without drawing them all again.
 */
export function cardsFor(loops, { turn, convo = null } = {}) {
  const key = turnKey(convo, turn);
  const touched = orderLoops(loops.filter((l) => key == null || l.touched.includes(key))).map((l) => Object.freeze({ ...l, carried: key != null && l.openedKey != null && l.openedKey !== key }));
  // Still open from THIS conversation's earlier turns — another conversation's open loops are its own.
  const standing = orderLoops(loops.filter((l) => key != null && !l.touched.includes(key) && (convo == null || l.convo === convo) && (l.state === "open" || l.state === "contested")));
  return Object.freeze({ cards: Object.freeze(touched), standing: Object.freeze(standing) });
}

// ── plain language ──────────────────────────────────────────────────────────

const listOut = (xs) => { const a = xs.filter(Boolean); return a.length <= 1 ? (a[0] ?? "") : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`; };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const spanText = (s) => (s ? (s.from === s.to ? `${s.from}` : `${s.from} to ${s.to}`) : null);

/** A witness, said. Whatever the act passed as `line` wins; otherwise the witness's own fields. */
export function witnessLine(w) {
  if (!w || typeof w !== "object") return "";
  if (w.line) return String(w.line);
  if (w.value != null) return `${w.value}${w.source ? ` — from ${w.source}` : ""}${w.count != null ? ` (${plural(w.count, "statement")})` : ""}`;
  if (Array.isArray(w.fillers) && w.fillers.length) return `${listOut(w.fillers.map((f) => (typeof f === "string" ? f : `${f.filler ?? f.value}${f.span ? `, ${spanText(f.span)}` : ""}`)))}${w.extent ? `, covering ${spanText(w.extent)}` : ""}`;
  if (w.filler) return `${w.filler}${w.span ? `, ${spanText(w.span)}` : ""}${w.source ? ` — from ${w.source}` : ""}`;
  if (Array.isArray(w.addresses)) return w.addresses.length ? `backed by ${plural(w.addresses.length, "place", "places")} in the material` : "checked against the material — nothing there to point at, and nothing it says was wrong";
  if (w.count != null) return `${plural(w.count, w.unit ?? "item")}${w.of != null ? ` of ${w.of}` : ""}`;
  if (w.verdict) return String(w.verdict);
  return Object.entries(w).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("; ");
}

/** One act of a loop's trail, said in a sentence. */
export function trailLine(h, { showTurn = true } = {}) {
  const when = showTurn && h.turn != null ? `Turn ${h.turn}: ` : "";
  const by = h.by ? ` (${h.by})` : "";
  switch (h.act) {
    case "open": return `${when}Opened${h.note ? ` — ${h.note}` : ""}.`;
    case "evidence": return h.prompt ? `${when}You added: “${h.note ?? ""}”.` : `${when}${h.note ?? ""}${h.addresses?.length ? `${h.note ? " " : ""}(${plural(h.addresses.length, "address", "addresses")})` : ""}${by}.`;
    case "spend": {
      const bits = [h.asks ? `${h.asks} ask${h.asks === 1 ? "" : "s"}` : null, h.fetches ? `${h.fetches} fetch${h.fetches === 1 ? "" : "es"}` : null].filter(Boolean);
      return `${when}Spent ${bits.join(", ") || "some effort"}${h.note ? ` — ${h.note}` : ""}.`;
    }
    case "again": return `${when}Went round again — ${h.trigger ?? ""}.`;
    case "close": return `${when}Closed${by} — ${h.line ?? (h.witness ? lineFor({ state: "closed", witness: h.witness, line: null, ring: 1, previous: [], evidence: [], spent: { asks: 0, fetches: 0 } }).replace(/\.$/, "") : "")}.`;
    case "refuse": return `${when}Could not close${by} — ${h.reason ?? ""}.`;
    case "contest": return `${when}Two witnesses disagreed — ${(h.sides ?? []).map((x) => `${x.witness ?? "one"} says ${x.says}`).join("; ")}.`;
    case "waive": return `${when}Set aside by ${h.by ?? "someone"} — ${h.because ?? ""}.`;
    case "reopen": return `${when}Reopened — ${h.trigger ?? ""}.`;
    default: return `${when}${h.act}`;
  }
}

/** The state, as one word for the card's head. */
export function stateWord(loop) {
  if (!loop) return "";
  if (loop.state === "closed") return loop.ring > 1 ? `closed again (round ${loop.ring})` : "closed";
  if (loop.state === "refused") return "could not close";
  if (loop.state === "contested") return "contested";
  if (loop.state === "waived") return "set aside";
  return loop.ring > 1 ? `round ${loop.ring}` : "open";
}

/**
 * lineFor(loop) → the card's body: what closed it, or what would, or what
 * reopened it — one or two sentences, from the loop's own fields.
 */
export function lineFor(loop) {
  if (!loop) return "";
  const latest = loop.evidence.length ? loop.evidence[loop.evidence.length - 1] : null;
  const before = loop.previous.length ? loop.previous[loop.previous.length - 1] : null;
  const beforeLine = before ? (before.state === "closed" ? before.line || witnessLine(before.witness) : before.state === "refused" ? `could not close: ${before.reason}` : before.state === "waived" ? `set aside by ${before.waiver?.by}` : before.state) : null;
  const spent = loop.spent.asks || loop.spent.fetches ? ` Spent so far: ${[loop.spent.asks ? plural(loop.spent.asks, "ask") : null, loop.spent.fetches ? plural(loop.spent.fetches, "fetch", "fetches") : null].filter(Boolean).join(", ")}.` : "";
  switch (loop.state) {
    case "closed": {
      const w = loop.line || witnessLine(loop.witness) || "closed";
      return loop.ring > 1 && before ? `${w}. Before this round: ${beforeLine}.` : `${w}.`;
    }
    case "refused": return `Could not close: ${loop.reason}.${spent}`;
    case "contested": return `Two witnesses disagree: ${(loop.sides ?? []).map((s) => `${s.witness ?? "one"} says ${s.says}`).join("; ")}. Left standing as contested, not settled.`;
    case "waived": return `Set aside by ${loop.waiver?.by}: ${loop.waiver?.because}.`;
    default: {
      const head = loop.ring > 1
        ? (before ? `Reopened (round ${loop.ring}): ${loop.trigger}. Before: ${beforeLine}.` : `Going round again (round ${loop.ring}): ${loop.trigger}.`)
        : `Would close on: ${loop.closesOn}.`;
      const sofar = latest?.note ? ` So far: ${latest.note}.` : latest?.addresses?.length ? ` So far: ${plural(latest.addresses.length, "address", "addresses")}.` : "";
      return `${head}${sofar}${spent}`;
    }
  }
}

// ── adapters: acts read off what the turn already computes ──────────────────

const anchorOf = (brief) => brief?.declaration?.cells?.find((c) => c.field === "anchor")?.declared ?? null;
const declaredOf = (brief, field) => brief?.declaration?.cells?.find((c) => c.field === field)?.declared ?? null;

/**
 * loopsFromBrief(brief, { phase, turn }) → acts. The void's nine cells, each
 * a loop; the declared ones close at once on the question's own words (the
 * question phase) or on the material (the material phase); the fill loop
 * opens at the question and is fed, closed or left open by the material.
 * `brief.reopened` (the grammar read singular, the material bound several)
 * REOPENS the cardinality loop, and the cascade takes admission and the
 * re-zero cell with it.
 */
export function loopsFromBrief(brief, { phase = "question", turn = null, convo = null } = {}) {
  if (!brief?.declaration?.cells) return [];
  const anchor = anchorOf(brief);
  const label = brief.headPhrase ?? brief.declaration.slot;
  const key = voidKey(anchor ?? brief.declaration.slot, label);
  const group = `void:${key}`;
  const head = anchor ? `${label} ${brief.connective ?? "of"} ${anchor}` : label;
  const acts = [];
  const by = "void-brief";
  for (const c of brief.declaration.cells) {
    const id = loopId("void", key, c.field);
    acts.push({ act: "open", id, kind: "void-cell", cell: c.op, grain: c.grain, asks: CELL_ASKS[c.field] ?? c.field, closesOn: `a reading of this, from the question's own words or from the material`, by, group, turn, convo });
    if (c.field === "cardinality" && brief.reopened) {
      acts.push({ act: "again", id, trigger: brief.declaration.cells.find((x) => x.field === "reopensOn")?.declared ?? `the material bound ${(brief.fillers ?? []).length} fillers to a question that asked as though there were one`, turn, convo, by });
    }
    if (c.declared != null && c.declared !== "unknown") {
      const v = c.declared;
      let value, count = null;
      if (c.field === "extent" && typeof v === "object") { value = `${spanText(v)}${brief.declaration.dimension ? ` (${brief.declaration.dimension})` : ""}`; count = brief.evidence?.mentions ?? null; }
      else if (c.field === "cardinality" && brief.reopened) { value = String(v); count = (brief.fillers ?? []).length; }
      else if (typeof v === "object") value = JSON.stringify(v);
      else value = String(v);
      // The source is a fact about WHERE the reading came from, not about the
      // phase that re-named it: a cell the question declared is closed by the
      // question's own words at every phase (so the material phase's re-close
      // is the same witness, a no-op); only the extent, and a cardinality the
      // material revised, come from the material.
      const from = c.field === "extent" || (c.field === "cardinality" && brief.reopened) ? "the material" : "the question's own words";
      acts.push({ act: "close", id, witness: { value, source: from, ...(count != null ? { count } : {}) }, turn, convo, by });
    } else if (c.field === "extent" && phase === "material" && brief.evidence?.refused) {
      const cands = (brief.evidence.refused.candidates ?? []).map(spanText).slice(0, 3);
      acts.push({ act: "evidence", id, note: `${brief.evidence.considered ?? cands.length} different spans are stated and none leads the rest: ${listOut(cands)}; a span picked out of a tie would let me report a hole that is only my own choice of edges`, turn, convo, by });
    }
  }
  // The fill loop.
  const fillId = loopId("fill", key);
  const extent = brief.declaration.extent ?? null;
  acts.push({
    act: "open", id: fillId, kind: "fill", cell: "DEF", asks: `who or what fills "${head}"`,
    closesOn: extent ? `every stretch of ${spanText(extent)} is accounted for by something the material names` : `something the material names fills it, and nothing read says the space is wider than what is named`,
    reopensOn: `a stretch nothing covers, a filler the space cannot place, or more fillers than the question asked for`,
    by, group, turn, convo, meta: { anchor: anchor ?? null, label },
  });
  if (phase === "material") {
    for (const f of brief.fillers ?? []) acts.push({ act: "evidence", id: fillId, note: `${f.filler}${f.span ? `, covering ${spanText(f.span)}` : ", though nothing read says for how long"}`, turn, convo, by });
    const st = brief.standing;
    if (st?.standing === "covered") {
      // The standing's own reason travels verbatim as the last arrival; the
      // closure names the fillers. Paraphrasing the arithmetic is how a card
      // comes to disagree with it.
      if (st.reason) acts.push({ act: "evidence", id: fillId, note: st.reason, turn, convo, by });
      acts.push({ act: "close", id: fillId, witness: { fillers: (brief.fillers ?? []).map((f) => ({ filler: f.filler, span: f.span ?? null })), extent }, turn, convo, by });
    } else if (st?.standing === "incomplete") {
      const holes = (st.voids ?? []).map((v) => `${spanText(v)} is filled by nothing named so far`);
      const unplaced = (st.unplaced ?? []).length ? `${listOut(st.unplaced)} came with no dates, so cannot be shown to cover any of it` : null;
      acts.push({ act: "evidence", id: fillId, note: [st.reason, ...holes, unplaced].filter(Boolean).join("; "), turn, convo, by });
    } else if (st?.standing === "unbounded" && !(brief.fillers ?? []).length) {
      acts.push({ act: "evidence", id: fillId, note: `nothing read names anything for it yet`, turn, convo, by });
    }
  }
  return acts;
}

/** The fill loop's id for a brief, so the caller can attach the ledger's void id or close it on a later filling. */
export const fillLoopIdFor = (brief) => (brief?.declaration ? loopId("fill", voidKey(anchorOf(brief) ?? brief.declaration.slot, brief.headPhrase ?? brief.declaration.slot)) : null);

// ── the question's own shape ────────────────────────────────────────────────
//
// User, 2026-09-08, on a poem that came back as three pipeline cards: "it's
// not creating the question properly." The first loops are the QUESTION'S,
// read off its own words before any organ runs: what FORM it asks for (a
// poem is verse, in lines — shape.js's declared genre and counted form), what
// it is ABOUT (the phrase after the question's last adposition, through the
// injected part-of-speech organ — never a word list here), and what the
// answer STANDS ON (the attached material; or nothing, in which case a
// creative ask is the model's own voice by design and a factual one is a
// loop that stays open until a source arrives). A slot-shaped question gets
// its subject from the void's own anchor cell instead (loopsFromBrief).

// A possessive is the same word ("Batman's" names Batman): the trailing 's
// is folded off before the match. Found live on the first poem.
const contentWords = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\u2019/g, "'").split(/[^\p{L}\p{N}']+/u).map((w) => w.replace(/^'+|'+$/g, "").replace(/'s$/, "")).filter((w) => w.length > 2);

/**
 * subjectOf(task, { isAdposition }) → { phrase, words } or null: the phrase
 * after the LAST adposition in the task, by the injected organ's reading of
 * each word (null when no organ, or none found). "write a poem about
 * batman" → "batman"; "tell me about the observatory's director" → "the
 * observatory's director".
 */
export function subjectOf(task, { isAdposition = null } = {}) {
  if (typeof isAdposition !== "function") return null;
  const toks = String(task ?? "").trim().replace(/[?!.]+$/, "").split(/\s+/).filter(Boolean);
  let at = -1;
  toks.forEach((w, i) => { const bare = w.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, ""); if (bare && isAdposition(bare) === true && i < toks.length - 1) at = i; });
  if (at < 0) return null;
  const phrase = toks.slice(at + 1).join(" ").replace(/[,;:]+$/, "").trim();
  const words = contentWords(phrase);
  return phrase && words.length ? Object.freeze({ phrase, words: Object.freeze(words) }) : null;
}

const FORM_WORDS = Object.freeze({
  lines: (n) => `${n} lines`, minLines: (n) => `at least ${n} lines`, maxLines: (n) => `at most ${n} lines`,
  acrostic: (w) => `an acrostic spelling ${w}`, mustInclude: (ws) => `using the word${[].concat(ws).length === 1 ? "" : "s"} ${[].concat(ws).join(", ")}`,
  mustExclude: (ws) => `without the word${[].concat(ws).length === 1 ? "" : "s"} ${[].concat(ws).join(", ")}`, noLetter: (l) => `without the letter ${l}`,
  minWords: (n) => `at least ${n} words`, maxWords: (n) => `at most ${n} words`, endsWith: (w) => `ending with the word ${w}`, startsWith: (w) => `starting with the word ${w}`, oneSentence: () => `one sentence`,
});
const formReads = (form) => Object.entries(form?.form ?? {}).map(([k, v]) => FORM_WORDS[k]?.(v)).filter(Boolean);

/**
 * loopsFromQuestion(task, { genre, form, subject, hasMaterial, sourceNames,
 * webOn, scope, turn, convo }) → acts. `genre` is shape.js's declaredGenre,
 * `form` its declaredForm, `subject` subjectOf's reading.
 */
// The form and the subject are the CONVERSATION's loops, not one turn's: a
// follow-up ("now make it rhyme") reaches the same form loop, which then
// goes round again with the note the reader left on it. `convoScope`
// defaults to `scope` so a caller that keys per turn still works.
export const formLoopIdFor = (convoScope, genre, form) => loopId("form", convoScope, genre?.kind ?? (Object.keys(form?.form ?? {}).length ? "declared" : "form"));
export const subjectLoopIdFor = (convoScope, subject) => loopId("subject", convoScope, subject?.phrase ?? "");

export function loopsFromQuestion(task, { genre = null, form = null, subject = null, hasMaterial = false, sourceNames = [], webOn = false, scope, convoScope = scope, turn = null, convo = null } = {}) {
  const group = groupOf(scope);
  const by = "the question's own words";
  const acts = [];
  const reads = [genre?.reads, ...formReads(form)].filter(Boolean);
  const unexamined = form?.unexamined ?? [];
  if (reads.length) {
    const id = formLoopIdFor(convoScope, genre, form);
    acts.push({ act: "open", id, kind: "form", cell: "DEF", asks: "in what form", closesOn: `the answer is ${reads.join("; ")}`, reopensOn: "a draft that is not", by, group, turn, convo, meta: { genre, form: form?.form ?? {} } });
    if (unexamined.length) acts.push({ act: "evidence", id, note: `${unexamined.join(", ")} asked for, not checkable here (no pronouncing dictionary), so not claimed`, turn, convo, by });
  }
  if (subject?.phrase) {
    const id = subjectLoopIdFor(convoScope, subject);
    acts.push({ act: "open", id, kind: "subject", cell: "SIG", asks: "about whom or what", closesOn: `the answer names ${subject.phrase}`, by, group, turn, convo, note: `${subject.phrase} — from the question's own words`, meta: { subject } });
  }
  const gid = loopId("ground", scope);
  acts.push({ act: "open", id: gid, kind: "ground", cell: "INS", asks: "what this stands on", closesOn: hasMaterial ? "the attached material" : webOn ? "a source attached, or a page the search finds" : "a source attached, or the web switch turned on", by, group, turn, convo });
  if (hasMaterial) acts.push({ act: "close", id: gid, witness: { count: sourceNames.length, unit: "source", line: `${sourceNames.length} attached source${sourceNames.length === 1 ? "" : "s"}${sourceNames.length ? `: ${sourceNames.slice(0, 6).join(", ")}${sourceNames.length > 6 ? `, and ${sourceNames.length - 6} more` : ""}` : ""}` }, turn, convo, by });
  else if (genre) acts.push({ act: "close", id: gid, witness: { value: "the model's own voice, marked as such", source: "nothing attached" }, turn, convo, by });
  return acts;
}

/**
 * closingsFromDraft(text, { genre, form, subject, scope, turn, convo }) →
 * acts: the form loop closes on shape.js's own checks of the draft (a
 * declared constraint that fails is a typed refusal with the bytes that
 * broke it), the subject loop on the draft naming the subject's words.
 */
export function closingsFromDraft(text, { genre = null, form = null, subject = null, scope, convoScope = scope, turn = null, convo = null, namesIn = null } = {}) {
  const acts = [];
  const t = String(text ?? "");
  const declared = Object.keys(form?.form ?? {}).length > 0;
  if (genre || declared) {
    const id = formLoopIdFor(convoScope, genre, form);
    const held = [], failed = [];
    if (genre) { const g = checkGenre(t, genre); if (!g.examined) held.push(`${genre.reads}: ${g.detail}`); else (g.ok ? held : failed).push(`${genre.reads}: ${g.detail}`); }
    if (declared) { const f = checkForm(draftText(t), form); for (const k of f.examined ?? []) { const fl = (f.failures ?? []).find((x) => x.kind === k); (fl ? failed : held).push(fl ? `${FORM_WORDS[k]?.(form.form[k]) ?? k}: ${fl.detail}` : FORM_WORDS[k]?.(form.form[k]) ?? k); } }
    if (failed.length) acts.push({ act: "refuse", id, reason: `${failed.join("; ")}${held.length ? ` (held: ${held.join("; ")})` : ""}`, turn, convo, by: "the form check" });
    else acts.push({ act: "close", id, witness: { line: held.join("; ") || "the form held" }, turn, convo, by: "the form check" });
  }
  if (subject?.words?.length) {
    const id = subjectLoopIdFor(convoScope, subject);
    const have = new Set(contentWords(t));
    const missing = subject.words.filter((w) => !have.has(w));
    if (!missing.length) {
      acts.push({ act: "close", id, witness: { value: subject.phrase, source: "the answer names it" }, turn, convo, by: "the draft" });
    } else {
      // THE HOLOGRAPH'S READING (user, 2026-09-08: "it never says batman,
      // but the holograph should definitely point towards batman" — "it
      // should know it's about batman just from discourse history even if
      // it's not stated"). The referent is on the record already: the
      // QUESTION named it, and that is an address the loop opened with. The
      // answer is the answer to that question — a part that points at the
      // whole — and what it names of its own (its capitalised names, read by
      // the injected `namesIn`, never a word list here) are the pointers it
      // carries. So the loop closes from the discourse, and SAYS so: the
      // basis is disclosed on the witness, never dressed as the literal
      // word. It stays refused only for an answer that carries nothing — no
      // name of its own and next to no words — which is not an answer about
      // anything.
      const names = typeof namesIn === "function" ? [...new Set(namesIn(t))].filter((n) => !subject.words.includes(contentWords(n)[0] ?? "")) : [];
      const words = contentWords(t);
      if (names.length || words.length >= 12) {
        acts.push({ act: "close", id, witness: { value: subject.phrase, source: `the discourse — asked about ${subject.phrase}; the answer never says the word and names ${names.length ? listOut(names.slice(0, 6)) : "nothing of its own"}` }, line: `${subject.phrase} — from the discourse: the question asked about it, and the answer answers that question${names.length ? `, naming ${listOut(names.slice(0, 6))}` : ""}; the word itself never appears`, turn, convo, by: "the discourse" });
      } else {
        acts.push({ act: "refuse", id, reason: `the answer never says ${missing.join(", ")}, names nothing of its own, and is too short to be about anything`, turn, convo, by: "the draft" });
      }
    }
  }
  return acts;
}

const partIdFor = (scope, part, i) => loopId("part", scope, part?.id ?? `${i}`);
const groupOf = (scope) => `turn:${scope}`;

/**
 * loopsFromProgress(phase, part, info, { scope, turn, planned }) → acts, one
 * progress event at a time — the same callback holon.js already reports
 * through, read into loops instead of into log lines. `scope` identifies
 * the turn (e.g. "c1t4"); `planned` is "model" when the plan is the model's.
 */
export function loopsFromProgress(phase, part, info = {}, { scope, turn = null, convo = null, planned = "model", parts = null, hasMaterial = true, groundState = null } = {}) {
  const group = groupOf(scope);
  const acts = [];
  const done = (xs) => (convo != null ? xs.map((a) => ({ ...a, convo })) : xs);
  const idx = () => (parts ? parts.findIndex((p) => p?.id === part?.id || p?.label === part?.label) : -1);
  // A flat turn makes no plan: the question is its one part, and the loop
  // is the DRAFT's — written, then checked. The plan loop exists only when
  // a plan was actually made.
  const flat = planned !== "model";
  const draftCloses = hasMaterial ? "checked against the material: every address bound, nothing the material does not hold" : "written; with nothing attached there is nothing to check it against, so every claim is marked as the model's own";
  switch (phase) {
    case "plan":
      if (!flat) acts.push({ act: "open", id: loopId("plan", scope), kind: "plan", cell: "NUL", asks: "what parts this needs", closesOn: "a plan into parts, or the question taken as one part", by: "planner", authored: "model", group, turn });
      break;
    case "planned": {
      const ps = info.parts ?? [];
      if (!flat) {
        acts.push({ act: "open", id: loopId("plan", scope), kind: "plan", cell: "NUL", asks: "what parts this needs", closesOn: "a plan into parts, or the question taken as one part", by: "planner", authored: "model", group, turn });
        acts.push({ act: "close", id: loopId("plan", scope), witness: { count: ps.length, unit: "part", line: info.degraded ? `the plan did not parse, so the question runs as one part` : `${plural(ps.length, "part")}: ${listOut(ps.map((p) => p.label))}` }, turn, by: "planner" });
      }
      ps.forEach((p, i) => {
        const generic = !p.label || /^the question$/i.test(p.label);
        acts.push({ act: "open", id: partIdFor(scope, p, i), kind: "part", cell: "SYN", asks: flat || generic ? "the draft" : p.label, closesOn: draftCloses, reopensOn: "a claim the material does not hold, or a name the question asked about left out", by: !flat && ps.length > 1 ? "plan:model" : "the question", authored: !flat && ps.length > 1 ? "model" : "instrument", group, turn, part: p.label ?? null });
      });
      break;
    }
    case "research": {
      const refs = (info.passages ?? []).map((p) => (typeof p === "string" ? p : p?.ref)).filter(Boolean);
      if (refs.length || hasMaterial) acts.push({ act: "evidence", id: partIdFor(scope, part, idx()), note: refs.length ? `${plural(refs.length, "passage")} retrieved${info.widened ? " (widened by the conversation)" : ""}` : "nothing retrieved on the part's own words", evidence: refs, turn, by: "retrieval" });
      // Material arriving mid-turn (a search, a named page) is what the open
      // ground loop was waiting for.
      if (refs.length && groundState === "open") acts.push({ act: "close", id: loopId("ground", scope), witness: { addresses: [...refs], line: `${plural(refs.length, "passage")} found and read` }, turn, by: "retrieval" });
      break;
    }
    case "execute":
      acts.push({ act: "spend", id: partIdFor(scope, part, idx()), asks: 1, note: "drafting", turn });
      break;
    case "correct":
      acts.push({ act: "again", id: partIdFor(scope, part, idx()), trigger: `${plural((info.failures ?? []).length, "claim")} the material does not hold; rewriting`, turn, by: "grounding" });
      acts.push({ act: "spend", id: partIdFor(scope, part, idx()), asks: 1, note: "rewriting", turn });
      break;
    case "checked": {
      const id = partIdFor(scope, part, idx());
      const refs = info.refs ?? [], unsupported = info.unsupported ?? [], open = hasMaterial ? (info.open ?? []) : [];
      if (!hasMaterial && !refs.length) acts.push({ act: "close", id, witness: { line: "written; nothing attached to check it against, so it stands as the model's own" }, turn, by: "grounding" });
      else if (refs.length || !unsupported.length) acts.push({ act: "close", id, witness: { addresses: [...refs] }, turn, by: "grounding" });
      else acts.push({ act: "refuse", id, reason: `nothing in the material backs this part; ${plural(unsupported.length, "claim")} stand unbacked`, turn, by: "grounding" });
      for (const u of unsupported) {
        const text = String(u?.text ?? u?.claim ?? u ?? "").trim();
        if (!text) continue;
        acts.push({ act: "open", id: loopId("unbacked", scope, text.slice(0, 80)), kind: "unbacked", cell: "EVA", asks: `what backs "${text.length > 120 ? `${text.slice(0, 117)}…` : text}"`, closesOn: "a passage that states it, or the sentence withdrawn", by: "grounding", group, turn, part: part?.label ?? null });
      }
      for (const g of open) {
        const text = String(g?.text ?? g?.detail ?? g?.question ?? g ?? "").trim();
        if (!text) continue;
        acts.push({ act: "open", id: loopId("gap", scope, text.slice(0, 80)), kind: "gap", cell: "SEG", asks: text.length > 120 ? `${text.slice(0, 117)}…` : text, closesOn: "material that covers it", by: "the check", group, turn, part: part?.label ?? null });
      }
      break;
    }
    default:
      break;
  }
  return done(acts);
}

/**
 * loopsFromResult(result, { scope, turn }) → acts from what the run's own
 * sections carry once it lands (P170's loops ride the part's record): the
 * premise check, the address check, the reader's restatement graded, the
 * sentence witness, the names asked about that the material never carries,
 * a misquotation cut, and the door that answered before any model.
 */
export function loopsFromResult(result, { scope, turn = null, convo = null } = {}) {
  const group = groupOf(scope);
  const acts = [];
  const done = (xs) => (convo != null ? xs.map((a) => ({ ...a, convo })) : xs);
  const sections = result?.sections ?? [];
  if (result?.answeredBeforeTheModel) {
    const k = result.answeredBeforeTheModel;
    const id = loopId("door", scope);
    acts.push({ act: "open", id, kind: "door", cell: "SEG", asks: "can this be answered from the material exactly, with no model", closesOn: "the answer recovered at an address, or a computation over values the question names", by: "answerable", group, turn });
    acts.push({ act: "close", id, witness: { addresses: [...(k.addresses ?? [])], line: `answered with no model call${k.addresses?.length ? `; ${plural(k.addresses.length, "address", "addresses")}` : ""}` }, turn, by: "answerable" });
  }
  sections.forEach((s, i) => {
    const label = s.part?.label ?? `part ${i + 1}`;
    const suffix = sections.length > 1 ? ` (${label})` : "";
    if (s.premises?.checked) {
      const id = loopId("premise", scope, i);
      const { checked, unverified, contradicted } = s.premises;
      acts.push({ act: "open", id, kind: "premise", cell: "SEG", asks: `does the question assume anything the sources do not carry${suffix}`, closesOn: "each thing the question assumes is found in the sources, or named as not found", by: "premise check", group, turn, part: label });
      const line = contradicted ? `${plural(contradicted, "point")} the sources contradict; ${unverified} not in them; ${checked - unverified - contradicted} found` : unverified ? `${checked - unverified} of ${plural(checked, "point")} in the sources; ${unverified} not` : `${plural(checked, "point")} the question assumes, all in the sources`;
      acts.push({ act: "close", id, witness: { count: checked, unit: "point", line }, turn, by: "premise check" });
      for (const r of s.premises.rows ?? []) {
        if (r.contradiction) acts.push({ act: "open", id: loopId("cut", scope, r.text.slice(0, 80)), kind: "cut", cell: "SEG", asks: `the question assumes "${r.text.length > 100 ? `${r.text.slice(0, 97)}…` : r.text}" and the sources say otherwise`, closesOn: "the question restated to what the sources hold", by: "premise check", group, turn, part: label, note: r.contradiction.ref ? `contradicted at ${r.contradiction.ref}` : null });
      }
    }
    if (s.addressed && !s.addressed.gap) {
      const id = loopId("address", scope, i);
      acts.push({ act: "open", id, kind: "address", cell: "SIG", asks: `does the answer name what was asked about${suffix}`, closesOn: "every name in the question appears in the answer, by identity", by: "referent index", group, turn, part: label });
      if (s.addressed.reasked) acts.push({ act: "again", id, trigger: `the draft left out ${listOut(s.addressed.missingNames ?? [])}; asked once more with what the sources say about ${listOut(s.addressed.missingNames ?? [])}`, turn, by: "referent index" });
      if (s.addressed.all) acts.push({ act: "close", id, witness: { count: (s.addressed.named ?? []).length, unit: "name", line: `${plural((s.addressed.named ?? []).length, "name")} asked about, all named` }, turn, by: "referent index" });
      else acts.push({ act: "refuse", id, reason: `the answer does not name ${listOut(s.addressed.missingNames ?? [])}`, turn, by: "referent index" });
    }
    if (s.position) {
      const id = loopId("position", scope, i);
      acts.push({ act: "open", id, kind: "position", cell: "EVA", asks: `is what you restated what the sources say${suffix}`, closesOn: "the restatement graded against the sources", by: "premise check", group, turn, part: label });
      acts.push({ act: "close", id, witness: { verdict: s.position === "yes" ? "yes, that is what the sources say" : s.position === "no" ? "no, the sources say otherwise" : s.position === "partly" ? "partly" : "the sources here do not say" }, turn, by: "premise check" });
    }
    if (s.witness?.rows?.length) {
      const id = loopId("witness", scope, i);
      const rows = s.witness.rows;
      const states = rows.filter((r) => r.witness === "states").length, refused = rows.filter((r) => r.witness === "refused").length, skipped = rows.filter((r) => r.witness === "skipped").length;
      const budget = rows.filter((r) => /budget/.test(String(r.why ?? ""))).length;
      acts.push({ act: "open", id, kind: "witness", cell: "EVA", asks: `does a passage state each sentence of the answer${suffix}`, closesOn: "every sentence asked about is pointed at, or refused", by: "the witness", group, turn, part: label });
      if (s.witness.asks) acts.push({ act: "spend", id, asks: s.witness.asks, turn });
      acts.push({ act: "close", id, witness: { count: rows.length, unit: "sentence", line: `${plural(states, "sentence")} pointed at${refused ? `, ${refused} refused` : ""}${skipped ? `, ${skipped} not asked${budget ? ` (${budget} past the budget)` : ""}` : ""}` }, turn, by: "the witness" });
      for (const r of rows.filter((x) => x.witness === "refused")) {
        const text = String(r.sentence ?? "").trim();
        if (text) acts.push({ act: "open", id: loopId("unbacked", scope, text.slice(0, 80)), kind: "unbacked", cell: "EVA", asks: `what backs "${text.length > 120 ? `${text.slice(0, 117)}…` : text}"`, closesOn: "a passage that states it, or the sentence withdrawn", by: "the witness", group, turn, part: label });
      }
    }
    for (const v of s.voidsDeclared ?? []) {
      if (!v?.name) continue;
      const id = loopId("absent", v.name);
      acts.push({ act: "open", id, kind: "absent", cell: "SIG", asks: `who or what "${v.name}" is`, closesOn: "a source that names it", reopensOn: "nothing; it stays until something read names it", by: "referent index", group, turn, part: label, note: v.refused ? `not declared as a gap on the record: ${v.refused}` : `asked about, and nothing read names it; declared as a gap on the record` });
    }
    if (s.misquote?.said?.length) {
      const id = loopId("misquote", scope, i);
      acts.push({ act: "open", id, kind: "cut", cell: "SEG", asks: `is what the question quotes what the sources say${suffix}`, closesOn: "the quotation checked against the bytes", by: "misquote check", group, turn, part: label });
      acts.push({ act: "close", id, witness: { line: `the sources say ${listOut(s.misquote.shouldBe ?? [])}, not ${listOut(s.misquote.said ?? [])}${s.misquote.ref ? ` (${s.misquote.ref})` : ""}` }, turn, by: "misquote check" });
    }
  });
  return done(acts);
}

/** loopsFromObligations(ledger, { turn }) → acts: one loop per clause, its standing read off the ledger's own projection (obligation.js). `standings` is that projection, injected. */
export function loopsFromObligations(standingsRows, { turn = null, convo = null, only = null } = {}) {
  const acts = [];
  const done = (xs) => (convo != null ? xs.map((a) => ({ ...a, convo })) : xs);
  for (const s of standingsRows ?? []) {
    if (only && !only.includes(s.id)) continue;
    const id = loopId("obligation", s.id);
    acts.push({ act: "open", id, kind: "obligation", cell: "EVA", asks: s.text, closesOn: "visited, and satisfied, with an address into the work", reopensOn: "a later edit that breaks it", by: "obligations", group: "obligations", turn });
    if (s.standing === "satisfied") acts.push({ act: "close", id, witness: { addresses: [...(s.refs ?? [])], line: s.because ?? null }, turn, by: "obligations" });
    else if (s.standing === "violated") acts.push({ act: "refuse", id, reason: s.because ?? "violated", turn, by: "obligations" });
    else if (s.standing === "waived") acts.push({ act: "waive", id, because: s.because ?? "waived", by: s.waivedBy ?? "unnamed", turn });
  }
  return done(acts);
}

/**
 * readerNotesFor(loops, { convo }) → the reader's own notes on this
 * conversation's loops that still stand open (or contested), phrased for
 * the mouth as facts in the reader's words: "The reader adds, about in
 * what form: make it rhyme." A note on a loop that has since closed is
 * spent — the loop closed with it in hand.
 */
export function readerNotesFor(loops, { convo = null } = {}) {
  const lines = [];
  for (const l of orderLoops(loops)) {
    if (convo != null && l.convo !== convo) continue;
    if (l.state !== "open" && l.state !== "contested") continue;
    for (const e of l.evidence) if (e.prompt && e.note) lines.push(`The reader adds, about ${l.asks}: ${String(e.note).trim().replace(/[.]+$/, "")}.`);
  }
  return lines.length ? lines.join(" ") : null;
}

/**
 * closingsFromFillings(loops, fillings) → acts: a void the ledger re-zeroed
 * (kernel notes.js `fillingsSince`) closes the fill loop that stands on it,
 * whatever turn opened it — the cross-turn close (P105's specimen: declared
 * on one turn, filled six turns later).
 */
export function closingsFromFillings(loops, fillings, { turn = null, convo = null } = {}) {
  const acts = [];
  for (const f of fillings ?? []) {
    for (const l of loops.filter((x) => x.voidId && x.voidId === f.void && (x.state === "open" || x.state === "contested"))) {
      acts.push({ act: "close", id: l.id, witness: { filler: f.by ?? "an arrival", source: f.witness ?? "the record" }, line: `filled on the record by ${f.by ?? "an arrival"}${f.witness ? ` (${f.witness})` : ""}`, turn, ...(convo != null ? { convo } : {}), by: "the record" });
    }
  }
  return acts;
}
