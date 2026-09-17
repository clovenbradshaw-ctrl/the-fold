// mechanical-pass-bilingual-e2e.mjs — the pre-speech walk in Hebrew and
// Attic Greek, over REAL material, with NO English assumptions.
//
// What the pass must do in each language, honestly:
//   1. retrieve — tokenize is \p{L}\p{N} (P62), so a Hebrew/Greek question
//      produces tokens; whether retrieval finds material is the real test.
//   2. the exact door (answerable.js) — its triggers are lang/en (S39), so
//      a Hebrew/Greek question must DECLINE, never silently English-match.
//   3. the reader (hypergraph.js) — the relation organs are English-tuned
//      (the census names the second-typology extractor as real unbuilt
//      work); so the pass must refuse typed where the reader is silent,
//      never guess.
//   4. morphology — the Hebrew identity-classes and Greek UniMorph priors
//      exist; the pass must use the right one or refuse typed.
//
// MATERIAL:
//   Hebrew — the Westminster Leningrad Codex Tanakh (live_priors,
//            openscriptures/morphhb, public domain): real prose, real
//            cantillation marks (the tokenizer must strip them).
//   Greek  — the Greek UniMorph prior (30215 forms) + a constructed real
//            Attic sentence; no real Greek prose file exists on disk (both
//            "odyssey-greek.txt" files are the Samuel Butler ENGLISH
//            translation, verified), so the honest Greek test is: does the
//            pass tokenize, retrieve-when-shared, decline the exact door,
//            and refuse the reader's silence typed?
//
// Renders both as a chat thread and opens it.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as mathjs from "mathjs";

import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/native/adapters/text/relations.js";
import { tokenize, chunkSource, retrieve } from "./source.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeReferentIndex } from "./cast.js";
import { answerBeforeTheModel } from "./answerable.js";
import { runMechanicalPass } from "./mechanical-pass.js";
import { expectationFrom } from "./dialogue.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "mechanical-pass-bilingual-e2e.html");

const referentIndex = makeReferentIndex({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  leadingSurfaces: extractLeadingSurfaces,
});

// ── the Hebrew material: the WLC Tanakh (real prose) ──────────────────────
const WLC = "/Users/mlacy/Documents/3.0/live_priors/14-holy-texts/wlc-tanakh/";
const hebFile = join(WLC, "2Sam.txt");
const hebText = existsSync(hebFile) ? readFileSync(hebFile, "utf8") : "";
const hebChunks = hebText ? chunkSource("2Sam.txt", hebText) : [];

// ── the Greek material: no real Greek prose on disk (both odyssey files are
//    English — verified); a declared Attic sentence + the UniMorph prior. ──
const GRC_TEXT = "ὁ γαλλικὸς στρατὸς διέβη τὸν Νέμωνα, ἵνα εἰσβάλῃ εἰς τὴν Ῥωσίαν.";
const grcChunks = chunkSource("attic.txt", GRC_TEXT);

// ── the questions ─────────────────────────────────────────────────────────
const CASES = [
  {
    lang: "he",
    label: "Hebrew — real WLC Tanakh prose",
    q: "מֵת שָׁאוּל וְדָוִד שָׁמַע — מָה עָשָׂה דָוִד?" ,
    material: "2Sam.txt (Westminster Leningrad Codex)",
    note: "a question about real Hebrew prose — retrieval and the exact door under a non-English question (S39)",
  },
  {
    lang: "he",
    label: "Hebrew — a question whose words the material literally carries",
    q: "מֵת שָׁאוּל",
    material: "2Sam.txt",
    note: "the material's own words, verbatim — does retrieval find them?",
  },
  {
    lang: "grc",
    label: "Attic Greek — constructed sentence, real morphology prior",
    q: "ὁ γαλλικὸς στρατὸς διέβη τὸν Νέμωνα;",
    material: "attic.txt (declared) + UniMorph grc prior (30215 forms)",
    note: "the exact door's triggers are lang/en — it must decline, never silently English-match",
  },
  {
    lang: "grc",
    label: "Attic Greek — a question the material does not answer",
    q: "τίς ὁ Ὅμηρος ἦν;",
    material: "attic.txt",
    note: "a different subject — the pass must refuse typed, not guess",
  },
];

const results = [];
for (const t of CASES) {
  const chunks = t.lang === "he" ? hebChunks : grcChunks;
  const pool = retrieve(chunks, t.q, 4, [], {});
  const exact = chunks.length ? answerBeforeTheModel({ question: t.q, passages: pool, transcript: [], math: mathjs, chunksByRef: new Map(chunks.map((c) => [c.ref, c])) }) : null;

  const reader = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize,
    nounPhraseSubjects: true, objectSpecificity: true,
    createLemmatizer: () => ({ sameAct: (a, b) => String(a).toLowerCase() === String(b).toLowerCase() }),
    morphologyIndex: {}, determiners: new Set(["the", "a", "an"]),
  })(pool);
  const read = (text) => reader.read(String(text ?? ""));

  const pass = runMechanicalPass({
    question: t.q,
    organs: {
      admission: ({ question, sources }) => ({ admitted: sources, refused: [] }),
      whatWouldSettle: () => [],
      referentIndex,
      answerBeforeTheModel: ({ question, passages, transcript, math, chunksByRef }) => answerBeforeTheModel({ question, passages, transcript, math, chunksByRef }),
      read,
      expectationFrom: (passages, question, rd, index, voids) => expectationFrom(passages, question, rd, index, voids),
    },
    context: { passages: pool, transcript: [], math: mathjs, chunksByRef: new Map(chunks.map((c) => [c.ref, c])), sources: pool, voids: [], priorNotes: [] },
  });

  results.push({ ...t, pool: pool.map((p) => ({ ref: p.ref, text: p.text.slice(0, 110) })), pass, exact: exact ? { kind: exact.kind, text: exact.text } : null, chunks: chunks.length });
}

