// voice.test.mjs — ONE PROPOSITION AT A TIME (2026-09-11): the record authors
// the claims; the mouth voices one claim per call; the record verifies each
// voiced sentence against its claim BEFORE the next is handed out. Pinned on
// the real reader, the real index, and a fake mouth that voices faithfully or
// drifts — the whole point is the mouth asserts nothing, it only words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { claimVoicePrompt, verifyVoiced, voiceClaims, VOICE_SYSTEM_PROMPT } from "./voice.js";
import { expectationFrom } from "./dialogue.js";
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
const CORPUS = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.",
  "Dredging of the shipping channel runs through March under the port authority schedule, with the deep berths closed for the duration.",
].join("\n\n");
const chunks = chunkSource("notes.txt", CORPUS);
const rel = makeRelationReader(await organs())(chunks, { pool: chunks });
const index = makeReferentIndex(await organs())(chunks);
const read = (t) => rel.read(t);
const bound = read("The Kessington report put the harbor figure at 12% for the spring quarter.").claims.find((c) => c.verdict === "bound");
const target = { end1: bound.end1, label: bound.label, end2: bound.end2 };

test("verifyVoiced: a faithful paraphrase is MATCHED; a different claim, a hedge, and a denial are caught", () => {
  assert.equal(verifyVoiced("The Kessington report put the harbor figure at 12 percent.", target, read, index).verdict, "matched", "the paraphrase is the same claim — span-overlap");
  assert.notEqual(verifyVoiced("Dredging of the shipping channel runs through March.", target, read, index).verdict, "matched", "a different claim is never matched");
  assert.equal(verifyVoiced("In summary, the matter deserves careful consideration.", target, read, index).verdict, "unvoiced", "a hedge voices nothing");
});

test("claimVoicePrompt carries the claim's words and NEVER its address (B1)", () => {
  const p = claimVoicePrompt({ ...target, at: "notes.txt#12-99", refs: ["notes.txt#12-99"] });
  assert.ok(p.includes("The Kessington report"), "the claim's words reach the mouth");
  assert.ok(!/#12-99|notes\.txt#/.test(p), "the address never reaches the mouth — the record keeps it");
});

test("voiceClaims: ONE claim at a time — a faithful mouth voices every claim and each is verified before the next; a drifting mouth is caught and re-asked, never shipped as voiced", async () => {
  const exp = expectationFrom(chunks, "What does the book say about the harbor figure?", read, index);
  assert.ok(exp.claims.length >= 1, "the record authors at least one claim");
  const faithful = async (messages) => {
    assert.ok(messages[0].content === VOICE_SYSTEM_PROMPT, "the mouth gets the voice instruction");
    const body = /state: ([\s\S]*?)\.\n\nSay it as one sentence/.exec(messages[1].content)?.[1] ?? "";
    // a faithful voice: keep the ACT (the label) and the referents, vary the
    // END-SPAN's phrasing — the grain verification is honest about (P74): a
    // mouth that changes the verb is drifting, not voicing.
    return body.replace("12% for the spring quarter", "12 percent in the spring quarter");
  };
  const r = await voiceClaims(exp.claims, faithful, { read, index, retries: 1 });
  assert.ok(r.every((x) => x.verdict.verdict === "matched"), `every claim voiced and matched (got ${r.map((x) => x.verdict.verdict).join(",")})`);
  // a drifting mouth: voices something else every time — caught, re-asked, never shipped
  const drifter = async () => "Dredging of the shipping channel runs through March.";
  const d = await voiceClaims(exp.claims, drifter, { read, index, retries: 1 });
  assert.ok(d.every((x) => x.verdict.verdict !== "matched"), "every drift is caught");
  assert.ok(d.some((x) => x.attempts > 1), "a drift is re-asked before it is landed as not-voiced");
});