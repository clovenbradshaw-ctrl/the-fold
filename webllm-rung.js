// webllm-rung.js — the in-tab model rung: one reliable WebLLM option. Pure,
// browser-safe, node-testable; the web-llm module itself is injected (the
// cast.js pattern), so nothing here reaches for the network, a worker, or a
// GPU — this file only DECIDES things, and every decision is testable in
// node against the real vendored library.
//
// Why one model and not a catalog: the rung exists so the fold can run where
// Ollama does not — a static deployment (GitHub Pages) or a machine with
// nothing pulled — and the failure modes of an in-browser model are all
// download- and device-shaped. Every additional catalog row multiplies those
// failure modes by one more set of weights. eochat's measured catalog note
// stands ("nothing smaller survives a real reading question well", its 3B
// default): the rung is Llama 3.2 3B, q4f16, and it is the ONLY one.
//
// Where the bytes come from is decided by where the page is served from,
// mechanically, never by a flag:
//   - a localhost page loads weights from this repo's own models/ directory
//     (P1: every byte same-origin; the fetch-llama32-3b.sh mirror put them
//     there, md5-verified against the manifest's own records);
//   - any other origin (the static deployment) loads them from the model's
//     publisher via the vendored library's OWN prebuilt catalog entry — the
//     address never appears in this repo's code, so it can never drift from
//     the wasm the installed engine version expects, and upgrading web-llm
//     re-points both together.

/** The one rung. The id is web-llm's own, and it is what `offered` lists and
 * `state.model` carry — never ambiguous with an Ollama tag. */
export const WEBLLM_MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

/** What the picker shows for it. */
export const WEBLLM_LABEL = "Llama 3.2 3B · in this tab";

export function isWebLLMModel(name) {
  return name === WEBLLM_MODEL_ID;
}

/** Hostnames that mean "this machine" — the same authorities the
 * constitution's host scan treats as local. */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalPage(pageHref) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(pageHref).hostname);
  } catch {
    return false;
  }
}

/** The installed library's own record for the rung — the single source of
 * the publisher address, the wasm address, and the context window. A build
 * of web-llm that drops the id is a typed error at decision time, never a
 * download-time surprise. */
export function prebuiltEntryFor(prebuilt, id = WEBLLM_MODEL_ID) {
  const entry = prebuilt?.model_list?.find((m) => m.model_id === id);
  if (!entry) throw new Error(`the installed web-llm ships no entry for ${id} — the rung and the library have drifted`);
  return entry;
}

/** The wasm's own filename, from the entry — models/libs/<this> is where the
 * local mirror keeps it, and the conformance test pins the two together so
 * upgrading web-llm without re-running the mirror is a failing test, not a
 * silent engine/wasm mismatch. */
export function localWasmName(entry) {
  return new URL(entry.model_lib).pathname.split("/").pop();
}

/**
 * The engine's app config for this page. `prebuilt` is the vendored
 * library's prebuiltAppConfig; `pageHref` is the page's own address. Returns
 * the config plus the two facts the page states out loud: where the weights
 * come from, and the declared context window.
 *
 * The local model address keeps the publisher's resolve/main/ layout on disk
 * because the library's URL normalizer appends that suffix to any address
 * that lacks it — mirroring the layout means the SAME code path serves both
 * origins, rather than a second path invented for localhost.
 */
export function appConfigFor(prebuilt, pageHref) {
  const entry = prebuiltEntryFor(prebuilt);
  const local = isLocalPage(pageHref);
  const record = local
    ? {
        ...entry,
        model: new URL(`models/${entry.model_id}/resolve/main/`, pageHref).href,
        model_lib: new URL(`models/libs/${localWasmName(entry)}`, pageHref).href,
      }
    : { ...entry };
  return {
    appConfig: { model_list: [record] },
    weights: local ? "this disk" : "the model's publisher, cached in this browser after the first load",
    contextWindow: record.overrides?.context_window_size ?? null,
  };
}

/**
 * complete()'s options, translated to the engine's request shape. Same
 * contract as the Ollama branch: `json` may be `true` (plain JSON mode) or a
 * JSON schema object — the engine's grammar-constrained decoding takes the
 * schema as a STRING, so the object is serialized here, and the shape is
 * physics on this rung exactly as it is on Ollama (P2).
 */
export function toWebLLMRequest(messages, { maxTokens, json } = {}) {
  return {
    messages,
    stream: true,
    stream_options: { include_usage: true },
    ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {}),
    ...(json
      ? {
          response_format:
            json === true
              ? { type: "json_object" }
              : { type: "json_object", schema: JSON.stringify(json) },
        }
      : {}),
  };
}

/**
 * The engine's final-chunk usage, folded to the pace ledger's own record
 * shape. The ledger stores tokens and nanoseconds; the engine reports tokens
 * and tokens-per-second — the conversion is arithmetic on the engine's own
 * telemetry, never a wall-clock estimate. A usage with no rate leaves the
 * duration 0, which foldPace already treats as "no measurement".
 */
