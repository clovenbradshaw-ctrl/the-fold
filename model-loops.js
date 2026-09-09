// model-loops.js — named, savable templates over the live chat turn's
// prompt ingredients (holon.js's draftMaterial/executeMessages assembly,
// holon.js:2143-2210). A model-loop names, per ingredient, whether it is
// included and, optionally, exact text to substitute for its computed
// value — never a second assembly of the prompt, only an adjustment of the
// inputs holon.js already computes and joins the same way it always has.
//
// The default loop's `nodes` map is empty, and applyModelLoop is a no-op
// against it: every ingredient passes through byte-identical to today's
// behavior. That is the one property this file must never break — pinned
// in model-loops.test.mjs.
//
// Scope (v1): the live chat turn's three in-scope branch shapes
// (flat+material, chat+history, chat+bare) plus the resolution block that
// also reaches the decomposed-part EXECUTE branch. Not in scope: the
// PLAN/EXECUTE system prompts used internally during holon's own
// multi-part task decomposition, chatHistory (a message array, not a
// string), and the user's own final message — visible on the canvas,
// never overridable.

export const DEFAULT_MODEL_LOOP = Object.freeze({ id: "default", name: "Default", nodes: {} });

/** SAMPLE_CAPTURE — a representative, entirely made-up turn (not a real
 * message anyone sent) that renders a full canvas — every pipeline-stage
 * node with a plausible computed value, the "How it speaks" ingredient
 * node with real-looking text — without needing a real chat turn (which
 * needs a reachable model) or waiting for one. Shipped from code, loaded
 * on demand via app.js's "sample data" control; loading it calls the exact
 * same captureLastTurn(ingredients, shape, pipeline) a real turn does, so
 * everything downstream (loopGraphFor, previewFor, renderWiringSent) reads
 * it exactly as it would a genuine capture — never a second, parallel
 * rendering path for "fake" data. */
export const SAMPLE_CAPTURE = Object.freeze({
  shape: "chat-history",
  ingredients: Object.freeze({
    s2Frame: "",
    chatSystemPrompt: "You are a careful, plain-spoken assistant. Answer from the material when there is any; say plainly when there isn't, rather than guessing.",
    flatExecuteSystemPrompt: "You are a careful, plain-spoken assistant reading attached material. Answer from it; say plainly when it doesn't say.",
    searchedVoidSuffix: "", notesSuffix: "", priorPassSuffix: "",
    chatContext: "the reader is asking how the Wiring tab's own canvas works",
    resolutionText: "",
  }),
  pipeline: Object.freeze({
    makeRelationReader: true, witnessSentences: true, checkLink: false, webPreflight: false,
    depth: 1, resolutions: 1, material: "auto", passagesPerPart: 3, maxCorrections: 1,
  }),
});

// A node can declare one of two operations on its value, named after the
// operators that already govern this project's own vocabulary for them
// (moves.js / THE-27-CELLS.md) rather than a bespoke "transform" concept:
//   REC (re-zero) — the plain case: an override with no {…} placeholder
//     concedes the computed value wholesale and replaces it outright.
//   SYN (compose) — an override CONTAINING a {…} placeholder composes a
//     new whole from named parts instead: {value} is this node's own raw
//     computed value, {otherKey} is any OTHER ingredient's raw computed
//     value — never another node's own override. That one-hop rule is
//     what makes this real node-to-node wiring rather than a hazard: every
//     reference resolves to an already-known raw value, so a cycle
//     (A composing from B composing from A) is structurally impossible,
//     never merely avoided by convention.
const TEMPLATE_REF_RE = /\{(\w+)\}/g;

/** validateOverride(overrideText) → {ok:true} | {ok:false, illegal:[…]}.
 * `{value}` is always legal (this node's own computed value); any other
 * `{ref}` must name a real ingredient (INGREDIENT_KEYS) — never a
 * pipeline-stage key (a different data structure entirely — see
 * PIPELINE_TOGGLE_KEYS/VALUE_KEYS below) and never a typo. This is the
 * dependency-order legality a SYN composition actually has: the ONLY
 * things a node may legally read are the raw ingredients holon.js already
 * computed before any model-loop ever runs, so there is no ordering to
 * get wrong — only a name to get right. Checked so an illegal reference
 * is a typed refusal, never the silent empty-string it would otherwise
 * resolve to. */
