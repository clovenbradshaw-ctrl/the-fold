// mechanical-pass-conversation-e2e.mjs — the pre-speech walk run as a LIVE
// BACK-AND-FORTH conversation, not one-shot questions.
//
// The one-shot driver (mechanical-pass-e2e.mjs) asked each question cold. A
// conversation is not that: the transcript accumulates, attachments come and
// go, the topic pivots, people type typos, and sometimes the language
// changes. Each turn re-runs the pass against the CURRENT state —
//
//   state = { transcript, attachments: Map<name, chunks> }
//
// and what the pass closes lands on the transcript as the record's own
// established facts, exactly as dialogue.js's "the record speaks first"
// principle threads prior answers into later turns. Attachments are ADDED
// and REMOVED between turns, so retrieval's pool is genuinely the current
// material, never a frozen set.
//
// THE STRESSES, each turn engineered to force one:
//   1. on-topic English question (baseline: material binds)
//   2. wild pivot to a different subject (material silent)
//   3. attachment ADDED, then asked about (new material binds)
//   4. attachment REMOVED, question still about it (retrieval must fail)
//   5. typo-laden English (retrieval + exact door under noise)
//   6. language switch to Russian (the exact door's triggers are lang/en)
//
// Renders the whole conversation as a chat thread and opens it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as mathjs from "mathjs";

import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/native/adapters/text/relations.js";
import { createLemmatizer, morphologyFromPrior } from "../eoreader7/native/adapters/text/morphology.js";
import { tokenize, chunkSource, retrieve } from "./source.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeReferentIndex } from "./cast.js";
import { answerBeforeTheModel } from "./answerable.js";
import { runMechanicalPass } from "./mechanical-pass.js";
import { expectationFrom } from "./dialogue.js";
import { concedePriorFacts } from "./concede-prior.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "mechanical-pass-conversation-e2e.html");

const referentIndex = makeReferentIndex({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  leadingSurfaces: extractLeadingSurfaces,
});

const priorRaw = JSON.parse(readFileSync(join(HERE, "../eoreader7/native/priors/morphology-eng.json"), "utf8"));
const prior = morphologyFromPrior(priorRaw);
const sameAct = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

// ── material: the book, plus a small second attachment to add/remove ──────
const book = readFileSync(join(HERE, "pg2600.txt"), "utf8");
const bookChunks = chunkSource("pg2600.txt", book);

const ATTACHMENT_TEXT = `The Amazon river in South America is the largest river by discharge volume, and one of the longest. The Nile in Africa is traditionally regarded as the longest river in the world. The Mississippi runs through the United States from north to south.`;
const attachChunks = chunkSource("amazon.txt", ATTACHMENT_TEXT);

const QUESTIONS = [
  // 1. baseline — the material binds
  { q: "What river did the French army cross to invade Russia?", lang: "en", add: [], remove: [], note: "baseline — on-topic, material binds" },
  // 2. wild pivot — nothing in the book
  { q: "What is the largest river by discharge in South America?", lang: "en", add: [], remove: [], note: "wild pivot — the book is silent; the Amazon lives in no attachment yet" },
  // 3. attachment added, then asked
  { q: "Which is longer, the Amazon or the Nile?", lang: "en", add: ["amazon.txt"], remove: [], note: "attachment ADDED — the Amazon material now binds" },
  // 4. attachment removed, still asked
  { q: "What is the largest river by discharge in South America?", lang: "en", add: [], remove: ["amazon.txt"], note: "attachment REMOVED — the material that answered it is gone" },
  // 5. typo-laden English
  { q: "wut river did teh frnch armie cros to invade rusia?", lang: "en", add: [], remove: [], note: "typos — retrieval and the exact door under noise" },
  // 6. language switch
  { q: "Какую реку пересекла французская армия, чтобы вторгнуться в Россию?", lang: "ru", add: [], remove: [], note: "language switch to Russian — the exact door's triggers are lang/en (S39)" },
  // 7. back to the book, opposite act — the record holds "crossed the Niemen"
  //    from turn 1's close; this turn asks about RETREAT, so REC·Figure must
  //    test the record against the CURRENT material and concede only on a
  //    real contradiction — never on the record's own silence.
  { q: "Did the French army retreat from the Niemen?", lang: "en", add: [], remove: [], note: "back to the book, opposite act — does the record's 'crossed' survive the current material?" },
];

