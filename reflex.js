// reflex.js — the instrument's own cognition, held on its own plane. Pure.
//
// The fold chat already performs its cognition in the open: it retrieves,
// checks, folds, records, and measures — and until now those acts were spent
// the moment they ran, visible only as console-style lines under a turn.
// This module makes the acts themselves a RECORD: an append-only ledger per
// conversation (the same discipline as pace.js and the plan log — entries
// appended, never mutated, seq not clock), rendered to an addressed text
// that the same organs which read material can read back.
//
// THE ONE RULE THIS MODULE EXISTS TO KEEP: the self plane and the world
// plane never mix. The material is what the conversation is ABOUT; the
// ledger is what the instrument DID. Four mechanical walls hold them apart:
//
//   1. NAMESPACE. Every self address lives under the reserved `self:` prefix
//      (`self:ledger#start-end`). A loaded source may not claim that prefix
//      — `isReservedSourceName` refuses it at the door — so no address is
//      ever ambiguous about which plane it names.
//   2. STORE. The ledger never enters `state.chunks`; material retrieval
//      cannot see it. A reflective turn retrieves over the ledger's own
//      chunks, with the same `retrieve` organ, on a separate call.
//   3. PROMPT. Self passages arrive under their own block (`buildSelfBlock`)
//      that declares what it is NOT: a line here supports a claim about how
//      this instrument worked, never a claim about the world.
//   4. RECORD. A warrant earned on the self plane is typed `plane: "self"`
//      end to end — fold.js carries it, the ON RECORD block marks it, the
//      renderer says it — so self-knowledge can never quietly acquire the
//      authority of a check that ran against the material.
//
// "What is most surprising" is MEASURED, never asked (L5: a compliance-
// critical fact is never left to the model's instruction-following — and a
// model asked to introspect its own surprise is exactly that mistake). The
// meter is the engine's own tier stack — eoreader6 emergence/tiers.js,
// createTierStack/foldThrough over surprise.js's bayesianSurprise and
// priorContinuationNull — used, never copied (organs injected, the cast.js
// pattern, so this module stays node-testable while the page loads them
// from /engine). Every message the conversation hears is one arrival; its
// surprise is placed against the reader's own continuation null; a run of
// tiers it disturbs is its altitude. The declared numbers name their givers
// below; none was tuned here.

import { tableFrom } from "./artifact.js";
import { RECENCY_WINDOW, truncate } from "./fold.js";
import { tokenize } from "./source.js";

// ── declared, never defaulted — each number names its giver ─────────────────

/**
 * The reach of the surprise prior, in arrivals. An arrival here is one
 * message, which is exactly the unit fold.js's RECENCY_WINDOW already counts
 * as "the raw present" — so the meter's present is the fold's present, one
 * declaration, not a second knob. Gamma is DERIVED from it by the engine's
 * own law (tiers.js::gammaFor = 1 - 1/window): the forgetting a window-wide
 * present implies, not a fourth number.
 */
export const SURPRISE_WINDOW = RECENCY_WINDOW;

/**
 * Resolution of testimony: the finest rank sayable is 1/draws. Received from
 * read-frankenstein.mjs's declaration (DRAWS = 200), the engine's own
 * left-to-right reading — not chosen here.
 */
export const SURPRISE_DRAWS = 200;

/** Smoothing: the cost a form never read still carries. Same giver. */
export const SURPRISE_ALPHA = 1;

/** The engine holds no randomness; it receives one seed. Declared. */
export const SURPRISE_SEED = 0;

/**
 * The altitudes, named for what accumulates there (tiers.js's own ladder):
 * an arrival that moves the discourse may also disturb the atmosphere the
 * discourse has settled into, and — rarely — the way of reading itself.
 * The altitude an arrival reaches IS its significance; nothing separate
 * scores it.
 */
export const SELF_TIERS = Object.freeze(["discourse", "atmosphere", "lens"]);

// ── the reserved plane ──────────────────────────────────────────────────────

export const SELF_SOURCE = "self:ledger";

