// proxy-api.js — the fold as a servable model, wire-shape half. Pure: no
// fetch, no node:*, no engine import — proxy-runner.mjs owns the model
// calls and the holon.js pipeline; this file owns only translating a
// request into one turn shape and a completed turn back into either wire
// format, streamed or not.
//
// The one rule enforced here, not negotiable: every servable model id is
// PREFIX-marked (`fold:<real ollama model>`), never a bare Ollama name. A
// client naming a bare model ("gemma2:2b") is asking Ollama itself, not
// the fold — collapsing the two would make "did this answer go through
// the grounded pipeline or not" a guess, which is exactly the kind of
// silent conflation this repo's grounding ladder exists to refuse
// elsewhere (CLAUDE.md: "an organ may say I have nothing to compare this
// against, or I compared it and it failed — never manufacture the second
// out of the first"; the model-identity version of that rule is: never
// answer AS the fold on a request that did not ask for the fold).

export const MODEL_PREFIX = "fold:";

export function prefixModel(name) {
  return `${MODEL_PREFIX}${name}`;
}

/** The fold: prefix stripped, or null when the id doesn't carry one — a
 * typed refusal for the caller to act on, never a silent fallback to the
 * bare name underneath. */
export function stripModelPrefix(id) {
  const s = String(id ?? "");
  return s.startsWith(MODEL_PREFIX) ? s.slice(MODEL_PREFIX.length) : null;
}

// app.js's own discourseLine cap (CLAUDE.md, "System 1's own ground"),
// reused rather than a second number invented here for the same idea: one
// line of context, not the carried block.
export const DISCOURSE_MAX_CHARS = 300;

/**
 * An OpenAI- or Ollama-shaped `messages` array (both use the identical
 * `{role, content}` shape) into one turn: the last message must be the
 * question (`task`); everything before it that is user/assistant becomes
 * verbatim `chatHistory` (holon.js's own shape, CLAUDE.md's "runPart takes
 * a flat flag" amendment); any `system` message content folds into
 * `discourse`, the one-line context runHolonicTask already accepts for a
 * flat turn. A role this turn shape has no place for (tool/function calls,
 * multi-turn agent scaffolding) is dropped, and named as dropped rather
 * than silently absorbed — a caller building on this proxy needs to know
 * its own tool-call turns are not reaching the model this way yet.
 */
export function turnFromMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) return { error: "messages must be a non-empty array" };
  const last = list[list.length - 1];
  if (!last || last.role !== "user")
    return { error: 'the last message must have role "user" — the fold answers a question, it does not continue an assistant turn' };
  const task = String(last.content ?? "").trim();
  if (!task) return { error: "the last user message has no content" };
  const rest = list.slice(0, -1);
  const chatHistory = rest
    .filter((m) => m?.role === "user" || m?.role === "assistant")
    .map((m) => ({ role: m.role, content: String(m.content ?? "") }));
  const discourse = rest
    .filter((m) => m?.role === "system")
    .map((m) => String(m.content ?? ""))
    .join(" ")
    .trim()
    .slice(0, DISCOURSE_MAX_CHARS);
  const droppedRoles = [...new Set(rest.filter((m) => !["user", "assistant", "system"].includes(m?.role)).map((m) => m.role))];
  return { task, chatHistory, discourse, droppedRoles };
}

/**
 * The one parse both wire protocols share (OpenAI's POST /v1/chat/completions
 * body and Ollama's POST /api/chat body are the identical
 * `{model, messages, stream}` shape). `fold_grounded: false` is the one
 * escape hatch from the standing default — full pipeline, relation tier
 * included — because the relation tier is the ladder's most expensive tier
 * and a caller doing high-volume plain chat may reasonably want it off; the
 * default stays the full pipeline (the decision this proxy exists to keep).
 */
