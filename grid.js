// grid.js — the terminal language's composition-law parser and event log.
//
// Implements the near-horizon build SEED-CREATION-LANGUAGE.md names first
// ("define the smallest event schema... grammar-constrained") and the fuller
// spec handed down after it (the Terminal Language document): nine operators,
// nine terrains, nine postures, one composition law —
//
//   <verb> [<object>] at <terrain> from <stance>
//     [ground <ground> broken:<perturbation>] [because <trigger>]
//     [supersedes <event>] [warrant:<giver>]
//
// — parsed into a typed event or a typed refusal, landed on an append-only
// log, folded into the current state on request. Physics, not politeness:
// a malformed act is unrepresentable, refused before it ever reaches the
// log, the same discipline PATCH_SCHEMA/measure.js's `admit` already hold.
//
// PURE, ORGANS INJECTED (the cast.js pattern, carried here from build-log.js
// and measure.js): the engine's own operator algebra and append-only task
// log arrive as arguments, via `makeGrid({ operators, taskLog })`, so this
// module loads from `/engine` in the page and by relative path in tests —
// see grid.test.mjs for the real organs (../eoreader6.1/packages/engine/
// operators.js and .../holon/task-log.js), never a stub.
//
// ── WHY THIS REUSES THE ENGINE'S ALGEBRA RATHER THAN RE-DERIVING IT ────────
//
// The nine operators, terrains and their (mode, domain, grain) derivation
// are NOT reinvented here. `packages/engine/operators.js` already states
// "THE ALGEBRA IS THE SINGLE SOURCE OF TRUTH" and this repo's standing rule
// is to leave everything possible in eoreader6.1 — so the terrain grid
// (`TERRAIN_BY_DOMAIN`), the operator letters (NUL SIG INS SEG CON SYN DEF
// EVA REC — literally the same nine letters the Terminal Language document
// names), the real dependency order (`OPERATOR_ORDER`), and the append-only
// log discipline (`task-log.js`'s propose/supersede/evidence/result/retract,
// seq not clock) are all imported, not copied. Three reconciliations were
// necessary between the document as handed down and what is actually
// shipped and load-bearing here; each is disclosed rather than silently
// picked, because a silent pick between two documents this codebase treats
// as canon is exactly the kind of drift POLICIES.md exists to catch:
//
// 1. OPERATOR ORDER. The document's prose calls the chain "NUL SIG INS SEG
//    CON SYN DEF EVA REC" and names it "the HELIX order". task-log.js's own
//    header — without spelling out that sequence's letters itself — records
//    that "an invented HELIX ordering" existed once, as a "hand-rolled
//    partial copy" in application-side code, and was REPLACED by the
//    engine's real, dependency-order-derived `OPERATOR_ORDER`: NUL SEG SIG
//    CON EVA DEF INS SYN REC. The shared, distinctive name ("HELIX order" /
//    "HELIX ordering") is what ties the two together, not a literal quote
//    of the old sequence from task-log.js's own text. This module uses the
//    engine's order, not the document's prose order, because the engine's
//    is the one `validateChain`/`isProductionOrder`/`checkCubeProgression`
//    actually enforce — reusing a name that has already been tried and
//    superseded once would silently reintroduce the defect the rename was
//    for, whether or not the two "HELIX"s turn out to be the identical
//    sequence.
//
// 2. DEF / EVA / REC READINGS. The document's own header text for `DEF` —
//    "commit a claim... refuses when no companion evaluate accompanies it"
//    — sounds different from `build-log.js`'s established DEF = "refuse, a
//    typed gap". They are the same operator read at different specificity:
//    task-log.js's own header glosses the engine's real order as "DEF
//    (define)" — DEF's general act is to DRAW A BOUNDARY (define what
//    counts), and a build's refusal is exactly the Void-targeted special
//    case of that (define this figure back into the nothing). Nothing here
//    contradicts build-log.js; `define at Void` (§ below) is written to
//    LAND as exactly what build-log.js already calls DEF.
//
// 3. TERRAIN IS MEDIUM-BLIND, EVEN ACROSS THE ENGINE'S OWN DOMAIN LOCK.
//    `operators.js::cellOf` derives an operator's terrain from
//    `OP_DOMAIN[op]` — SIG and INS are always Existence-domain there, so
//    `cellOf` alone could only ever land a `distinguish` on Void/Entity/
//    Kind. The Terminal Language document's own worked example uses
//    `distinguish at Network from encounter` — Network is Structure-domain
//    — and states the reason directly: "the operator is medium-blind... A
//    single DEF means the same act whether defining a variable, a
//    character, a policy, a paragraph, or a hypothesis." So `at <terrain>`
//    here is taken AS AUTHORITATIVE, never re-derived from the verb's own
//    operator letters, and `cellOf` is not called to second-guess it —
//    calling it would silently overrule the very generality the document
//    is built to have. What IS kept from the engine, because it never
//    depended on that domain lock, is the terrain→grain lookup itself
//    (`TERRAIN_BY_DOMAIN`, flattened once below) and the real dependency
//    order for `revise`'s chain check.
//
// A fourth boundary is scope, not disagreement, and is named here so it is
// not mistaken for either: STANCE here is genuinely a new, independently
// declared axis this module adds on top of the engine's own two faces
// (operator×terrain) — the engine's `STANCE_BY_MODE` labels (Clearing,
// Dissecting, Tending, Cultivating…) only mean something when an act's
// operator and its terrain share one domain, which point 3 above says this
// module does not require. Mixing those labels onto an act that has
// deliberately stepped outside that requirement would read as authoritative
// engine output when it is not, so this module does not import or display
// them — the document's own mode/grain vocabulary (Differentiate/Relate/
// Generate × Ground/Figure/Pattern, and the four named shorthands) is the
// only stance vocabulary landed here.

