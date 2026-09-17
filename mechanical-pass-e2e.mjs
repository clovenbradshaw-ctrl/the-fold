// mechanical-pass-e2e.mjs — run the pre-speech walk against the REAL organs
// over REAL War-and-Peace material, and render the thread to the browser.
//
// The same bundle app.js builds (P69's ratchet: native organs imported by
// relative path, the mount a browser-only concern), wired into
// runMechanicalPass exactly as the production seam would wire it:
//
//   reader        hypergraph.js::makeRelationReader   (the CON·Figure edges)
//   referentIndex cast.js::makeReferentIndex          (SIG·Figure identity)
//   sameAct       morphology.js::createLemmatizer over the committed
//                 morphology-eng.json prior            (inflectional paraphrase)
//   exact door    answerable.js::answerBeforeTheModel  (INS·Figure, no model)
//
// The questions are GENUINELY difficult ones that a small model gets wrong:
// exact-address retrievals, comparisons with unit errors, pronoun-anchored
// asks, and questions whose material states a DIFFERENT act than the ask
// (the paraphrase seam's sharpest wall). Each is run through the pass and
// rendered as a chat thread: the question, every cell's close/refusal, and
// the residual the mouth would compose. Writes mechanical-pass-e2e.html
// and opens it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as mathjs from "mathjs";

import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../eoreader7/native/adapters/text/pronouns.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/native/adapters/text/relations.js";
import { createLemmatizer, morphologyFromPrior } from "../eoreader7/native/adapters/text/morphology.js";
import { tokenize, chunkSource, retrieve } from "./source.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeReferentIndex } from "./cast.js";
import { answerBeforeTheModel } from "./answerable.js";
import { runMechanicalPass } from "./mechanical-pass.js";
import * as expectationModule from "./dialogue.js";
import * as misquoteModule from "./correction.js";
import * as premisesModule from "./correction.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "mechanical-pass-e2e.html");

// ── the real bundle, the same seam app.js uses ─────────────────────────────
const reader = makeRelationReader({
  splitSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  discoverRelationVocab,
  extractRelations,
  tokenize,
  nounPhraseSubjects: true,
  objectSpecificity: true,
  createLemmatizer: () => ({ sameAct: (a, b) => String(a).toLowerCase() === String(b).toLowerCase() }),
  morphologyIndex: {},
  determiners: new Set(["the", "a", "an", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their"]),
});
// The reader is relationsFor(passages) → { read, edges, ... }; read(text) judges.

const referentIndex = makeReferentIndex({
  splitSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  leadingSurfaces: extractLeadingSurfaces,
});

const priorRaw = JSON.parse(readFileSync(join(HERE, "../eoreader7/native/priors/morphology-eng.json"), "utf8"));
const prior = morphologyFromPrior(priorRaw);
const sameAct = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

const material = readFileSync(join(HERE, "pg2600.txt"), "utf8");
const chunks = chunkSource("pg2600.txt", material);

// ── the questions: genuinely hard ones ────────────────────────────────────
const QUESTIONS = [
  "What river did the French army cross to invade Russia?",
  "Did the French army cross the Niemen before the battle of Borodino?",
  "Who was the first to learn that the French army had crossed the Niemen?",
  "How many years apart were 1805 and 1841?",
  "Which is earlier, 1805 or 1841, and how many years apart are they?",
  "Did the French army retreat from the Niemen?",
  "What did Kutuzov's army cross on the twenty-eighth of October?",
];

const results = [];
for (const q of QUESTIONS) {
  const pool = retrieve(chunks, q, 4, [], {});
  const exact = answerBeforeTheModel({ question: q, passages: pool, transcript: [], math: mathjs, chunksByRef: new Map(chunks.map((c) => [c.ref, c])) });
  // The real reader, over THIS question's own retrieved passages — the same
  // seam runPart uses (relationsFor(passages) → read each passage).
  const rel = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize,
    nounPhraseSubjects: true, objectSpecificity: true,
    createLemmatizer: () => ({ sameAct: (a, b) => (sameAct ? sameAct(a, b) : String(a).toLowerCase() === String(b).toLowerCase()) }),
    morphologyIndex: {},
    determiners: new Set(["the", "a", "an"]),
  })(pool);
  const read = (t) => rel.read(String(t ?? ""));
  const expectationFrom = (passages, question, rd, index, voids) => {
    const { expectationFrom: ef } = expectationModule;
    return ef(passages, question, rd, index, voids);
  };
  const r = runMechanicalPass({
    question: q,
    organs: {
      admission: ({ question, sources }) => ({ admitted: sources, refused: [] }),
      whatWouldSettle: () => [],
      referentIndex,
      answerBeforeTheModel: ({ question, passages, transcript, math, chunksByRef }) => answerBeforeTheModel({ question, passages, transcript, math, chunksByRef }),
      read,
      sameAct,
      expectationFrom,
      findMisquote: (question, passages) => { try { return misquoteModule.findMisquote(question, passages); } catch { return null; } },
      checkPremises: (question, passages, opts) => { try { return premisesModule.checkPremises(question, passages, opts); } catch { return null; } },
    },
    context: { passages: pool, transcript: [], math: mathjs, chunksByRef: new Map(chunks.map((c) => [c.ref, c])), sources: pool, voids: [], priorNotes: [] },
  });
  results.push({ question: q, pool: pool.map((p) => ({ ref: p.ref, text: p.text.slice(0, 120) })), pass: r, exact: exact ? { kind: exact.kind, text: exact.text } : null });
}

