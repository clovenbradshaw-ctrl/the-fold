// er7-client.js — the fold's thin HTTP client onto eoreader7's proxy engine.
//
// ONE-ENGINE-PLAN: the TUI and the proxy already share one engine
// (proxy-runner.mjs::runProxyTurn); this module is the browser half of that
// same seam — the ONE place the fold's chat talks to the engine. It is a
// thin client, deliberately: it reimplements no turn logic (no retrieval, no
// correction loop, no checks — the engine owns all of it) and it never
// reimplements the wire shape the TUI already speaks. The proxy's
// `/v1/chat/completions` returns the FULL reading (charter, pii, injection,
// the per-sentence reading surface, the answer record), which is what the
// fold's render layer draws.
//
// Browser-safe: `fetch` only, no Node imports, no filesystem. Heavier model
// management stays on the engine's side — this client sends the question and
// the attached material, and receives the engine's own answer and reading.
//
// A BUSY BOX IS A TYPED 429, NEVER A HANG: heimdall's admission gate refuses
// with `{type: "saturated"|"lane_full", retry_after}` and a Retry-After
// header. This client honors that contract (bounded backoff, exactly the
// TUI's proxy-client.mjs does), so the fold's chat never silently wedges on
// a momentarily busy engine.

const ER7_PORT = 11436;
const BASE = `http://127.0.0.1:${ER7_PORT}`;
const MODEL_PREFIX = "er7:";
const RETRYABLE_TYPES = new Set(["saturated", "lane_full"]);
const MAX_RETRIES = 5;

/** Is the engine reachable right now? A health probe, never a full turn. */
export async function er7Reachable({ timeoutMs = 1500 } = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/** Strip the er7: prefix (a bare real-model id is what the engine expects upstream). */
export function stripEr7Prefix(modelId) {
  return modelId?.startsWith(MODEL_PREFIX) ? modelId.slice(MODEL_PREFIX.length) : modelId;
}

/**
 * POST /v1/chat/completions, non-streaming (the same single-shot posture the
 * TUI's proxy-client.mjs documents: a draft must never be shown before the
 * engine's reading has run against it).
 *
 * `attachments` — [{name, text}] — is the browser's material: pasted/dropped
 * sources ride the request BODY (the ONE-ENGINE-PLAN's material-intake port),
 * admitted into the session corpus on the engine's side, no disk path needed.
 *
 * Returns `{ text, reading, sessionId }` — the answer, the engine's full
 * reading (per-sentence surface, answer record, charter, archons, void), and
 * the session that produced it.
 */
export async function er7ChatCompletion({ model, history = [], task, sessionId, attachments = [], discloseThinking = false, onRetry }) {
  const messages = [...(history ?? []), { role: "user", content: task }];
  const headers = { "content-type": "application/json" };
  if (sessionId) headers["x-er7-session"] = sessionId;
  const payload = {
    model: model?.startsWith(MODEL_PREFIX) ? model : `${MODEL_PREFIX}${model}`,
    messages,
    stream: false,
    discloseThinking,
    ...(attachments?.length ? { attachments } : {}),
  };
  let attempt = 0;
  for (;;) {
    let res, body;
    try {
      res = await fetch(`${BASE}/v1/chat/completions`, { method: "POST", headers, body: JSON.stringify(payload) });
      body = await res.json().catch(() => ({}));
    } catch (err) {
      throw new Error(`er7 engine not answering on ${BASE}: ${err?.message ?? err}`);
    }
    if (res.ok) {
      return {
        text: body?.choices?.[0]?.message?.content ?? "",
        reading: body?.reading ?? null,
        sessionId: body?.reading?.sessionId ?? sessionId ?? null,
      };
    }
    const type = body?.error?.type;
    if (res.status === 429 && RETRYABLE_TYPES.has(type) && attempt < MAX_RETRIES) {
      attempt += 1;
      const retryAfterS = Number(body?.error?.retry_after ?? res.headers.get("retry-after") ?? 2);
      onRetry?.({ attempt, retryAfterS, type });
      await new Promise((r) => setTimeout(r, retryAfterS * 1000));
      continue;
    }
    throw new Error(body?.error?.message || `POST /v1/chat/completions: ${res.status}`);
  }
}