// ── the verbs (operators) ───────────────────────────────────────────────────

/** Eight surface verbs over the nine operators — `distinguish` alone carries
 * two (SIG then INS), per the document's own note: "to sign a figure and
 * individuate it are one motion at the surface, two operators in the
 * algebra." */
export const VERBS = Object.freeze({
  void: Object.freeze({ ops: Object.freeze(["NUL"]) }),
  distinguish: Object.freeze({ ops: Object.freeze(["SIG", "INS"]) }),
  separate: Object.freeze({ ops: Object.freeze(["SEG"]) }),
  relate: Object.freeze({ ops: Object.freeze(["CON"]) }),
  synthesize: Object.freeze({ ops: Object.freeze(["SYN"]) }),
  define: Object.freeze({ ops: Object.freeze(["DEF"]) }),
  evaluate: Object.freeze({ ops: Object.freeze(["EVA"]) }),
  revise: Object.freeze({ ops: Object.freeze(["REC"]) }),
});

// ── stance vocabulary ────────────────────────────────────────────────────────

const MODE_WORDS = Object.freeze({ differentiate: "Differentiate", relate: "Relate", generate: "Generate" });
const GRAIN_WORDS = Object.freeze({ ground: "Ground", figure: "Figure", pattern: "Pattern" });

/** The four named shorthands the document calls out as recurring most.
 * Three expand to a FIXED (mode, grain) cell — grain is checked against the
 * terrain's own grain at resolution time, never silently overridden.
 * `encounter` is deliberately `grain: null` (flexible) — see the note below
 * this table for why, pinned by a worked-example test in grid.test.mjs. */
