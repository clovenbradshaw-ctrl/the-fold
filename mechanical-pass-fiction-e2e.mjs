// mechanical-pass-fiction-e2e.mjs — push the mechanical pass to FAN-FICTION
// shape and length, driven ONLY by prompts.
//
// The falsification chase (mechanical-pass-falsify.mjs) found CON·Figure
// closes are "mentions, not answers" — word-overlap binds that share the
// question's vocabulary but do not answer its shape. For QUESTION-ANSWERING
// that was a flaw. For NARRATIVE COMPOSITION it is exactly the raw material:
// a fan fiction of a source is a retelling built from the source's OWN
// stated facts, and the pass's closes are precisely those facts, each with
// its byte address.
//
// THE SHAPE, with no free generation anywhere:
//   1. Each PROMPT is a scene beat ("the night before Borodino…").
//   2. The prompt retrieves the source's own passages; the relation reader
//      returns the material's BOUND claims (end1 —label→ end2, addressed).
//   3. A single GENERIC narrative renderer turns each claim into prose using
//      ONLY the claim's own words plus a small DECLARED connective set —
//      the same token-origin discipline compose.js's TRANSITIONS holds.
//   4. The claims of one scene are ordered by their own byte offsets (the
//      source's document order IS the story's chronology).
//   5. compose() joins them with its closed transition table; the scenes
//      chain, so LENGTH comes from the prompt sequence, never from padding.
//
// "Using only prompts": the driver is generic — swap the SCENES array for a
// different story and the whole shape rerenders. No per-prompt code.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as mathjs from "mathjs";

import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm, extractLeadingSurfaces } from "../eoreader7/native/adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/native/adapters/text/relations.js";
import { tokenize, chunkSource, retrieve } from "./source.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeReferentIndex } from "./cast.js";
import { compose, transitionFor, TRANSITIONS } from "./compose.js";
import { selectSceneClaims } from "./scene-select.js";
import { claimKindsOf } from "../eoreader7/native/organs/output-claims.js";
import { orderByNarrative } from "../eoreader7/native/organs/output-order.js";
import { voiceOf } from "../eoreader7/native/organs/output-voice.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "mechanical-pass-fiction-e2e.html");

const material = readFileSync(join(HERE, "pg2600.txt"), "utf8");
const chunks = chunkSource("pg2600.txt", material);
const chunksByRef = new Map(chunks.map((c) => [c.ref, c]));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
  nounPhraseSubjects: true, objectSpecificity: true,
  createLemmatizer: () => ({ sameAct: (a, b) => String(a).toLowerCase() === String(b).toLowerCase() }),
  morphologyIndex: {}, determiners: new Set(["the", "a", "an"]),
});

const referentIndex = makeReferentIndex({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  leadingSurfaces: extractLeadingSurfaces,
});

// ── the scenes — the ONLY thing a person changes to write a different story ─
// Scenes come from the command line: `node mechanical-pass-fiction-e2e.mjs
// -- "scene one" "scene two" ...`. Bare `node mechanical-pass-fiction-e2e.mjs`
// runs the default set. The driver is otherwise untouchable — this file is
// the prompt door, nothing else is a variable.
const DEFAULT_SCENES = [
  "The night before the battle of Borodino, Prince Andrew walks through the camp and thinks of his son and of Natasha.",
  "Napoleon from the height looks down on the field and gives his orders.",
  "Pierre rides out to see the battle, carrying his white hat and his uneasy heart.",
  "The French cross the river and the cannon begin, and Kutuzov receives the reports.",
];
const SCENES = (() => {
  const argv = process.argv.slice(2);
  const prompts = argv.filter((a) => !a.startsWith("-"));
  return prompts.length ? prompts : DEFAULT_SCENES;
})();