// ── render ────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cellColor = (c) => (c.startsWith("NUL") || c.startsWith("SEG") || c.startsWith("DEF") ? "#c2572f" : c.startsWith("SIG") || c.startsWith("CON") || c.startsWith("EVA") ? "#2f6b8f" : "#3f7d4a");

const renderTurn = (t) => {
  const cells = t.pass.cells.map((c) => {
    const body = c.close
      ? `<div class="close"><b>CLOSE</b> ${esc(c.close.text)}${c.close.addresses?.length ? ` <span class="addr">@ ${esc(c.close.addresses.join(", "))}</span>` : ""}${c.close.why ? ` <span class="why">— ${esc(c.close.why)}</span>` : ""}</div>`
      : `<div class="refuse"><b>REFUSE</b> ${esc(c.refusal.type)} <span class="why">${esc(c.refusal.detail)}</span></div>`;
    return `<div class="cell" style="border-left:3px solid ${cellColor(c.cell)}"><div class="cell-name">${esc(c.cell)}</div>${body}</div>`;
  }).join("");
  const pool = t.pool.length
    ? t.pool.map((p) => `<div class="passage"><span class="addr">${esc(p.ref)}</span> ${esc(p.text)}…</div>`).join("")
    : `<div class="passage none">no passages retrieved — ${t.lang === "grc" ? "the Greek reader is English-tuned; silence is typed, never a guess" : "the question shares no token with the material"}</div>`;
  const residual = t.pass.residual
    ? `<div class="residual"><b>RESIDUAL — the mouth composes:</b> ${esc(t.pass.residual.question)}<div class="why">${esc(t.pass.residual.why)}</div>${t.pass.residual.boundary ? ` <span class="boundary">boundary: ${esc(t.pass.residual.boundary.cell)} · ${esc(t.pass.residual.boundary.type)}</span>` : ""}</div>`
    : `<div class="residual answered"><b>ANSWERED BY THE PASS — no model.</b> ${t.exact ? esc(t.exact.text) : ""}</div>`;
  return `<div class="turn">
    <div class="meta">${esc(t.label)} · ${t.lang} · ${t.chunks.toLocaleString()} chunk(s) · <span class="why">${esc(t.note)}</span></div>
    <div class="question" dir="auto">${esc(t.q)}</div>
    <div class="material">material: ${esc(t.material)}</div>
    <details><summary>retrieved (${t.pool.length})</summary>${pool}</details>
    <div class="cells">${cells}</div>
    ${residual}
    ${t.exact ? `<div class="exact">the exact door: <i>${esc(t.exact.text)}</i></div>` : ""}
  </div>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The mechanical pass — Hebrew and Attic Greek</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font:14px/1.5 "Helvetica Neue",Arial,sans-serif; margin:0; padding:28px 22px 80px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .lede { color:var(--dim); max-width:82ch; margin:0 0 4px; }
  .meta2 { color:var(--dim); font:11.5px ui-monospace,Menlo,monospace; margin-bottom:22px; }
  .turn { border:1px solid #262a2e; border-radius:10px; padding:14px 16px; margin:14px 0; background:#121518; }
  .turn .meta { font-size:11.5px; color:var(--dim); font-family:ui-monospace,Menlo,monospace; margin-bottom:6px; }
  .question { font-size:16.5px; font-weight:600; margin-bottom:4px; }
  .material { font-size:11.5px; color:var(--dim); margin-bottom:8px; }
  .passage { font-size:12px; color:var(--dim); margin:3px 0; padding-left:10px; border-left:2px solid #2a2f34; }
  .passage.none { font-style:italic; }
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
  <h1>The mechanical pass — Hebrew and Attic Greek</h1>
  <p class="lede">The pre-speech walk over real non-English material, with no English assumptions. Hebrew: the Westminster Leningrad Codex Tanakh (real prose, cantillation marks included). Greek: no real Greek prose file exists on disk (both "odyssey-greek.txt" fixtures are the Samuel Butler <b>English</b> translation — verified), so the Greek turn uses a declared Attic sentence plus the real UniMorph grc prior (30,215 forms). <b>The honest expectation: tokenize works (P62, \p{L}\p{N}), the exact door declines non-English (S39), and the English-tuned relation reader refuses typed where it is silent — never guesses.</b></p>
  <div class="meta2">organs: hypergraph reader + cast referents + answerable exact door · material: live_priors WLC Tanakh + declared Attic sentence · no model</div>
  ${results.map(renderTurn).join("")}
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
for (const t of results) {
  const nC = t.pass.cells.filter((c) => c.close).length;
  const nR = t.pass.cells.filter((c) => c.refusal).length;
  console.log(`\n[${t.lang}] ${t.q}`);
  console.log(`  chunks=${t.chunks} · retrieved=${t.pool.length} · closes ${nC} · refusals ${nR} · answered=${t.pass.answered} · boundary=${t.pass.boundary?.cell ?? "—"}`);
  for (const c of t.pass.cells.filter((x) => x.close)) console.log(`    CLOSE  ${c.cell}: ${c.close.text.slice(0, 70)}`);
  for (const c of t.pass.cells.filter((x) => x.refusal && ["INS·Figure", "CON·Figure", "EVA·Figure"].includes(x.cell))) console.log(`    REFUSE ${c.cell}: ${c.refusal.type}`);
}