export const STANCE_SHORTHANDS = Object.freeze({
  extraction: Object.freeze({ mode: "Differentiate", grain: "Figure" }),
  cultivation: Object.freeze({ mode: "Relate", grain: "Figure" }),
  encounter: Object.freeze({ mode: "Generate", grain: null }),
  closure: Object.freeze({ mode: "Generate", grain: "Pattern" }),
});
// `encounter` is under-specified in the document itself, and resolved here
// by deferring to the document's OWN worked example over its OWN table
// formatting, where the two conflict. The prose that introduces the
// shorthand ("the encounter of generate·ground/generate·figure") already
// reads as naming both cells loosely; the §5 worked example then settles
// it by USE: `distinguish at Network from encounter` — Network is
// Pattern-grain, which a Figure-locked `encounter` could never satisfy.
// And §2 states read launchers "default to `encounter`" across launchers
// that target terrains of every different grain (Void through Paradigm) —
// a grain-locked default could not serve all of them either. So `encounter`
// is read as a mnemonic for bare `generate` (any grain, resolved from the
// terrain, exactly like the bare-mode rule below) rather than as a fifth
// cell-specific shorthand alongside the other three, which — unlike
// `encounter` — are each used at one grain consistently everywhere the
// document places them and stay locked.

/** The one stance-law rule the document actually names and pins as
 * illegal — "generate·pattern (synthesis, closure) may not be performed
 * from a relate posture... the forbidden SYN·cultivation cell". Read
 * narrowly (see this module's header, point 3): the rule is about the
 * VERB `synthesize` declaring a `relate` mode, not a blanket ban on
 * `relate·pattern` as a stance for other acts (the document's own table
 * describes `relate·pattern` — "Tracing" in the engine's unrelated
 * vocabulary — as a legitimate way to hold a structure open). */
function stanceIsIllegal(verb, mode) {
  return verb === "synthesize" && mode === "Relate";
}

/** Resolve a stance token against the terrain's own grain. Returns
 * `{ mode, grain, cell }` or a typed refusal — never guesses. */
export function resolveStance(token, terrainGrain) {
  const raw = String(token ?? "").trim();
  if (!raw) return { refused: { type: "no_stance", detail: "every act must declare a stance — an undeclared stance is an unfalsifiable one" } };
  const lower = raw.toLowerCase();

  if (Object.hasOwn(STANCE_SHORTHANDS, lower)) {
    const { mode, grain: fixedGrain } = STANCE_SHORTHANDS[lower];
    if (fixedGrain === null) return { mode, grain: terrainGrain, cell: `${mode}·${terrainGrain}`, shorthand: lower };
    if (fixedGrain !== terrainGrain) {
      return { refused: { type: "stance_grain_mismatch", shorthand: lower, shorthandGrain: fixedGrain, terrainGrain, detail: `"${lower}" names ${mode.toLowerCase()}·${fixedGrain.toLowerCase()} — this terrain is ${terrainGrain.toLowerCase()}-grain, so the shorthand and the terrain disagree` } };
    }
    return { mode, grain: fixedGrain, cell: `${mode}·${fixedGrain}`, shorthand: lower };
  }

  if (Object.hasOwn(MODE_WORDS, lower)) {
    // Bare mode: resolves to the mode crossed with the act's own terrain
    // grain, exactly as the composition law specifies.
    const mode = MODE_WORDS[lower];
    return { mode, grain: terrainGrain, cell: `${mode}·${terrainGrain}` };
  }

  const compound = lower.match(/^(differentiate|relate|generate)[·.]\s*(ground|figure|pattern)$/);
  if (compound) {
    const mode = MODE_WORDS[compound[1]];
    const grain = GRAIN_WORDS[compound[2]];
    if (grain !== terrainGrain) {
      return { refused: { type: "stance_grain_mismatch", stated: lower, statedGrain: grain, terrainGrain, detail: `"from ${raw}" names ${grain.toLowerCase()}-grain, but this terrain (grain from the \`at\` clause) is ${terrainGrain.toLowerCase()}-grain` } };
    }
    return { mode, grain, cell: `${mode}·${grain}` };
  }

  return { refused: { type: "unknown_stance", stated: raw, detail: `"${raw}" is not a mode (differentiate/relate/generate), a named shorthand (${Object.keys(STANCE_SHORTHANDS).join("/")}), or a mode·grain pair` } };
}

// ── the composition-law tokenizer ───────────────────────────────────────────

const CLAUSE_KEYWORDS = Object.freeze(["at", "from", "ground", "because", "supersedes"]);

