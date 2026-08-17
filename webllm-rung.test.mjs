// webllm-rung.test.mjs — the in-tab rung's conformance, against the REAL
// vendored web-llm and the REAL mirrored weights on this disk. The walls:
// the library and the local mirror may never drift apart silently; a
// localhost page loads only same-origin bytes; a static page loads only what
// the library's own catalog names; the request adapter keeps complete()'s
// contract (grammar as physics included); and routing over the merged offer
// still answers on a machine with nothing but a browser.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { prebuiltAppConfig } from "./node_modules/@mlc-ai/web-llm/lib/index.js";
import {
  WEBLLM_MODEL_ID,
  isWebLLMModel,
  isLocalPage,
  prebuiltEntryFor,
  localWasmName,
  appConfigFor,
  toWebLLMRequest,
  paceRecordFromUsage,
  mergeOffered,
  webgpuBlocker,
  classifyWebLLMFailure,
  engineStalledError,
  LOAD_ATTEMPTS,
  ENGINE_FIRST_LIFE_MS,
  ENGINE_QUIET_MS,
} from "./webllm-rung.js";
import { MODEL_PICKER, ROUTE_KINDS, routeModel } from "./model-routing.js";
import { emptyPaceLog, recordCall, foldPace } from "./pace.js";
import { FOLD_SCHEMA } from "./fold.js";

const ROOT = fileURLToPath(new URL("./", import.meta.url));
const LOCAL_PAGE = "http://localhost:8811/index.html";
const STATIC_PAGE = "https://someone.github.io/the-fold/index.html";

// ── the library and the mirror may not drift ────────────────────────────────