/** The whole `self:` namespace is the plane's, not just the ledger's. */
export function isReservedSourceName(name) {
  return /^self:/i.test(String(name ?? "").trim());
}

export function isSelfRef(ref) {
  return /^self:/i.test(String(ref ?? ""));
}

// ── the act ledger — append-only, seq not clock ─────────────────────────────

export function emptyReflexLog() {
  return Object.freeze({ entries: Object.freeze([]), nextSeq: 0 });
}

const freezeValue = (v) => (Array.isArray(v) ? Object.freeze([...v]) : v);

/**
 * Append one act. `turn` and `act` are the entry's identity; everything else
 * is payload and rides through untouched (the plan-log discipline, P3 —
 * unrecognized keys are payload). No clock: order is seq, and a ledger
 * rebuilt from its entries alone is byte-identical.
 */
export function recordAct(log, { turn, act, ...detail }) {
  const entry = { seq: log.nextSeq, turn: Number(turn) || 0, act: String(act) };
  for (const [k, v] of Object.entries(detail)) entry[k] = freezeValue(v);
  return Object.freeze({
    entries: Object.freeze([...log.entries, Object.freeze(entry)]),
    nextSeq: log.nextSeq + 1,
  });
}

const bracket = (refs) => (refs ?? []).map((r) => `[${r}]`).join(" ");

/** Stable rendering for acts this module was not taught — sorted keys, so
 * the ledger text stays deterministic whatever a future act carries. */
function stableDetail(entry) {
  const keys = Object.keys(entry).filter((k) => !["seq", "turn", "act"].includes(k)).sort();
  return keys.map((k) => `${k} ${Array.isArray(entry[k]) ? entry[k].join(", ") : entry[k]}`).join(" · ");
}

/** One act as one line — the resolution the ledger is read at. */
export function actLine(e) {
  switch (e.act) {
    case "asked":
      return `asked: "${e.text}"`;
    case "planned":
      return `planned ${e.parts?.length ?? 0} part(s): ${(e.parts ?? []).join(" · ")}${e.degraded ? " — plan did not parse, ran flat" : ""}`;
    case "retrieved":
      return `retrieved ${e.refs?.length ?? 0} passage(s) for ${e.part}${e.refs?.length ? `: ${bracket(e.refs)}` : ""}`;
    case "corrected":
      return `rewrote ${e.part}: ${e.failures} unsupported claim(s)`;
    case "checked":
      return `checked ${e.part}: ${e.refs} address(es), ${e.unsupported} unsupported, ${e.open} open`;
    case "production":
      return `production halted by ${e.halted_by} after ${e.steps} step(s)`;
    case "recorded":
      return `recorded on the ${e.plane} plane${e.refs?.length ? `: ${bracket(e.refs)}` : ""}${e.unsupported ? ` · ${e.unsupported} unsupported` : ""}${e.open ? ` · ${e.open} open` : ""}`;
    case "folded":
      return `folded: ${e.line}`;
    case "surprise":
      return e.gap
        ? `surprise (${e.role}): ${e.gap}`
        : `surprise (${e.role}): ${e.bits} bits — ${e.standing}${e.reach && e.reach !== SELF_TIERS[0] ? `, reached ${e.reach}` : ""}`;
    case "answered-from-state":
      return `answered from state: ${e.what}`;
    case "reflected":
      return `reflected over the self plane${e.refs?.length ? `: ${bracket(e.refs)}` : ""}`;
    case "bound":
      return `bound offer: ${e.names} name(s), ${e.figures} figure(s)${e.degraded ? " — reply degraded" : ""}`;
    case "errored":
      return `errored: ${e.message}`;
    default:
      return `${e.act}: ${stableDetail(e)}`;
  }
}

/**
 * The ledger as an addressed text — one paragraph per turn, rebuilt
 * deterministically from the entries alone. This TEXT is what a self ref's
 * offsets index (P5.2: an address must read back exactly what it names), so
 * nothing here may depend on a clock, the environment, or iteration order
 * beyond seq.
 */