/** Each token carries whether it was quoted in the source line — a quoted
 * referent's text is never treated as a clause keyword, an inline
 * `key:value` field, or a place `relate`/`synthesize` may split (below):
 * a referent literally named "the report we sent to auditors" must not
 * fracture on its own bare "to". */
function tokenize(line) {
  const out = [];
  const re = /"[^"]*"|'[^']*'|\S+/g;
  let m;
  while ((m = re.exec(line))) {
    const raw = m[0];
    const quoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
    out.push({ text: quoted ? raw.slice(1, -1) : raw, quoted });
  }
  return out;
}

/**
 * Read one composition-law line into a raw parse — verb, object, and each
 * clause's tokens joined back to text, plus any inline `key:value` tokens
 * (`broken:`, `warrant:`, `verdict:`) wherever they appear. Returns null
 * when the first word isn't a known verb, so a caller's door can fall
 * through to the next one (measure.js's `parseMeasure` convention).
 * `objectTokens` (the object clause's own token list, quote-flags intact)
 * rides alongside the joined `object` string so `relate`/`synthesize` can
 * split on a bare separator without shredding a quoted referent.
 */
export function tokenizeAct(line) {
  const tokens = tokenize(String(line ?? ""));
  if (!tokens.length) return null;
  const verb = tokens[0].text.toLowerCase();
  if (!Object.hasOwn(VERBS, verb)) return null;

  const clauses = { object: [], at: [], from: [], ground: [], because: [], supersedes: [] };
  const fields = {}; // inline key:value tokens
  let current = "object";
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    const lower = tok.text.toLowerCase();
    if (!tok.quoted && CLAUSE_KEYWORDS.includes(lower)) { current = lower; continue; }
    if (!tok.quoted) {
      const kv = tok.text.match(/^([A-Za-z][A-Za-z0-9_]*):(.*)$/);
      if (kv) { fields[kv[1].toLowerCase()] = kv[2]; continue; }
    }
    clauses[current].push(tok);
  }
  const join = (k) => clauses[k].map((t) => t.text).join(" ").trim();
  return {
    verb,
    object: join("object"),
    objectTokens: clauses.object,
    terrain: join("at"),
    stanceToken: join("from"),
    ground: join("ground"),
    because: join("because"),
    supersedes: join("supersedes") || null,
    warrant: fields.warrant ?? null,
    broken: fields.broken ?? null,
    verdict: fields.verdict ?? null,
  };
}

/** Split an object-clause token list on the first BARE (unquoted) token
 * equal to `word` — used by `relate`'s "<a> to <b>". Returns `[a, b]` or
 * null when the separator is absent or either side would be empty. */
function splitOnBareWord(tokens, word) {
  const idx = tokens.findIndex((t) => !t.quoted && t.text.toLowerCase() === word);
  if (idx === -1) return null;
  const left = tokens.slice(0, idx).map((t) => t.text).join(" ").trim();
  const right = tokens.slice(idx + 1).map((t) => t.text).join(" ").trim();
  if (!left || !right) return null;
  return [left, right];
}

/** Split an object-clause token list on bare commas — used by
 * `synthesize`'s comma-separated parts. A comma INSIDE a quoted token
 * (or attached to one, "part1", part2) never splits; a comma attached to
 * a bare token ("part1," "part2") does, the common case tokenize()
 * otherwise hands back as one token including the punctuation. */
function splitOnBareCommas(tokens) {
  const parts = [];
  let current = [];
  for (const t of tokens) {
    if (!t.quoted && t.text.includes(",")) {
      const segs = t.text.split(",");
      if (segs[0]) current.push(segs[0]);
      if (current.length) parts.push(current.join(" ").trim());
      current = [];
      for (let i = 1; i < segs.length - 1; i++) if (segs[i]) parts.push(segs[i].trim());
      if (segs[segs.length - 1]) current.push(segs[segs.length - 1]);
    } else {
      current.push(t.text);
    }
  }
  if (current.length) parts.push(current.join(" ").trim());
  return parts.filter(Boolean);
}