export function validateOverride(overrideText) {
  if (typeof overrideText !== "string" || !overrideText.includes("{")) return { ok: true };
  const refs = [...overrideText.matchAll(TEMPLATE_REF_RE)].map((m) => m[1]);
  const illegal = [...new Set(refs.filter((r) => r !== "value" && !INGREDIENT_KEYS.includes(r)))];
  return illegal.length ? { ok: false, illegal } : { ok: true };
}

/** applyModelLoop(ingredients, loop) → a new ingredients object: a node
 * marked {enabled:false} nulls its value — REC toward absence, dropping
 * it from holon.js's existing `.filter(Boolean).join(...)`. A node
 * carrying a string `override` either replaces the computed value
 * outright (REC) or, if it contains a `{value}`/`{otherKey}` placeholder,
 * composes a new value from named parts (SYN) — see above. An override
 * whose placeholders fail validateOverride is refused WHOLESALE, falling
 * back to the computed value — never a half-substituted string — because
 * a stored loop is not re-validated at every load site (an import, a
 * hand-edited file) and this is the one place that matters. Keys the loop
 * doesn't mention pass through unchanged. */
export function applyModelLoop(ingredients, loop) {
  const nodes = loop?.nodes ?? {};
  const out = { ...ingredients };
  for (const key of Object.keys(nodes)) {
    if (!(key in out)) continue;
    const node = nodes[key];
    if (node?.enabled === false) { out[key] = null; continue; }
    if (typeof node?.override === "string") {
      if (!node.override.includes("{")) { out[key] = node.override; continue; }
      if (!validateOverride(node.override).ok) continue;
      out[key] = node.override.replace(TEMPLATE_REF_RE, (_, ref) => String((ref === "value" ? ingredients[key] : ingredients[ref]) ?? ""));
    }
  }
  return out;
}

let activeModelLoop = DEFAULT_MODEL_LOOP;
export function getActiveModelLoop() { return activeModelLoop; }
export function setActiveModelLoop(loop) { activeModelLoop = loop && typeof loop === "object" ? loop : DEFAULT_MODEL_LOOP; }

let lastCapturedTurn = null;
/** captureLastTurn(rawIngredients, shape, pipelineSnapshot) — stashes the
 * RAW (pre-tuning) ingredients a turn actually computed, plus which
 * branch shape it took, so the canvas can render real values instead of
 * recomputing retrieval/cast/etc. itself. Raw, not tuned: the canvas
 * re-tunes against whichever loop is active NOW (loopGraphFor/previewFor
 * both call applyModelLoop themselves), so switching loops updates the
 * picture without needing another turn. Retrospective otherwise, the same
 * way renderFold already discloses a past turn's sent messages.
 *
 * `pipelineSnapshot` (v2, optional) is what actually ran this part for
 * the toggle/value keys holon.js's own runPart has in scope
 * (makeRelationReader, witnessSentences, checkLink, resolutions,
 * material, passagesPerPart, maxCorrections) — a key it omits (depth,
 * webPreflight: decided before holon.js is ever reached) is disclosed as
 * unset, never guessed at. */
export function captureLastTurn(rawIngredients, shape, pipelineSnapshot = null) {
  lastCapturedTurn = { ingredients: { ...rawIngredients }, shape, pipeline: pipelineSnapshot ? { ...pipelineSnapshot } : null, at: Date.now() };
}
export function getLastCapturedTurn() { return lastCapturedTurn; }

export const DRAFT_MATERIAL_KEYS = Object.freeze([
  "comparisonLine", "declaredLine", "aboutLine", "recalledLine", "snipPrefix",
  "premiseBlock", "dialogueBlock", "learnedBlock", "factBlockText", "ledgerBlock", "rawSource",
]);

// ── ingredient order (v2) ────────────────────────────────────────────────────
//
// Off limits vs tunable, stated once so it does not get re-litigated per
// feature: WHICH stages run and in what SEQUENCE relative to each other
// (retrieve → check premises → draft → correct → witness) is the
// perception engine's own math — this repo's history is an extended record
// of correctness bugs from getting that order wrong (P23 "checked before
// generation, not after," P59, the void loop's own DEF→EVA→REC). None of
// that is exposed here, on purpose, and PIPELINE_TOGGLE_KEYS/VALUE_KEYS
// above only ever turn an already-optional organ on/off or set its budget
// — never reorder it relative to another stage.
//
// The join ORDER of draftMaterial's own blocks is different: verified
// against holon.js directly (every downstream reader takes the joined
// string wholesale — buildExecutePrompt, the system-message template — and
// nothing slices it by position), so which block's text reads first is
// pure presentation, with no correctness dependency to break. That is the
// one part of this assembly genuinely safe to make user-orderable.

