// goldens/conduct/run.mjs — drive every conduct item through the Fold's own turn.
//
// The turn here is `eval/dialogue.mjs`'s turn, which is `app.js`'s send()
// headless: retrieval on the question's own words, one bounded system message,
// the mechanical checks (citations, grounding through the cast resolver,
// null-gated attribution), a warrant record where a check ran, a typed gap
// where none could, and the capped summary refresh. The pure modules ARE the
// app; nothing is re-implemented here.
//
//   node goldens/conduct/run.mjs                      # against the local model
//   node goldens/conduct/run.mjs --model qwen2.5:14b-instruct-q4_K_M
//   node goldens/conduct/run.mjs --only SYC,DEIX
//   node goldens/conduct/run.mjs --strategy sycophant # no model — see below
//
// ── --strategy: the benchmark measuring itself ──────────────────────────────
//
// A conduct benchmark that a reflex can pass is not measuring conduct. Each
// family here declares its DEGENERATE strategy — the reflex that would collect
// its passes for free — and carries at least one control that the reflex
// fails. `--strategy <name>` runs the whole harness with a scripted answerer
// instead of a model, so that claim is checked rather than asserted, and costs
// no model call. These runs say nothing about the Fold; they say whether the
// items can tell conduct from reflex. `checks.test.mjs` pins the result.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FOLD_SCHEMA,
  FOLD_SYSTEM_PROMPT,
  addWarrantRecord,
  buildRecordSystemMessage,
  buildSummarySystemMessage,
  buildSummaryUpdatePrompt,
  buildTurnMessages,
  buildWarrantRecord,
  charCount,
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
  RECENCY_WINDOW,
} from "../../fold.js";
import { buildSourceBlock, checkCitations, chunkSource, openQuestions, retrieve, tokenize } from "../../source.js";
import { checkGrounding, unsupportedClaims } from "../../grounding.js";
import { attribute, attributedRefs } from "../../cite.js";
import { CONSTITUTION_PROMPT } from "../../constitution.js";
import { makeCastResolver } from "../../cast.js";
import { ROUTE_KINDS, routeModel } from "../../model-routing.js";

import { lineIndex, outlineOfIndex } from "../../../eoreader6/packages/engine/perceiver/text/segments.js";
import { splitSentences as engineSentences } from "../../../eoreader6/packages/engine/perceiver/text/spans.js";
import {
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
} from "../../../eoreader6/packages/engine/perceiver/text/surfaces.js";

import { makeChecks, verify, scoreFamilies } from "./checks.mjs";
import { readCorpus, CORPUS } from "./fetch.mjs";
import { STRATEGIES } from "./strategies.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OLLAMA = "http://localhost:11434";
const ANSWER_MAX_TOKENS = 512;
const FOLD_MAX_TOKENS = 300;

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const MODEL = arg("--model", "gemma2:2b");
const FAST = arg("--fast", routeModel(ROUTE_KINDS.FLAT, { selected: MODEL }));
const STRATEGY = arg("--strategy", null);
const ONLY = arg("--only", null)?.split(",").map((s) => s.trim());

// ── the material, cut exactly as the page cuts it ───────────────────────────

const text = readCorpus();
const discoverBoundaries = (t) => {
  try {
    const out = outlineOfIndex(lineIndex(t), { max: 5000 });
    if (out.gap || out.headings.length < 2) return null;
    return out.headings.map((h) => ({ start: h.start, end: h.end, label: h.label }));
  } catch {
    return null;
  }
};
const chunks = chunkSource(CORPUS.name, text, { boundaries: discoverBoundaries(text) });

const castFor = makeCastResolver({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
});
const { runCheck } = makeChecks({ splitSentences: engineSentences });

const ITEMS = JSON.parse(readFileSync(join(HERE, "items.json"), "utf8"));

// ── the answer key checks itself before anything is scored ──────────────────

// `tokenize` is retrieval's OWN tokenizer, not a second opinion about what a
// content word is: the deixis guard asks whether the words this question will
// actually be retrieved on overlap the words that settle it, and only the real
// tokenizer can answer that.
const v = verify(ITEMS.items, text, { tokenize });
if (!v.ok) {
  console.error("REFUSED: the answer key does not match the corpus bytes.\n");
  for (const r of v.rows.filter((r) => !r.ok)) {
    console.error(`  ${r.item}: "${r.value}" wanted ${r.wanted}, corpus has ${r.observed}`);
  }
  console.error("\nA score against a rotted fixture is uninterpretable. Fix items.json or re-pin the corpus.");
  process.exit(1);
}

// ── one model call, or one scripted reply ───────────────────────────────────

async function call(messages, { maxTokens, json, model } = {}) {
  const modelName = model ?? MODEL;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: false,
          ...(json ? { format: json === true ? "json" : json } : {}),
          options: { num_predict: maxTokens ?? ANSWER_MAX_TOKENS },
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      return (await res.json()).message?.content ?? "";
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
}

// ── one item, as a conversation ─────────────────────────────────────────────

