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
  WEBLLM_MODELS,
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
  weightsBases,
  readMirrors,
  weightsProbeUrl,
} from "./webllm-rung.js";
import { MODEL_PICKER, ROUTE_KINDS, routeModel } from "./model-routing.js";
import { emptyPaceLog, recordCall, foldPace } from "./pace.js";
import { FOLD_SCHEMA } from "./fold.js";

const ROOT = fileURLToPath(new URL("./", import.meta.url));
const LOCAL_PAGE = "http://localhost:8811/index.html";
const STATIC_PAGE = "https://someone.github.io/the-fold/index.html";

// ── the library and the mirror may not drift ────────────────────────────────

test("the installed web-llm ships every roster entry; an unknown id is a typed error", () => {
  assert.equal(WEBLLM_MODELS.length, 3, "the roster is bounded at three");
  for (const m of WEBLLM_MODELS) {
    const entry = prebuiltEntryFor(prebuiltAppConfig, m.id);
    assert.equal(entry.model_id, m.id);
    assert.match(entry.model, /^https:\/\//);
    assert.match(entry.model_lib, /\.wasm$/);
    assert.ok(m.origin.length > 20 && m.license && m.publisher, `${m.id} states its origin, licence and publisher`);
  }
  assert.equal(prebuiltEntryFor(prebuiltAppConfig).model_id, WEBLLM_MODEL_ID);
  assert.throws(() => prebuiltEntryFor(prebuiltAppConfig, "No-Such-Model"), /drifted/);
});

// The mirror walks, per roster model. A model with NO mirror directory on
// this disk skips typed (a dev checkout need not hold 3.4GB of weights —
// models/fetch-webllm.sh puts them there); a mirror that IS present must be
// exactly what the installed engine expects, or the test fails: the library
// and the mirror may never drift apart silently.
// tensor-cache.json is what the engine loads by; ndarray-cache.json is the
// older name some publishers still ship beside it (OLMo 2 ships only the new one).
const manifestOf = (id) => ["tensor-cache.json", "ndarray-cache.json"].map((f) => `${ROOT}models/${id}/resolve/main/${f}`).find(existsSync) ?? null;
const mirrored = (id) => manifestOf(id) !== null;

test("each mirrored model's wasm on this disk is the exact lib the installed engine expects", (t) => {
  const present = WEBLLM_MODELS.filter((m) => mirrored(m.id));
  if (!present.length) return t.skip("no in-tab model is mirrored on this checkout — sh models/fetch-webllm.sh");
  for (const m of present) {
    const entry = prebuiltEntryFor(prebuiltAppConfig, m.id);
    const wasm = `${ROOT}models/libs/${localWasmName(entry)}`;
    assert.ok(existsSync(wasm), `models/libs is missing ${localWasmName(entry)} — web-llm was upgraded without re-running models/fetch-webllm.sh ${m.id}`);
    assert.ok(statSync(wasm).size > 1e6, "the mirrored wasm is not a real engine lib");
  }
});

test("every weight shard each mirrored manifest names is on this disk at its stated size", (t) => {
  const present = WEBLLM_MODELS.filter((m) => mirrored(m.id));
  if (!present.length) return t.skip("no in-tab model is mirrored on this checkout");
  for (const m of present) {
    const dir = `${ROOT}models/${m.id}/resolve/main/`;
    const manifest = JSON.parse(readFileSync(manifestOf(m.id), "utf8"));
    assert.ok(manifest.records.length > 0);
    for (const r of manifest.records) {
      assert.ok(existsSync(dir + r.dataPath), `${m.id}: missing shard ${r.dataPath}`);
      assert.equal(statSync(dir + r.dataPath).size, r.nbytes, `${m.id}: ${r.dataPath} is not the manifest's size`);
    }
    const config = JSON.parse(readFileSync(`${dir}mlc-chat-config.json`, "utf8"));
    for (const f of config.tokenizer_files) assert.ok(existsSync(dir + f), `${m.id}: missing tokenizer file ${f}`);
  }
});

test("the manifest the installed engine loads by is mirrored for each present model, and its records fit the shards", (t) => {
  // web-llm >= 0.2.84 fetches tensor-cache.json, not ndarray-cache.json —
  // measured live: the load died on a 404 for this exact file. Both name the
  // same shard files; this walk holds for whichever the engine asks by.
  const present = WEBLLM_MODELS.filter((m) => mirrored(m.id));
  if (!present.length) return t.skip("no in-tab model is mirrored on this checkout");
  for (const m of present) {
    const dir = `${ROOT}models/${m.id}/resolve/main/`;
    const manifest = JSON.parse(readFileSync(`${dir}tensor-cache.json`, "utf8"));
    assert.ok(manifest.records.length > 0);
    const need = new Map();
    for (const r of manifest.records) {
      const end = (r.byteOffset ?? 0) + r.nbytes;
      need.set(r.dataPath, Math.max(need.get(r.dataPath) ?? 0, end));
    }
    for (const [file, min] of need) {
      assert.ok(existsSync(dir + file), `${m.id}: missing shard ${file}`);
      assert.ok(statSync(dir + file).size >= min, `${m.id}: ${file} is shorter than the manifest's records`);
    }
  }
});

// ── where the bytes come from is the page's origin, mechanically ────────────

test("a localhost page is local; a static one is not; garbage is not", () => {
  assert.equal(isLocalPage("http://localhost:8811/index.html"), true);
  assert.equal(isLocalPage("http://127.0.0.1:8812/explore.html"), true);
  assert.equal(isLocalPage(STATIC_PAGE), false);
  assert.equal(isLocalPage("not a url"), false);
});

test("a localhost page loads every roster model's bytes same-origin, publisher layout kept", () => {
  const { appConfig, weights, contextWindow, contextWindows } = appConfigFor(prebuiltAppConfig, LOCAL_PAGE);
  assert.equal(appConfig.model_list.length, WEBLLM_MODELS.length);
  for (const rec of appConfig.model_list) {
    assert.equal(rec.model, `http://localhost:8811/models/${rec.model_id}/resolve/main/`);
    assert.equal(rec.model_lib, `http://localhost:8811/models/libs/${localWasmName(prebuiltEntryFor(prebuiltAppConfig, rec.model_id))}`);
    assert.ok(rec.model.includes("/resolve/main/"), "the library's URL normalizer needs the publisher layout");
    assert.ok(Number.isFinite(contextWindows[rec.model_id]) && contextWindows[rec.model_id] > 0, `${rec.model_id} declares no window`);
  }
  assert.equal(appConfig.model_list[0].model_id, WEBLLM_MODEL_ID, "the default rung is first");
  assert.equal(weights, "this disk");
  assert.ok(Number.isFinite(contextWindow) && contextWindow > 0, "the config declares no window");
});

test("a static page keeps the library's own catalog entries untouched — no address of ours", () => {
  const { appConfig, weights } = appConfigFor(prebuiltAppConfig, STATIC_PAGE);
  for (const rec of appConfig.model_list) {
    const entry = prebuiltEntryFor(prebuiltAppConfig, rec.model_id);
    assert.equal(rec.model, entry.model);
    assert.equal(rec.model_lib, entry.model_lib);
  }
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

test("with Ollama present the native rungs stay first and the in-tab roster is last, in roster order", () => {
  const offered = mergeOffered([...MODEL_PICKER], true);
  assert.deepEqual(offered.slice(0, MODEL_PICKER.length), MODEL_PICKER);
  assert.deepEqual(offered.slice(MODEL_PICKER.length), WEBLLM_MODELS.map((m) => m.id));
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered, selected: WEBLLM_MODEL_ID }), MODEL_PICKER[0]);
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered, selected: WEBLLM_MODEL_ID }), WEBLLM_MODEL_ID);
});