/** orderedDraftMaterialKeys(loop) → DRAFT_MATERIAL_KEYS, permuted per
 * `loop.ingredientOrder` when it is a genuine permutation of the exact
 * same set (every key present exactly once) — never a partial list that
 * would silently drop a block, never a foreign key. An invalid or absent
 * order falls back to the natural order rather than throwing. */
export function orderedDraftMaterialKeys(loop) {
  const order = loop?.ingredientOrder;
  if (!Array.isArray(order) || order.length !== DRAFT_MATERIAL_KEYS.length) return DRAFT_MATERIAL_KEYS;
  const isPermutation = new Set(order).size === order.length && DRAFT_MATERIAL_KEYS.every((k) => order.includes(k));
  return isPermutation ? order : DRAFT_MATERIAL_KEYS;
}

/** joinDraftMaterial(tunedIngredients, loop) → holon.js's own draftMaterial
 * string, in the loop's chosen block order (natural order by default) —
 * the exact same `.filter(Boolean).join("\n\n")` holon.js always did,
 * over a reorderable key list instead of a hardcoded array literal. */
export function joinDraftMaterial(tunedIngredients, loop) {
  return orderedDraftMaterialKeys(loop).map((k) => tunedIngredients[k]).filter(Boolean).join("\n\n");
}

export const INGREDIENT_KEYS = Object.freeze([
  ...DRAFT_MATERIAL_KEYS,
  "resolutionText",
  "s2Frame", "flatExecuteSystemPrompt", "chatSystemPrompt",
  "shapeSuffix", "notesSuffix", "priorPassSuffix", "searchedVoidSuffix", "chatContext",
]);

// Which ingredients actually reach the prompt for each of the three
// in-scope branch shapes (holon.js's own four-way branch on
// passages.length / flat / chatHistory.length) — a node not in this list
// for the captured turn's shape never had a chance to matter this turn.
const SHAPE_KEYS = Object.freeze({
  "flat-material": Object.freeze([
    "s2Frame", "flatExecuteSystemPrompt", "shapeSuffix", "notesSuffix", "priorPassSuffix",
    ...DRAFT_MATERIAL_KEYS, "chatContext", "resolutionText",
  ]),
  "chat-history": Object.freeze([
    "s2Frame", "chatSystemPrompt", "searchedVoidSuffix", "notesSuffix", "priorPassSuffix",
    "chatContext", "ledgerBlock", "resolutionText",
  ]),
  "chat-bare": Object.freeze([
    "s2Frame", "chatSystemPrompt", "searchedVoidSuffix", "notesSuffix", "priorPassSuffix", "ledgerBlock",
  ]),
  "execute-part": Object.freeze(["resolutionText"]),
});

function nodeState(key, loop) {
  const node = loop?.nodes?.[key];
  if (node?.enabled === false) return "off";
  if (typeof node?.override === "string") return "overridden";
  return null;
}

function pipelineNodeState(key, loop) {
  const node = loop?.pipelineOptions?.[key];
  if (typeof node?.enabled === "boolean") return node.enabled ? "overridden" : "off";
  if (node && "value" in node) return "overridden";
  return null;
}

const UNSET = "not disclosed this turn";
function pipelineMeta(key, tunedValue) {
  const meta = PIPELINE_STAGE_META[key];
  if (meta.kind === "pipeline-toggle") return tunedValue === true ? "on" : tunedValue === false ? "off" : UNSET;
  return tunedValue === null || tunedValue === undefined ? UNSET : String(tunedValue);
}

const previewOf = (value) => (value ? `${String(value).length} chars` : "empty");

// Only these two of the eleven draftMaterial/system-prompt ingredients are
// safe for a user to hand-edit without risking the answer's own
// correctness — both are pure PERSONA/TONE text the model reads regardless
// of content ("how it speaks"). The other nine are the checking apparatus's
// own inputs or outputs (retrieved bytes, the corroboration ledger,
// checked-claim text, the premise verdict, durable corrections) — a
// hand-typed override there would inject a false premise or a fake
// "corroboration" the rest of the pipeline would then trust as real.
// Pruned from the canvas for that reason (user direction, 2026-09-08:
// "only keep the nodes that are meaningful for a user to adjust without
// breaking the response"). `applyModelLoop` itself is untouched — a loop
// saved or imported before this prune that still names one of the nine
// keeps applying exactly as before; only the CANVAS stopped offering them.
const SAFE_INGREDIENT_META = Object.freeze({
  chatSystemPrompt: { title: "How it speaks", hint: "The instructions that set the model's tone and personality for an ordinary chat reply." },
  flatExecuteSystemPrompt: { title: "How it speaks (with material)", hint: "The instructions that set the model's tone and personality when it's answering from attached material." },
});