export function parseProxyRequest(body) {
  const model = stripModelPrefix(body?.model);
  if (!model)
    return {
      error: `model must be a fold-prefixed id, e.g. "${prefixModel("gemma2:2b")}" — got ${JSON.stringify(body?.model ?? null)}`,
    };
  const turn = turnFromMessages(body?.messages);
  if (turn.error) return { error: turn.error };
  const stream = Boolean(body?.stream);
  const grounded = body?.fold_grounded !== false;
  return { model, ...turn, stream, grounded };
}

// ── model listing, both wire shapes ─────────────────────────────────────────
// Both readers list REAL Ollama models (proxy-runner.mjs fetches Ollama's
// own /api/tags), reprefixed — never a hand-maintained second list that
// could name a model Ollama does not actually have loaded.

export function toOpenAIModelList(realNames, { createdAt = 0 } = {}) {
  return {
    object: "list",
    data: realNames.map((name) => ({ id: prefixModel(name), object: "model", created: createdAt, owned_by: "the-fold" })),
  };
}

/** Ollama's own /api/tags response, reprefixed field-for-field — size,
 * digest, modified_at, details all carried through unchanged, because
 * they describe the real underlying blob and stay true under the prefix. */
export function reprefixOllamaTags(realTagsJson) {
  const models = Array.isArray(realTagsJson?.models) ? realTagsJson.models : [];
  return {
    models: models.map((m) => ({ ...m, name: prefixModel(m.name ?? m.model ?? ""), model: prefixModel(m.model ?? m.name ?? "") })),
  };
}

// ── response shaping, OpenAI wire ───────────────────────────────────────────
// `fold` rides as an extra top-level key on the completion object and on the
// stream's closing chunk — non-standard, ignored by any client that only
// reads the OpenAI-defined fields, and the only place the ladder's real
// findings (refs/unsupported/unbacked/open/channels) can travel without
// smearing them into the answer text itself.

export function openAIResponse({ id, model, text, created, usage, fold }) {
  return {
    id,
    object: "chat.completion",
    created,
    model,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: usage?.promptTokens ?? 0,
      completion_tokens: usage?.completionTokens ?? 0,
      total_tokens: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
    },
    fold,
  };
}

/**
 * Single-shot streaming, disclosed as exactly that (CLAUDE.md, "the model
 * proxy"): one content chunk carrying the whole finished answer, then a
 * stop chunk, then [DONE]. Real token-level streaming would mean showing
 * text before the correction loop and the relation/quote tiers have run
 * against it — i.e. showing a draft the ladder has not yet checked, which
 * is the one thing this instrument's whole grounding apparatus exists to
 * not do. A client that only needs valid SSE framing (most do) sees no
 * difference from a token-streamed answer; one that renders deltas live
 * sees the answer arrive as a single burst rather than word by word.
 */
export function openAIStreamLines({ id, model, text, created, fold }) {
  const base = { id, object: "chat.completion.chunk", created, model };
  return [
    `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], fold })}\n\n`,
    "data: [DONE]\n\n",
  ];
}

// ── response shaping, Ollama-native wire ────────────────────────────────────

export function ollamaChatResponse({ model, text, createdAt, usage, fold }) {
  return {
    model,
    created_at: createdAt,
    message: { role: "assistant", content: text },
    done: true,
    done_reason: "stop",
    prompt_eval_count: usage?.promptTokens ?? 0,
    eval_count: usage?.completionTokens ?? 0,
    fold,
  };
}

/** Same single-shot disclosure as openAIStreamLines: one NDJSON line
 * carrying the whole answer with done:false, one closing line with
 * done:true — valid Ollama streaming framing, not token-level delivery. */
export function ollamaChatStreamLines({ model, text, createdAt, usage, fold }) {
  return [
    JSON.stringify({ model, created_at: createdAt, message: { role: "assistant", content: text }, done: false }) + "\n",
    JSON.stringify({
      model,
      created_at: createdAt,
      message: { role: "assistant", content: "" },
      done: true,
      done_reason: "stop",
      prompt_eval_count: usage?.promptTokens ?? 0,
      eval_count: usage?.completionTokens ?? 0,
      fold,
    }) + "\n",
  ];
}