export function ledgerText(log) {
  const byTurn = new Map();
  for (const e of log.entries) {
    if (!byTurn.has(e.turn)) byTurn.set(e.turn, []);
    byTurn.get(e.turn).push(e);
  }
  const paragraphs = [];
  for (const [turn, entries] of [...byTurn.entries()].sort((a, b) => a[0] - b[0]))
    paragraphs.push(`turn ${turn}\n${entries.map(actLine).join("\n")}`);
  return paragraphs.join("\n\n");
}

/**
 * The ledger as passage-shaped chunks — one per turn — so the SAME organs
 * that read material (retrieve, checkGrounding, attribute, checkCitations)
 * read the self plane with no second implementation. `text` is the exact
 * slice at the ref's offsets, untrimmed: the chunk self-verifies.
 */
export function ledgerChunks(log) {
  const text = ledgerText(log);
  if (!text) return [];
  const chunks = [];
  let start = 0;
  for (const para of text.split("\n\n")) {
    const end = start + para.length;
    chunks.push({
      source: SELF_SOURCE,
      start,
      end,
      text: para,
      ref: `${SELF_SOURCE}#${start}-${end}`,
      terms: new Set(tokenize(para)),
    });
    start = end + 2; // the "\n\n" between paragraphs
  }
  return chunks;
}

