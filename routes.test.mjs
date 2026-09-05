// routes.test.mjs — the three homes' report (P118): where the page is, read
// off its own address; what it can reach, said from what the probes found.
import { test } from "node:test";
import assert from "node:assert/strict";
import { whereAmI, describeRoutes } from "./routes.js";

test("whereAmI: a localhost page is the terminal home, a github.io page is the site, a chrome-extension page is the extension; garbage is unknown", () => {
  assert.equal(whereAmI("http://localhost:8811/index.html").home, "terminal");
  assert.equal(whereAmI("http://127.0.0.1:8931/").local, true);
  const site = whereAmI("https://clovenbradshaw-ctrl.github.io/the-fold/the-fold/index.html");
  assert.equal(site.home, "site");
  assert.equal(site.subpath, "/the-fold/the-fold/");
  assert.equal(site.local, false);
  const ext = whereAmI("chrome-extension://abcdefghijklmnop/the-fold/index.html");
  assert.equal(ext.home, "extension");
  assert.equal(ext.extension, true);
  assert.equal(whereAmI("not a url").home, "unknown");
});

test("describeRoutes: the terminal home with everything answering says so in one line and names no gaps", () => {
  const r = describeRoutes({
    where: whereAmI("http://localhost:8811/"),
    probes: { ollama: { ok: true, models: 4 }, webgpu: null, explore: { ok: true, base: "http://localhost:8812" }, api: { ok: true, base: "http://localhost:8811" }, weights: { route: "this site's own models/", base: "http://localhost:8811/models/" } },
  });
  assert.equal(r.summary, "terminal · Ollama + in-tab · record & web on");
  assert.deepEqual(r.gaps, []);
  assert.ok(r.lines.some((l) => /Ollama on localhost:11434 \(4 model\(s\)\)/.test(l)));
  assert.ok(r.lines.some((l) => /weights: this site's own models\//.test(l)));
});

test("describeRoutes: a static site with WebGPU and no servers routes the mouth in-tab and names every door that will answer with a typed gap", () => {
  const r = describeRoutes({
    where: whereAmI("https://example.github.io/the-fold/"),
    probes: { ollama: { ok: false, detail: "no answer on :11434" }, webgpu: null, explore: { ok: false, base: "http://localhost:8812", detail: "Failed to fetch" }, api: { ok: false, base: "https://example.github.io", detail: "answered 404" }, weights: null },
  });
  assert.equal(r.summary, "site · in-tab · record & web off");
  assert.deepEqual(r.gaps, ["explore-server", "serve-api"]);
  assert.ok(r.lines.some((l) => /Reading pane, \/reopen, the web toggle, \/priors, \/gateways, \/ranke and GitHub answer with a typed gap/.test(l)));
  assert.ok(r.lines.some((l) => /in-page sandbox terminal and file transcription still work/.test(l)));
});

test("describeRoutes: no Ollama and no WebGPU is said as NO MOUTH, never as a working page", () => {
  const r = describeRoutes({ where: whereAmI("https://example.github.io/the-fold/"), probes: { ollama: { ok: false }, webgpu: "this browser offers no WebGPU, which the in-tab model needs — Chrome or Edge with hardware acceleration on", explore: { ok: false }, api: { ok: false } } });
  assert.equal(r.summary, "site · no mouth · record & web off");
  assert.ok(r.lines.some((l) => /mouth: NONE/.test(l)));
  assert.ok(r.lines.some((l) => /in-tab rung: unavailable — this browser offers no WebGPU/.test(l)));
});

test("describeRoutes: an extension with Ollama listening beside it is Ollama + in-tab, record off — the site visitor who runs ./fold gets record & web on", () => {
  const ext = describeRoutes({ where: whereAmI("chrome-extension://abc/the-fold/index.html"), probes: { ollama: { ok: true, models: 2 }, webgpu: null, explore: { ok: false, base: "http://localhost:8812" }, api: { ok: false } } });
  assert.equal(ext.summary, "extension · Ollama + in-tab · record & web off");
  const withServers = describeRoutes({ where: whereAmI("https://example.github.io/the-fold/"), probes: { ollama: { ok: false }, webgpu: null, explore: { ok: true, base: "http://localhost:8812" }, api: { ok: false } } });
  assert.equal(withServers.summary, "site · in-tab · record & web on");
  assert.deepEqual(withServers.gaps, ["serve-api"]);
});