// ── render the thread ──────────────────────────────────────────────────────
const cellColor = (cell) => {
  if (cell.startsWith("NUL")) return "#c2572f";
  if (cell.startsWith("SIG")) return "#2f6b8f";
  if (cell.startsWith("INS")) return "#3f7d4a";
  if (cell.startsWith("SEG")) return "#c2572f";
  if (cell.startsWith("CON")) return "#2f6b8f";
  if (cell.startsWith("SYN")) return "#3f7d4a";
  if (cell.startsWith("DEF")) return "#c2572f";
  if (cell.startsWith("EVA")) return "#2f6b8f";
  return "#3f7d4a";
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderTurn = ({ question, pool, pass, exact }) => {
  const rows = pass.cells.map((c) => {
    const close = c.close
      ? `<div class="close"><b>CLOSE</b> ${esc(c.close.text)}${c.close.addresses?.length ? ` <span class="addr">@ ${esc(c.close.addresses.join(", "))}</span>` : ""}${c.close.why ? ` <span class="why">— ${esc(c.close.why)}</span>` : ""}</div>`
      : `<div class="refuse"><b>REFUSE</b> ${esc(c.refusal.type)} <span class="why">${esc(c.refusal.detail)}</span></div>`;
    return `<div class="cell" style="border-left:3px solid ${cellColor(c.cell)}">
      <div class="cell-name">${esc(c.cell)}</div>
      ${close}
    </div>`;
  }).join("");

  const poolRows = pool.length
    ? pool.map((p) => `<div class="passage"><span class="addr">${esc(p.ref)}</span> ${esc(p.text)}…</div>`).join("")
    : `<div class="passage none">no passages retrieved</div>`;

  const residual = pass.residual
    ? `<div class="residual"><b>RESIDUAL — the mouth composes:</b> ${esc(pass.residual.question)}<div class="why">${esc(pass.residual.why)}</div>${pass.residual.boundary ? ` <span class="boundary">boundary: ${esc(pass.residual.boundary.cell)} · ${esc(pass.residual.boundary.type)}</span>` : ""}</div>`
    : `<div class="residual answered"><b>ANSWERED BY THE PASS — no model.</b> ${exact ? esc(exact.text) : ""}</div>`;

  return `<div class="turn">
    <div class="question">${esc(question)}</div>
    <details open><summary>retrieved (${pool.length})</summary>${poolRows}</details>
    <div class="cells">${rows}</div>
    ${residual}
    ${exact ? `<div class="exact">the exact door would have answered: <i>${esc(exact.text)}</i></div>` : ""}
  </div>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The mechanical pass — pre-speech walk, live on War and Peace</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font:14px/1.5 "Helvetica Neue",Arial,sans-serif; margin:0; padding:28px 22px 80px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .lede { color:var(--dim); max-width:78ch; margin:0 0 6px; }
  .meta { color:var(--dim); font:11.5px ui-monospace,Menlo,monospace; margin-bottom:22px; }
  .turn { border:1px solid #262a2e; border-radius:10px; padding:14px 16px; margin:14px 0; background:#121518; }
  .question { font-size:15.5px; font-weight:600; margin-bottom:8px; }
  .passage { font-size:12px; color:var(--dim); margin:3px 0; padding-left:10px; border-left:2px solid #2a2f34; }
  .passage.none { color:#8b877d; font-style:italic; }
  details { margin:6px 0; }
  summary { color:var(--dim); cursor:pointer; font-size:12.5px; }
  .cells { display:flex; flex-direction:column; gap:4px; margin:10px 0; }
  .cell { padding:6px 10px; border-radius:6px; background:#0d1012; }
  .cell-name { font:11px ui-monospace,Menlo,monospace; color:var(--dim); margin-bottom:2px; }
  .close { font-size:12.5px; color:#bfe8c4; }
  .refuse { font-size:12.5px; color:#e0a08a; }
  .addr { font:10.5px ui-monospace,Menlo,monospace; color:#6ea8d8; }
  .why { color:var(--dim); font-style:italic; }
  .residual { margin-top:10px; padding:9px 12px; border-radius:8px; background:#1a1d20; font-size:13.5px; }
  .residual .why { margin-top:3px; }
  .boundary { font:11px ui-monospace,Menlo,monospace; color:#c2a96b; }
  .residual.answered { background:#14241a; color:#bfe8c4; }
  .exact { margin-top:8px; font-size:12px; color:var(--dim); }
</style>
</head>
<body>
  <h1>The mechanical pass — the pre-speech walk, live</h1>
  <p class="lede">Each question is run through <code>runMechanicalPass</code> wired to the <b>real</b> organs — the relation reader, the referent index, the morphology prior (sameAct), the exact door — over the real 3.3MB <code>pg2600.txt</code> (War and Peace). Every cell closes (the instrument knew, with an address) or refuses (typed — the model's authorization). The residual is exactly what the mouth would compose. No model ran anywhere.</p>
  <div class="meta">material: pg2600.txt · ${chunks.length.toLocaleString()} chunks · ${results.length} questions · organs: hypergraph reader + cast referents + UniMorph morphology + answerable exact door</div>
  ${results.map(renderTurn).join("")}
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
for (const r of results) {
  const nClose = r.pass.cells.filter((c) => c.close).length;
  const nRefuse = r.pass.cells.filter((c) => c.refusal).length;
  console.log(`\n» ${r.question}`);
  console.log(`   closes ${nClose} · refusals ${nRefuse} · answered=${r.pass.answered} · boundary=${r.pass.boundary?.cell ?? "—"}`);
  for (const c of r.pass.cells.filter((x) => x.close)) console.log(`     CLOSE  ${c.cell}: ${c.close.text.slice(0, 80)}`);
  for (const c of r.pass.cells.filter((x) => x.refusal)) console.log(`     REFUSE ${c.cell}: ${c.refusal.type}`);
}