// ── one generic narrative renderer — the whole fan-fiction voice ──────────
// The register is chosen by the PROMPT's own cues (output-voice.js): a
// "tell me a story" prompt wears Terry Gross's oral frame; a "precise
// report" wears Kubrick's. The frame writes only the claim's own words
// inside the register's declared shape — never an invented sentence.
// `makeRenderer(prompt)` closes the prompt so compose's (merged, claim)
// signature is honoured.
const makeRenderer = (prompt) => (merged, claim) => {
  const c = String(claim?.case ?? merged?.case ?? "").toUpperCase();
  if (c === "UNDETERMINED" || !c) return null;
  const v = voiceOf({ prompt, claim: { end1: claim?.end1, label: claim?.label, end2: claim?.end2 } });
  return v.text || null;
};

// ── a scene: retrieve on the prompt, SELECT the story's claims ────────────
const sceneClaims = (prompt) => {
  const pool = retrieve(chunks, prompt, 8, [], {});
  // THE REFERENT INDEX MUST SEE THE MATERIAL, or the prompt's names resolve
  // to nothing and selection falls to bare word-touch (measured: "French,
  // Napoleon, Kutuzov" all unresolved → the story prompts selected 0 of 51).
  // makeReferentIndex is a FACTORY: indexFor(passages) builds the real index
  // over the material. Built per scene over the retrieved pool.
  const sceneIndex = makeReferentIndex({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    leadingSurfaces: extractLeadingSurfaces,
  })(pool);
  const res = reader(pool);
  const claims = [];
  for (const p of pool) {
    const r = res.read(String(p?.text ?? ""));
    for (const c of r?.claims ?? []) {
      if (c?.verdict !== "bound") continue;
      const end1 = c.end1 ?? c.subject ?? "";
      const label = c.label ?? c.verb ?? "";
      const end2 = c.end2 ?? c.object ?? "";
      if (!end1 || !label || !end2) continue;
      // the claim's byte offset in the source — document order IS chronology
      const at = String(chunksByRef.get(p.ref)?.text ?? "").indexOf(end1.slice(0, 20));
      claims.push({
        end1, label, end2,
        claim: { end1, label, end2, sentence: [end1, label, end2].join(" "), refs: [...new Set([p.ref, ...(c.refs ?? [])])] },
        merged: { case: c.polarity === "-" ? "DISAGREE" : "SINGLE", standing: c.refs?.length >= 2 ? "corroborated" : "single" },
        offset: at >= 0 ? at : 0,
      });
    }
  }
  // de-duplicate identical claims across passages
  const seen = new Set();
  const uniq = claims.filter((it) => {
    const k = it.claim.sentence.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // SELECT the story: only claims whose ends touch the prompt's referents
  // or words. The material states a lot; the story needs a subset, and the
  // rest is WITHHELD with the reason — the fix for "composed N of N, 0
  // withheld" (the falsification's finding). The referent index is the
  // SCENE's own, built over the retrieved pool.
  const sel = selectSceneClaims({ prompt, claims: uniq, referentIndex: sceneIndex });
  return sel;
};

// ── run the story ──────────────────────────────────────────────────────────
const chapters = [];
const allCoverage = [];
for (const [i, prompt] of SCENES.entries()) {
  const sel = sceneClaims(prompt);
  // THE NEW ORGANS: hear the material's own claim-kinds (dialogue, cause,
  // sequence) and order the selected claims by the narrative anchors the
  // material itself states — the THEN probe's fix (output-order).
  const kinds = claimKindsOf(sel.selected.map((s) => s.claim.sentence).join("\n"), { language: "en" });
  const narr = orderByNarrative({
    kinds: kinds.kinds,
    claims: sel.selected.map((s, idx) => ({ ...s, claim: s.claim, span: { start: idx, end: idx + 1 }, offset: idx })),
  });
  const ordered = narr.refused ? sel.selected : narr.ordered.map((o) => ({ ...o, offset: undefined }));
  const out = compose(ordered, {
    renderClaim: makeRenderer(prompt),
    orderBy: (a, b) => (a.offset ?? 0) - (b.offset ?? 0),
  });
  allCoverage.push(out.coverage);
  chapters.push({
    scene: i + 1,
    prompt,
    claims: sel.selected.length,
    totalClaims: sel.selected.length + sel.withheld.length,
    withheldCount: sel.withheld.length,
    kindLine: kinds.basis,
    orderLine: narr.basis,
    coverage: out.coverage,
    text: out.text,
    sentences: out.sentences.map((s) => s.text),
    withheld: sel.withheld,
  });
}

// ── render the story ───────────────────────────────────────────────────────
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const chapterHtml = chapters
  .map((ch) => {
    const sentences = ch.sentences.length
      ? ch.sentences.map((s) => `<p class="sentence">${esc(s)}</p>`).join("")
      : `<p class="empty">no bound claim composed for this scene</p>`;
    return `<section class="chapter">
      <h2>Scene ${ch.scene} — <span class="prompt">${esc(ch.prompt)}</span></h2>
      <div class="counts">${ch.claims} of ${ch.totalClaims} bound claims selected for the story · composed ${ch.coverage.composed} · ${ch.withheldCount} withheld by selection · ${esc(ch.kindLine)} · ${esc(ch.orderLine)}</div>
      <div class="prose">${sentences}</div>
    </section>`;
  })
  .join("");

const total = allCoverage.reduce((a, c) => ({ composed: a.composed + c.composed, given: a.given + c.given, withheld: a.withheld + c.withheld }), { composed: 0, given: 0, withheld: 0 });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The mechanical pass, as fan fiction — composed from the source's own claims</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font:15px/1.65 Georgia, "Times New Roman", serif; margin:0; padding:32px 24px 90px; }
  header { max-width:760px; margin:0 auto 10px; }
  h1 { font-size:24px; margin:0 0 6px; }
  .lede { color:var(--dim); font-size:13.5px; max-width:72ch; line-height:1.5; }
  main { max-width:760px; margin:0 auto; }
  .chapter { margin:26px 0; }
  .chapter h2 { font-size:15px; color:var(--ink); letter-spacing:.02em; }
  .chapter h2 .prompt { color:var(--dim); font-weight:400; font-style:italic; }
  .counts { font:11px ui-monospace,Menlo,monospace; color:var(--dim); margin:2px 0 10px; }
  .prose { border-left:3px solid #2a2f34; padding-left:18px; }
  .sentence { margin:0 0 10px; }
  .sentence:first-letter { font-size:1.35em; color:#c2a96b; }
  .empty { color:var(--dim); font-style:italic; }
  .total { margin-top:24px; padding-top:14px; border-top:1px solid #262a2e; color:var(--dim); font:11.5px ui-monospace,Menlo,monospace; }
</style>
</head>
<body>
  <header>
    <h1>The mechanical pass, as fan fiction</h1>
    <p class="lede">Four scene prompts, retrieved against the real 3.3MB <code>pg2600.txt</code> (War and Peace). Every sentence is <b>composed, never generated</b>: the relation reader returns the material's own bound claims (end —label→ end, byte-addressed), a single declared narrative voice renders them using only the claims' own words plus a closed connective set, document order supplies the chronology, and <code>compose()</code>'s token-trace rule makes fabrication structurally impossible. No model ran. Change the <code>SCENES</code> array to write a different story — the shape is prompt-driven.</p>
  </header>
  <main>
    ${chapterHtml}
    <div class="total">total: ${total.composed} of ${total.given} bound claims composed into prose · ${total.withheld} withheld (each named by compose, never silent) · every word traces to a byte address</div>
  </main>
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
for (const ch of chapters) {
  console.log(`\nScene ${ch.scene}: ${ch.prompt}`);
  console.log(`  ${ch.claims} of ${ch.totalClaims} bound claims selected → composed ${ch.coverage.composed} · ${ch.withheldCount} withheld by selection`);
  console.log(`  ${ch.text.slice(0, 300)}${ch.text.length > 300 ? "…" : ""}`);
}
console.log(`\ntotal prose: ${total.composed} sentences across ${SCENES.length} scenes · every token traces to a source byte`);