/** loopGraphFor(capturedTurn, loop) → {nodes, edges} in the shape
 * holograph-graph.js's place()/draw() already expect: one node per
 * ingredient the captured turn's shape actually used, re-tuned against
 * `loop` right now (never against whichever loop was active when the
 * turn actually ran), plus the assembled system/user/sent nodes every
 * shape feeds into. Each ingredient node's `row` carries both `computed`
 * (what the mechanism produced, read-only) and `tuned` (what `loop`
 * would substitute) so the drawer can show both. `state` is
 * "off"/"overridden" per the active loop, drawn via the same
 * `hg-state-${state}` CSS hook draw() already emits — no change needed
 * there. */
export function loopGraphFor(capturedTurn, loop = DEFAULT_MODEL_LOOP) {
  if (!capturedTurn) return { nodes: [], edges: [] };
  const tuned = applyModelLoop(capturedTurn.ingredients, loop);
  const keys = SHAPE_KEYS[capturedTurn.shape] ?? INGREDIENT_KEYS;
  const nodes = [];
  const edges = [];
  // Pipeline-stage nodes (v2): which STAGES ran, not what text they
  // produced.
  const snapshot = capturedTurn.pipeline ?? {};
  for (const key of [...PIPELINE_TOGGLE_KEYS, ...PIPELINE_VALUE_KEYS]) {
    const meta = PIPELINE_STAGE_META[key];
    const fallback = key in snapshot ? snapshot[key] : undefined;
    const computed = fallback === undefined ? null : fallback;
    const tunedValue = meta.kind === "pipeline-toggle" ? pipelineToggle(loop, key, fallback) : pipelineValue(loop, key, fallback);
    nodes.push({
      key,
      title: meta.title,
      hint: meta.hint,
      meta: pipelineMeta(key, tunedValue),
      kind: meta.kind,
      state: pipelineNodeState(key, loop),
      drill: true,
      row: { key, computed, tuned: tunedValue, stageKind: meta.kind, domain: meta.domain, hint: meta.hint },
    });
  }
  for (const key of keys) {
    if (!(key in SAFE_INGREDIENT_META)) continue;
    const computed = capturedTurn.ingredients?.[key] ?? null;
    const tunedValue = tuned[key] ?? null;
    const ingredientMeta = SAFE_INGREDIENT_META[key];
    nodes.push({
      key,
      title: ingredientMeta.title,
      hint: ingredientMeta.hint,
      meta: previewOf(tunedValue),
      kind: "ingredient",
      state: nodeState(key, loop),
      drill: true,
      row: { key, computed, tuned: tunedValue, hint: ingredientMeta.hint },
    });
  }
  // The prior-turns/system-message/user-message/sent-to-model nodes this
  // canvas used to carry were dropped outright (not merely hidden) — user
  // direction, verbatim: "if we can't adjust a parameter, it probably
  // shouldn't be there." Every one of the four was `readOnly: true` (no
  // enable/override field existed on any of them), and the assembled
  // system/sent text they showed is already the EXACT thing
  // renderWiringSent's own "Sent to model" disclosure below the canvas
  // shows — so removing them loses no information, only the four
  // dead-end clicks. Only genuinely adjustable nodes reach the canvas now.
  return { nodes, edges };
}

// ── pipeline-stage options (v2) ─────────────────────────────────────────────
//
// The ingredient nodes above tune the VALUES that flow into a fixed set of
// prompt slots. These tune which STAGES of the pipeline run at all — real,
// already-implemented options runHolonicTask's own call site (app.js) already
// passes, exactly the way `state.grounded ? relationsFor : null` already
// gates the relation tier. Nothing here is new holon.js logic: only new
// callers of options that already exist.
//
// Four of these already have a header control (checking mode, the web
// toggle, the depth slider) — for those, a loop's setting is a MIRROR of
// that same underlying flag (pipelineToggle's `fallback` argument is what
// the caller already computed from it), never a second independent boolean
// that could drift from the header. Absent from `pipelineOptions` inherits
// the fallback unchanged — the same no-op guarantee applyModelLoop already
// holds for ingredients.

