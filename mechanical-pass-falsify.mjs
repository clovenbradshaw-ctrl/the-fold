// mechanical-pass-falsify.mjs — CHASE THE PASS UNTIL IT MAKES A MISTAKE.
//
// The repo's own law (II.23): a control is built to fail. This driver runs
// the mechanical pass over a sustained battery of prompts against the REAL
// War-and-Peace material, composes whatever closed, and then — the load-
// bearing part — VERIFIES every claim the pass closed against the material's
// own bytes. A refusal is honest and costs nothing. A WRONG OUTPUT is a
// mistake: a close that cites bytes that don't state it, a composed sentence
// that asserts what the material contradicts, an exact-door answer that is
// arithmetically false.
//
// The battery is adversarial by design:
//   - numeric traps (comparisons, unit errors, decades)
//   - near-paraphrases (the material says X; the claim says ~X)
//   - pronoun pivots (the question's "it"/"he" pointing at the wrong referent)
//   - ambiguous blanks (two passages disagree on the filling)
//   - questions whose words match but whose subject does not
//
// It runs the whole battery, reports EVERY mistake found (not just the
// first), and prints how far the pass got before each one — so the answer
// to "how long can you get an output" is a measured number, not a claim.

import { readFileSync } from "node:fs";
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
import { compose } from "./compose.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const referentIndex = makeReferentIndex({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  leadingSurfaces: extractLeadingSurfaces,
});

const material = readFileSync(join(HERE, "pg2600.txt"), "utf8");
const chunks = chunkSource("pg2600.txt", material);
const chunksByRef = new Map(chunks.map((c) => [c.ref, c]));

// The battery — adversarial, in escalating order. HARDER than the first cut:
// numeric order traps, close-call dates, pronoun ambiguity, a question that
// REVERSES a relation the material states, and a comparison the door must
// get exactly right.
const BATTERY = [
  // exact, safe — should close with the exact door
  { q: "How many years apart were 1805 and 1841?", kind: "comparison" },
  { q: "Which is earlier, 1805 or 1841?", kind: "comparison" },
  // the door's arithmetic must survive order reversal
  { q: "How many years after 1805 was 1841?", kind: "comparison-reverse" },
  // a date that's easy to get wrong by one
  { q: "How many years apart were 1812 and 1805?", kind: "comparison" },
  // near-paraphrase trap: material says crossed, ask about a different act
  { q: "Did the French army retreat from the Niemen?", kind: "paraphrase-trap" },
  // REVERSED relation: the material states "X crossed Y"; ask "Y crossed X"
  { q: "Did the Niemen cross the French army?", kind: "relation-reversal" },
  // ambiguous: two passages could disagree
  { q: "In what year did the war begin?", kind: "ambiguous" },
  // pronoun pivot: "he" without a clear referent in the question
  { q: "What did he cross?", kind: "pronoun" },
  // words match, subject does not
  { q: "What river is longest?", kind: "topic-mismatch" },
  // the book's own famous lines — near-verbatim
  { q: "What did the historian say about Borodino?", kind: "reader" },
  // numeric unit trap
  { q: "How many years after 1805 was 1841?", kind: "comparison" },
  // double barreled
  { q: "When did the war start and who invaded?", kind: "reader" },
  // negation trap: the material denies something; ask it affirmatively
  { q: "Was the war won by the French?", kind: "negation" },
];

// ── verification: a close is WRONG iff its cited bytes do not state it ──
// NOT every close is a claim. NUL·Ground's close ("4 source(s) admitted…")
// and EVA·Figure's close ("3 expected claim(s)…") are METADATA — they
// describe what the instrument did, not what the passage states; checking
// their words against the bytes is a false positive. Only CON·Figure's
// close carries the material's actual claim, and only the exact door's
// comparison answer is arithmetically checkable. Verify those two.
const verifyClose = (close, cell, question) => {
  if (cell === "NUL·Ground" || cell === "EVA·Figure") return { ok: true, note: "metadata close — not a claim to verify" };
  if (cell === "INS·Figure") {
    // the exact door's own answer — verified arithmetically from the
    // QUESTION's own numbers, never from the answer's own claim
    const qnums = (close.why ?? "").length ? (close.text.match(/\d{3,4}/g) ?? []) : [];
    // the question itself is the source of truth for what numbers were asked
    const askNums = (question + " " + close.why).match(/\d{3,4}/g)?.map(Number) ?? [];
    if (askNums.length >= 2) {
      // the two distinct magnitudes in play
      const uniq = [...new Set(askNums)];
      if (uniq.length === 2) {
        const want = Math.abs(uniq[0] - uniq[1]);
        const said = close.text.match(/(\d+) years/)?.[1] ? Number(close.text.match(/(\d+) years/)[1]) : null;
        if (said != null) {
          return said === want
            ? { ok: true, note: `arithmetic verified: |${uniq[0]}-${uniq[1]}| = ${said}` }
            : { ok: false, error: `arithmetic WRONG: |${uniq[0]}-${uniq[1]}| = ${want}, door said ${said}` };
        }
      }
    }
    return { ok: true, note: "exact door — no independent number pair recoverable" };
  }
  if (!close.addresses?.length) return { ok: false, error: "no address — an unaddressed close is exactly the mouth's territory, not the pass's" };
  const addr = close.addresses[0];
  const chunk = chunksByRef.get(addr);
  if (!chunk) return { ok: false, error: `cited address ${addr} does not resolve to a loaded chunk` };
  // The close's own substantive words must appear in the cited bytes.
  const words = (close.text.match(/\p{L}{4,}/gu) ?? []).filter((w) => !["claim","s","the","material","states","about","what","was","asked","that"].includes(w)).slice(0, 8);
  const hay = String(chunk.text ?? "").toLowerCase();
  const present = words.filter((w) => hay.includes(w.toLowerCase()));
  if (present.length < 2) {
    return { ok: false, error: `only ${present.length} of ${words.length} claim-words present in cited ${addr} — the close cites bytes that do not state it` };
  }
  // CONTRADICTION check: if the cited chunk NEGATES the close's act about
  // the same ends, the close is a false bind. Cheap lexical denial test:
  // "not X" / "never X" / "did not X" in the same bytes as the act word.
  if (cell === "CON·Figure") {
    const act = words[0];
    if (act && /(not|never|hardly|no) /.test(hay) && new RegExp(`(not|never|hardly)\\s+${act}`, "i").test(hay)) {
      return { ok: false, error: `cited ${addr} negates the close's act "${act}" — a false bind` };
    }
    // ANSWER-check: an "In what year…" question must be answered by a YEAR,
    // not by a prediction or a mention. This is the falsification: the pass
    // closes word-overlap binds that share vocabulary but do not answer.
    if (/\b(in what year|when did|how many)\b/i.test(question) && /what year/i.test(question)) {
      if (!/18\d\d/.test(hay)) {
        return { ok: false, error: `"in what year" close cites ${addr}, but the bytes carry no year — a mention wearing an answer's clothes` };
      }
    }
  }
  return { ok: true, note: `${present.length} of ${words.length} claim-words present in ${addr}` };
};

