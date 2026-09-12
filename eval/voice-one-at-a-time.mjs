// eval/voice-one-at-a-time.mjs — the claim-atomic turn: the record authors the
// claims (expectationFrom), the mouth voices ONE claim per call, and the record
// verifies each voiced sentence against its claim (verifyVoiced) BEFORE the
// next is handed out. A faithful mouth is matched claim by claim; a mouth that
// drifts (changes the act or the referents) is caught and re-asked, never
// shipped as voiced.
//
//   node eval/voice-one-at-a-time.mjs
import { voiceClaims, claimVoicePrompt } from "../voice.js";
import { expectationFrom } from "../dialogue.js";
import { makeRelationReader } from "../hypergraph.js";
import { makeReferentIndex } from "../cast.js";
import { chunkSource } from "../source.js";

const organs = async () => ({
  splitSentences: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js")).splitSentences,
  extractSurfaces: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).extractSurfaces,
  discoverReferents: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).discoverReferents,
  namesCorefer: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).namesCorefer,
  diaNorm: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).diaNorm,
  discoverRelationVocab: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).discoverRelationVocab,
  extractRelations: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).extractRelations,
  tokenize: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js")).tokenize,
});
const CORPUS = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.",
  "Dredging of the shipping channel runs through March under the port authority schedule, with the deep berths closed for the duration.",
  "The port authority postponed the channel works until the audit cleared the spring estimate.",
].join("\n\n");
const chunks = chunkSource("notes.txt", CORPUS);
const rel = makeRelationReader(await organs())(chunks, { pool: chunks });
const index = makeReferentIndex(await organs())(chunks);
const read = (t) => rel.read(t);

const exp = expectationFrom(chunks, "What does the book say about the harbor figure and the channel works?", read, index);
const faithful = async (messages) => {
  const body = /state: ([\s\S]*?)\.\n\nSay it as one sentence/.exec(messages[1].content)?.[1] ?? "";
  return body.replace("12% for the spring quarter", "12 percent in the spring quarter");
};
const drifter = async () => "The port authority postponed the channel works until the audit cleared.";

const run = async (name, mouth) => {
  const rows = await voiceClaims(exp.claims, mouth, { read, index, retries: 1 });
  const matched = rows.filter((r) => r.verdict.verdict === "matched").length;
  const caught = rows.filter((r) => r.verdict.verdict !== "matched").length;
  console.log(`— ${name}: ${rows.length} claim(s), ${matched} voiced+matched, ${caught} caught (${rows.map((r) => r.verdict.verdict).join(", ")})`);
  for (const r of rows.slice(0, 4)) {
    console.log(`    target: ${r.claim.end1} ${r.claim.label} ${r.claim.end2}  →  ${r.verdict.verdict}${r.verdict.via ? ` (${r.verdict.via})` : ""}`);
  }
  return rows;
};

console.log(`ONE PROPOSITION AT A TIME — the record authors, the mouth voices, the record verifies each sentence before the next\n`);
run("faithful mouth", faithful);
run("drifting mouth", drifter);