// constitution.js — the constitution's channel into the running app. Pure.
//
// The constitution (FOLD-CONSTITUTION.md, one level up) governs the workbench.
// It cannot be "followed" by the model, and the document itself says why:
// II.9 — a prompt is a request, not a guarantee — and Article III's framing
// that telling a person to be careful is the same category error as telling a
// model to be careful. So the constitution reaches the conversation on two
// channels, and only one of them goes through the model:
//
//   1. THE FOLD OF IT (below): one bounded paragraph, prose, carried in the
//      system message every turn. It contains only what a mouth can honor in
//      language — say it plainly, cite what you were handed, name the gap —
//      and not one article the model would have to be trusted to enforce.
//      It is a fold in this repo's sense: a lossless drop in resolution of
//      the articles that address speech, with the full document as its
//      descent. It is a REQUEST. Nothing downstream relies on it.
//
//   2. THE ENFORCEMENT MAP (below): which article binds which organ, in code,
//      where reliance actually lives. This is the alignment claim made
//      checkable — constitution.test.mjs walks this table and probes each
//      row's behavior, so "the app follows its constitution" is a test run,
//      not an assertion. An article no organ enforces is listed with
//      enforced: null, because unwired-is-failing (VI.3) only works if
//      unwired is VISIBLE.

/**
 * The folded instruction block. Replaces the old BASE_PROMPT — same duty,
 * now derived from the constitution's speech-facing articles rather than
 * written freehand. Prose, one paragraph, no scaffolding: what goes in front
 * of a small model shapes what comes out of it, and bracket-tagged rule
 * lists come back out as bracket-tagged rule recitals.
 */
export const CONSTITUTION_PROMPT =
  // Amended 2026-08-17, by user direction: the mouth PROPOSES, the
  // instrument checks. The old block told the model never to supply a
  // value the material had not given — which left a compliance-critical
  // behavior to instruction-following, the exact thing L5 distrusts, and
  // measured live it half-worked: the model withheld answers it knew
  // ("The passage does not provide information about the mayor") on the
  // same day it invented mayors under headings. The mechanical ladder is
  // the real wall in both directions — attribute() marks the model's own
  // voice, checkGrounding flags what nothing backs, proof-seeking takes it
  // to the web — so the prompt now asks for the model's honest answer and
  // leaves the epistemics to the organs that actually enforce them.
  "You are the mouth of a careful instrument, not its memory and not its judge. " +
  "Answer the question you were asked, in plain prose. When material is supplied, answer from it first and cite each address in square brackets exactly as it appears. " +
  "Where the material is silent, note the gap in passing and still answer from your own knowledge, plainly — but never attach an address to what the material did not give you: the instrument marks what stands on the material and checks the rest, so an honest answer helps and a dressed-up one is caught. " +
  "Prefer counts to percentages when the material gives you counts. " +
  "The past-discourse block is paraphrase and cannot support a factual claim; only the record block carries addresses. " +
  "Do not claim that anything was checked, measured, or verified — checking is not your job, and the instrument attaches its own results.";

/**
 * Article → organ. `holds` names the function(s) that enforce the article
 * mechanically; `where` names the file. `enforced: null` marks an article
 * this app does not yet wire, kept in the table so the omission stays
 * visible (VI.3) instead of quietly implied as compliance.
 */
export const ENFORCEMENT = [
  {
    article: "II.3 descent — every altitude reaches the rows",
    holds: "readRange; every ref is a byte range that re-opens from the source",
    where: "source.js",
    enforced: true,
  },
  {
    article: "II.5 firewall — the result may not tune the instrument",
    holds: "normalizeSummary carries prior records through untouched, whatever the refresh returns",
    where: "fold.js",
    enforced: true,
  },
  {
    article: "II.9 mouth — no model-authored value ships unchecked",
    holds: "checkGrounding (figures/names vs bytes); attribute (null-gated); checkCitations (addresses vs offered); tables.js computes state answers instead of asking",
    where: "grounding.js, cite.js, source.js, tables.js",
    enforced: true,
  },
  {
    article: "II.11 earned constants — a number names its giver or its run",
    holds: "partially: retrieval has no floor by design; ROWS_PER_CHUNK, NULL_SAMPLES, CORPUS_MINIMUM, MAX_FINDINGS are hand-picked and documented as open debt",
    where: "CLAUDE.md (open debt)",
    enforced: "partial",
  },
  {
    article: "II.13 local — the computation runs on the machine that has the data",
    holds: "the only network host in app.js is localhost; the model is Ollama; no hosted path exists",
    where: "app.js",
    enforced: true,
  },
  {
    article: "III.3 absent — the missing thing is on screen",
    holds: "openQuestions types every gap; records render 'left open' lines; a part that produces no text says so in place",
    where: "source.js, holon.js, app.js",
    enforced: true,
  },
  {
    article: "IV.1 derive vs receive — the model never retrieves on its own",
    holds: "retrieve() is term overlap on the question's words; the model has no tools. Known deviation: a holonic part retrieves on plan words, disclosed as a typed gap when the part strays from the task's vocabulary",
    where: "source.js, holon.js",
    enforced: "partial",
  },
  {
    article: "IV.3 a missing prior is a typed gap, never a silently wrong number",
    holds: "openQuestions; runPart's typed open list; parsePlan degradation is itself a typed gap",
    where: "source.js, holon.js",
    enforced: true,
  },
  {
    article: "IV.4 shown is typed, never blocked — measured and shown never render alike",
    holds: "provenance.js classifies every sentence onto material or model ground from checks already run; the renderer draws model-ground dotted, absent-claim sentences striped, material plain with its address",
    where: "provenance.js, app.js, index.html",
    enforced: true,
  },
  {
    article: "IV.5 the register is the reader's; paraphrase never gains authority",
    holds: "System 1 and System 2 blocks are never merged; the paraphrase block carries its own disclaimer in the prompt",
    where: "fold.js (buildSummarySystemMessage, buildRecordSystemMessage)",
    enforced: true,
  },
  {
    article: "III.1 anchor — a default view is a claim",
    holds: null,
    where: null,
    enforced: null,
  },
  {
    article: "III.4 opposite — the strongest contrary slice is rendered",
    holds: null,
    where: null,
    enforced: null,
  },
  {
    article: "III.5 prediction — the reader states expectations before results",
    holds: null,
    where: null,
    enforced: null,
  },
];

/** The articles this app claims to enforce, for the assay to walk. */
export function enforcedArticles() {
  return ENFORCEMENT.filter((e) => e.enforced === true);
}

/** The articles visibly not wired — VI.3's list, kept honest. */
export function unwiredArticles() {
  return ENFORCEMENT.filter((e) => e.enforced === null);
}
