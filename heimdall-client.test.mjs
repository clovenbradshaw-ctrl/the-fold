// heimdall-client.test.mjs — the page watcher's own walls: a connection
// that breaks is re-zeroed ONCE with its trigger recorded; a probe still
// down is not re-recovered every tick; a probe that never reported good is
// a first run, never a blind re-zero; recovery that throws is recorded as
// failed; and the watch's report says what every connection stands at.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWatch } from "./heimdall-client.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("a connection that breaks is re-zeroed once, with its trigger on the record; a probe still down is not re-recovered", async () => {
  const acts = []; const recovers = [];
  let ok = true;
  const watch = createWatch({
    intervalMs: 10,
    probes: [{ name: "matrix", probe: async () => ok ? { ok: true } : { ok: false, reason: "sync dropped" } }],
    recover: async (name, reason) => { recovers.push([name, reason]); },
    act: (kind, fields) => acts.push({ kind, ...fields }),
  });
  watch.start();
  await sleep(40);
  ok = false;
  await sleep(40);
  assert.equal(recovers.length, 1, "one break, one re-zero");
  assert.deepEqual(recovers[0], ["matrix", "sync dropped"], "the trigger names the connection and the reason");
  const rec = acts.find((a) => a.kind === "rec");
  assert.ok(rec && rec.probe === "matrix" && rec.recovered === true);
  await sleep(40);
  assert.equal(recovers.length, 1, "a probe still down is not re-recovered on the next tick");
  watch.stop();
});

test("a probe that never reported good is a first run, reported as a standing — never re-zeroed blind", async () => {
  const acts = []; const recovers = [];
  const watch = createWatch({
    intervalMs: 10,
    probes: [{ name: "engine", probe: async () => ({ ok: false, reason: "no engine loaded yet" }) }],
    recover: async () => { recovers.push("engine"); },
    act: (kind, fields) => acts.push({ kind, ...fields }),
  });
  watch.start();
  await sleep(40);
  assert.equal(recovers.length, 0, "first-run-down is not recovered");
  const eva = acts.find((a) => a.kind === "eva");
  assert.match(eva?.standing ?? "", /first-run/);
  watch.stop();
});

test("a recover that throws is recorded as failed with its reason — never swallowed", async () => {
  const acts = []; let ok = true;
  const watch = createWatch({
    intervalMs: 10,
    probes: [{ name: "matrix", probe: async () => ok ? { ok: true } : { ok: false, reason: "token dead" } }],
    recover: async () => { throw new Error("re-login failed"); },
    act: (kind, fields) => acts.push({ kind, ...fields }),
  });
  watch.start();
  await sleep(30);
  ok = false;
  await sleep(40);
  const rec = acts.find((a) => a.kind === "rec");
  assert.ok(rec, "the REC act landed");
  assert.equal(rec.recovered, false);
  assert.equal(rec.detail, "re-login failed");
  watch.stop();
});

test("the watch's report says what each connection stands at — ok and reason both", async () => {
  let ok = false;
  const watch = createWatch({
    intervalMs: 10,
    probes: [{ name: "matrix", probe: async () => ok ? { ok: true } : { ok: false, reason: "sync dropped" } }],
  });
  watch.start();
  await sleep(40);
  const down = watch.report();
  assert.equal(down.probes.matrix.ok, false);
  assert.equal(down.probes.matrix.reason, "sync dropped");
  assert.equal(down.running, true);
  ok = true;
  await sleep(40);
  const up = watch.report();
  assert.equal(up.probes.matrix.ok, true);
  watch.stop();
  assert.equal(watch.report().running, false);
});