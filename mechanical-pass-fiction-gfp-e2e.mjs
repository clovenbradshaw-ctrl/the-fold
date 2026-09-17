// mechanical-pass-fiction-gfp-e2e.mjs — the fan-fiction chase at the GFP
// level, not the SVO level.
//
// THE CORRECTION (user, 2026-09-16): "svo is too high a level up, gfp"
// and "its the english specific grammatical level is the real point." The
// first fiction driver composed from the SVO relation reader's claims —
// measured 82% fragment-ended ("road by", "frightened face"), because SVO
// is a grammatical level and English's grammar is one language's
// convention. The nonsense prose was that level's fault, and no gate at
// the SVO level (claim-integrity) could fix it — it would only enforce
// English grammar harder.
//
// THE FIX: compose from GFP ARRANGEMENTS. The unit is {end1, label, end2} —
// figure, act, ground — resolved by the language's OWN slot organ
// (relations-positional.js's makePositionalSlots over the measured English
// RoleConfig@1: subject 96.4% before the verb, object 96.6% after). Ends
// are POS-classified nominals — "army", "orders", "reports", "Vienna" —
// never trigram fragments. A sentence that yields no clean arrangement is
// an HONEST GAP (makePositionalSlots returns []), never a fragment shipped
// as prose. Order is document order (the material's own sequence); voice
// is the prompt's register (output-voice.js); pathos would measure the
// result (pacing.js) — but the composition is only ever arrangements.
//
// PURE ORGANS, no model. Scenes from argv, exactly like the SVO driver.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as mathjs from "mathjs";

import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm, extractLeadingSurfaces } from "../eoreader7/native/adapters/text/surfaces.js";
import { tokenize, chunkSource, retrieve } from "./source.js";
import { classifyWord, dominantClass } from "../eoreader7/native/adapters/text/wordclass.js";
import { extractPositionalRelation, makePositionalSlots } from "../eoreader7/native/adapters/text/relations-positional.js";
import { makeGfpGround } from "./grounding-gfp.js";
import { compose } from "./compose.js";
import { voiceOf } from "../eoreader7/native/organs/output-voice.js";
import { makeReferentIndex } from "./cast.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "mechanical-pass-fiction-gfp-e2e.html");

const material = readFileSync(join(HERE, "pg2600.txt"), "utf8");
const chunks = chunkSource("pg2600.txt", material);

const posPrior = JSON.parse(readFileSync(join(HERE, "../eoreader7/native/priors/pos-eng.json"), "utf8"));
const roleConfig = JSON.parse(readFileSync(join(HERE, "../eoreader7/native/priors/role-config-eng.json"), "utf8"));

const slotsOf = makePositionalSlots({ roleConfig, posPrior, classifyWord, dominantClass });

const DEFAULT_SCENES = [
  "Tell me a story: first the French crossed the river, then Napoleon gave his orders, afterward Kutuzov received the reports.",
  "Give the precise report: Napoleon from the height looked down on the field and ordered the attack.",
  "Pierre rode out to the battle, and he was afraid as he went.",
];
const SCENES = (() => {
  const argv = process.argv.slice(2);
  const prompts = argv.filter((a) => !a.startsWith("-"));
  return prompts.length ? prompts : DEFAULT_SCENES;
})();

const makeRenderer = (prompt) => (merged, claim) => {
  const c = String(claim?.case ?? merged?.case ?? "").toUpperCase();
  if (c === "UNDETERMINED" || !c) return null;
  const v = voiceOf({ prompt, claim: { end1: claim?.end1, label: claim?.label, end2: claim?.end2 } });
  return v.text || null;
};