// ── terrain lookup, flattened once from the engine's own grid ──────────────

function flattenTerrains(TERRAIN_BY_DOMAIN) {
  const byName = new Map();
  for (const [domain, byGrain] of Object.entries(TERRAIN_BY_DOMAIN)) {
    for (const [grain, terrain] of Object.entries(byGrain)) byName.set(terrain, { domain, grain });
  }
  return byName;
}

let eventCounter = 0;
/** Deterministic-enough act ids for this pass — a real deployment would key
 * these off the log's own seq (task-log.js supplies one); exposed as an
 * override so tests can pin ids without relying on module-load order. */
function nextEventId(log) {
  return `act-${log?.nextSeq ?? eventCounter++}`;
}

// ── the grid: parse, refuse, land, fold ─────────────────────────────────────

/**
 * `makeGrid({ operators, taskLog })` binds the composition law to the
 * engine's real operator algebra and append-only log. `operators` is the
 * namespace of `packages/engine/operators.js` (`TERRAIN_BY_DOMAIN`,
 * `isCurrentOperator`, `OPERATOR_ORDER`); `taskLog` is
 * `packages/engine/holon/task-log.js` (`createTaskLog`, `append`,
 * `projectTasks`, `ENTRY_KINDS`, `OPERATOR_BASIS`, `isProductionOrder`).
 */