/** Re-open a self ref — the same shape refContext gives for material. */
export function selfRefContext(log, ref) {
  const m = String(ref).match(/^(.*)#(\d+)-(\d+)$/);
  if (!m || m[1] !== SELF_SOURCE) return null;
  const text = ledgerText(log);
  const from = Math.max(0, Math.min(Number(m[2]), text.length));
  const to = Math.max(from, Math.min(Number(m[3]), text.length));
  return { name: SELF_SOURCE, text, from, to, before: text.slice(0, from), cited: text.slice(from, to), after: text.slice(to) };
}

/**
 * The self plane's prompt block. Deliberately NOT buildSourceBlock: the two
 * planes must never read alike in the prompt, for the same reason PAST
 * DISCOURSE and ON RECORD never merge — a block's framing is what its
 * contents inherit.
 */
export function buildSelfBlock(chunks) {
  if (!chunks?.length) return null;
  const parts = [
    "SELF — the instrument's own record of its acts in this conversation, each with the address it can be re-read at. This is not material about the world: a line here supports a claim about how this instrument worked — what it retrieved, checked, folded, and how far each arrival moved its belief — and nothing else. Answer from these when they cover the question and cite each address in brackets exactly as written; where they do not cover it, say so.",
  ];
  for (const c of chunks) parts.push(`[${c.ref}]\n${c.text}`);
  return parts.join("\n\n");
}

// ── the surprise meter — the engine's tier stack, injected ──────────────────

const countsOf = (tokens) => {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
};

/** Natural-frequency phrasing of where an arrival fell against the null. */
function standingOf(r) {
  if (r.censored === "above") return `beyond all ${SURPRISE_DRAWS} continuations of its own prior`;
  if (r.censored === "below") return `below every one of ${SURPRISE_DRAWS} continuations — steadier than carrying on`;
  if (r.rank != null) return `${Math.round(r.rank * SURPRISE_DRAWS)} of ${SURPRISE_DRAWS} continuations moved belief at least this far`;
  return null;
}

/**
 * `makeReflexMeter(organs)` → `{ create, observe }`.
 *
 * The organs are eoreader6's own — emergence/tiers.js createTierStack and
 * foldThrough — injected so this module is imported by both the page (which
 * loads them from /engine) and the node tests (relative path). One meter per
 * conversation; `observe` mutates the meter's tiers (they are the engine's
 * own stateful readers) and appends one frozen observation per arrival.
 */
export function makeReflexMeter({ createTierStack, foldThrough }) {
  return {
    create() {
      return {
        tiers: createTierStack([...SELF_TIERS], {
          window: SURPRISE_WINDOW,
          draws: SURPRISE_DRAWS,
          seed: SURPRISE_SEED,
        }),
        /** Every arrival's measurement, in order. Append-only. */
        observations: [],
      };
    },

    /** One message heard by the conversation = one arrival. */
    observe(meter, { turn, role, text }) {
      const arrival = countsOf(tokenize(text));
      const seq = meter.observations.length;
      let obs;
      if (arrival.size === 0) {
        obs = { seq, turn, role, gist: truncate(text, 100), bits: null, rank: null, censored: null, standing: null, top: null, gap: "empty_arrival — nothing tokenizable arrived" };
      } else {
        const r = foldThrough(meter.tiers, arrival, { alpha: SURPRISE_ALPHA });
        const t0 = r.results[0];
        obs = {
          seq,
          turn,
          role,
          gist: truncate(text, 100),
          bits: t0.surprise != null ? Number(t0.surprise.toFixed(3)) : null,
          rank: t0.rank ?? null,
          censored: t0.censored ?? null,
          standing: standingOf(t0),
          top: r.top,
          // The first arrival seeds belief and is not measured: a first
          // ground is received, never derived (SEED.md #1). The engine
          // already types this; the phrasing is carried, not invented.
          gap: t0.gap ? `${t0.gap.gap ?? t0.gap}${t0.gap.detail?.reason ? ` — ${t0.gap.detail.reason}` : ""}` : null,
        };
      }
      obs = Object.freeze(obs);
      meter.observations.push(obs);
      return obs;
    },
  };
}

/**
 * The measured answer to "what surprised you most", ranked mechanically:
 * censored-above first (the null could not produce it at all), then by rank
 * (the share of the prior's own continuations that moved belief as far —
 * smaller is rarer), then by bits. No model chose this order.
 */
export function mostSurprising(meter) {
  const measured = (meter?.observations ?? []).filter((o) => o.bits != null);
  return [...measured].sort((a, b) => {
    const ra = a.censored === "above" ? -1 : a.rank ?? 2;
    const rb = b.censored === "above" ? -1 : b.rank ?? 2;
    return ra - rb || b.bits - a.bits;
  });
}

// ── the levels, answered from state — computed, not generated ───────────────

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function actsTable(log) {
  if (!log?.entries.length) return null;
  return {
    table: tableFrom(log.entries, [
      { label: "Turn", get: (e) => e.turn },
      { label: "Act", get: (e) => actLine(e) },
    ]),
    caption: `${plural(log.entries.length, "act")} on the ledger · computed, not generated`,
  };
}

export function surpriseTable(meter) {
  const ranked = mostSurprising(meter);
  const total = meter?.observations.length ?? 0;
  if (!total) return null;
  const gamma = 1 - 1 / SURPRISE_WINDOW;
  if (!ranked.length) {
    // Arrivals heard, none measurable yet — the first ground seeds belief.
    return {
      table: tableFrom(meter.observations, [
        { label: "Turn", get: (o) => o.turn },
        { label: "Arrival", get: (o) => `${o.role}: ${o.gist}` },
        { label: "Measured", get: (o) => o.gap ?? "—" },
      ]),
      caption: `${plural(total, "arrival")} heard, none measurable yet — a first ground is received, never measured · computed, not generated`,
    };
  }
  return {
    table: tableFrom(ranked, [
      { label: "Turn", get: (o) => o.turn },
      { label: "Arrival", get: (o) => `${o.role}: ${o.gist}` },
      { label: "Bits", get: (o) => o.bits },
      { label: "Against its own continuations", get: (o) => o.standing ?? "—" },
      { label: "Reached", get: (o) => o.top ?? "—" },
    ]),
    caption:
      `${plural(ranked.length, "arrival")} measured of ${total} heard, most surprising first · ` +
      `window ${SURPRISE_WINDOW}, gamma ${gamma}, draws ${SURPRISE_DRAWS} — declared with their givers, not tuned · computed, not generated`,
  };
}

/** The measured physiology, from pace.js's fold — rows, not a paraphrase. */
export function paceTable(pace) {
  if (!pace?.calls) return null;
  const rows = [
    ["calls measured", pace.calls],
    ["tokens per char", pace.tokensPerChar?.toFixed(4) ?? "unmeasured"],
    ["prefill tok/s", pace.prefillTps ? Math.round(pace.prefillTps) : "unmeasured"],
    ["decode tok/s", pace.decodeTps ? Math.round(pace.decodeTps) : "unmeasured"],
    ["mean answer tokens", pace.meanOutTokens ? Math.round(pace.meanOutTokens) : "unmeasured"],
  ];
  return {
    table: tableFrom(rows, [
      { label: "Measure", get: (r) => r[0] },
      { label: "Value", get: (r) => r[1] },
    ]),
    caption: `the pace of this instrument, measured from the runtime's own telemetry over ${plural(pace.calls, "call")} · computed, not generated`,
  };
}

/**
 * The ladder itself, on request: every level of the instrument's own
 * cognition, its current extent, and the door to it. Plain text for a
 * usage-style turn — no model call.
 */
export function selfOverview({ history, summary, reflexLog, meter, pace }) {
  const measured = (meter?.observations ?? []).filter((o) => o.bits != null).length;
  const lines = [
    "The instrument's own cognition, by level — each held on the self plane, apart from the material, and computed on request:",
    `  transcript · ${plural(history?.length ?? 0, "message")} exist; only the last ${RECENCY_WINDOW} are ever resent — "show the folds" for what stands in for the rest`,
    `  fold · the running summary after ${plural(summary?.turnCount ?? 0, "turn")} — /self folds`,
    `  record · ${plural(summary?.records?.length ?? 0, "addressed record")} — /self records`,
    `  acts · ${plural(reflexLog?.entries.length ?? 0, "act")} on the ledger (what was retrieved, checked, folded) — /self acts`,
    `  surprise · ${measured} of ${plural(meter?.observations.length ?? 0, "arrival")} measured against the reader's own continuation null — /self surprise`,
    `  pace · ${pace?.calls ? `measured over ${plural(pace.calls, "call")}` : "unmeasured — no completed call yet"} — /self pace`,
    "",
    "Ask in words (\"what surprised you most\") or by door. /reflect <question> retrieves from the ledger itself and answers with the usual checks — on the self plane, typed as such.",
  ];
  return lines.join("\n");
}

/** `/self <word>` → which level. Includes the app-plane tables tables.js
 * already builds, so the ladder is one ladder. */
export function normalizeSelfLevel(word) {
  const w = String(word ?? "").trim().toLowerCase();
  if (/^(acts?|log|ledger|thinking|cognition)$/.test(w)) return "acts";
  if (/^(surprise|surprises|surprising)$/.test(w)) return "surprise";
  if (/^(pace|speed|latency)$/.test(w)) return "pace";
  if (/^(folds?|summary)$/.test(w)) return "folds";
  if (/^(records?|warrants?)$/.test(w)) return "records";
  if (/^(sources?|material)$/.test(w)) return "sources";
  if (/^(passages?|retrieved)$/.test(w)) return "passages";
  return null;
}

/**
 * The mechanical door for self questions asked in words. Deliberately
 * narrow: it requires the second-person tell — the question must be TO the
 * instrument about the instrument ("what surprised you", "how do you
 * think") — because a question about surprise IN the material is the
 * material's, and material must always win (the same reason detectTable
 * demands the possessive). The explicit doors (/self, /reflect) are always
 * available for anything this refuses.
 */
export function detectReflex(question) {
  const q = String(question ?? "");
  if (!/\b(you|your|yourself)\b/i.test(q)) return null;
  if (/\bsurpris/i.test(q)) return "surprise";
  if (/\byour (acts?|process|thinking|cognition|log|ledger)\b/i.test(q)) return "acts";
  if (/\byour (pace|speed|latency)\b/i.test(q) || /\bhow fast are you\b/i.test(q)) return "pace";
  if (/\bhow (do|did|are) you (think|thinking|decide|deciding|read|reading|work|working|remember|retrieve)\b/i.test(q)) return "reflect";
  return null;
}
