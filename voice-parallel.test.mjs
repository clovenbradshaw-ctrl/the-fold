// voice-parallel.test.mjs — the work-stealing dispatcher, pinned the way the
// experiment measured it: two mouths on one claim queue, mechanical
// alternation, escalation on failure — and the DIFFERENCE THAT MAKES A
// DIFFERENCE is the control, not the mechanism. The earning case is two
// mouths with DISJOINT failure sets: the dispatcher recovers the union, which
// NO singleton can reach — escalation is the difference-maker, and the
// differential (recovered / matched / no-difference) must read it. A case
// where the better singleton would have matched everything is a case where
// the dispatcher earned nothing, and the trail must make that comparison.
import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceClaimsParallel, differential } from "./voice-parallel.js";
import { claimVoicePrompt } from "./voice.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeReferentIndex } from "./cast.js";
import { chunkSource } from "./source.js";

const organs = async () => ({
  splitSentences: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js")).splitSentences,
  extractSurfaces: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).extractSurfaces,
  discoverReferents: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).discoverReferents,
  namesCorefer: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).namesCorefer,
  diaNorm: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).diaNorm,
  discoverRelationVocab: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).discoverRelationVocab,
  extractRelations: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).extractRelations,
  tokenize: (await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js")).tokenize,
});
const SENTENCES = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.",
  "Dredging of the shipping channel runs through March under the port authority schedule, with the deep berths closed for the duration.",
];
const chunks = chunkSource("notes.txt", SENTENCES.join("\n\n"));
const rel = makeRelationReader(await organs())(chunks, { pool: chunks });
const index = makeReferentIndex(await organs())(chunks);
const read = (t) => rel.read(t);

// two REAL extracted claims — one harbor-marked, one channel-marked — the
// exact shape the record actually voices (extractor noise included; that is
// the honest floor this organ was measured on).
const bound = (s) => read(s).claims.find((c) => c?.verdict === "bound");
const harborClaim = bound(SENTENCES[0]);
const channelClaim = bound(SENTENCES[1]);
assert.ok(harborClaim && channelClaim, "each sentence yields a bound claim");
const harborBody = `${harborClaim.end1} ${harborClaim.label} ${harborClaim.end2}`;
const channelBody = `${channelClaim.end1} ${channelClaim.label} ${channelClaim.end2}`;
assert.notEqual(harborBody, channelBody, "the two claims are distinct");
// ordering matters: alternation assigns by INDEX (i % mouths). A claim must
// land on the mouth that FAILS it for escalation to be the difference-maker.
// escalate-all: channel at even indices → A (fails channel) → B; harbor at
// odd → B (fails harbor) → A.
const escalateAll = [channelClaim, harborClaim, channelClaim, harborClaim, channelClaim, harborClaim];
// the mix: harbor at even → A (matches); channel at odd → A (fails) → B.
const mixClaims = [harborClaim, channelClaim, harborClaim, channelClaim, harborClaim, channelClaim];

const bodyOf = (messages) => /state: ([\s\S]*?)\.\n\nSay it as one sentence/.exec(messages[1].content)?.[1] ?? "";
const isHarbor = (body) => /harbor|Kessington|12/.test(body);
const NEVER = "The audit cleared the spring estimate."; // voices no claim (nothing bound on it)
// A: faithful on the harbor claim, fails the channel claim.
const mouthHarborOnly = async (messages) => (isHarbor(bodyOf(messages)) ? `${harborBody}.` : NEVER);
// B: faithful on the channel claim, fails the harbor claim.
const mouthChannelOnly = async (messages) => (isHarbor(bodyOf(messages)) ? NEVER : `${channelBody}.`);
// the better singleton: faithful on BOTH.
const mouthBoth = async (messages) => (isHarbor(bodyOf(messages)) ? `${harborBody}.` : `${channelBody}.`);
// fails everything.
const mouthNothing = async () => NEVER;