export function makeGrid({ operators, taskLog }) {
  const TERRAINS = flattenTerrains(operators.TERRAIN_BY_DOMAIN);
  const capacityLookup = { findCapacity: null, unresolvedCapacity: null };

  function withCapacities(cap) {
    capacityLookup.findCapacity = cap.findCapacity;
    capacityLookup.unresolvedCapacity = cap.unresolvedCapacity;
  }

  /**
   * Parse one line into `{ ok: true, event }` or `{ ok: false, refusal }`.
   * `log` provides context for the log-aware refusals (`separate` needs an
   * already-individuated object; `relate` needs both referents to already
   * be established, unless a `warrant:` marks the edge as offered rather
   * than established; `revise` needs its target on the log).
   */
  function parseAct(line, { log } = {}) {
    const raw = tokenizeAct(line);
    if (!raw) {
      const firstWord = String(line ?? "").trim().split(/\s+/)[0] ?? "";
      return { ok: false, refusal: { type: "unknown_verb", stated: firstWord, detail: `"${firstWord}" is not one of the eight verbs (${Object.keys(VERBS).join(", ")})` } };
    }

    if (!raw.terrain) return { ok: false, refusal: { type: "no_terrain", detail: "every act names its altitude — `at <terrain>` is required" } };
    const terrainInfo = TERRAINS.get(raw.terrain);
    if (!terrainInfo) return { ok: false, refusal: { type: "unknown_terrain", stated: raw.terrain, detail: `"${raw.terrain}" is not one of the nine terrains (${[...TERRAINS.keys()].join(", ")})` } };

    const stance = resolveStance(raw.stanceToken, terrainInfo.grain);
    if (stance.refused) return { ok: false, refusal: stance.refused };
    if (stanceIsIllegal(raw.verb, stance.mode)) {
      return { ok: false, refusal: { type: "illegal_stance", verb: raw.verb, mode: stance.mode, detail: "generate·pattern (synthesis, closure) may not be performed from a relate posture — you cannot commit a whole from a stance that refuses to commit" } };
    }

    // BOTH halves of `ground <candidate> broken:<perturbation>` are
    // required together — a candidate with no perturbation, or a
    // perturbation with no candidate, is not a constructed nothing, it is
    // half of one. (Was `||` — a real bug: either half alone used to pass.)
    const hasGround = !!(raw.ground && raw.broken);
    const refusal = verbRefusal(raw, { terrainInfo, hasGround, log });
    if (refusal) return { ok: false, refusal };

    const ops = VERBS[raw.verb].ops;
    const referents = raw.verb === "relate" ? splitOnBareWord(raw.objectTokens, "to") : null;
    const event = {
      id: null, // assigned at land time, once the log's own seq is known
      verb: raw.verb,
      ops,
      object: raw.object || null,
      referents, // relate's own two referents, exact — never re-derived by substring match downstream (synthesize's own check reads this, not `object`)
      terrain: raw.terrain,
      domain: terrainInfo.domain,
      grain: terrainInfo.grain,
      stance: { input: raw.stanceToken, mode: stance.mode, grain: stance.grain, cell: stance.cell, shorthand: stance.shorthand ?? null },
      ground: raw.ground || null,
      broken: raw.broken || null,
      because: raw.because || null,
      supersedes: raw.supersedes,
      warrant: raw.warrant,
      requiresEvaluate: raw.verb === "define",
      verdict: raw.verdict, // "holds" | "refused" | null — see evaluate's own note below
    };
    return { ok: true, event };
  }

  function verbRefusal(raw, { terrainInfo, hasGround, log }) {
    const live = log ? taskLog.projectTasks(log) : [];
    const objectEstablished = (name) => live.some((t) => (t.object ?? "").toLowerCase() === String(name ?? "").toLowerCase());

    switch (raw.verb) {
      case "void":
        // "refuses when the perturbation is unlicensed for the candidate" —
        // the deep half of this (nul/index.js's LICENSED table, or
        // measure.js's own `admit`) is not wired into the grammar this
        // pass; only the syntactic half — a candidate and a perturbation
        // must actually be named — is checked here. Disclosed in
        // CLAUDE.md, not silently implied as done.
        if (!hasGround) return { type: "no_ground", detail: "`void` constructs a nothing FOR something — name it: `ground <candidate> broken:<perturbation>`" };
        return null;

      case "distinguish":
        if (!hasGround) return { type: "no_ground", detail: "`distinguish` pulls a figure out of a ground that must be named — `ground <candidate> broken:<perturbation>`" };
        return null;

      case "separate":
        if (!raw.object) return { type: "no_object", detail: "`separate` needs a thing to find the parts of" };
        if (terrainInfo.grain === "Ground") return { type: "not_individuated", detail: "a Ground-grain terrain has no individuated thing yet to separate — `distinguish` one first" };
        if (log && !objectEstablished(raw.object)) return { type: "not_individuated", object: raw.object, detail: `"${raw.object}" has not been individuated yet on this log — \`distinguish\` it before separating its parts` };
        return null;

      case "relate": {
        // Token-based, quote-aware (see splitOnBareWord) — a referent whose
        // own name contains a bare "to" would otherwise fracture the split
        // (measured against the real bug: "commute to work" as one side).
        const parts = splitOnBareWord(raw.objectTokens, "to");
        if (!parts) return { type: "no_referents", detail: "`relate` needs two referents — `relate <a> to <b> at <terrain> from <stance>`" };
        if (!raw.warrant && log) {
          const unresolved = parts.filter((p) => !objectEstablished(p));
          if (unresolved.length) {
            return { type: "referent_unresolved", referents: unresolved, detail: `${unresolved.join(", ")} — not yet established on this log; either land it first, or mark this edge \`warrant:<giver>\` so it lands as OFFERED rather than established` };
          }
        }
        return null;
      }

      case "synthesize": {
        // Token-based, quote-aware (see splitOnBareCommas) — same reason as
        // relate's split above.
        const parts = splitOnBareCommas(raw.objectTokens);
        if (parts.length < 2) return { type: "no_parts", detail: "`synthesize` composes a whole from parts — name at least two, comma-separated" };
        if (log) {
          // EXACT match against a relate act's own two referents — never a
          // substring check against its raw object text (measured against
          // the real bug: "zone" matching inside "zone-99" through
          // String.includes, warranting a synthesis nothing actually
          // related). `referents` is null for anything but a landed
          // `relate` act. Both of a relate act's referents must be among
          // synthesize's own parts — "the parts share a warranting
          // relation" means the RELATED PAIR is what is being synthesized,
          // not that some unrelated third part merely resembles one side
          // of some other edge on the log.
          const hasRelation = live.some(
            (t) => t.verb === "relate" && Array.isArray(t.referents)
              && t.referents.every((r) => parts.some((p) => p.toLowerCase() === r.toLowerCase())),
          );
          const capacityHit = capacityLookup.findCapacity ? parts.some((p) => capacityLookup.findCapacity(p)) : false;
          if (!hasRelation && !capacityHit) {
            return { type: "unwarranted_synthesis", parts, detail: "the parts share no warranting relation yet — `relate` them first, or reference an established capacity" };
          }
        }
        return null;
      }

      case "define":
        // No refusal at parse time for a missing companion `evaluate` — the
        // document is explicit that this is a FOLD-time fact ("a define
        // lands on the record only if its evaluate clears"), not a
        // grammar-time one; refusing at parse would refuse the act of
        // making a claim at all, which is not what "requires evaluate"
        // means. `foldGrid` below computes the landing.
        if (!raw.object) return { type: "no_object", detail: "`define` commits a claim about something — name it" };
        return null;

      case "evaluate":
        if (!hasGround) return { type: "no_ground", detail: "`evaluate` checks a claim against a ground that must be constructed — `ground <candidate> broken:<perturbation>`" };
        if (raw.verdict && raw.verdict !== "holds" && raw.verdict !== "refused") {
          return { type: "unknown_verdict", stated: raw.verdict, detail: '`verdict:` must be "holds" or "refused" — grid.js records a declared verdict, it does not yet compute one (see CLAUDE.md)' };
        }
        return null;

      case "revise":
        if (!raw.because) return { type: "no_trigger", detail: "`revise` supersedes because something failed — name it: `because <trigger>`" };
        if (!raw.supersedes) return { type: "no_target", detail: "`revise` needs the event it supersedes — `supersedes <event-id>`" };
        if (log) {
          const onLog = log.entries.some((e) => e.task_id === raw.supersedes);
          if (!onLog) return { type: "target_not_found", target: raw.supersedes, detail: `"${raw.supersedes}" is not on this log — nothing to supersede` };
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Land a parsed event on `log`, returning `{ log, ids }`. `distinguish`
   * appends TWO task-log entries (SIG then INS, in that order — legal per
   * the engine's own `OPERATOR_ORDER`, since SIG precedes INS there) that
   * share one act; every other verb appends one.
   */
  function land(log, event) {
    let current = log;
    const ids = [];
    for (const op of event.ops) {
      const id = nextEventId(current);
      // Only `revise` (REC) ever supersedes — the composition law's
      // `supersedes` clause is grammatically available to any line, but
      // landing as a task-log SUPERSEDE (rather than PROPOSE) is reserved
      // for the one verb whose whole act IS superseding, so a `supersedes`
      // clause attached elsewhere (harmless, unused) can never accidentally
      // drop an earlier act out of the live fold.
      const kind = event.verb === "revise" && event.supersedes
        ? taskLog.ENTRY_KINDS.SUPERSEDE
        : taskLog.ENTRY_KINDS.PROPOSE;
      current = taskLog.append(current, {
        kind,
        task_id: id,
        description: describeEvent(event, op),
        supersedes: kind === taskLog.ENTRY_KINDS.SUPERSEDE ? event.supersedes : undefined,
        operator: op,
        operator_basis: taskLog.OPERATOR_BASIS.DECLARED, // a human/model typed this at the terminal — not autopoietically produced
        grain: event.grain,
        verb: event.verb,
        object: event.object,
        referents: event.referents,
        terrain: event.terrain,
        domain: event.domain,
        stance: event.stance,
        ground: event.ground,
        broken: event.broken,
        because: event.because,
        warrant: event.warrant,
        requiresEvaluate: event.requiresEvaluate,
        verdict: event.verdict,
        actGroup: event.ops.length > 1 ? event.ops.join("+") : null,
      });
      ids.push(id);
    }
    return { log: current, ids };
  }

  function describeEvent(event, op) {
    const objectPart = event.object ? `${event.object} ` : "";
    return `${event.verb} ${objectPart}at ${event.terrain} from ${event.stance.cell} [${op}]`.trim();
  }

  /**
   * Attach a RESULT to an already-landed act — the outcome of actually
   * RUNNING a capacity (capacity-runner.js), never a re-typing of the act:
   * task-log.js's own `produce()` discipline ("a result attaches an
   * answer to a task that already exists; stamping an operator on it
   * would re-type the task in the fold") is carried here unchanged.
   * `taskId` must already be on the log — a result for nothing is a typed
   * gap, not a silent no-op.
   */
  function attachResult(log, taskId, result) {
    if (!log.entries.some((e) => e.task_id === taskId)) {
      return { ok: false, refusal: { type: "target_not_found", target: taskId, detail: `"${taskId}" is not on this log — nothing to attach a result to` } };
    }
    return { ok: true, log: taskLog.append(log, { kind: taskLog.ENTRY_KINDS.RESULT, task_id: taskId, result }) };
  }

  /**
   * Fold the log into current acts plus DEF landing status, per the
   * document's load-bearing rule: "a define lands on the record (testimony)
   * only if its evaluate clears; otherwise it lands as paraphrase... or a
   * typed refusal." Matching a define to its evaluate is by shared
   * `object` text — the simplest referent match this pass makes; a real
   * referent index (cast.js's own) is the honest upgrade, named in
   * CLAUDE.md rather than faked here.
   */
  function foldGrid(log) {
    const acts = taskLog.projectTasks(log);
    const defines = acts.filter((t) => t.operator === "DEF").sort((a, b) => a.first_seq - b.first_seq);
    const evaluations = acts.filter((t) => t.operator === "EVA");
    // Group by object so each define's own companion search is bounded by
    // the NEXT define of the same object — otherwise two unrelated claims
    // about the same object ("finding" twice) would both match whichever
    // evaluate came first (a real bug: Array.find always returns the
    // first hit, so a later, corrected evaluate could never be seen and a
    // second define could silently borrow the first define's verdict).
    const byObject = new Map();
    for (const d of defines) {
      const key = (d.object ?? "").toLowerCase();
      if (!byObject.has(key)) byObject.set(key, []);
      byObject.get(key).push(d);
    }
    const landings = defines.map((d) => {
      const key = (d.object ?? "").toLowerCase();
      const nextSiblingSeq = byObject.get(key).find((s) => s.first_seq > d.first_seq)?.first_seq ?? Infinity;
      // Within this define's own window, the LATEST evaluate wins — a
      // correction (re-running evaluate with a new verdict) supersedes an
      // earlier one, matching the append-only "later entries win" rule
      // this log already holds everywhere else (task-log.js's own
      // projectTasks).
      const companion = evaluations
        .filter((e) => (e.object ?? "").toLowerCase() === key && e.first_seq > d.first_seq && e.first_seq < nextSiblingSeq)
        .sort((a, b) => b.first_seq - a.first_seq)[0];
      if (!companion) return { task_id: d.task_id, object: d.object, status: "wish", reason: "no companion evaluate yet — this claim is not testimony" };
      if (companion.verdict === "refused") return { task_id: d.task_id, object: d.object, status: "refused", reason: "the companion evaluate did not clear", evaluatedBy: companion.task_id };
      if (companion.verdict === "holds") return { task_id: d.task_id, object: d.object, status: "testimony", evaluatedBy: companion.task_id };
      return { task_id: d.task_id, object: d.object, status: "wish", reason: "the companion evaluate declared no verdict yet" };
    });
    return {
      acts,
      landings,
      progression: typeof operators.isCurrentOperator === "function" && typeof taskLog.checkCubeProgression === "function"
        ? taskLog.checkCubeProgression(log)
        : [],
    };
  }

  return {
    VERBS,
    TERRAINS,
    STANCE_SHORTHANDS,
    withCapacities,
    parseAct,
    resolveStance,
    land,
    attachResult,
    foldGrid,
    createLog: (opts) => taskLog.createTaskLog(opts),
  };
}

export { flattenTerrains };