test("the installed web-llm ships the rung's entry; an unknown id is a typed error", () => {
  const entry = prebuiltEntryFor(prebuiltAppConfig);
  assert.equal(entry.model_id, WEBLLM_MODEL_ID);
  assert.match(entry.model, /^https:\/\//);
  assert.match(entry.model_lib, /\.wasm$/);
  assert.throws(() => prebuiltEntryFor(prebuiltAppConfig, "No-Such-Model"), /drifted/);
});

test("the mirrored wasm on this disk is the exact lib the installed engine expects", () => {
  const entry = prebuiltEntryFor(prebuiltAppConfig);
  const wasm = `${ROOT}models/libs/${localWasmName(entry)}`;
  assert.ok(existsSync(wasm), `models/libs is missing ${localWasmName(entry)} — web-llm was upgraded without re-running models/fetch-llama32-3b.sh`);
  assert.ok(statSync(wasm).size > 1e6, "the mirrored wasm is not a real engine lib");
});

test("every weight shard the manifest names is on this disk at its stated size", () => {
  const dir = `${ROOT}models/${WEBLLM_MODEL_ID}/resolve/main/`;
  const manifest = JSON.parse(readFileSync(`${dir}ndarray-cache.json`, "utf8"));
  assert.ok(manifest.records.length > 0);
  for (const r of manifest.records) {
    assert.ok(existsSync(dir + r.dataPath), `missing shard ${r.dataPath}`);
    assert.equal(statSync(dir + r.dataPath).size, r.nbytes, `${r.dataPath} is not the manifest's size`);
  }
  const config = JSON.parse(readFileSync(`${dir}mlc-chat-config.json`, "utf8"));
  for (const t of config.tokenizer_files) assert.ok(existsSync(dir + t), `missing tokenizer file ${t}`);
});

test("the manifest the installed engine loads by is mirrored, and its records fit the shards", () => {
  // web-llm >= 0.2.84 fetches tensor-cache.json, not ndarray-cache.json —
  // measured live: the load died on a 404 for this exact file. Both name the
  // same shard files; this walk holds for whichever the engine asks by.
  const dir = `${ROOT}models/${WEBLLM_MODEL_ID}/resolve/main/`;
  const manifest = JSON.parse(readFileSync(`${dir}tensor-cache.json`, "utf8"));
  assert.ok(manifest.records.length > 0);
  const need = new Map();
  for (const r of manifest.records) {
    const end = (r.byteOffset ?? 0) + r.nbytes;
    need.set(r.dataPath, Math.max(need.get(r.dataPath) ?? 0, end));
  }
  for (const [file, min] of need) {
    assert.ok(existsSync(dir + file), `missing shard ${file}`);
    assert.ok(statSync(dir + file).size >= min, `${file} is shorter than the manifest's records`);
  }
});

// ── where the bytes come from is the page's origin, mechanically ────────────

test("a localhost page is local; a static one is not; garbage is not", () => {
  assert.equal(isLocalPage("http://localhost:8811/index.html"), true);
  assert.equal(isLocalPage("http://127.0.0.1:8812/explore.html"), true);
  assert.equal(isLocalPage(STATIC_PAGE), false);
  assert.equal(isLocalPage("not a url"), false);
});

test("a localhost page loads every model byte same-origin, publisher layout kept", () => {
  const { appConfig, weights, contextWindow } = appConfigFor(prebuiltAppConfig, LOCAL_PAGE);
  assert.equal(appConfig.model_list.length, 1);
  const [rec] = appConfig.model_list;
  assert.equal(rec.model, `http://localhost:8811/models/${WEBLLM_MODEL_ID}/resolve/main/`);
  assert.equal(rec.model_lib, `http://localhost:8811/models/libs/${localWasmName(prebuiltEntryFor(prebuiltAppConfig))}`);
  assert.ok(rec.model.includes("/resolve/main/"), "the library's URL normalizer needs the publisher layout");
  assert.equal(weights, "this disk");
  assert.ok(Number.isFinite(contextWindow) && contextWindow > 0, "the config declares no window");
});

test("a static page keeps the library's own catalog entry untouched — no address of ours", () => {
  const entry = prebuiltEntryFor(prebuiltAppConfig);
  const { appConfig, weights } = appConfigFor(prebuiltAppConfig, STATIC_PAGE);
  const [rec] = appConfig.model_list;
  assert.equal(rec.model, entry.model);
  assert.equal(rec.model_lib, entry.model_lib);
  assert.notEqual(weights, "this disk");
  // The invariant behind the constitution scan staying allowance-free: this
  // repo's own module contains no publisher hostname.
  const src = readFileSync(`${ROOT}webllm-rung.js`, "utf8");
  assert.ok(!src.includes("huggingface"), "webllm-rung.js hardcodes the publisher host");
  assert.ok(!src.includes("githubusercontent"), "webllm-rung.js hardcodes the lib host");
});

// ── complete()'s contract survives the translation ──────────────────────────

test("the request adapter: stream always, telemetry always, cap only when given", () => {
  const messages = [{ role: "user", content: "hello" }];
  const bare = toWebLLMRequest(messages);
  assert.equal(bare.stream, true);
  assert.deepEqual(bare.stream_options, { include_usage: true });
  assert.ok(!("max_tokens" in bare) && !("response_format" in bare));
  assert.equal(toWebLLMRequest(messages, { maxTokens: 300 }).max_tokens, 300);
});

test("grammar is physics on this rung too: a schema crosses as the engine's own string form", () => {
  const messages = [{ role: "user", content: "fold" }];
  assert.deepEqual(toWebLLMRequest(messages, { json: true }).response_format, { type: "json_object" });
  const rf = toWebLLMRequest(messages, { json: FOLD_SCHEMA }).response_format;
  assert.equal(rf.type, "json_object");
  assert.equal(typeof rf.schema, "string");
  assert.deepEqual(JSON.parse(rf.schema), FOLD_SCHEMA);
});

test("the engine's telemetry folds to the pace ledger's shape, arithmetic only", () => {
  const messages = [{ role: "user", content: "12345" }];
  const usage = { prompt_tokens: 100, completion_tokens: 50, extra: { prefill_tokens_per_s: 200, decode_tokens_per_s: 25 } };
  const rec = paceRecordFromUsage(WEBLLM_MODEL_ID, messages, usage);
  assert.equal(rec.promptChars, 5);
  assert.equal(rec.promptTokens, 100);
  assert.equal(rec.promptNs, (100 / 200) * 1e9);
  assert.equal(rec.outNs, (50 / 25) * 1e9);
  // Round-trip through the REAL ledger: foldPace recovers the engine's own rates.
  const pace = foldPace(recordCall(emptyPaceLog(), rec), WEBLLM_MODEL_ID);
  assert.ok(Math.abs(pace.decodeTps - 25) < 1e-9);
  assert.ok(Math.abs(pace.prefillTps - 200) < 1e-9);
});

test("a usage with no rates leaves durations 0 — no measurement, never an estimate", () => {
  const rec = paceRecordFromUsage(WEBLLM_MODEL_ID, [], { prompt_tokens: 10, completion_tokens: 5 });
  assert.equal(rec.promptNs, 0);
  assert.equal(rec.outNs, 0);
});

// ── the offer, and routing over it ──────────────────────────────────────────

test("with Ollama present the native rungs stay first and the in-tab rung is last", () => {
  const offered = mergeOffered([...MODEL_PICKER], true);
  assert.deepEqual(offered.slice(0, MODEL_PICKER.length), MODEL_PICKER);
  assert.equal(offered.at(-1), WEBLLM_MODEL_ID);
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered, selected: WEBLLM_MODEL_ID }), MODEL_PICKER[0]);
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered, selected: WEBLLM_MODEL_ID }), WEBLLM_MODEL_ID);
});