test("disjoint failure sets — escalation recovers the union NO singleton can reach", async () => {
  const mouths = [{ name: "A", call: mouthHarborOnly }, { name: "B", call: mouthChannelOnly }];
  const rows = await voiceClaimsParallel(escalateAll, mouths, { read, index, retries: 1 });
  assert.ok(rows.every((r) => r.verdict.verdict === "matched"), `the union is recovered (${rows.map((r) => r.verdict.verdict).join(",")})`);
  const d = rows.map(differential);
  assert.equal(d.filter((x) => x === "recovered").length, 6, "every claim was recovered by escalation — each landed on its failing mouth first");
  assert.equal(d.filter((x) => x === "no-difference").length, 0);
  // THE CONTROL THAT MUST RESOLVE: no singleton reaches the union.
  const aOnly = await voiceClaimsParallel(escalateAll, [{ name: "A", call: mouthHarborOnly }, { name: "Z", call: mouthNothing }], { read, index, retries: 1 });
  assert.equal(aOnly.filter((r) => r.verdict.verdict === "matched").length, 3, "A alone reaches only its own claims (3/6)");
  const bOnly = await voiceClaimsParallel(escalateAll, [{ name: "Z", call: mouthNothing }, { name: "B", call: mouthChannelOnly }], { read, index, retries: 1 });
  assert.equal(bOnly.filter((r) => r.verdict.verdict === "matched").length, 3, "B alone reaches only its own claims (3/6)");
});

test("a case where the better singleton suffices — recovered is measured, but earned is the comparison against it", async () => {
  // A is faithful on harbor, fails channel; B (mouthBoth) is faithful on
  // EVERYTHING. Order [channel, harbor]×3: channel lands on A (fails) →
  // recovered by B; harbor lands on B (matches, no escalation). B alone would
  // have matched ALL SIX — so the three recoveries are real and NONE is
  // earned. The differential reads both values.
  const mouths = [{ name: "A", call: mouthHarborOnly }, { name: "B", call: mouthBoth }];
  const rows = await voiceClaimsParallel(escalateAll, mouths, { read, index, retries: 1 });
  assert.ok(rows.every((r) => r.verdict.verdict === "matched"));
  const d = rows.map(differential);
  assert.equal(d.filter((x) => x === "matched").length, 3, "the harbor claims matched on the assigned mouth — no escalation spent");
  assert.equal(d.filter((x) => x === "recovered").length, 3, "recovered is real but NOT earned — the better singleton matched the whole set");
  assert.ok(rows.every((r) => r.tried.length >= 1), "the trail makes the singleton baseline computable");
});

test("no-difference stays typed — a claim NO mouth can voice is a born-gate finding, not a mouth failure", async () => {
  const bothFail = [{ name: "A", call: mouthNothing }, { name: "B", call: mouthNothing }];
  const rows = await voiceClaimsParallel([harborClaim, channelClaim], bothFail, { read, index, retries: 1 });
  assert.ok(rows.every((r) => r.verdict.verdict !== "matched"));
  assert.ok(rows.every((r) => r.tried.length === 2), "both mouths were tried — the trail says so");
  assert.ok(rows.every((r) => differential(r) === "no-difference"), "no mouth made a difference — the finding belongs upstream (born gate / extractor), not to a third mouth");
});

test("retries bound escalation — retries 0 never reaches the second mouth", async () => {
  const mouths = [{ name: "A", call: mouthHarborOnly }, { name: "B", call: mouthChannelOnly }];
  const rows = await voiceClaimsParallel([channelClaim], mouths, { read, index, retries: 0 });
  assert.equal(rows[0].tried.length, 1, "no escalation budget, no second mouth");
  assert.notEqual(rows[0].verdict.verdict, "matched");
});

test("B1 holds — no address reaches any mouth; the guard requires two mouths and a reader", async () => {
  const mouths = [{ name: "A", call: mouthHarborOnly }, { name: "B", call: mouthChannelOnly }];
  const withAddr = { ...harborClaim, at: "notes.txt#12-99", refs: ["notes.txt#12-99"] };
  const rows = await voiceClaimsParallel([withAddr, channelClaim], mouths, { read, index, retries: 1 });
  assert.ok(!/notes\.txt#|#12-99/.test(claimVoicePrompt(rows[0].claim)), "the address never reaches the mouth (B1)");
  await assert.rejects(() => voiceClaimsParallel([harborClaim], [mouths[0]], { read, index }), /two mouths/);
  await assert.rejects(() => voiceClaimsParallel([harborClaim], mouths, { index }), /reader/);
});