export function paceRecordFromUsage(model, messages, usage) {
  const promptTokens = usage?.prompt_tokens ?? 0;
  const outTokens = usage?.completion_tokens ?? 0;
  const prefillTps = usage?.extra?.prefill_tokens_per_s ?? 0;
  const decodeTps = usage?.extra?.decode_tokens_per_s ?? 0;
  return {
    model,
    promptChars: (messages ?? []).reduce((n, m) => n + (m.content?.length ?? 0), 0),
    promptTokens,
    promptNs: prefillTps > 0 ? (promptTokens / prefillTps) * 1e9 : 0,
    outTokens,
    outNs: decodeTps > 0 ? (outTokens / decodeTps) * 1e9 : 0,
  };
}

/**
 * The offered list when both runtimes are in play. Ollama's rungs keep
 * picker order (fastest first — routing's whole contract); the in-tab rung
 * is appended LAST: on a machine where Ollama answers, a native 2B is the
 * faster summary rung than a 3B behind WebGPU, and on a machine where it
 * does not, the in-tab rung is offered[0] and routing sends every kind
 * there — the single-model case model-routing.test.mjs already pins.
 */
export function mergeOffered(ollamaOffered, webllmAvailable) {
  const base = [...(ollamaOffered ?? [])];
  if (webllmAvailable && !base.includes(WEBLLM_MODEL_ID)) base.push(WEBLLM_MODEL_ID);
  return base;
}

/**
 * Why the in-tab model cannot run here, or null when it can. Decided from
 * the page's own capabilities object (injected — in the page this is
 * `navigator` + `window.isSecureContext`; in tests it is a plain object), so
 * the three lookalike failures — no WebGPU at all, WebGPU behind an insecure
 * origin, a browser that is not Chrome-shaped — each name their own fix.
 */
export function webgpuBlocker({ gpu, secureContext } = {}) {
  if (secureContext === false)
    return "WebGPU needs a secure origin (https:// or localhost) and this page has neither — serve it from one and reload";
  if (!gpu)
    return "this browser offers no WebGPU, which the in-tab model needs — Chrome or Edge with hardware acceleration on";
  return null;
}

/**
 * A load or generation failure, typed. The raw browser strings for
 * out-of-quota, dropped-network, and reclaimed-GPU failures look nothing
 * alike and have nothing-alike fixes; the caller shows `text` and branches
 * on `kind`, never on the raw message. Unrecognized errors keep their own
 * words rather than being mislabeled.
 */
export function classifyWebLLMFailure(err, { online = true } = {}) {
  const msg = String(err?.message ?? err ?? "").trim();
  if (err?.name === "DeviceLostError" || /device (was |is )?lost/i.test(msg))
    return { kind: "device-lost", text: `the GPU device was reclaimed mid-work (low memory or a driver reset): ${msg}` };
  if (err?.name === "EngineStalledError" || /engine went silent/i.test(msg))
    return { kind: "stalled", text: msg };
  if (!online)
    return { kind: "offline", text: "this device is offline, so the model weights cannot download — reconnect and it will resume where it stopped" };
  if (/QuotaExceededError|quota.?exceeded/i.test(msg))
    return { kind: "quota", text: `the browser ran out of storage partway through the ~1.7GB download — free space for this site and retry (${msg})` };
  if (/Failed to fetch|NetworkError|ERR_NETWORK|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Cache(\.| )add|'add' on 'Cache'/i.test(msg))
    return { kind: "network", text: `the weight download was dropped mid-shard — a retry resumes from what the browser already kept (${msg})` };
  if (/WebGPU|adapter|GPU/i.test(msg)) return { kind: "gpu", text: `the GPU rejected the model: ${msg}` };
  return { kind: "unknown", text: msg || "the model failed for an unstated reason" };
}

/** Load attempts before the failure is handed to the caller, and the waits
 * between them. A multi-shard download's transient failures resume from the
 * browser's own cache, so a retry is cheap; three attempts distinguishes "a
 * shard hiccuped" from "this network blocks the host". */
export const LOAD_ATTEMPTS = 3;
export const LOAD_BACKOFF_MS = [1000, 4000];

/**
 * The engine watchdog's budgets — P9 budgets with a named duty: runaway
 * backstop, never a quality threshold. Measured live (2026-08-17): a WebGPU
 * device reclaimed mid-request leaves web-llm's worker RPC pending FOREVER
 * (the library's own #647 shape) — the turn hangs with no error to catch, so
 * silence past these bounds is treated as a lost device and the engine is
 * rebuilt. FIRST covers the one-time cost before any token can arrive
 * (grammar compilation for a constrained request, then prefill of a full
 * context); QUIET is between tokens, where even a slow decode speaks every
 * few hundred milliseconds.
 */
export const ENGINE_FIRST_LIFE_MS = 120_000;
export const ENGINE_QUIET_MS = 30_000;

/** The watchdog's own error, typed so the classifier and the replay logic
 * treat a silent engine exactly like a lost device — which is what the
 * measured case actually was. */
export function engineStalledError(sinceMs, phase) {
  const err = new Error(
    `the engine went silent for ${Math.round(sinceMs / 1000)}s (${phase}) — treating the GPU device as lost and rebuilding`,
  );
  err.name = "EngineStalledError";
  return err;
}
