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

/** applyModelLoop(ingredients, loop) → a new ingredients object: a node
 * marked {enabled:false} nulls its value (so it drops out of holon.js's
 * existing `.filter(Boolean).join(...)`), a node carrying a string
 * `override` replaces the computed value outright. Keys the loop doesn't
 * mention pass through unchanged. */
export function applyModelLoop(ingredients, loop) {
  const nodes = loop?.nodes ?? {};
  const out = { ...ingredients };
  for (const key of Object.keys(nodes)) {
    if (!(key in out)) continue;
    const node = nodes[key];
    if (node?.enabled === false) { out[key] = null; continue; }
    if (typeof node?.override === "string") out[key] = node.override;
  }
  return out;
}

let activeModelLoop = DEFAULT_MODEL_LOOP;
export function getActiveModelLoop() { return activeModelLoop; }
export function setActiveModelLoop(loop) { activeModelLoop = loop && typeof loop === "object" ? loop : DEFAULT_MODEL_LOOP; }

let lastCapturedTurn = null;
/** captureLastTurn(rawIngredients, shape) — stashes the RAW (pre-tuning)
 * ingredients a turn actually computed, plus which branch shape it took,
 * so the canvas can render real values instead of recomputing
 * retrieval/cast/etc. itself. Raw, not tuned: the canvas re-tunes against
 * whichever loop is active NOW (loopGraphFor/previewFor both call
 * applyModelLoop themselves), so switching loops updates the picture
 * without needing another turn. Retrospective otherwise, the same way
 * renderFold already discloses a past turn's sent messages. */
export function captureLastTurn(rawIngredients, shape) {
  lastCapturedTurn = { ingredients: { ...rawIngredients }, shape, at: Date.now() };
}
export function getLastCapturedTurn() { return lastCapturedTurn; }

const DRAFT_MATERIAL_KEYS = [
  "comparisonLine", "declaredLine", "aboutLine", "recalledLine", "snipPrefix",
  "premiseBlock", "dialogueBlock", "learnedBlock", "factBlockText", "ledgerBlock", "rawSource",
];

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

const previewOf = (value) => (value ? `${String(value).length} chars` : "empty");

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
  for (const key of keys) {
    const computed = capturedTurn.ingredients?.[key] ?? null;
    const tunedValue = tuned[key] ?? null;
    nodes.push({
      key,
      title: key,
      meta: previewOf(tunedValue),
      kind: "ingredient",
      state: nodeState(key, loop),
      drill: true,
      row: { key, computed, tuned: tunedValue },
    });
    edges.push({ from: key, to: "system", part: true });
  }
  if (capturedTurn.shape === "chat-history") {
    nodes.push({ key: "history", title: "Prior turns", meta: "read-only", kind: "fixed", drill: false, row: null });
    edges.push({ from: "history", to: "sent" });
  }
  nodes.push({ key: "system", title: "System message", kind: "assembled", drill: false, row: null });
  nodes.push({ key: "user", title: "User message", meta: "read-only", kind: "fixed", drill: false, row: null });
  nodes.push({ key: "sent", title: "Sent to model", kind: "sent", drill: false, row: null });
  edges.push({ from: "system", to: "sent" });
  edges.push({ from: "user", to: "sent" });
  return { nodes, edges };
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