const runOne = (item, idx) => {
  const pool = retrieve(chunks, item.q, 4, [], {});
  const exact = answerBeforeTheModel({ question: item.q, passages: pool, transcript: [], math: mathjs, chunksByRef });

  const reader = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize,
    nounPhraseSubjects: true, objectSpecificity: true,
    createLemmatizer: () => ({ sameAct: (a, b) => String(a).toLowerCase() === String(b).toLowerCase() }),
    morphologyIndex: {}, determiners: new Set(["the", "a", "an"]),
  })(pool);
  const read = (t) => reader.read(String(t ?? ""));

  const pass = runMechanicalPass({
    question: item.q,
    organs: {
      admission: ({ question, sources }) => ({ admitted: sources, refused: [] }),
      whatWouldSettle: () => [],
      referentIndex,
      answerBeforeTheModel: ({ question, passages, transcript, math, chunksByRef }) => answerBeforeTheModel({ question, passages, transcript, math, chunksByRef }),
      read,
      expectationFrom: (passages, question, rd, index, voids) => expectationFrom(passages, question, rd, index, voids),
    },
    context: { passages: pool, transcript: [], math: mathjs, chunksByRef, sources: pool, voids: [], priorNotes: [] },
  });

  const mistakes = [];
  for (const c of pass.cells.filter((x) => x.close)) {
    const v = verifyClose(c.close, c.cell, item.q);
    if (!v.ok) mistakes.push({ cell: c.cell, close: c.close.text.slice(0, 90), ...v });
  }
  return { item, pass, exact, mistakes, poolCount: pool.length };
};

// ── run the whole battery, report every mistake, and the clean-run length ─
const results = BATTERY.map((item, i) => runOne(item, i));
let cleanStreak = 0;
const mistakes = [];
for (const r of results) {
  if (r.mistakes.length) {
    mistakes.push({ idx: results.indexOf(r) + 1, question: r.item.q, mistakes: r.mistakes });
    cleanStreak = 0;
  } else {
    cleanStreak += 1;
  }
}

console.log("═ FALSIFICATION CHASE — the mechanical pass over War and Peace ═");
console.log(`battery: ${BATTERY.length} prompts · material: pg2600.txt (${chunks.length.toLocaleString()} chunks)\n`);
let longestClean = 0, run = 0;
for (const r of results) {
  const nC = r.pass.cells.filter((c) => c.close).length;
  const answered = r.exact ? `EXACT: ${r.exact.text.slice(0, 50)}` : "";
  const err = r.mistakes.length ? ` ✗ ${r.mistakes.map((m) => `${m.cell}:${m.error}`).join(" | ")}` : "";
  console.log(`[${results.indexOf(r) + 1}] ${r.item.q}  (${r.item.kind}) — closes ${nC}, retrieved ${r.poolCount}${answered ? `, ${answered}` : ""}${err}`);
  run = r.mistakes.length ? 0 : run + 1;
  longestClean = Math.max(longestClean, run);
}
console.log(`\n${mistakes.length} prompt(s) produced a WRONG output.`);
console.log(`longest clean run: ${longestClean} prompt(s) before a mistake.\n`);
if (mistakes.length) {
  console.log("─ the mistakes, verbatim ─");
  for (const m of mistakes) {
    console.log(`\n[${m.idx}] ${m.question}`);
    for (const err of m.mistakes) console.log(`   ${err.cell}: "${err.close}" → ${err.error}`);
  }
}