// ── the conversation loop ──────────────────────────────────────────────────
// The BOOK is the standing material, present from turn 1 (it is "the book
// you have read"). `amazon.txt` is the attachment ADDED (turn 3) and REMOVED
// (turn 4) — the piece of content that comes and goes, so retrieval's pool
// genuinely changes under the conversation.
const attachments = new Map([["pg2600.txt", bookChunks]]);
const transcript = [];            // prior turns' closes, the record
const turns = [];

for (const [i, t] of QUESTIONS.entries()) {
  // apply attachment changes FIRST, so this turn sees the new state
  for (const name of t.remove) attachments.delete(name);
  for (const name of t.add) attachments.set(name, name === "amazon.txt" ? attachChunks : bookChunks);

  const allChunks = [...attachments.values()].flat();
  const pool = retrieve(allChunks, t.q, 4, [], {});
  const exact = answerBeforeTheModel({ question: t.q, passages: pool, transcript, math: mathjs, chunksByRef: new Map(allChunks.map((c) => [c.ref, c])) });

  const reader = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize,
    nounPhraseSubjects: true, objectSpecificity: true,
    createLemmatizer: () => ({ sameAct: (a, b) => (sameAct ? sameAct(a, b) : String(a).toLowerCase() === String(b).toLowerCase()) }),
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
      sameAct,
      expectationFrom: (passages, question, rd, index, voids) => expectationFrom(passages, question, rd, index, voids),
      // REC·Figure: a prior close the CURRENT material contradicts is
      // conceded, not silently kept — the back-and-forth, made real.
      priorConceded: (priorAnswers, q) => {
        const { conceded } = concedePriorFacts({ facts: priorAnswers, passages: pool, read, referentIndex, sameAct });
        return conceded.map((c) => ({ ref: c.ref ?? null, text: c.text, contradictedBy: c.contradictedBy.text }));
      },
    },
    context: { passages: pool, transcript, math: mathjs, chunksByRef: new Map(allChunks.map((c) => [c.ref, c])), sources: pool, voids: [], priorNotes: [], priorAnswers: transcript.map((x) => ({ text: x.fact, ref: `turn:${x.turn}` })) },
  });

  // the record: this turn's closes ARE the instrument's established facts.
  // Store the CON·Figure claim TEXT (a parseable "X —act→ Y" fact), not the
  // count line, so a later turn's REC·Figure can genuinely concede it.
  for (const c of pass.closes) {
    if (c.text && c.text.length < 200) {
      const fact = c.text.match(/claim\(s\) the material states about what was asked: (.*)$/)?.[1] ?? c.text;
      transcript.push({ turn: i + 1, question: t.q, fact, refs: c.addresses ?? [] });
    }
  }

  turns.push({ idx: i + 1, ...t, pool: pool.map((p) => ({ ref: p.ref, text: p.text.slice(0, 110) })), pass, exact: exact ? { kind: exact.kind, text: exact.text } : null, attached: [...attachments.keys()], transcriptLen: transcript.length });
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
    : `<div class="passage none">no passages retrieved — the current attachments hold nothing the question touches</div>`;
  const residual = t.pass.residual
    ? `<div class="residual"><b>RESIDUAL — the mouth composes:</b> ${esc(t.pass.residual.question)}<div class="why">${esc(t.pass.residual.why)}</div>${t.pass.residual.boundary ? ` <span class="boundary">boundary: ${esc(t.pass.residual.boundary.cell)} · ${esc(t.pass.residual.boundary.type)}</span>` : ""}</div>`
    : `<div class="residual answered"><b>ANSWERED BY THE PASS — no model.</b> ${t.exact ? esc(t.exact.text) : ""}</div>`;
  const lang = t.lang === "ru" ? `<span class="lang">🇷🇺 ru</span>` : `<span class="lang">en</span>`;
  const attachRow = t.attached.length ? `attachments: ${t.attached.map((a) => esc(a)).join(", ")}` : `attachments: none`;
  const ops = [];
  if (t.add.length) ops.push(`<span class="op add">+ ${t.add.join(", ")}</span>`);
  if (t.remove.length) ops.push(`<span class="op remove">− ${t.remove.join(", ")}</span>`);
  return `<div class="turn">
    <div class="meta">turn ${t.idx} · ${lang} ${attachRow} ${ops.join(" ")} · <span class="why">${esc(t.note)}</span></div>
    <div class="question">${esc(t.q)}</div>
    <details><summary>retrieved (${t.pool.length}) · record has ${t.transcriptLen} fact(s)</summary>${pool}</details>
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
<title>The mechanical pass — a live back-and-forth conversation</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font:14px/1.5 "Helvetica Neue",Arial,sans-serif; margin:0; padding:28px 22px 80px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .lede { color:var(--dim); max-width:80ch; margin:0 0 4px; }
  .meta2 { color:var(--dim); font:11.5px ui-monospace,Menlo,monospace; margin-bottom:22px; }
  .turn { border:1px solid #262a2e; border-radius:10px; padding:14px 16px; margin:14px 0; background:#121518; }
  .turn .meta { font-size:11.5px; color:var(--dim); font-family:ui-monospace,Menlo,monospace; margin-bottom:6px; }
  .lang { font-size:11px; border:1px solid #3a3f45; border-radius:4px; padding:0 5px; }
  .op.add { color:#7fbf8a; }
  .op.remove { color:#d98a8a; }
  .question { font-size:15.5px; font-weight:600; margin-bottom:8px; }
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
  <h1>The mechanical pass — a live back-and-forth conversation</h1>
  <p class="lede">Six turns, one running conversation. Attachments are ADDED and REMOVED between turns; the topic pivots from Napoleon's invasion to South American hydrology and back; turn 5 is typo-laden English; turn 6 is Russian. Every turn re-runs <code>runMechanicalPass</code> against the CURRENT state — the live transcript, the live attachment pool — over the real 3.3MB <code>pg2600.txt</code> plus a small second attachment. The pass's closes land on the record and feed later turns. No model ran anywhere.</p>
  <div class="meta2">organs: hypergraph reader + cast referents + UniMorph morphology + answerable exact door · record: ${transcript.length} accumulated fact(s)</div>
  ${turns.map(renderTurn).join("")}
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
for (const t of turns) {
  const nC = t.pass.cells.filter((c) => c.close).length;
  const nR = t.pass.cells.filter((c) => c.refusal).length;
  console.log(`\n[turn ${t.idx}] ${t.q}`);
  console.log(`  attached=${t.attached.join(",") || "—"} · add=${t.add.join(",") || "—"} remove=${t.remove.join(",") || "—"} · retrieved=${t.pool.length} · closes ${nC} · refusals ${nR} · answered=${t.pass.answered} · boundary=${t.pass.boundary?.cell ?? "—"}`);
  for (const c of t.pass.cells.filter((x) => x.close)) console.log(`    CLOSE  ${c.cell}: ${c.close.text.slice(0, 75)}`);
  for (const c of t.pass.cells.filter((x) => x.refusal && ["INS·Figure", "CON·Figure", "EVA·Figure"].includes(x.cell))) console.log(`    REFUSE ${c.cell}: ${c.refusal.type}`);
}