// ── a scene at the GFP level: the material's OWN arrangements ─────────────
const sceneArrangements = (prompt) => {
  const pool = retrieve(chunks, prompt, 8, [], {});
  // THE GFP READER: every sentence of the retrieved passages resolved into
  // {end1, label, end2} by the English eigenvalue; a sentence that yields
  // none is an honest gap, never a fragment shipped as prose.
  const arrangements = [];
  const gaps = [];
  for (const p of pool) {
    const text = String(p?.text ?? "");
    const sents = (() => { try { return splitSentences(text); } catch { return [text]; } })();
    for (const s of sents.map((x) => (typeof x === "string" ? x : x?.text ?? ""))) {
      const rel = extractPositionalRelation(s, { roleConfig, posPrior, classifyWord, dominantClass });
      if (rel?.end1 && rel?.label && rel?.end2) {
        arrangements.push({
          end1: rel.end1.word, label: rel.label.word, end2: rel.end2.word,
          claim: { end1: rel.end1.word, label: rel.label.word, end2: rel.end2.word, sentence: [rel.end1.word, rel.label.word, rel.end2.word].join(" ") },
          merged: { case: "SINGLE", standing: "single" },
          offset: String(p?.text ?? "").indexOf(s),
          ref: p.ref ?? null,
        });
      } else {
        const reason = Array.isArray(rel?.gap) ? rel.gap.join("; ") : (rel?.gap && typeof rel.gap === "object" ? String(rel.gap.reason ?? JSON.stringify(rel.gap)) : String(rel?.gap ?? "no clean arrangement"));
        gaps.push({ sentence: s.slice(0, 70), reason });
      }
    }
  }
  // de-duplicate
  const seen = new Set();
  const uniq = arrangements.filter((a) => { const k = a.claim.sentence.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  return { arrangements: uniq, gaps };
};

const chapters = [];
for (const [i, prompt] of SCENES.entries()) {
  const { arrangements, gaps } = sceneArrangements(prompt);
  const out = compose(arrangements, {
    renderClaim: makeRenderer(prompt),
    orderBy: (a, b) => (a.offset ?? 0) - (b.offset ?? 0),
  });
  chapters.push({
    scene: i + 1,
    prompt,
    arrangements: arrangements.length,
    gaps: gaps.length,
    coverage: out.coverage,
    text: out.text,
    sentences: out.sentences.map((s) => s.text),
    sampleGaps: gaps.slice(0, 3),
  });
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const chapterHtml = chapters
  .map((ch) => {
    const sentences = ch.sentences.length
      ? ch.sentences.map((s) => `<p class="sentence">${esc(s)}</p>`).join("")
      : `<p class="empty">no clean GFP arrangement composed for this scene</p>`;
    const gapRows = ch.sampleGaps.length
      ? `<div class="gaps">honest gaps (${ch.gaps} total): ${ch.sampleGaps.map((g) => `«${esc(g.sentence)}» — ${esc(g.reason)}`).join(" · ")}</div>`
      : "";
    return `<section class="chapter">
      <h2>Scene ${ch.scene} — <span class="prompt">${esc(ch.prompt)}</span></h2>
      <div class="counts">${ch.arrangements} clean GFP arrangements · ${ch.gaps} honest gaps · composed ${ch.coverage.composed} of ${ch.coverage.given}</div>
      <div class="prose">${sentences}</div>
      ${gapRows}
    </section>`;
  })
  .join("");

const totalArr = chapters.reduce((a, c) => a + c.arrangements, 0);
const totalGaps = chapters.reduce((a, c) => a + c.gaps, 0);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The mechanical pass, as fan fiction — composed at the GFP level</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font:15px/1.65 Georgia, "Times New Roman", serif; margin:0; padding:32px 24px 90px; }
  header { max-width:760px; margin:0 auto 10px; }
  h1 { font-size:24px; margin:0 0 6px; }
  .lede { color:var(--dim); font-size:13.5px; max-width:76ch; line-height:1.5; }
  main { max-width:760px; margin:0 auto; }
  .chapter { margin:26px 0; }
  .chapter h2 { font-size:15px; }
  .chapter h2 .prompt { color:var(--dim); font-weight:400; font-style:italic; }
  .counts { font:11px ui-monospace,Menlo,monospace; color:var(--dim); margin:2px 0 10px; }
  .prose { border-left:3px solid #2a2f34; padding-left:18px; }
  .sentence { margin:0 0 10px; }
  .gaps { margin-top:10px; font-size:12px; color:var(--dim); font-style:italic; }
  .empty { color:var(--dim); font-style:italic; }
  .total { margin-top:24px; padding-top:14px; border-top:1px solid #262a2e; color:var(--dim); font:11.5px ui-monospace,Menlo,monospace; }
</style>
</head>
<body>
  <header>
    <h1>The mechanical pass, as fan fiction — composed at the GFP level</h1>
    <p class="lede">The correction, applied: the first fiction driver composed from the SVO relation reader — 82% fragment-ended, nonsense. This one composes from <b>GFP arrangements</b>: each sentence resolved into {figure, act, ground} by the language's own measured eigenvalue (English RoleConfig@1: subject 96.4% before the verb, object 96.6% after), so ends are clean nominals — "army", "orders", "reports" — never "road by". A sentence that yields no clean arrangement is an <b>honest gap</b>, reported, never rendered as prose. No model ran.</p>
  </header>
  <main>
    ${chapterHtml}
    <div class="total">total: ${totalArr} clean GFP arrangements · ${totalGaps} honest gaps · every rendered word traces to an arrangement's own ends</div>
  </main>
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
for (const ch of chapters) {
  console.log(`\nScene ${ch.scene}: ${ch.prompt}`);
  console.log(`  ${ch.arrangements} arrangements · ${ch.gaps} honest gaps · composed ${ch.coverage.composed} of ${ch.coverage.given}`);
  console.log(`  ${ch.text.slice(0, 260)}${ch.text.length > 260 ? "…" : ""}`);
  if (ch.sampleGaps.length) console.log(`  gaps: ${ch.sampleGaps.map((g) => g.reason).join(" | ")}`);
}