// webllm-rung.js — the in-tab model rung: three WebLLM options, one roster. Pure,
// browser-safe, node-testable; the web-llm module itself is injected (the
// cast.js pattern), so nothing here reaches for the network, a worker, or a
// GPU — this file only DECIDES things, and every decision is testable in
// node against the real vendored library.
//
// Why three and not one, and not a catalog (amended 2026-09-05): the rung
// exists so the fold can run where Ollama does not — a static deployment or
// a machine with nothing pulled — and the failure modes of an in-browser
// model are all download- and device-shaped, so every row is one more set
// of weights to mirror and to fail. The roster is bounded at THREE, chosen
// for what their publishers disclose about the training data (the user's
// standing ask: origins as ethically sourced as the vendored catalog
// allows), not for benchmark rank:
//   OLMo 2 1B (Ai2) — data, code, weights and training logs all published;
//     Apache-2.0. The most transparent model in the catalog, and already
//     this instrument's S1 rung under Ollama (model-routing.js).
//   SmolLM2 1.7B (Hugging Face) — the pretraining mixture and the
//     instruction data are published; Apache-2.0.
//   RedPajama-INCITE Chat 3B (Together) — trained on RedPajama-1T, the open
//     reproduction of the LLaMA data; Apache-2.0. The one 3B in the roster,
//     because eochat's measured note stands ("nothing smaller survives a
//     real reading question well"); its context window is 2048.
// None of the three is trained only on licensed or public-domain text — the
// Common Corpus / Common Pile family is not in the vendored catalog and
// would need an MLC compile of its own; that is named, not claimed. Llama
// 3.2 3B (the rung's original single model) is no longer offered: its
// training data is undisclosed. Its mirror script stays for the file it
// names.
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

/** The roster. Each id is web-llm's own (what `offered` lists and
 * `state.model` carry — never ambiguous with an Ollama tag); `label` is what
 * the picker shows; `origin` is what the PUBLISHER discloses about the
 * training data, stated where the model is picked, with the licence. The
 * model cards are cited in POLICIES.md (P116), never here: this module is
 * loaded by the page, and the constitution's host scan (II.13) keeps every
 * non-local address out of anything the page can reach. */
export const WEBLLM_MODELS = Object.freeze([
  Object.freeze({
    id: "OLMo-2-0425-1B-Instruct-q4f16_1-MLC",
    label: "OLMo 2 1B · in this tab",
    publisher: "Ai2",
    license: "Apache-2.0",
    origin: "fully open: the training data (Dolma / OLMo-mix), code, weights and logs are published",
  }),
  Object.freeze({
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    label: "SmolLM2 1.7B · in this tab",
    publisher: "Hugging Face",
    license: "Apache-2.0",
    origin: "the pretraining mixture (FineWeb-Edu, DCLM, The Stack, curated math and code) and the instruction data are published",
  }),
  Object.freeze({
    id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC",
    label: "RedPajama-INCITE 3B · in this tab",
    publisher: "Together",
    license: "Apache-2.0",
    origin: "trained on RedPajama-1T, the open reproduction of the LLaMA training data; instruction-tuned on OASST1 and Dolly 2.0",
  }),
]);
export const WEBLLM_IDS = Object.freeze(WEBLLM_MODELS.map((m) => m.id));

/** The default rung: the smallest of the three, the same reason the picker
 * defaults to the smallest Ollama rung — the first connection should cost
 * the least. */
export const WEBLLM_MODEL_ID = WEBLLM_IDS[0];

/** What the picker shows for the default. */
export const WEBLLM_LABEL = WEBLLM_MODELS[0].label;

export function isWebLLMModel(name) {
  return WEBLLM_IDS.includes(name);
}
export function webllmModelOf(name) {
  return WEBLLM_MODELS.find((m) => m.id === name) ?? null;
}
export function webllmLabelFor(name) {
  return webllmModelOf(name)?.label ?? name;
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
export function appConfigFor(prebuilt, pageHref, ids = WEBLLM_IDS) {
  const local = isLocalPage(pageHref);
  const records = ids.map((id) => {
    const entry = prebuiltEntryFor(prebuilt, id);
    return local
      ? {
          ...entry,
          model: new URL(`models/${entry.model_id}/resolve/main/`, pageHref).href,
          model_lib: new URL(`models/libs/${localWasmName(entry)}`, pageHref).href,
        }
      : { ...entry };
  });
  return {
    appConfig: { model_list: records },
    weights: local ? "this disk" : "the model's publisher, cached in this browser after the first load",
    // the DEFAULT rung's window; contextWindows answers for every id
    contextWindow: records[0]?.overrides?.context_window_size ?? null,
    contextWindows: Object.fromEntries(records.map((r) => [r.model_id, r.overrides?.context_window_size ?? null])),
  };
}

/** The declared window of one rung, off the library's own entry. */
export function contextWindowFor(prebuilt, id) {
  return prebuiltEntryFor(prebuilt, id).overrides?.context_window_size ?? null;
}

/**
 * complete()'s options, translated to the engine's request shape. Same
 * contract as the Ollama branch: `json` may be `true` (plain JSON mode) or a
 * JSON schema object — the engine's grammar-constrained decoding takes the
 * schema as a STRING, so the object is serialized here, and the shape is
 * physics on this rung exactly as it is on Ollama (P2).
 */
export function toWebLLMRequest(messages, { maxTokens, json, temperature } = {}) {
  return {
    messages,
    stream: true,
    stream_options: { include_usage: true },
    ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {}),
    ...(Number.isFinite(temperature) ? { temperature } : {}),
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
export function mergeOffered(ollamaOffered, webllmAvailable, ids = WEBLLM_IDS) {
  const base = [...(ollamaOffered ?? [])];
  if (webllmAvailable) for (const id of ids) if (!base.includes(id)) base.push(id);
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