test("a browser-only machine offers the in-tab roster alone: the summary rung is the smallest, deep work is the one picked", () => {
  const offered = mergeOffered([], true);
  assert.deepEqual(offered, WEBLLM_MODELS.map((m) => m.id));
  assert.equal(offered[0], WEBLLM_MODEL_ID, "the default is the smallest, first");
  const picked = offered.at(-1);
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered, selected: picked }), WEBLLM_MODEL_ID);
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered, selected: picked }), picked);
  for (const kind of Object.values(ROUTE_KINDS)) assert.ok(isWebLLMModel(routeModel(kind, { offered, selected: picked })));
});

test("no WebGPU and no Ollama is an empty offer, never a name that would fail; a rung is never offered twice", () => {
  assert.deepEqual(mergeOffered([], false), []);
  assert.deepEqual(mergeOffered(["gemma2:2b"], false), ["gemma2:2b"]);
  const twice = mergeOffered([WEBLLM_MODEL_ID], true);
  assert.equal(twice.filter(isWebLLMModel).length, WEBLLM_MODELS.length);
  assert.equal(new Set(twice).size, twice.length);
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


// ── the weights ladder (P118): the site's own models/, then its mirrors, then the publisher

test("weightsBases: this site's own models/ first on ANY origin, then each mirror the site names, then the publisher — the own base never repeated", () => {
  const site = weightsBases("https://example.github.io/the-fold/the-fold/index.html", ["https://archive.org/download/the-fold-pin/models", "https://example.github.io/the-fold/the-fold/models/"]);
  assert.equal(site[0].base, "https://example.github.io/the-fold/the-fold/models/");
  assert.equal(site[1].base, "https://archive.org/download/the-fold-pin/models/");
  assert.match(site[1].route, /archive\.org/);
  assert.equal(site.length, 3, "the own base named again as a mirror is not a second step");
  assert.equal(site.at(-1).base, null);
  assert.match(site.at(-1).route, /publisher/);
  const ext = weightsBases("chrome-extension://abc/the-fold/index.html", []);
  assert.equal(ext[0].base, "chrome-extension://abc/the-fold/models/");
  assert.equal(ext.length, 2);
});

test("readMirrors reads the file's shape defensively and keeps only https bases; weightsProbeUrl names the rung's own config under a base", () => {
  assert.deepEqual(readMirrors('{"mirrors":["https://archive.org/download/x/models/","ftp://no","not a url"]}'), ["https://archive.org/download/x/models/"]);
  assert.deepEqual(readMirrors('["https://a.example/models"]'), ["https://a.example/models"]);
  assert.deepEqual(readMirrors("<html>"), []);
  assert.deepEqual(readMirrors(null), []);
  assert.equal(weightsProbeUrl("https://archive.org/download/x/models", WEBLLM_MODEL_ID), `https://archive.org/download/x/models/${WEBLLM_MODEL_ID}/resolve/main/mlc-chat-config.json`);
});

test("appConfigFor with a chosen base points every rung at that base and says so; without one a localhost page reads its own disk and any other origin the publisher", () => {
  const chosen = appConfigFor(prebuiltAppConfig, STATIC_PAGE, undefined, { base: "https://archive.org/download/x/models/" });
  for (const rec of chosen.appConfig.model_list) {
    assert.equal(rec.model, `https://archive.org/download/x/models/${rec.model_id}/resolve/main/`);
    assert.match(rec.model_lib, /^https:\/\/archive\.org\/download\/x\/models\/libs\/.+\.wasm$/);
  }
  assert.equal(chosen.weights, "https://archive.org/download/x/models/");
  assert.equal(appConfigFor(prebuiltAppConfig, LOCAL_PAGE).weights, "this disk");
  assert.match(appConfigFor(prebuiltAppConfig, STATIC_PAGE).weights, /publisher/);
});
