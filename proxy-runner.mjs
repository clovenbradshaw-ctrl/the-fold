// proxy-runner.mjs — the fold's own turn pipeline, invoked headlessly for
// the model-proxy endpoints. proxy-api.js owns the wire shapes and touches
// no engine code; this file owns the two things a pure module may not:
// the engine imports (cast.js/hypergraph.js's organ bundles, the exact
// ones app.js wires — see app.js:208-259) and the network call to Ollama.
//
// Same shape as eval/dialogue.mjs's own header claim ("the exact turn
// app.js runs, headless — the pure modules ARE the app"), except this
// calls holon.js's REAL runHolonicTask/runPart directly rather than
// dialogue.mjs's simplified reimplementation of a flat turn — dialogue.mjs
// was built to measure the fold at conversation length cheaply; this proxy
// exists BECAUSE the full pipeline (plan gate, quote tier, relation tier,
// correction loop) was the explicit ask, so it goes to the real thing.
//
// Disclosed scope for this pass (CLAUDE.md, "the model proxy" carries the
// map): no material/attachments (chunks: [] — an OpenAI-shaped request has
// no composer to attach a file to); no link tier (checkLink: null — P13's
// web egress needs its own consent posture, never silently granted to
// every proxied call); no per-conversation running summary or warrant
// record — the wire protocol already resends the full message history on
// every call, so each turn folds fresh (foldedRefs: [], discourse built
// only from any system message in THIS request) rather than pretending to
// a persistent session the protocol does not carry.

import { runHolonicTask, needsDecomposition } from "./holon.js";
import { makeCastResolver } from "./cast.js";
import { makeRelationReader } from "./hypergraph.js";
import { tokenize } from "./source.js";
import { splitSentences as engineSentences } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js";

// Overridable so a Node test or a non-default Ollama install is not stuck
// on localhost:11434 — every other Ollama call site in this repo (app.js,
// eval/*.mjs) hardcodes it, but those all run IN the browser or as a
// one-shot script; this one is a long-lived server process, so the escape
// hatch costs nothing and helps a real deploy.
export const OLLAMA = process.env.FOLD_OLLAMA_URL ?? "http://localhost:11434";

// The identical organ bundle app.js builds at app.js:208-259, so cast
// resolution and relation reading behave identically whether a passage was
// checked from the browser or from this proxy — one implementation of
// "the same name" and "the material's own edges," not a second one grown
// here that could quietly drift from the browser's.
const castFor = makeCastResolver({ splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const relationsFor = makeRelationReader({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  discoverRelationVocab,
  extractRelations,
  tokenize,
});

/** Ollama's own /api/tags, unprefixed — proxy-api.js's reprefixOllamaTags
 * does the renaming; this function only ever reads real state, never a
 * cached or hand-maintained list, so a servable model is one Ollama
 * actually has pulled. */
export async function offeredOllamaModels() {
  const res = await fetch(`${OLLAMA}/api/tags`);
  if (!res.ok) throw new Error(`ollama /api/tags: ${res.status}`);
  return res.json();
}

// dialogue.mjs's own ANSWER_MAX_TOKENS, reused rather than a second number
// picked for this pass — not tuned against anything, just the fold's
// standing per-call budget.
const CALL_MAX_TOKENS = 512;
const CALL_RETRIES = 2;

/** One Ollama /api/chat call, fixed to `model` — matches holon.js's
 * expected `call(messages, {maxTokens, json})` shape exactly (eval/
 * dialogue.mjs:107-128's own pattern, one retry, a typed failure on the
 * second). `usage` is a shared accumulator object so the turn's real
 * token cost is measured from Ollama's own counters across every call the
 * turn makes (plan, each part, each correction) — CLAUDE.md's "turn cost
 * is measured, never estimated," applied here as it already is in app.js. */
function makeOllamaCall(model, usage) {
  return async function call(messages, { maxTokens, json } = {}) {
    for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
      try {
        const res = await fetch(`${OLLAMA}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            ...(json ? { format: json === true ? "json" : json } : {}),
            options: { num_predict: maxTokens ?? CALL_MAX_TOKENS },
          }),
        });
        if (!res.ok) throw new Error(`ollama ${res.status}`);
        const data = await res.json();
        usage.promptTokens += data.prompt_eval_count ?? 0;
        usage.completionTokens += data.eval_count ?? 0;
        return data.message?.content ?? "";
      } catch (err) {
        if (attempt === CALL_RETRIES - 1) throw err;
      }
    }
  };
}

/**
 * One turn, end to end: the mechanical decomposition gate, then holon.js's
 * real pipeline. `model` is a bare Ollama name (proxy-api.js already
 * stripped the fold: prefix) and every call this turn makes spends exactly
 * that model — never a routing-ladder substitution. app.js's own
 * model-routing.js exists because a person picks once per session and the
 * fold then protects the small model's context on their behalf; an
 * OpenAI-shaped caller instead names a model explicitly on every single
 * request, which already IS the routing decision, made per call rather
 * than per session — spending a different model underneath that choice
 * would make "which model actually answered" a guess.
 */
export async function runProxyTurn({ model, task, chatHistory = [], discourse = "", grounded = true }) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  const call = makeOllamaCall(model, usage);
  const planMode = needsDecomposition(task) ? "model" : "flat";
  const result = await runHolonicTask({
    task,
    chunks: [],
    call,
    foldedRefs: [],
    makeNameResolver: castFor,
    // Off means not computed, not computed-and-hidden (app.js:2570's own
    // rule for state.grounded, applied here to the request's own
    // fold_grounded flag).
    makeRelationReader: grounded ? relationsFor : null,
    checkLink: null,
    planMode,
    chatHistory,
    discourse,
  });
  return {
    text: result.output,
    refs: result.refs,
    unsupported: result.unsupported,
    unbacked: result.unbacked,
    open: result.open,
    channels: result.channels,
    planMode,
    parts: result.plan.parts.length,
    usage,
  };
}