export async function runItem(item, { answerer }) {
  const state = { summary: emptySummary(), history: [] };
  const observations = [];
  let fillerAt = 0;

  for (const turn of item.turns) {
    const question = turn.filler ? ITEMS.filler[fillerAt++ % ITEMS.filler.length] : turn.ask;

    const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
    const passages = retrieve(chunks, question, 3, foldedRefs);
    const sourceBlock = buildSourceBlock(passages);
    const messages = buildTurnMessages({
      basePrompt: CONSTITUTION_PROMPT,
      summary: state.summary,
      history: state.history,
      question,
      sourceBlock,
    });

    let answer;
    try {
      answer = await answerer({ messages, question, passages, item, state });
    } catch (err) {
      observations.push({ question, error: String(err?.message ?? err) });
      break;
    }

    state.history.push({ role: "user", content: question }, { role: "assistant", content: answer });

    const { used, unsupported: badRefs } = checkCitations(answer, passages);
    const grounding = checkGrounding(answer, passages, { question, resolveName: castFor(passages) });
    const attributions = attribute(answer, passages, chunks);
    const grounded = [...new Set([...used, ...attributedRefs(attributions)])];
    const open = openQuestions(question, passages, grounded);
    const unsupported = [...badRefs, ...unsupportedClaims(grounding)];

    const fold = mechanicalFoldLine(question, answer);
    const record = passages.length
      ? buildWarrantRecord({
          turn: state.summary.turnCount + 1,
          gist: fold,
          channels: [...(used.length ? ["cited"] : []), ...(attributions.length ? ["attributed"] : [])],
          refs: grounded,
          unsupported,
          open,
        })
      : null;
    if (record) state.summary = addWarrantRecord(state.summary, record);

    // The summary refresh is the fold's one model call. In a scripted run it
    // degrades to the mechanical path, which is the same fallback the app
    // takes when the model's JSON does not arrive.
    if (STRATEGY) {
      state.summary = updateSummaryWithFold(state.summary, fold);
    } else {
      try {
        const raw = await call(
          [
            { role: "system", content: FOLD_SYSTEM_PROMPT },
            { role: "user", content: buildSummaryUpdatePrompt(state.summary, [...(state.summary.folds || []), fold]) },
          ],
          { maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA, model: FAST },
        );
        state.summary = updateSummaryWithFold(state.summary, fold, raw);
      } catch {
        state.summary = updateSummaryWithFold(state.summary, fold);
      }
    }

    observations.push({
      question,
      filler: !!turn.filler,
      text: answer,
      passageRefs: passages.map((p) => p.ref),
      passageTexts: passages.map((p) => p.text),
      grounded,
      unsupported,
      open,
      recorded: !!record,
    });
  }

  const verdict = runCheck(item, observations);
  return {
    id: item.id,
    family: item.family,
    control: !!item.control,
    rung: item.rung,
    ...verdict,
    carried:
      (buildSummarySystemMessage(state.summary)?.length ?? 0) +
      (buildRecordSystemMessage(state.summary)?.length ?? 0) +
      charCount(state.history.slice(-RECENCY_WINDOW)),
    transcript: charCount(state.history),
    observations: observations.map((o) => ({ ...o, passageTexts: undefined })),
  };
}

// ── the run ─────────────────────────────────────────────────────────────────

async function main() {
  const items = ONLY ? ITEMS.items.filter((i) => ONLY.includes(i.family) || ONLY.includes(i.id)) : ITEMS.items;

  let answerer;
  if (STRATEGY) {
    const strat = STRATEGIES[STRATEGY];
    if (!strat) {
      console.error(`unknown strategy ${STRATEGY} — have: ${Object.keys(STRATEGIES).join(", ")}`);
      process.exit(1);
    }
    answerer = async (ctx) => strat(ctx);
  } else {
    answerer = async ({ messages }) => call(messages, { maxTokens: ANSWER_MAX_TOKENS, model: FAST });
  }

  mkdirSync(join(HERE, "results"), { recursive: true });
  const stamp = STRATEGY ? `strategy-${STRATEGY}` : `${MODEL.replace(/[^\w.-]/g, "_")}-${process.pid}`;
  const outPath = join(HERE, "results", `conduct-${stamp}.jsonl`);
  writeFileSync(outPath, "");

  console.log(
    `conduct: ${items.length} items · corpus ${CORPUS.name} (${chunks.length} passages) · ` +
      (STRATEGY ? `STRATEGY ${STRATEGY} (no model)` : `model ${FAST}`),
  );
  console.log(`answer key verified: ${v.rows.length} pinned values match the corpus bytes`);
  console.log(`writing ${outPath}\n`);

  const results = [];
  for (const item of items) {
    const r = await runItem(item, { answerer });
    results.push(r);
    appendFileSync(outPath, JSON.stringify(r) + "\n");
    console.log(
      `${r.id.padEnd(9)} ${r.control ? "control" : "probe  "} ${(r.pass ? "PASS" : "FAIL").padEnd(5)} ${r.verdict}`,
    );
  }

  console.log("\n— by family —");
  for (const f of scoreFamilies(results)) {
    console.log(
      `${f.family.padEnd(7)} ${String(f.status).padEnd(11)} controls ${f.controls}   probes ${f.passed}/${f.of}`,
    );
  }
  console.log(`\nfull rows: ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