test("a browser-only machine offers the in-tab rung alone and every kind routes there", () => {
  const offered = mergeOffered([], true);
  assert.deepEqual(offered, [WEBLLM_MODEL_ID]);
  for (const kind of Object.values(ROUTE_KINDS))
    assert.equal(routeModel(kind, { offered, selected: WEBLLM_MODEL_ID }), WEBLLM_MODEL_ID);
});

test("no WebGPU and no Ollama is an empty offer, never a name that would fail", () => {
  assert.deepEqual(mergeOffered([], false), []);
  assert.deepEqual(mergeOffered(["gemma2:2b"], false), ["gemma2:2b"]);
  assert.equal(mergeOffered([WEBLLM_MODEL_ID], true).filter(isWebLLMModel).length, 1, "the rung is never offered twice");
});

// ── the failures, typed ─────────────────────────────────────────────────────

test("the three lookalike WebGPU blocks each name their own fix", () => {
  assert.equal(webgpuBlocker({ gpu: {}, secureContext: true }), null);
  assert.match(webgpuBlocker({ gpu: undefined, secureContext: true }), /no WebGPU/);
  assert.match(webgpuBlocker({ gpu: undefined, secureContext: false }), /secure origin/);
});

test("failure kinds: device-lost, quota, offline, network, gpu — and unknown keeps its words", () => {
  assert.equal(classifyWebLLMFailure({ name: "DeviceLostError", message: "x" }).kind, "device-lost");
  assert.equal(classifyWebLLMFailure(new Error("the device was lost")).kind, "device-lost");
  assert.equal(classifyWebLLMFailure(new Error("QuotaExceededError: out of room")).kind, "quota");
  assert.equal(classifyWebLLMFailure(new Error("Failed to fetch"), { online: false }).kind, "offline");
  assert.equal(classifyWebLLMFailure(new Error("Failed to fetch"), { online: true }).kind, "network");
  // Chrome's own phrasing when a request inside Cache.add fails — measured live.
  assert.equal(classifyWebLLMFailure(new TypeError("Failed to execute 'add' on 'Cache': Request failed")).kind, "network");
  assert.equal(classifyWebLLMFailure(new Error("no WebGPU adapter found")).kind, "gpu");
  const odd = classifyWebLLMFailure(new Error("something else entirely"));
  assert.equal(odd.kind, "unknown");
  assert.match(odd.text, /something else entirely/);
});

test("the load is attempted more than once — a sharded download's transient failure is not terminal", () => {
  assert.ok(LOAD_ATTEMPTS >= 2);
});

test("a silent engine is typed like a lost device — the measured hang, never an untyped forever-await", () => {
  // Measured live 2026-08-17: the WebGPU device died mid-plan, the worker's
  // RPC never settled, and the turn hung with nothing to catch. The watchdog
  // error must classify as its own kind so the replay logic rebuilds.
  const err = engineStalledError(120_000, "between tokens");
  assert.equal(err.name, "EngineStalledError");
  assert.equal(classifyWebLLMFailure(err).kind, "stalled");
  assert.match(err.message, /120s/);
  assert.match(err.message, /between tokens/);
  // The budgets exist and are ordered: the one-time first-life bound (grammar
  // compile + prefill) is the larger, the between-tokens bound the smaller.
  assert.ok(ENGINE_FIRST_LIFE_MS > ENGINE_QUIET_MS);
  assert.ok(ENGINE_QUIET_MS >= 10_000);
});