// The three organ toggles that are literal fields of runHolonicTask's own
// options object (applyModelLoopOptions writes these). "webPreflight" gates
// a DIFFERENT, earlier call (gatherPreflightMaterial, before runHolonicTask
// is ever reached) and is read via pipelineToggle at that call site instead.
const ORGAN_OPTION_KEYS = Object.freeze(["makeRelationReader", "witnessSentences", "checkLink"]);
export const PIPELINE_TOGGLE_KEYS = Object.freeze([...ORGAN_OPTION_KEYS, "webPreflight"]);
export const PIPELINE_VALUE_KEYS = Object.freeze(["depth", "maxCorrections", "resolutions", "material", "passagesPerPart"]);

// Titles, hints, and domains for the drawer and the canvas — never
// consulted by applyModelLoop/applyModelLoopOptions themselves, display
// metadata only. `hint` is a plain-English, one-sentence answer to "what
// does touching this actually change" — caught live (user, 2026-09-09,
// looking at the real drawer: "i still dont get what any of these do
// almost") that a jargon title ("Relation/checking tier") plus an
// implementation-internals label ("setting — inherit follows the
// header's own control, never a second flag") explains this file's own
// mechanism, never the reader's actual question. Titles renamed to plain
// action phrases for the same reason; nothing here is an identifier —
// every real caller keys off the object's KEY (makeRelationReader,
// depth, …), never `.title` (checked before renaming).
export const PIPELINE_STAGE_META = Object.freeze({
  makeRelationReader: {
    title: "Check claims against your material", kind: "pipeline-toggle",
    hint: "Compares what the answer says to anything you attached, and flags claims that aren't backed up.",
  },
  witnessSentences: {
    title: "Double-check each sentence", kind: "pipeline-toggle",
    hint: "Asks the model to re-verify individual sentences of its own answer against the material, as an extra pass.",
  },
  checkLink: {
    title: "Verify links before showing them", kind: "pipeline-toggle",
    hint: "Makes sure a web link the answer cites actually resolves, and removes it if it doesn't.",
  },
  webPreflight: {
    title: "Search the web before answering", kind: "pipeline-toggle",
    hint: "Runs a web search first, before drafting an answer, when nothing relevant is attached.",
  },
  depth: {
    title: "Effort level", kind: "pipeline-value", domain: [0, 1, 2, 3],
    hint: "How many passes the model takes before answering. Higher takes longer but can be more thorough. 0 is fastest.",
  },
  resolutions: {
    title: "How much conversation to carry in", kind: "pipeline-value", domain: [0, 1, 2, 3],
    hint: "How much of the conversation so far gets folded into this one answer. Higher remembers more.",
  },
  material: {
    title: "How your files get read", kind: "pipeline-value", domain: ["auto", "passages", "snips"],
    hint: "Whether attached material is read as short excerpts, full passages, or left for the app to decide (auto).",
  },
  maxCorrections: {
    title: "Rewrite attempts", kind: "pipeline-value", domain: "number",
    hint: "How many times the model can revise its own answer if a check finds a problem with it.",
  },
  passagesPerPart: {
    title: "Excerpts pulled in at once", kind: "pipeline-value", domain: "number",
    hint: "How many chunks of your attached material get read at a time while answering.",
  },
});

/** pipelineToggle(loop, key, fallback) → true/false. An explicit
 * {enabled} in the active loop's pipelineOptions wins; absence inherits
 * `fallback` — whatever the caller already computed (state.grounded,
 * state.webProof, …) — unchanged. */
export function pipelineToggle(loop, key, fallback) {
  const node = loop?.pipelineOptions?.[key];
  return typeof node?.enabled === "boolean" ? node.enabled : fallback;
}

/** pipelineValue(loop, key, fallback) → the loop's explicit value for a
 * value-knob key, or `fallback` unchanged when the loop doesn't set one. */
export function pipelineValue(loop, key, fallback) {
  const node = loop?.pipelineOptions?.[key];
  return node && "value" in node ? node.value : fallback;
}

/** applyModelLoopOptions(options, loop, {organsWhenOn}) → a new options
 * object for runHolonicTask's own call. `organsWhenOn` is a small,
 * caller-supplied map ({makeRelationReader: relationsFor, …}) so this
 * module never needs to hold a real, non-serializable organ reference:
 * forcing a toggle ON substitutes the real function named there, forcing
 * it OFF substitutes null, and a key the loop doesn't mention passes
 * through exactly what `options` already held (i.e. whatever the caller
 * already computed from state.grounded/state.webProof/the depth slider). */
