import test from "node:test";
import assert from "node:assert/strict";
import { revisePiece } from "./piece-revise.js";
import { groundOf } from "./ground-ladder.js";
import { splitSentences } from "./cite.js";

const ctx = { notes: [], disputes: new Map(), derived: [], passages: [{ ref: "b.txt#0-50", text: "The observatory never opened in 1889; it opened in 1890." }], resolveName: () => new Set(), model: "gemma2:2b" };

test("a sentence a later reading denies is rewritten once, and the rewrite lands only if it grounds; a sentence whose ground rose is re-cited without a model", async () => {
  const sections = [
    { label: "Opening", text: "The observatory opened in 1889. It stood on the hill.", claims: [{ sentence: "The observatory opened in 1889.", end1: "the observatory", label: "opened", end2: "in 1889", verdict: "unbound" }], witnessRows: [] },
    { label: "Later", text: "It opened in 1890 after repairs.", claims: [], witnessRows: [] },
  ];
  const disputes = new Map([["the observatory|opened|in 1889", [{ source: "b.txt" }]]]);
  const readAgainst = (sent) => /opened in 1889/.test(sent) ? [{ end1: "the observatory", label: "opened", end2: "in 1889", verdict: "bound", spans: [{ ref: "a.txt#0-30" }] }] : /opened in 1890/.test(sent) ? [{ end1: "the observatory", label: "opened", end2: "in 1890", verdict: "bound", spans: [{ ref: "b.txt#0-50" }] }] : [];
  const calls = [];
  const r = await revisePiece(sections, { groundOf, readAgainst, call: async (m) => { calls.push(m); return "The observatory opened in 1890."; }, splitSentences, ctx: { ...ctx, disputes }, model: "gemma2:2b" });
  assert.equal(calls.length, 1, "one ask for the contested sentence");
  assert.match(calls[0][1].content, /later reading found otherwise/);
  const rw = r.revisions.find((x) => x.kind === "rewrite");
  assert.ok(rw, "the rewrite landed"); assert.equal(rw.to, "The observatory opened in 1890."); assert.equal(rw.ground.tier, "bound");
  assert.match(r.sections[0].text, /^The observatory opened in 1890\. It stood on the hill\.$/);
  // an ungrounded rewrite is refused and the original stays
  const r2 = await revisePiece(sections, { groundOf, readAgainst, call: async () => "The observatory opened whenever it pleased.", splitSentences, ctx: { ...ctx, disputes }, model: "gemma2:2b" });
  const ref = r2.revisions.find((x) => x.kind === "rewrite-refused");
  assert.ok(ref); assert.match(ref.because, /not a grounded rung/);
  assert.match(r2.sections[0].text, /opened in 1889/, "the original stands, wearing its contested mark");
});

test("control built to fail: nothing later, nothing revised, no ask spent", async () => {
  const r = await revisePiece([{ label: "A", text: "The hill was green.", claims: [], witnessRows: [] }], { groundOf, readAgainst: () => [], call: async () => { throw new Error("must not be asked"); }, splitSentences, ctx, model: "m" });
  assert.deepEqual(r.revisions, []); assert.equal(r.asksSpent, 0);
});