export function applyModelLoopOptions(options, loop, { organsWhenOn = {} } = {}) {
  const out = { ...options };
  for (const key of ORGAN_OPTION_KEYS) {
    const node = loop?.pipelineOptions?.[key];
    if (typeof node?.enabled !== "boolean") continue;
    out[key] = node.enabled ? (organsWhenOn[key] ?? out[key] ?? null) : null;
  }
  for (const key of PIPELINE_VALUE_KEYS) {
    const node = loop?.pipelineOptions?.[key];
    if (node && "value" in node) out[key] = node.value;
  }
  return out;
}

/** previewFor(capturedTurn, loop) → {shape, parts: [{key, value}]} — the
 * tuned ingredients that would feed this shape's system message, in the
 * order they'd be joined, non-empty only. Not a byte-exact reconstruction
 * of holon.js's own template-string interpolation (that stays the one
 * place the real join happens) — an honest, ordered list of what a saved
 * loop's toggles/overrides would hand the mechanism next turn. */
export function previewFor(capturedTurn, loop = DEFAULT_MODEL_LOOP) {
  if (!capturedTurn) return null;
  const tuned = applyModelLoop(capturedTurn.ingredients, loop);
  const keys = SHAPE_KEYS[capturedTurn.shape] ?? INGREDIENT_KEYS;
  const parts = keys.map((key) => ({ key, value: tuned[key] ?? null })).filter((p) => p.value);
  return { shape: capturedTurn.shape, parts };
}

// ── JSON export/import (v2) ─────────────────────────────────────────────────
//
// Export is just the loop's own saved shape, verbatim — nothing to build.
// Import needs a shape check import-time callers don't otherwise get:
// applyModelLoop/applyModelLoopOptions already refuse an illegal reference
// or unknown pipeline key at USE time (falling back to the computed value,
// never a half-substituted string), but that per-field fallback would let a
// foreign or hand-edited file land as a loop that silently does less than
// it claims to. validateModelLoopImport is the whole-file check: a
// malformed shape or an unknown-keyed field is a typed refusal, never a
// silently partial import.
const PIPELINE_OPTION_KEYS = Object.freeze([...PIPELINE_TOGGLE_KEYS, ...PIPELINE_VALUE_KEYS]);

/** validateModelLoopImport(data) → {ok:true, loop} | {ok:false, reason}.
 * `data` is whatever JSON.parse produced from an uploaded file — untyped,
 * possibly not even an object. `loop` on success is {name, nodes,
 * pipelineOptions, ingredientOrder}, ready to hand to the same
 * POST /api/model-loops route "+ New" already uses (the server derives its
 * own id from the name; nothing here mints one). */
export function validateModelLoopImport(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, reason: "not a JSON object" };
  if (typeof data.name !== "string" || !data.name.trim()) return { ok: false, reason: "missing a name (string)" };

  const nodes = data.nodes ?? {};
  if (typeof nodes !== "object" || Array.isArray(nodes)) return { ok: false, reason: "nodes is not an object" };
  for (const [key, node] of Object.entries(nodes)) {
    if (!INGREDIENT_KEYS.includes(key)) return { ok: false, reason: `unknown ingredient key: ${key}` };
    if (node !== null && typeof node === "object") {
      const illegalField = Object.keys(node).find((f) => f !== "enabled" && f !== "override");
      if (illegalField) return { ok: false, reason: `unknown field on ${key}: ${illegalField}` };
    }
  }

  const pipelineOptions = data.pipelineOptions ?? {};
  if (typeof pipelineOptions !== "object" || Array.isArray(pipelineOptions)) return { ok: false, reason: "pipelineOptions is not an object" };
  const unknownPipelineKey = Object.keys(pipelineOptions).find((k) => !PIPELINE_OPTION_KEYS.includes(k));
  if (unknownPipelineKey) return { ok: false, reason: `unknown pipeline key: ${unknownPipelineKey}` };

  let ingredientOrder;
  if (data.ingredientOrder !== undefined) {
    if (!Array.isArray(data.ingredientOrder) || !data.ingredientOrder.every((k) => typeof k === "string")) {
      return { ok: false, reason: "ingredientOrder is not an array of strings" };
    }
    ingredientOrder = data.ingredientOrder;
  }

  return { ok: true, loop: { name: data.name.trim(), nodes, pipelineOptions, ingredientOrder } };
}
