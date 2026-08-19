// holon.js — holonic task decomposition for the fold. Pure: no IO, no network,
// no DOM. The model arrives as an injected async function with the same shape
// as app.js's complete(); retrieval, citation, attribution, and grounding are
// the exact organs every ordinary turn already uses, called per part.
//
// The loop, in full:
//   1. PLAN     — one model call splits the task into parts (JSON, constrained
//                 where the provider can constrain; parsed defensively where
//                 it can't). A plan that fails to parse degrades to one part —
//                 the task itself — and says so as a typed gap.
//   2. For each part:
//      a. RESEARCH — retrieve() on the part's own words. The mechanism is
//                    mechanical, but the part's words are the PLAN's words —
//                    a model-authored steering of retrieval that an ordinary
//                    turn does not have. This is a known, deliberate deviation
//                    from "retrieval is a function of the question's own
//                    words," and it is disclosed rather than hidden: a part
//                    that shares no term with the task is flagged as a typed
//                    gap in its own record entry.
//      b. EXECUTE  — one model call writes the part from its passages.
//      c. CHECK    — checkCitations, checkGrounding, attribute. All mechanical.
//      d. CORRECT  — if the check found claims the bytes don't support, one
//                    bounded rewrite pass naming exactly what failed. A budget,
//                    not a threshold: the pass runs at most `maxCorrections`
//                    times and the last draft stands either way, with its
//                    failures still on the record.
//   3. ASSEMBLE — sections joined under headings; provenance is the union of
//                 what each part's own check already established. No field is
//                 computed at assembly time that wasn't read off step 2.
//
// What the model never sees: citation numbers to invent, other parts'
// transcripts, or a tool list. What the caller gets back: output plus a
// per-part provenance trail in the same vocabulary as a turn's warrant record
// (refs, channels, unsupported, open), so the app can fold the whole task as
// one turn without re-checking anything.

import { buildSourceBlock, checkCitations, foldTypography, openQuestions, retrieve, tokenize } from "./source.js";
import { checkGrounding, extractCheckableAtoms, unsupportedClaims } from "./grounding.js";
import { attribute, attributedRefs, splitSentences } from "./cite.js";
import { stripNarrationSentences, stripScaffoldNarration } from "./provenance.js";
import { relationFindings } from "./hypergraph.js";
import { applyQuotes, quoteFindings, quoteOpens, verifyQuotes } from "./quotes.js";
import { LINK_CHECKS_PER_PART, extractLinkAtoms, linkFindings, stripDeadLinks, urlInMaterial, verifyLinks } from "./links.js";
import { parseSegments } from "./artifact.js";

// ── the decomposition gate ───────────────────────────────────────────────────
//
// Ported from eochatX's eo-holonic-plan.ts, which is the canon on this: the
// gate is the SHAPE of the request, decided mechanically from the question's
// own words — never a model call (a malformed JSON reply and a considered
// "no" are the same shape once the reply is text, so the model cannot be
// asked), and never whether a corpus happens to be loaded.
//
// The shape being detected: "budget is $2000, we need wifi, everyone eats
// vegetarian, and our CFO can't attend on the 14th" genuinely has several
// separately-anchored parts to work through; one elaborated ask does not,
// even when it is long and comma-heavy. Clause count alone over-fires on a
// long single-topic sentence; requiring several clauses to each pin their
// OWN concrete anchor — a figure, a date, a name past the first word — is
// what separates "many dependent parts" from "one ask with many words."

const CLAUSE_SPLIT_RE = /[,;]|(?:\.\s+)|(?:\band\b)|(?:\bbut\b)|(?:\bwhile\b)/gi;
const MIN_CLAUSE_WORDS = 3;
const MIN_SUBSTANTIVE_CLAUSES = 3;
const NAMED_QUANTITY_RE =
  /\$\s?\d|\b\d{1,2}(?:st|nd|rd|th)\b|\b\d{4}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/i;
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=\S)/g;
// A standing preference ("from now on, always number your lists") is not
// WORK for this turn — it is a configuration change for every future turn.
// Measured live (2026-08-17): a message naming a standing preference plus an
// unrelated question ("My name is Jordan. From now on, always use a
// numbered list. What's the difference between weather and climate?")
// tripped the clause-count gate on the preference sentence's own commas —
// three parts, each re-greeting the user and re-answering the whole
// question, none of them actually numbering anything. The preference isn't
// a fact to decompose; it's addressed by carrying it forward as state, not
// by planning it as a part.
const STANDING_INSTRUCTION_RE =
  /\b(?:from now on|from here on|going forward|new rule|as a (?:standing )?rule|every time (?:you|i)|whenever (?:you|i) )\b/i;

/** Drop sentences that state a standing preference rather than this turn's
 * work, before the gate ever counts clauses. */
function stripStandingInstructions(text) {
  const sentences = text.split(SENTENCE_SPLIT_RE).filter(Boolean);
  if (sentences.length < 2) return text;
  const kept = sentences.filter((s) => !STANDING_INSTRUCTION_RE.test(s));
  return kept.join(" ");
}

/** A clause pins an anchor when it names a concrete fact beyond its first word — a figure, a date, or a proper noun mid-clause (sentence-initial capitals are just grammar). */
function clausePinsAnchor(clause) {
  if (NAMED_QUANTITY_RE.test(clause)) return true;
  const rest = clause.replace(/^\s*\S+/, "");
  return /\b[A-Z][a-z]+\b/.test(rest);
}

/**
 * True when the question itself has the shape of several dependent parts.
 * Cheap-bails on the first check — a greeting or single-sentence ask never
 * reaches the anchor scan.
 */
export function needsDecomposition(question) {
  let q = String(question || "").trim();
  if (!q) return false;
  q = stripStandingInstructions(q).trim();
  if (!q) return false;
  // A question is one ask, however many facets it names. Measured live
  // (2026-08-17): "What river is Nashville on, what US state is it in, and
  // who was its mayor in 2019?" tripped the anchor gate, each part then
  // re-answered the WHOLE question, and the assembly shipped three headed
  // sections that contradicted each other on the mayor (Briley vs Cooper) —
  // less trustworthy than one draft would have been, at three times the
  // cost. The flat path is the right shape there: the model proposes one
  // answer, and the checking ladder — which verifies every name and figure
  // separately anyway — is the fact-check. Decomposition is for WORK
  // (imperative, multi-sentence, genuinely dependent parts), so a single
  // interrogative sentence never plans.
  if (q.endsWith("?") && !/[.!?]\s+\S/.test(q)) return false;
  const clauses = q
    .split(CLAUSE_SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.split(/\s+/).filter(Boolean).length >= MIN_CLAUSE_WORDS);
  if (clauses.length < MIN_SUBSTANTIVE_CLAUSES) return false;
  // The clause-count shortcut holds only for MULTI-SENTENCE work — steps
  // stated as steps. Inside one sentence, a comma count is LENGTH, not
  // structure (P4: decompose only on a counted property, and the property
  // is anchors, never commas). Measured live in the browser (2026-08-17):
  // "Make me a counter widget in html, with a plus button, a minus button,
  // and a number in between." hit this shortcut at four comma-clauses —
  // but those commas name facets of ONE artifact, none pins an anchor, and
  // each planned part, sighted only on its own label, regenerated the
  // whole widget from scratch: five restarts wearing a plan's clothes,
  // minutes of a 2B model re-answering one ask. A single-sentence ask now
  // plans only on the anchor count; the build loop's own iteration
  // (SIG/DEF/EVA aiming each next delta) is how an artifact gets good —
  // never five blind rewrites of it in one turn.
  if (clauses.length >= 4 && /[.!?]\s+\S/.test(q)) return true;
  const anchors = clauses.filter(clausePinsAnchor).length;
  return anchors >= 2;
}

// ── the plan log ─────────────────────────────────────────────────────────────
//
// A plan is not a structure that mutates; it is an append-only log of
// inserts, and "the plan" at any moment is a FOLD over that log. The
// semantics are ported from eochat's server/task-log.js — the
// task-log-holon-spine line, the lineage's proven shape for exactly this —
// with its scars kept and its cube apparatus deliberately left behind (this
// repo is not a cube consumer; operators and grains are another organ's
// address system, and carrying them here un-earned would be decoration):
//
//   Entries are appended, never mutated. Revision appends an entry that
//   supersedes; the superseded entry STAYS, because the fact that the work
//   was once seen that way is itself evidence.
//   Ordering is `seq`, a logical counter the log supplies. No clock.
//   Evidence accumulates from ANY entry that carries it, not only from
//   evidence-kind entries — gating on kind shipped tasks whose sections had
//   nothing to cite (measured in eochat, kept as law here).
//   Unrecognized keys are payload and are carried through the fold —
//   dropping them silently handed downstream an emptied structure (same
//   lineage, same lesson).
//   A missing field is a typed gap with a reason, never a default.

export const PLAN_ENTRY_KINDS = Object.freeze({
  PROPOSE: "propose",     // a part enters the log
  SUPERSEDE: "supersede", // a part is revised; the prior entry remains
  EVIDENCE: "evidence",   // addresses admitted for a part
  RESULT: "result",       // output produced for a part
  RETRACT: "retract",     // a part is withdrawn (it stays in the log)
});

export function createPlanLog(task) {
  return Object.freeze({ task: String(task ?? ""), entries: Object.freeze([]), nextSeq: 0 });
}

/**
 * Append one entry. Returns a NEW log — the old one remains valid, which is
 * what makes "what did this look like before the revision" answerable.
 */
export function appendPlan(log, entry) {
  if (!entry || typeof entry !== "object") throw new TypeError("appendPlan requires an entry object");
  if (!Object.values(PLAN_ENTRY_KINDS).includes(entry.kind))
    throw new TypeError(`appendPlan: unknown entry kind ${JSON.stringify(entry.kind)}`);
  if (typeof entry.part_id !== "string" || !entry.part_id)
    throw new TypeError("appendPlan: every entry needs a part_id");
  const sealed = Object.freeze({
    ...entry,
    seq: log.nextSeq,
    evidence: Object.freeze([...(entry.evidence ?? [])]),
  });
  return Object.freeze({
    task: log.task,
    entries: Object.freeze([...log.entries, sealed]),
    nextSeq: log.nextSeq + 1,
  });
}

const PLAN_RESERVED = new Set(["kind", "part_id", "seq", "supersedes", "description", "evidence", "result"]);

/**
 * Fold the log into the current set of live parts. Later entries for a
 * part_id win field by field; superseded and retracted parts drop out of the
 * live set — but nothing is deleted from `log.entries`.
 */
export function projectParts(log) {
  const byId = new Map();
  const superseded = new Set();
  const retracted = new Set();

  for (const e of log.entries) {
    if (e.kind === PLAN_ENTRY_KINDS.RETRACT) { retracted.add(e.part_id); continue; }
    if (e.supersedes) superseded.add(e.supersedes);

    const prior = byId.get(e.part_id) ?? {
      part_id: e.part_id,
      description: null,
      description_gap: "no description has been given for this part yet",
      evidence: [],
      result: null,
      first_seq: e.seq,
    };

    // Domain payload: the log knows structure, not what the structure is
    // made of, and a part must carry its material through the fold.
    const payload = {};
    for (const [key, value] of Object.entries(e)) {
      if (!PLAN_RESERVED.has(key)) payload[key] = value;
    }

    byId.set(e.part_id, {
      ...prior,
      ...payload,
      description: e.description ?? prior.description,
      description_gap: e.description != null ? null : prior.description_gap,
      // Evidence accumulates from any entry that carries it.
      evidence: e.evidence?.length ? [...new Set([...prior.evidence, ...e.evidence])] : prior.evidence,
      result: e.kind === PLAN_ENTRY_KINDS.RESULT ? e.result : prior.result,
      last_seq: e.seq,
    });
  }

  return [...byId.values()]
    .filter((t) => !retracted.has(t.part_id) && !superseded.has(t.part_id))
    .sort((a, b) => a.first_seq - b.first_seq);
}

/**
 * The plan as the rest of the app reads it: live parts in proposal order,
 * plus whether the parse ever degraded — read off the live parts' own basis,
 * derived, never stored.
 */
export function foldPlan(log) {
  const live = projectParts(log);
  return {
    task: log.task,
    parts: live.map((t) => ({ id: t.part_id, label: t.label ?? t.part_id, description: t.description ?? "" })),
    results: new Map(live.filter((t) => t.result).map((t) => [t.part_id, t.result])),
    degraded: live.some((t) => t.basis === "degraded"),
  };
}

/** Canonical rendering, key order included, so two folds can be compared. */
function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** A digest of the live fold — two logs differing only in dead entries digest alike. */
const foldDigest = (log) => canon(projectParts(log).map(({ first_seq, last_seq, ...t }) => t));

/** Production passes per run — a runaway backstop, same duty as eochat's maxSteps. */
export const MAX_PRODUCE_STEPS = 3;

/**
 * The production closure, ported from task-log.js's produce(): fire rules,
 * append what they yield, run whatever became live and unrun, refold,
 * repeat — until the fold stops moving or the step guard trips. Rules are
 * caller-supplied predicates over the live fold; each returns entries to
 * append (kind defaults to PROPOSE) and must key its firing on evidence in
 * the fold, never on anything outside it. Three halt facts, kept distinct
 * because collapsing them is the one way this loop can lie: "fixpoint"
 * (production exhausted), "max-steps-guard" (bound tripped), and open gaps
 * outstanding — production being exhausted is NOT the work being done.
 */
export async function producePlan(log, rules, runLive, { maxSteps = MAX_PRODUCE_STEPS } = {}) {
  let current = log;
  let steps = 0;
  let fixpoint = false;

  while (steps < maxSteps) {
    const before = foldDigest(current);
    for (const rule of rules) {
      for (const produced of rule(projectParts(current), current) ?? []) {
        current = appendPlan(current, { kind: PLAN_ENTRY_KINDS.PROPOSE, ...produced });
      }
    }
    // Run whatever is live and has no result — the executor half of the
    // closure. Results are appended like every other entry.
    for (const part of projectParts(current).filter((t) => !t.result)) {
      const ran = await runLive(part);
      current = appendPlan(current, {
        kind: PLAN_ENTRY_KINDS.RESULT,
        part_id: part.part_id,
        evidence: ran.refs,
        result: ran,
      });
    }
    steps += 1;
    if (foldDigest(current) === before) { fixpoint = true; break; }
  }

  const openGaps = projectParts(current)
    .filter((t) => (t.result?.open ?? []).length)
    .map((t) => t.part_id);

  return {
    log: current,
    steps,
    fixpoint,
    halted_by: !fixpoint ? "max-steps-guard" : openGaps.length ? "open-gaps-remain" : "operational-closure",
    open_gaps: openGaps,
  };
}

/**
 * The one shipped rule: a part that strayed from the task's words AND
 * matched no material gets one retry proposed in the task's own words —
 * the mechanical repair for the one failure the checks type mechanically.
 * It keys on the fold's own evidence (the typed open entries) and marks its
 * product `basis: "retry"`, which is also what stops it firing twice.
 */
export function retryStrayedRule(tasks) {
  return tasks
    .filter(
      (t) =>
        t.basis !== "retry" &&
        t.result &&
        t.result.open?.some((o) => o.startsWith("part searched on words the task never used")) &&
        t.result.open?.some((o) => o.startsWith("no material matched")),
    )
    .map((t, i) => ({
      part_id: `${t.part_id}r`,
      supersedes: t.part_id,
      label: t.label ?? t.part_id,
      description: "",
      basis: "retry",
      reason: "strayed part matched nothing; retried on the task's own words",
    }));
}

/** Same limit an ordinary turn retrieves at — a part is a turn-sized question. */
export const PASSAGES_PER_PART = 3;
/** Parts beyond this are a sign the plan is padding, not decomposing. */
export const MAX_PARTS = 6;
/** Rewrite passes per part. A correction budget, not a quality threshold. */
export const MAX_CORRECTIONS = 1;
/**
 * Decode budget per part answer. A part is turn-sized; without a bound the
 * default 4096-token allowance is a standing permit to transcribe a whole
 * chapter (measured live: a "who is Dolokhov" part reproduced the Christmas
 * dinner chapter wholesale). A part that genuinely needs more length is more
 * parts — that is what decomposition is for.
 */
export const EXECUTE_MAX_TOKENS = 512;
/** The plan is a short JSON array; anything longer is the model talking. */
export const PLAN_MAX_TOKENS = 400;

export const PLAN_SYSTEM_PROMPT =
  "You split a task into the few parts it is actually made of. Reply with only a JSON array, nothing before or after it.";

/**
 * The plan's shape, enforced as grammar rather than requested as behavior:
 * Ollama's structured outputs take a JSON schema as `format` and constrain
 * decoding to it. Measured need, not caution — under plain `format: "json"`
 * gemma2:2b emits a single object (one part), because that mode's grammar
 * ends at one object. The schema is physics; the prompt above stays a
 * request, and parsePlan still handles every shape for callers whose
 * runtime cannot enforce one.
 */
export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          description: { type: "string" },
        },
        required: ["label", "description"],
      },
    },
  },
  required: ["parts"],
};

export function buildPlanPrompt(task, maxParts = MAX_PARTS) {
  return (
    `A task is to be split into parts, each answerable on its own from written material. ` +
    `Task: ${task}\n\n` +
    `Reply with a JSON array of at most ${maxParts} objects. Each object has a "label" of a few words ` +
    `and a "description" of one sentence saying what that part must establish. ` +
    `Order the parts the way the finished piece should read. If the task is already a single question, return one part.`
  );
}

// The shape of a good answer, declared before the model writes a word — not
// because a prompt is trusted (L5: it never is; judge() below enforces this
// mechanically regardless), but because a model that has never been told
// what "answered" looks like has no way to aim for it. Two shapes named
// because they are the two failures measured live: restating the prompt
// back (echo), and transcribing the passage instead of answering from it
// (reproduction) — a photocopy that grounds perfectly and answers nothing.
// No citation instruction, deliberately (2026-08-19): buildSourceBlock
// stopped showing the model any address on 2026-08-18 — zero exposure to
// this instrument's own addressing scheme, addresses attached mechanically
// by cite.js — but this prompt kept ordering "cite the address in square
// brackets exactly as it appears" when nothing appears. Measured live: the
// model obeyed the only way it could, by inventing "[4]" and
// "[Faculty & Research]", which then shipped as text and were parsed as
// claims. An instruction referencing a thing the pipeline mechanically
// removed is not a harmless leftover; it is a fabrication order.
export const EXECUTE_SYSTEM_PROMPT =
  "You are writing one part of a larger piece. Write plain prose for the part you are given, and only that part, in your own words. Say what the material establishes about the prompt — do not copy sentences from it, and do not just restate the prompt back. Where the material does not cover the part, say so plainly instead of filling the gap.";

// The no-material reply's other face. A prompt that matched no material is
// not necessarily a research gap — a greeting, a question of taste, a joke —
// and a model ordered to "say what the part would need" on "hi" says "the
// question is: hi". This prompt is the one place chat is allowed to be chat:
// no material framing, no citation grammar, just a reply to a person.
export const CHAT_SYSTEM_PROMPT =
  "A friendly conversation with no source material. The user's message matched no document to cite, so reply to it directly, briefly, and naturally, as a person would. Do not restate the message back; say something new in response.";

// S1's own face (2026-08-19, user direction: "prompt the system... to say
// if it warrants fact checking, 'my first reaction' or 'off the top of my
// head'... don't give it a list of options, give it the minimal prompting
// that would get it to frame things like that"). No canned phrases: a
// closed menu of exact wording is the same mistake L5/FLAT_EXECUTE's own
// history already names — a small model asked to pick from a list reads as
// a form filled in, not a person talking. This is one added clause, and it
// asks for a JUDGMENT ("is what I'm about to say worth checking"), not a
// performance — the same first-person hedge honest speech already reaches
// for on an off-the-cuff answer, in the model's own words rather than
// ours. Plain conversation is explicitly exempted so "hi" stays "hi".
export const S1_SYSTEM_PROMPT =
  `${CHAT_SYSTEM_PROMPT} If what you're about to say is the kind of thing worth checking, let that show naturally in how you say it — plain conversation doesn't need that.`;

// The void, acknowledged (2026-08-19, user direction: "if the surf did not
// turn something up, the model should be fed the acknowledgement of this
// void"). Before this, a preflight search that ran and found nothing looked
// IDENTICAL to a turn where no search was ever attempted — the model had no
// way to know the difference, so a materialless answer and a
// searched-and-came-up-empty answer read the same way to it. This is
// information, not an instruction (facts-before-draft.mjs's own finding,
// same day: give the model only what it needs, don't stack behavioral
// steering on top) — CHAT_SYSTEM_PROMPT's existing honesty framing already
// covers what to DO with an empty search; this only supplies the FACT that
// one happened.
export const SEARCHED_VOID_PREFIX = "A web search ran for this and found nothing usable — the search came back empty, it was not skipped.";

// The System 1 / System 2 pass (2026-08-19, user direction: "one is just
// the raw transcript that gets summarized for size and responds fast, the
// next is the system 2 response, which also has access to the fast
// response"). Same posture as SEARCHED_VOID_PREFIX, same reasoning: this is
// INFORMATION handed to the checked pass, never a behavioral instruction
// stacked on top — S2 is free to confirm, extend, or contradict what S1
// said; nothing here tells it which. `priorPassFor(text)` builds the fact
// sentence from S1's own answer; a caller with no S1 pass (or one that was
// gated off) simply never calls it, so every existing caller of runPart/
// runHolonicTask is byte-identical to before this existed.
export const priorPassFor = (text) =>
  `A faster, unchecked first pass already answered this: "${String(text ?? "").trim()}" You may confirm it, extend it, or correct it — check it against what you find rather than assuming it is right.`;

// The flat turn's material prompt speaks at the OBJECT level (2026-08-19,
// user direction: "we're being fed the wrong level of response"). The old
// shape wrapped the person's message inside a meta-directive — "Write this
// part: the question. research Robert Macnamera" — and prompt format
// matches output format: fed a description of the task, a small model
// answers with a description of the task ("This prompt asks you to research
// Robert McNamara…", measured live, shipped). So the flat call is shaped
// like the conversation it is: duty and material in the system prompt, the
// real history as messages, the person's message itself as the final user
// turn — never a directive about it. Decomposed parts keep the directive
// shape: there a part label genuinely exists and the meta level is the
// true level.
export const FLAT_EXECUTE_SYSTEM_PROMPT =
  "You are answering the latest message in a conversation. Passages retrieved for this turn follow. Answer the message in your own words — do not describe the message or the passages, and do not restate the message back. Write from the passages when they cover the question; where they do not cover it, say so plainly instead of filling the gap.";

export function buildExecutePrompt(part, sourceBlock, discourse = "") {
  const head = `Write this part: ${part.label}. ${part.description}`;
  // The discourse slice is ONE line — topic, flow, entities — never the
  // records block. A part that needs an established fact retrieves it;
  // recall is retrieval, and a small prompt is the point of running as
  // parts at all.
  const context = discourse ? `\nThe conversation so far, in one line: ${discourse}` : "";
  return sourceBlock
    ? `${head}${context}\n\n${sourceBlock}`
    : `${head}${context}\n\nNo material matched this part. Say what the part would need and stop; do not invent content.`;
}

export function buildCorrectionPrompt(part, sourceBlock, draft, failures, mode = "unsupported") {
  // Three failures, three rewrite instructions — each names exactly what
  // went wrong, because "try again" teaches nothing.
  if (mode === "reproduction") {
    return (
      `Your draft for "${part.label}" copies the passage word for word. Copying is not answering. ` +
      `Answer the question in your own words — a short paragraph saying what the passage shows about it, ` +
      `quoting at most one sentence.\n\nThe draft:\n${draft}\n\n${sourceBlock ?? ""}`
    );
  }
  if (mode === "echo") {
    return (
      `Your draft for "${part.label}" restates the prompt instead of answering it. ` +
      `Answer it from the material in your own words; ` +
      `if the material does not answer it, say so plainly.\n\nThe draft:\n${draft}\n\n${sourceBlock ?? ""}`
    );
  }
  if (mode === "narrated") {
    return (
      `Your draft for "${part.label}" describes the passage instead of answering the question — ` +
      `sentences like "this passage details…" or "it highlights…" are about the material, not an ` +
      `answer drawn from it. State the answer directly, in your own words, using what the passage says.\n\n` +
      `The draft:\n${draft}\n\n${sourceBlock ?? ""}`
    );
  }
  if (mode === "incomplete") {
    return (
      `Your draft for "${part.label}" answers as if there is only one, but the material states more than one:\n` +
      failures.map((f) => `- ${f}`).join("\n") +
      `\n\nRewrite to name all of them, or say plainly that the material lists more than one. ` +
      `Do not invent a reason to prefer one over the others unless the material itself gives one.\n\n` +
      `The draft:\n${draft}\n\n${sourceBlock ?? ""}`
    );
  }
  return (
    `Your draft for the part "${part.label}" contains statements the supplied material does not support:\n` +
    failures.map((f) => `- ${f}`).join("\n") +
    `\n\nRewrite the part using only what the passages state. ` +
    `Where the material is silent, say so instead.\n\nThe draft:\n${draft}\n\n${sourceBlock ?? ""}`
  );
}

/**
 * The mechanical answer — the fallback when the model's drafts keep failing
 * (echo or photocopy) and the correction budget is spent. The model has had
 * its chances; the instrument assembles the answer itself from the
 * material's own sentences, EACH carrying its address — measured need
 * 2026-08-17: a photocopy shipped with one address on four sentences, and
 * the reader asked "how did it know all this?" — provenance that isn't on
 * every sentence reads as knowledge from nowhere. Selection is the argmax
 * of overlap with the question's own tokens, one sentence per passage
 * (each retrieved perspective gets one voice; no threshold anywhere, P4).
 * The closing line states a process fact that is true by construction —
 * never a judgement about what the material "doesn't say".
 */
export function mechanicalAnswer(question, passages) {
  const qTokens = new Set(tokenize(String(question ?? "")));
  if (!qTokens.size) return "";
  const lines = [];
  for (const p of passages ?? []) {
    const best = splitSentences(String(p.text ?? ""))
      .map((s) => {
        const t = String(s).trim();
        return { t, n: tokenize(t).filter((w) => qTokens.has(w)).length };
      })
      .filter((x) => x.t && x.n > 0)
      .sort((a, b) => b.n - a.n)[0];
    if (best) lines.push(`“${best.t}”${p.ref ? ` [${p.ref}]` : ""}`);
  }
  if (!lines.length) return "";
  return [
    "The model's drafts did not answer, so this is assembled mechanically — the material's own sentences that bear on the question, each with its address:",
    ...lines,
    "Nothing further was retrieved for the question's own words.",
  ].join("\n\n");
}

/**
 * Pull the first balanced JSON array out of a reply. Constrained decoding
 * makes this trivial for Ollama; a prose-mode model may wrap the array in
 * talk, so the extraction walks brackets rather than trusting a regex to
 * find the end.
 */
export function extractArray(text) {
  const s = String(text ?? "");
  // Every "[" is a candidate start, not just the first: a bracketed aside in
  // prose before the real array must not discard a valid plan.
  for (let start = s.indexOf("["); start !== -1; start = s.indexOf("[", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        if (ch === "\\") i++;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "[") depth++;
      else if (ch === "]" && --depth === 0) {
        try {
          const parsed = JSON.parse(s.slice(start, i + 1));
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // this bracket was not the array — keep scanning
        }
        break;
      }
    }
  }
  return null;
}

/**
 * A plan is whatever survives: objects with a usable label or description,
 * capped, each part given a stable id. An unusable reply is not an error —
 * the task runs as its own single part and the degradation is a typed gap,
 * because a task silently un-decomposed reads as a plan that chose that.
 */
export function parsePlan(raw, task, maxParts = MAX_PARTS) {
  // Constrained decoding guarantees JSON, not shape: gemma2:2b's live reply
  // was a top-level OBJECT wrapping the array ({"parts": [...]}), which the
  // array scan alone misses. An object whose first array-valued field holds
  // the parts is the same plan in a wrapper — unwrap it, don't degrade on it.
  let arr = extractArray(raw);
  if (!arr) {
    try {
      const obj = JSON.parse(String(raw ?? ""));
      if (obj && typeof obj === "object" && !Array.isArray(obj))
        arr = Object.values(obj).find(Array.isArray) ?? null;
    } catch {
      // not an object either — the degradation path below handles it
    }
  }
  const parts = (arr ?? [])
    .filter((p) => p && typeof p === "object")
    .map((p, i) => ({
      id: `p${i + 1}`,
      label: String(p.label ?? p.title ?? "").trim() || `part ${i + 1}`,
      description:
        String(p.description ?? p.desc ?? "").trim() ||
        String(p.label ?? p.title ?? "").trim(),
    }))
    .filter((p) => p.description)
    .slice(0, maxParts);

  if (parts.length) return { parts, degraded: false };
  return {
    parts: [{ id: "p1", label: "the task", description: task }],
    degraded: true,
  };
}

/**
 * One part, end to end: research, execute, check, bounded correction. The
 * check runs on every draft, and the provenance reported is the LAST draft's
 * check — a correction that didn't take stays visible as what it is.
 */
export async function runPart({
  part,
  task = "",
  discourse = "",
  chatHistory = [],
  chunks,
  call,
  foldedRefs = [],
  passagesPerPart = PASSAGES_PER_PART,
  maxCorrections = MAX_CORRECTIONS,
  makeNameResolver = null,
  makeRelationReader = null,
  // The link tier (links.js): an async function url => fetched-shape result,
  // through the P13 egress — injected because this module owns no network.
  // null means the standing web consent is off; every cited URL then ships
  // `unexamined`, never silently treated as checked.
  checkLink = null,
  linkBudget = LINK_CHECKS_PER_PART,
  // True only for the single flat part a plain chat question runs as
  // (runHolonicTask's planMode "flat" — the part's own words ARE the whole
  // conversation, never a plan-scoped slice). Distinguishes this part from
  // a decomposed part, whose narrow scoping is deliberate: `strayed` below
  // already discloses rather than silently widens when a part's words share
  // nothing with the task. A flat part gets no such protection by staying
  // narrow — the opposite failure is the live one: asked "prove it" after a
  // weather question, the part's own words are the whole content, and
  // retrieval on "the question prove it" alone shares no term with whatever
  // this turn just fetched to answer it. Default false so every existing
  // caller — every decomposed part — is byte-identical to before.
  flat = false,
  // The fact that a preflight web search ran BEFORE this part and found
  // nothing — a string naming what was searched, or null when no search
  // happened at all (never attempted and attempted-and-empty must read as
  // different facts to the model, not the same silence). Flat only, and
  // only reaches the chat branch below (a part that HAS passages already
  // knows the surf turned something up; this is specifically the void).
  searchedVoid = null,
  // S1's own answer text, or null when there was no fast pass (or the S2
  // gate never fired). Flat only, reaching both the chat branches and the
  // flat material branch (unlike searchedVoid, S1's answer stays relevant
  // once material exists too — "here's what a fast pass said, check it
  // against what you now have"). See priorPassFor, above.
  priorPass = null,
  onProgress = null,
}) {
  // Stable sub-assemblies (2026-08-19, user direction). The part's own words
  // and the fold's discourse line are two DIFFERENT assemblies, and the old
  // unconditional concatenation let one contaminate the other: measured
  // live, "research Robert Macnamera" asked right after a greeting retrieved
  // greeting-etiquette passages, because the stale topic's words ("Greeting
  // exchange · …") rode into the query on spec and out-voted a misspelled
  // name that matched nothing. The discourse anchor exists for the OPPOSITE
  // case — a topic-less follow-up ("prove it") whose own words anchor
  // nothing — so the join is now earned by measurement, never assumed:
  // retrieve on the part's own words first; only when that comes back EMPTY
  // does a flat part widen with the discourse line, and the widening is
  // disclosed on the research progress event rather than folded in silently.
  //
  // The label joins the query only for a DECOMPOSED part, where it is a
  // real, model-authored search phrase ("Nashville founding year"). A flat
  // part's label is never that — `runHolonicTask` hardcodes it to the
  // literal string "the question" (a narration constant: it is what turns
  // the progress line into "the question: 3 passage(s) retrieved", nothing
  // more), so joining it here folded the bare word "question" into every
  // flat retrieval query regardless of what was actually asked. Measured
  // live 2026-08-19: "who was abraham lincoln's vice president?" retrieved
  // a passage about "the slavery question" at the 1860 Democratic National
  // Convention over the material's own Hamlin/Johnson succession-box facts,
  // on that one shared, meaningless word — the model then had a real answer
  // sitting in the same material and a spurious one ranked ahead of it, and
  // (being small) narrated the wrong one instead of answering. This is a
  // sibling of the "Write this part: the question. …" bug the flat/decomposed
  // prompt split above already fixed the SAME day for the model-facing
  // text — the meta label leaked into content here too, just one layer
  // over, in the query rather than the prompt.
  const partWords = flat ? part.description : `${part.label} ${part.description}`;
  const live = chunks ?? [];
  let question = partWords;
  let passages = live.length ? retrieve(live, question, passagesPerPart, foldedRefs) : [];
  let widened = false;
  if (!passages.length && flat && discourse && live.length) {
    question = `${partWords} ${discourse}`;
    passages = retrieve(live, question, passagesPerPart, foldedRefs);
    widened = passages.length > 0;
  }
  const sourceBlock = buildSourceBlock(passages);
  onProgress?.("research", part, { passages: passages.map((p) => p.ref), widened });

  // The plan steers this part's retrieval — that is what a plan is for — but
  // steering is disclosed, never silent: a part whose words share nothing
  // with the task searched on vocabulary the task never contained, and that
  // fact is a typed entry in the part's own gaps, not a thing to notice later.
  const taskTerms = new Set(tokenize(task));
  const strayed =
    taskTerms.size > 0 && !tokenize(question).some((t) => taskTerms.has(t));

  let draft = "";
  let check = null;
  let corrections = 0;

  // Built once per part from its own passages — names resolve against the
  // cast the material itself establishes (cast.js), never a wider corpus.
  const resolveName = makeNameResolver?.(passages) ?? null;

  // The relation tier (hypergraph.js), built the same way: the material's
  // own edges from this part's passages, the closed-class measure from the
  // live corpus. Injected — this module stays pure and the page supplies
  // the engine's organs.
  const relations = passages.length ? makeRelationReader?.(passages, { pool: live }) ?? null : null;

  const inspect = (text) => {
    // The label is model-authored output that ships as a heading, so it is
    // checked with the draft — a figure invented in a label is the same
    // failure as one invented in a sentence, and must land in the same list.
    const shipped = `${part.label}\n${text}`;
    const { used, unsupported } = checkCitations(shipped, passages);
    // Symmetric with retrieval above: the discourse joins the grounding
    // question only where the task's own words demonstrably failed to
    // anchor — retrieval had to widen, or there are no passages at all (the
    // P23 no-material case this anchor was built for, where the folded
    // question is what keeps a topic-less follow-up's proof search on the
    // real conversation). A part whose own words retrieved its material
    // keeps its own words: the findings' sentences, and every proof query
    // built from them, stop inheriting a stale topic's vocabulary.
    const groundingQuestion =
      flat && discourse && (widened || !passages.length)
        ? `${task} ${part.description} ${discourse}`
        : `${task} ${part.description}`;
    const checkedGrounding = checkGrounding(shipped, passages, {
      question: groundingQuestion,
      resolveName,
    });
    // No material means checkGrounding rightly declines to examine anything
    // (its `examined: false` is a deliberate fact, not a gap — see
    // grounding.test.mjs). The constitutional question is what absence is
    // ALLOWED to mean: everywhere else in this ladder, "nothing to check
    // against" is a reason to withhold judgment, never a reason to convict.
    // extractCheckableAtoms exists to give proof-seeking candidates on a
    // genuine world-claim nobody sourced — a bare factual question with no
    // material at all (grounding.js's own docstring: "what percentage of
    // Earth's atmosphere is nitrogen"). It must not fire on a part whose
    // subject is an artifact the model just produced. A build's own account
    // of its own code ("initializes a counter", "adds click listeners") is
    // not a claim about the world nobody sourced — its ground is the code
    // sitting right next to it, which this ladder doesn't check prose
    // against because app.js already treats that ground as sufficient (the
    // 2026-08-17 build-turn amendment, CLAUDE.md). Manufacturing "unsupported
    // by definition" findings from bare absence, on a part that HAS a ground
    // just not one this ladder reads, produced exactly the failure that
    // amendment named live: a counter widget's own walk-through read back as
    // a wall of invented-claim chips. So the fallback is gated on the same
    // signal app.js uses to withhold its chip strip — a fenced code segment
    // in the part's own text — rather than repeating the mistake one layer
    // down under a different name.
    const isArtifactPart = parseSegments(text).some((s) => s.type === "code");
    const grounding = passages.length || isArtifactPart
      ? checkedGrounding
      : (() => {
          const findings = extractCheckableAtoms(shipped, { question: groundingQuestion });
          return { ...checkedGrounding, findings, clean: findings.length === 0 };
        })();
    const attributions = attribute(text, passages, live);
    const attributed = attributedRefs(attributions);
    // The answer read against the material's own edges. Contradicted and
    // unbound edges are claims of fact the material does not make — they
    // join the unsupported list and drive the same bounded correction;
    // beyond-reach and unheard stay disclosure-only (limits of the
    // instrument, not failures of the answer).
    //
    // `text` alone, NOT `shipped` — unlike checkCitations/checkGrounding
    // above (which legitimately want a figure invented IN the label
    // caught too), relations.read() extracts SVO by a subject span that
    // can run up to two tokens across whitespace, INCLUDING a newline.
    // Measured live 2026-08-19 (the completeness-gate work): a flat
    // turn's label is literally "the question" (the hardcoded flat-mode
    // constant), so `shipped` reads "the question\nLincoln appointed
    // Hamlin…" — and the subject span bridged the newline, extracting
    // "question\nLincoln" as the claim's subject instead of "Lincoln".
    // The verdict itself still resolved correctly (endpoint() also
    // matches by surface substring, so "question\nLincoln" still found
    // the Lincoln referent) — but two claims for the SAME real subject
    // now carried two DIFFERENT subject strings, one polluted and one
    // clean, so a caller grouping claims by subject+verb (the
    // completeness gate, below) saw two distinct slots instead of one and
    // wrongly convicted an answer that had, in fact, named every filler.
    // A part's label is never itself a sentence worth relation-checking
    // (flat mode's is a constant with no content at all; a decomposed
    // part's is a short phrase), so nothing is lost dropping it here.
    const relationReport = relations ? relations.read(text) : null;
    // Every quotation followed to the bytes (quotes.js): a fabricated
    // quotation joins the unsupported list — the strongest claim an answer
    // makes gets the same bounded correction as an invented figure. That
    // includes a quotation fabricated only in PART: an ellipsis quotation
    // with one segment located nowhere is `partial`, and quoteFindings
    // reports it here (one line per invented segment, naming it) exactly
    // as it reports a wholly invented one — the located half is not a
    // warrant for the other half. `quoted` below is a whitelist for the
    // same reason: only wholly located quotations are a channel of
    // support. Drift repair happens once, after the correction loop, where
    // the final draft is rewritten to the source's own bytes and
    // re-inspected.
    const quotes = passages.length ? verifyQuotes(text, passages, { pool: live }) : null;
    return {
      used,
      attributed,
      refs: [...new Set([...used, ...attributed])],
      channels: [
        ...(used.length ? ["cited"] : []),
        ...(attributed.length ? ["attributed"] : []),
        ...(relationReport?.examined && !relationReport.vocabulary?.gap ? ["relations"] : []),
        ...(quotes?.quotes.some((q) => q.status === "verbatim" || q.status === "drifted") ? ["quoted"] : []),
      ],
      // Two lists now, because they are two kinds of fact (user-directed
      // 2026-08-17, propose-then-check). LIES about the given drive the
      // bounded correction: an address that was never offered, a fabricated
      // quotation, an edge the material states the opposite of. UNBACKED
      // knowledge — a name or figure the material is merely silent on, an
      // edge it never binds — ships and is MARKED: the wavy stripe, the ∅
      // badge, the proof-seeking door are that list's whole treatment.
      // Measured live before this split: "who was its mayor in 2019?" put
      // the true answer in the draft, the correction pass rewrote it away
      // for being unsupported, the rewrite collapsed into reproduction, and
      // the mechanical fallback shipped no mayor at all — the apparatus
      // deleting the one thing the reader asked for.
      unsupported: [...unsupported, ...relationFindings(relationReport, { verdicts: ["contradicted"] }), ...quoteFindings(quotes)],
      unbacked: [...unsupportedClaims(grounding), ...relationFindings(relationReport, { verdicts: ["unbound"] })],
      attributions,
      grounding,
      relations: relationReport,
      quotes,
    };
  };

  // Grounded is necessary; ANSWERING is the requirement. Two ways a draft
  // can be perfectly grounded and still fail the question, both measured
  // live and both threshold-free set/substring containment — SENTENCE-wise,
  // not whole-draft: a draft that opens by echoing the question and THEN
  // transcribes the passage is neither a whole-draft echo nor a whole-draft
  // substring, and the first version of this check missed it live (2026,
  // "Who is Anna Pávlovna Schérer?" followed by the entire chapter). Each
  // sentence is classified on its own; a sentence whose every content word
  // is already in the question is FRAMING, set aside; what remains is the
  // draft's actual content, and IT is what gets judged:
  //   echoed       — no content sentences survive framing: the prompt,
  //                  restated and nothing else. Run 6: 8/50 turns.
  //   reproduced   — either the content, rejoined, is one contiguous
  //                  verbatim stretch of an offered passage (the simple
  //                  whole-copy case), OR MORE OF THE ANSWER'S SUBSTANCE IS
  //                  COPIED THAN IS NOT — the same "present more often than
  //                  absent" cut cite.js's commonTerms already uses for
  //                  terms (`cut = pool.length / 2`), applied here to the
  //                  character mass of the answer's own sentences. The
  //                  second test is the one the first version of this check
  //                  missed live: real commentary sentences interleaved
  //                  between long verbatim quotations break contiguity, but
  //                  an answer that is mostly quotation with a little
  //                  commentary stitched between the quotes has still not
  //                  answered the question — it has annotated a photocopy.
  //                  Mass, not a count of sentences: a count measures the
  //                  material's punctuation habits, and a page of short
  //                  dialogue lines transcribed whole reads as clean under
  //                  one (see reproducedFromContent for the measurement).
  // Either verdict is a FAILURE that triggers the same bounded correction
  // pass as an unsupported claim, with the rewrite told exactly which
  // failure it is fixing. A draft still failing when the budget runs out
  // fails the part: no refs, typed open — an answer that does not answer
  // earns nothing.
  const questionWords = new Set(tokenize(`${task} ${question}`));
  const ADDRESS_RE = /\[?[^\s\]]+#\d+-\d+\]?/g;
  // ONE fold, applied to both sides of every containment below (P11). It is
  // source.js's `foldTypography`: the source's words, to the source's own
  // stops, with the typesetting shed. The fold that used to sit here folded
  // diacritics, case and whitespace only, so a model that retyped a chapter
  // while straightening its quotation marks, hyphenating its em dashes,
  // spelling its ellipsis with three dots or dropping one comma slipped past
  // every test below with the source's words intact — reproduction the
  // instrument reported clean (audit 2026-08-16).
  const passagesFolded = passages.map((p) => foldTypography(p.text));
  // A sentence that only NAMES the act of prompting is framing, not content:
  // "The question is: …", "You asked about …", "To answer your question …".
  // The tell is structural and closed-set — every surviving content token is
  // either the prompt's own word or one of a tiny set of act-naming words.
  // The set is the reason "The question is: hi." is caught at all: tokenize
  // drops "hi" (two letters) and the sentence survives as {"question"} alone.
  // This is a judgement in code, never a vocabulary list planted in a prompt
  // — the same L5/L2 discipline as grounding.js's stoplist and cite.js's veto.
  const ACT_WORDS = new Set([
    "question", "answer", "ask", "asked", "asks", "asking", "reply", "replied",
    "responding", "respond", "referring", "regarding", "concerning", "about",
    // Act-naming words measured live 2026-08-17 (three echoes in a row on
    // the Borodino material): "The question at hand is…", "…is addressed."
    // Each names the act of asking; none performs an answer.
    "addressed", "address", "hand", "matter",
  ]);
  // A code fence is STRUCTURE, never framing. Measured live: a Python
  // answer opened with ```python, whose one surviving token ("python") was
  // also in the prompt, so the fence read as a restatement — the trim below
  // dropped the opening fence and the block rendered as flattened prose
  // with an orphan ``` at the end, and no build was ever made from it.
  // Structure is not a claim about the prompt and cannot echo it.
  const FENCE_LINE = /^[ \t]*(?:```|~~~)/;
  // The embedded-interrogative echo, measured live 2026-08-17: "The question
  // of who commanded the Russian army at the Battle of Borodino and who led
  // the French is addressed." Every content word the plain test needs sits
  // inside a wh-clause — and the model resolved the question's "this battle"
  // to the material's own "Borodino", so the word-for-word test cannot see
  // the restatement. Blanking each wh-clause (wh-word up to the matrix verb,
  // a conjunction, or punctuation) strips what the sentence merely re-asks;
  // if what SURVIVES is still nothing but the question's words and
  // act-words, the sentence performed no answer. A real answer keeps its
  // content outside the wh-clause ("Napoleon, who led the French, entered
  // Moscow" survives as "Napoleon entered Moscow"), and a pseudo-cleft's
  // content sits after the copula boundary, so both stay content. Residue
  // accepted and disclosed: an echo whose embedded clause re-inflects the
  // question's verb ("who was in command" for "who commanded") slips this
  // test — the guard catches the measured shapes, it is not a parser.
  const WH_CLAUSE = /\b(?:who|whom|whose|what|which|when|where|why|how)\b[^,;:—–]*?(?=\b(?:is|are|was|were|and|but|or)\b|[,;:—–]|$)/gi;
  // The dialogue-narration echo, measured live 2026-08-18 ("what is the
  // weather in NYC today?", real weather pages fetched and offered): "The
  // conversation starts with a question about the weather in New York
  // City." / "The user is waiting for more information about the weather."
  // / "The user is looking for the weather in New York." A third echo
  // shape neither test above can see: it narrates the dialogue in the
  // third person instead of restating the question's own words, so its
  // content tokens (user, conversation, waiting, looking) come from the
  // dialogue apparatus, not the question — and the word-coverage test
  // reads them as content. Vocabulary held to exactly what was measured —
  // subjects {user(s), conversation}, verb lemmas {ask, start, wait,
  // look} — the same II.11 earned-constant discipline ACT_WORDS' own
  // dated amendments follow; a wider guess list is future work, not
  // shipped here as if it were already measured.
  //
  // provenance.js's own `NARRATION_SUBJECT`/`CUT_RES` (imported above as
  // stripNarrationSentences, already run inside this function's `clean`,
  // before this text is ever reached) is the SAME register, earned
  // against a real null (194 live_priors documents, ~460k sentences).
  // This is deliberately NOT a second copy of that list: clean() DELETES
  // a matching sentence from the draft outright, with no verdict signal,
  // before judge() runs; DIALOGUE_NARRATION_RE below classifies whatever
  // SURVIVES that cut, feeding the echoed/reproduced verdict, the
  // correction retry, and the mechanical fallback — a job clean() cannot
  // do (an all-narration draft that clean() empties out entirely still
  // needs a verdict, and the code below is what supplies one). The two
  // lists were extended together on this date (provenance.js gained
  // wait(s)/waiting and look(s)/looking in the same pass) precisely so
  // they name the same measured register rather than drifting apart —
  // extend both together, never one alone.
  //
  // Disclosed residue, both directions, the guard's own standing posture:
  // material genuinely ABOUT a user or a conversation that also carries
  // one of these four verbs ("The user requests an access token." is
  // outside this measured set and ships; "The user starts the session."
  // would not) can be misread as narration — this corrupts not only the
  // framing-cut but also the reproduction-mass denominator, since a
  // misclassified sentence never reaches contentSentencesOf either. And
  // in the other direction, only a PREFIX or SUFFIX of framing sentences
  // is cut at ship time (below); a narration sentence classified here as
  // framing but sitting in the MIDDLE of an otherwise-real answer still
  // ships to the page, the fold, and the record. Neither residue is
  // pinned by a test; both are named here so a widened vocabulary or a
  // mid-draft cut are recognized as the next measured passes, not
  // rediscovered from scratch.
  // Extended 2026-08-19 with the same measured shapes provenance.js's
  // register gained the same day (the two lists name one register — extend
  // both together, never one alone): subjects prompt|question with up to
  // four modifier words between determiner and noun ("The 1960 World
  // Series question … is directly related to baseball playoffs", shipped
  // live as a whole answer), and the relate verb lemma from that same
  // specimen.
  const DIALOGUE_NARRATION_RE =
    /^[\s"'“”‘’(\[]*(?:the|this|that|your|our)\s+(?:[\p{L}\p{N}'’-]+\s+){0,4}?(?:user|users|conversation|prompt|question)\b(?:\s*,[^,\n]*,)?[^.,;:—–!?]*?\b(?:ask|asks|asked|asking|start|starts|started|starting|wait|waits|waited|waiting|look|looks|looked|looking|relate|relates|related|relating)\b/iu;
  const isFraming = (sentence) => {
    if (FENCE_LINE.test(sentence)) return false;
    // A sentence that ends by asking is asking, not answering — two of the
    // three live echoes shipped with the question mark still on them.
    if (/\?\s*["'”’)\]]*\s*$/.test(sentence)) return true;
    if (DIALOGUE_NARRATION_RE.test(sentence)) return true;
    const toks = tokenize(sentence);
    if (!toks.length) return false;
    if (toks.every((w) => questionWords.has(w) || ACT_WORDS.has(w))) return true;
    const rest = tokenize(sentence.replace(WH_CLAUSE, " "));
    return rest.length > 0 && rest.every((w) => questionWords.has(w) || ACT_WORDS.has(w));
  };
  /** Sentences of `t` with addresses stripped, framing (question-echo) sentences removed. */
  const contentSentencesOf = (t) =>
    splitSentences(String(t ?? "").replace(ADDRESS_RE, " "))
      .map((s) => s.replace(ADDRESS_RE, " ").trim())
      .filter(Boolean)
      .filter((s) => !isFraming(s));
  /** A folded sentence is the material's own if some passage contains it. */
  const isVerbatimSentence = (sf) => sf.length > 0 && passagesFolded.some((pf) => pf.includes(sf));
  /**
   * Reproduction, from an already-extracted list of non-framing sentences.
   *
   * The majority cut is over CHARACTER MASS, not over a count of sentences,
   * and it carries no length floor. That is a deliberate replacement of both
   * halves of what stood here, for one reason: a count of sentences is a
   * measurement of the material's punctuation habits, not of how much of the
   * answer is copied.
   *
   * The count had a floor — a sentence under three content tokens could not
   * COUNT as verbatim, so that a short coincidence ("Yes." appearing
   * somewhere in a passage) could not buy a whole vote. But the floor only
   * ever silenced the numerator; those sentences stayed in the denominator.
   * Dialogue is made of them. Measured on War and Peace (audit 2026-08-16):
   * 1,137 chunks have half or more of their sentences under the floor, and
   * every one of them can be transcribed WHOLE — nine lines of speech, word
   * for word — while at most one line is allowed to count, so the cut
   * mathematically cannot fire. The novel's entire dialogue face photocopies
   * past a guard that reports clean.
   *
   * Mass fixes the numerator and the denominator at once, and dissolves the
   * floor rather than tuning it: a sentence contributes exactly what it
   * weighs, to both sides. A three-character coincidence buys three
   * characters of numerator instead of a full vote, which is what the floor
   * was reaching for and could not express — so the floor comes out, and with
   * it a hand-set constant (P9: no number where a structural rule will do).
   * Nine short copied lines outweigh one original lead-in, as they should;
   * two short quoted lines inside a real paragraph of the model's own prose
   * do not, which a floorless COUNT would have called reproduction at 2 of 3.
   * The measure is a ratio of the answer's own substance, immune to how the
   * source happens to distribute its full stops.
   */
  const reproducedFromContent = (content) => {
    if (!content.length) return false;
    const folded = content.map(foldTypography).filter(Boolean);
    if (!folded.length) return false;
    const contentText = folded.join(" ");
    const wholeBlockCopied = passagesFolded.some((pf) => pf.includes(contentText));
    let copiedMass = 0;
    let totalMass = 0;
    for (const sf of folded) {
      totalMass += sf.length;
      if (isVerbatimSentence(sf)) copiedMass += sf.length;
    }
    return wholeBlockCopied || copiedMass > totalMass / 2;
  };
  const judge = (t) => {
    const all = splitSentences(String(t ?? "").replace(ADDRESS_RE, " ")).filter(Boolean);
    if (!all.length) return { echoed: false, reproduced: false };
    const content = contentSentencesOf(t);
    if (!content.length) return { echoed: true, reproduced: false };
    return { echoed: false, reproduced: reproducedFromContent(content) };
  };

  // The draft streams out through progress events, so the page can show the
  // part being written instead of dead air. Predictive error correction:
  // periodically — not on every token, which would spend more on checking
  // than on writing — the sentences COMPLETED so far are judged by the same
  // majority test the finished draft will face. A generation already
  // provably dominated by verbatim copying is stopped there rather than
  // left to spend its whole decode budget confirming what the completed
  // sentences already show; the caller (below) treats the cancelled
  // partial exactly like a finished draft that failed the same test.
  let lastPredicted = 0;
  const PREDICT_EVERY_CHARS = 200;
  const streaming = {
    onDelta: (partial) => {
      onProgress?.("draft", part, { partial });
      if (partial.length - lastPredicted < PREDICT_EVERY_CHARS) return false;
      lastPredicted = partial.length;
      // Only sentences the stream has actually FINISHED — splitSentences on
      // a partial always risks judging an in-progress last sentence that
      // has not yet had the chance to diverge from the passage.
      const finished = splitSentences(partial.replace(ADDRESS_RE, " ")).slice(0, -1);
      if (!finished.length) return false;
      const content = finished.map((s) => s.trim()).filter((s) => s && !isFraming(s));
      return reproducedFromContent(content);
    },
  };

  // A part with no material is plain chat, not a research gap. The
  // research-framed prompt over nothing produces either an echo of the
  // prompt or a diagnosis of it ("The prompt needs a clear, specific
  // question") — both measured live — because a model told to "say what
  // the part would need" on "hi" has nothing to say but that. The first
  // draft for a passage-less part is therefore ONE neutral conversational
  // call: the prompt is a prompt, answered as a person would answer it.
  //
  // When verbatim history is available (chatHistory), send it as message
  // pairs so the model can see the actual back-and-forth. The threshold
  // is the window itself — RECENCY_WINDOW messages is always small enough
  // to send raw. The one-line discourse slice is NOT a fallback for when
  // chatHistory is absent — it is a different assembly (S1's own distilled
  // topic/flow/entities, never re-derivable from raw turns by a small model
  // for free) and rides ALONGSIDE chatHistory always, not only in its
  // absence. Measured live (2026-08-19, "system 2 keeps drifting off the
  // discourse"): the prior code dropped this line the moment chatHistory
  // existed (`chatHistory.length ? "" : chatContext`), which is exactly
  // backwards at the moment it matters most — aperture.js's own regime can
  // narrow chatHistory to as little as the two messages of one exchange
  // under startle, and that is precisely when the wider conversation's only
  // surviving anchor is this line, not the (now-truncated) raw turns.
  const chatContext = discourse ? `\n\nThe conversation so far: ${discourse}` : "";
  // The conversation is its own assembly, and the flat material path gets it
  // REAL — the same role-structured history the chat path already sends —
  // never only the one-line paraphrase. Measured live (2026-08-19): "what is
  // my name?" ran the material path, which used to drop history entirely the
  // moment passages existed, so the model dutifully summarized a
  // preflight-fetched page about a stranger instead of seeing the
  // conversation it was asked about. A regular model with the full context
  // answers that honestly; this instrument may not do worse than the null
  // it exists to beat. And the person's message arrives as ITSELF — the
  // final user turn, verbatim — with duty and material in the system prompt
  // (FLAT_EXECUTE_SYSTEM_PROMPT above says why: fed a directive about the
  // task, a small model answers with a description of the task). Flat only:
  // a decomposed part's small prompt is the point of running as parts at
  // all, and its history stays out by design.
  // S1's own answer, when there was one and the S2 gate let this part run
  // (priorPassFor, above) — flat only, same reach as searchedVoid, folded
  // in alongside it rather than replacing it: a turn can both have run a
  // preflight search AND have a fast first pass to check.
  const priorPassSuffix = flat && priorPass ? ` ${priorPassFor(priorPass)}` : "";
  const searchedVoidSuffix = flat && searchedVoid ? ` ${searchedVoid}` : "";
  const executeMessages = passages.length
    ? flat
      ? [
          {
            role: "system",
            content: [FLAT_EXECUTE_SYSTEM_PROMPT + priorPassSuffix, sourceBlock].join("\n\n") + chatContext,
          },
          ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: task || `${part.label}. ${part.description}` },
        ]
      : [
          { role: "system", content: EXECUTE_SYSTEM_PROMPT },
          { role: "user", content: buildExecutePrompt(part, sourceBlock, discourse) },
        ]
    : chatHistory.length
      ? [
          { role: "system", content: `${CHAT_SYSTEM_PROMPT}${searchedVoidSuffix}${priorPassSuffix}${chatContext}` },
          ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: task },
        ]
      : [
          { role: "system", content: `${CHAT_SYSTEM_PROMPT}${searchedVoidSuffix}${priorPassSuffix}` },
          { role: "user", content: `${task}${chatContext}` },
        ];
  onProgress?.("execute", part, {
    // What this call will actually carry — the page's pace ledger turns it
    // into an expected duration.
    promptChars: executeMessages.reduce((n, m) => n + m.content.length, 0),
  });
  // Meta-cognition is not content. A model's brackets mean one thing here —
  // a citation — so any bracketed span that is not one, and that itself
  // runs more than one sentence, is the model narrating its own act of
  // answering rather than answering. Stripped mechanically, immediately,
  // before inspect() or judge() ever see it: hidden from render because it
  // was never an answer, and kept out of the checks because it is not a
  // claim to verify. What was hidden is disclosed once, below — the fact
  // that it happened is on the record; its content is not.
  const scaffoldRemoved = [];
  let lastCleanRemoved = 0;
  // stripNarrationSentences (provenance.js) used to CUT its matches
  // ("This passage details…", "It highlights…") straight out of the
  // shipped draft — silent surgery on the model's own sentences, with no
  // way for the model to have a say in it. User direction, 2026-08-19,
  // reacting to exactly that live: "no post processing. the model says
  // what it says. we can fact check or revise what it said later — not
  // rewriting but changing its mind." It now runs in DETECT-ONLY mode:
  // `lastNarrationCut`/`lastNarrationTotal` measure how much of the draft
  // it would have removed, and verdictOf below turns that measurement into
  // `narrated`, a verdict that joins echoed/reproduced in the SAME
  // correction loop everything else already goes through — a real second
  // call, told plainly what went wrong, so what ships is either the
  // model's own revised words or (if it still fails) the same disclosed
  // mechanical fallback echoed/reproduced already use. Never a quiet edit
  // to sentences the model was never shown was made.
  let lastNarrationCut = 0;
  let lastNarrationTotal = 0;
  const clean = (raw) => {
    const scaffold = stripScaffoldNarration(raw);
    const narration = stripNarrationSentences(scaffold.text, {
      discourse,
      hasMaterial: passages.length > 0,
    });
    lastCleanRemoved = scaffold.removed.length;
    scaffoldRemoved.push(...scaffold.removed);
    lastNarrationCut = narration.removed.join(" ").length;
    lastNarrationTotal = scaffold.text.length;
    return scaffold.text;
  };
  // Completeness (2026-08-19, user direction: "we STILL are not getting
  // Johnson, it's not adversarially checking if there is more to the
  // story" / "every question like that spin up a little def eva rec that
  // has a completeness gate"). hypergraph.js's clusterFillers already
  // computes exactly this — a bound claim whose subject+verb binds MORE
  // than one distinct object (Lincoln —appointed→ {Hamlin, Johnson}) — and
  // was sitting unread: the Lincoln/Hamlin/Johnson turn's own verification
  // taxonomy carried `fillers` on the claim the whole time, and nothing
  // downstream ever asked. `isIncomplete` is that ask: a BOUND claim
  // (never unbound — a wrong answer is a different, already-handled
  // problem, P33's own unbacked/unsupported split) with more than one real
  // filler means the question's own singular phrasing outran what the
  // material actually has, the exact Strawson/Russell uniqueness gap P33's
  // own header names. Scoped to `check.relations`, computed at verdictOf's
  // call sites (both already hold a fresh `check`).
  // A single claim carrying `fillers.length > 1` is not by itself proof of
  // an incomplete ANSWER — clusterFillers computes cardinality once per
  // slot and every claim sharing that slot reports the identical list, so
  // an answer that names every filler across SEVERAL sentences ("Lincoln
  // appointed Hamlin. Lincoln also appointed Johnson.") would still have
  // each individual claim carrying both names in `fillers`, and a naive
  // per-claim check would wrongly convict a genuinely complete answer.
  // What actually matters is COVERAGE: across every claim this answer
  // makes for one slot (subject+verb), does the union of what it actually
  // SAID cover every filler the material states? One entry per slot,
  // never one per claim, so a slot is never reported twice.
  const incompleteClaimsOf = (c) => {
    const claims = c?.relations?.claims ?? [];
    const seenSlots = new Set();
    const result = [];
    for (const claim of claims) {
      if (claim.verdict !== "bound" || !(claim.fillers?.length > 1)) continue;
      const slot = `${claim.subject}|${claim.verb}`;
      if (seenSlots.has(slot)) continue;
      const named = claims
        .filter((c2) => c2.verdict === "bound" && `${c2.subject}|${c2.verb}` === slot)
        .map((c2) => foldTypography(c2.object).toLowerCase());
      const uncovered = claim.fillers.filter((f) => {
        const ft = foldTypography(f.object).toLowerCase();
        return !named.some((t) => t.includes(ft) || ft.includes(t));
      });
      if (uncovered.length) {
        seenSlots.add(slot);
        result.push({ ...claim, uncovered });
      }
    }
    return result;
  };
  const isIncomplete = (c) => incompleteClaimsOf(c).length > 0;
  // The concrete diagnosis buildCorrectionPrompt's "incomplete" mode needs:
  // not "be more complete" (teaches nothing, judge()'s own stated reason
  // every mode here names what actually went wrong) but the real fillers,
  // by name, so the model is told exactly what the material states rather
  // than asked to guess what "more" might mean. Named as `uncovered` —
  // what the answer is STILL missing, not the full filler list including
  // what it already got right.
  const incompleteFindings = (c) =>
    incompleteClaimsOf(c).map(
      (claim) =>
        `"${claim.subject} ${claim.verb} ${claim.object}" — the material also states: ${claim.uncovered.map((f) => f.object).join(", ")}`,
    );
  // The verdict, with the cut accounted for: judge() deliberately reads a
  // genuinely empty reply as no-verdict ("produced no text" is its own typed
  // open, not an echo) — but a draft stripScaffoldNarration EMPTIED is the
  // dialogue-narration echo wearing its verdict, and hiding it must not also
  // hide the failure from the correction ladder and the mechanical fallback
  // that exist to answer past it. `narrated` is the mass-majority test
  // reproducedFromContent already uses for copying, aimed at narration
  // instead (P9: no hand-set threshold where a structural rule — "more of
  // the draft is narration than not" — already exists). Material path only,
  // like every other verdict.
  const verdictOf = (t, c) =>
    !passages.length
      ? { echoed: false, reproduced: false, narrated: false, incomplete: false }
      : !String(t ?? "").trim() && lastCleanRemoved > 0
        ? { echoed: true, reproduced: false, narrated: false, incomplete: false }
        : {
            ...judge(t),
            narrated: lastNarrationTotal > 0 && lastNarrationCut > lastNarrationTotal / 2,
            incomplete: isIncomplete(c),
          };

  const rawDraft = await call(executeMessages, { effort: "low", maxTokens: EXECUTE_MAX_TOKENS, ...streaming });
  draft = clean(rawDraft);
  check = inspect(draft);
  // Echo and reproduction are MATERIAL-level judgments — a draft measured
  // against passages it should have answered from. A passage-less turn is
  // plain chat (its first call already runs under CHAT_SYSTEM_PROMPT, with
  // real history), and judging conversation by material rules is a category
  // error at the wrong level — measured live 2026-08-19: "hey" answered
  // "Hey there! 😄 What's going on?" was convicted as echo ("Hey there" is
  // the greeting's own words; a question back ends in "?"), a second,
  // near-identical chat call was spent re-rolling the same dice, and the
  // ship-time framing cut then deleted everything but the emoji. On the
  // chat path the verdict machinery stands down: no echo retry (the old
  // retry re-sent the SAME messages the first call already ran), no
  // correction loop (already passage-gated below), and no framing cut (also
  // gated below). What the person gets is what the model said, as a person.
  let verdict = verdictOf(draft, check);

  while (
    (check.unsupported.length || verdict.echoed || verdict.reproduced || verdict.narrated || verdict.incomplete) &&
    // The correction prompt answers "from the material" — with no passages
    // it cannot, and a material-framed rewrite of a passage-less echo just
    // produces a diagnosis of the prompt. The chat path above is the whole
    // answer to a passage-less echo; nothing in this loop fixes it.
    passages.length &&
    corrections < maxCorrections
  ) {
    corrections++;
    const mode = verdict.reproduced
      ? "reproduction"
      : verdict.echoed
        ? "echo"
        : verdict.narrated
          ? "narrated"
          : verdict.incomplete
            ? "incomplete"
            : "unsupported";
    const correctionFailures = mode === "incomplete" ? incompleteFindings(check) : check.unsupported;
    const correctionMessages = [
      { role: "system", content: EXECUTE_SYSTEM_PROMPT },
      { role: "user", content: buildCorrectionPrompt(part, sourceBlock, draft, correctionFailures, mode) },
    ];
    onProgress?.("correct", part, {
      failures: correctionFailures,
      mode,
      promptChars: correctionMessages.reduce((n, m) => n + m.content.length, 0),
    });
    const rawCorrected = await call(correctionMessages, { effort: "low", maxTokens: EXECUTE_MAX_TOKENS, ...streaming });
    draft = clean(rawCorrected);
    check = inspect(draft);
    verdict = verdictOf(draft, check);
  }

  // The mechanical fallback (user-directed 2026-08-17): the correction
  // budget is spent and the draft still restates or photocopies — the
  // model has had its chances, and shipping its failure would put a
  // non-answer on the page with the record quietly disagreeing. The
  // instrument assembles the answer itself instead: the material's own
  // sentences, verbatim, each with its address. The failed verdict stays
  // on the record (it says why this path ran); the assembled text is
  // re-inspected below so the record describes what actually ships, and
  // judge() is NOT re-run on it — quoting the material is this text's
  // declared method, not a failure of it.
  let mechanical = false;
  if ((verdict.echoed || verdict.reproduced || verdict.narrated) && passages.length) {
    const assembled = mechanicalAnswer(question, passages);
    if (assembled) {
      draft = assembled;
      check = inspect(draft);
      mechanical = true;
    }
  }

  // The quote repair, once, on what will actually ship: every located
  // quotation is rewritten to the source's own bytes (drift dies here, not
  // on the record) and every quotation located in the offer gains its
  // chunk's address — mechanical citation, cite.js's own posture, at the
  // one place a quote's warrant can be attached with certainty. The
  // repaired draft is re-inspected so the record describes the text the
  // reader sees, not the text the model wrote.
  let quoteCorrections = [];
  if (passages.length && check.quotes) {
    const fixed = applyQuotes(draft, check.quotes);
    quoteCorrections = fixed.corrections;
    if (fixed.text !== draft) {
      draft = fixed.text;
      check = inspect(draft);
    }
  }

  // The link tier (links.js), once, on what will actually ship — a URL is
  // the strongest claim about the WORLD an answer can make ("this address
  // is real, go look"), and the one claim a correction retry cannot cheaply
  // re-check every iteration the way an unlocated quote or an invented
  // figure can, because checking it is a live network crossing (P13's one
  // egress), not free containment. So this runs ONCE, after the model's own
  // corrections have settled, and fixes what it finds MECHANICALLY rather
  // than spending another round trip asking the model to fix its own
  // invention — the same posture the mechanical fallback above already
  // takes when a model cannot be trusted to fix something itself. Every
  // distinct cited URL not already grounded in the loaded material is
  // fetched, capped at `linkBudget` (an automatic crossing the instrument
  // decided to make, not a click the reader made — bounded and the bound
  // stays visible, P13's own discipline for proof-seeking). `checkLink` is
  // null when the standing web consent is off; every URL then ships
  // `unexamined` rather than silently passing as checked. In-material is
  // checked against `live` (the WHOLE loaded corpus), not just this part's
  // narrower `passages` — quotes.js's own pool/offer distinction: a URL
  // this part's retrieval did not happen to surface can still be printed in
  // a sibling part's material, and that is still material, not a model
  // assertion on its own word.
  let linkReport = null;
  let linkCorrections = [];
  if (checkLink) {
    const candidates = [
      ...new Set(extractLinkAtoms(draft).map((a) => a.text).filter((u) => !urlInMaterial(u, live))),
    ].slice(0, linkBudget);
    const checked = new Map();
    for (const url of candidates) {
      try {
        checked.set(url, await checkLink(url));
      } catch (e) {
        checked.set(url, { gap: { silence: "not-present", detail: e.message } });
      }
    }
    linkReport = verifyLinks(draft, live, checked);
    const dead = stripDeadLinks(draft, linkReport);
    linkCorrections = dead.removed;
    if (dead.removed.length) {
      draft = dead.text;
      check = inspect(draft);
    }
    if (linkReport.links.some((l) => l.verdict === "unreachable")) {
      check = { ...check, unsupported: [...check.unsupported, ...linkFindings(linkReport)] };
    }
  }

  // The output ships without its framing: a sentence that names the act of
  // prompting is never an answer, and a draft that opens by echoing the
  // prompt must not carry that echo to the page, the fold, or the record.
  // The SAME sentences judge() already classified are the ones shipped, so
  // what was judged is what leaves. A draft that is nothing but framing
  // ships nothing — the typed gap below says why.
  // MATERIAL PATH ONLY, both cuts (2026-08-19): framing is a material-level
  // judgment, and running it on conversation deleted a real greeting down
  // to its emoji (measured live — "Hey there! 😄 What's going on?" shipped
  // as "😄": the opening made of the greeting's own words, the question
  // back convicted by the question-mark rule). In plain chat what the
  // person gets is what the model said.
  const raw = String(draft ?? "").trim();
  const sentences = splitSentences(raw.replace(ADDRESS_RE, " "))
    .map((s) => s.trim())
    .filter(Boolean);
  const firstContent = passages.length ? sentences.findIndex((s) => !isFraming(s)) : sentences.length ? 0 : -1;
  // Dropping the framing prefix is a CUT, never a rejoin. Rejoining trimmed
  // sentence pieces with spaces destroyed every newline and indent the
  // draft had — measured live on a fenced Python block, which arrived at
  // the page as one flat line. Slicing the raw text at the first content
  // sentence drops exactly the prefix and leaves the remainder byte-exact.
  // A sentence that carried an address cannot be located in raw (the
  // address was stripped before splitting); then nothing is cut, because
  // shipping the whole draft is always safer than mangling it.
  // The suffix gets the same cut (2026-08-17): a draft that answers what it
  // can and then ECHOES the unanswered facet back — "…it is in Tennessee.
  // Who was the mayor of Nashville in 2019?" — ships a question as its last
  // sentence, which is never an answer, and measured live it read exactly as
  // dumb as it sounds. Both cuts stay slices of raw (never a rejoin), both
  // bail to the whole draft when a sentence cannot be located, and the gap
  // the trailing echo gestured at is already `open`'s job to report.
  let lastContent = -1;
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (!isFraming(sentences[i])) {
      lastContent = i;
      break;
    }
  }
  const text =
    firstContent < 0
      ? ""
      : (() => {
          const from = firstContent === 0 ? 0 : raw.indexOf(sentences[firstContent]);
          if (from < 0) return raw;
          let to = raw.length;
          // Material path only: in plain chat a trailing question is
          // conversation ("How can I help you today?"), not a dodge —
          // measured immediately by this file's own chat test.
          if (passages.length && lastContent < sentences.length - 1) {
            const lastAt = raw.lastIndexOf(sentences[lastContent]);
            if (lastAt >= 0) {
              // Keep the sentence and whatever closing punctuation follows it.
              const end = lastAt + sentences[lastContent].length;
              const tail = raw.slice(end).match(/^[.!?…)\]"'”’]*/);
              to = end + (tail ? tail[0].length : 0);
            }
          }
          return raw.slice(from, to).trim();
        })();
  // A failed model answer earns nothing — but the mechanical assembly is
  // not the model's answer: its sentences ARE the material's bytes and its
  // addresses attach with certainty, so its warrant stands.
  if ((verdict.echoed || verdict.reproduced || verdict.narrated) && !mechanical) {
    check = { ...check, refs: [], used: [], attributed: [], channels: [] };
  }
  const open = [
    ...(strayed ? [`part searched on words the task never used: ${part.label}`] : []),
    ...(verdict.echoed ? [`answer restates the prompt; nothing established: ${part.label}`] : []),
    ...(verdict.reproduced
      ? [`answer reproduces the material verbatim; it does not answer the prompt: ${part.label}`]
      : []),
    ...(verdict.narrated
      ? [`answer describes the material instead of answering from it: ${part.label}`]
      : []),
    // Unlike echoed/reproduced/narrated, an incomplete answer is not a
    // failure — the correction loop got one real, honest shot at naming
    // every filler; if it's STILL incomplete when the budget runs out, the
    // (still true, still readable) answer ships as-is rather than being
    // torn up by the mechanical fallback, and the gap stays disclosed here
    // by name rather than silently dropped.
    ...(verdict.incomplete ? incompleteFindings(check).map((f) => `answer names only one of several the material states: ${f}`) : []),
    ...(mechanical
      ? [`shipped text assembled mechanically from the material's own sentences, each with its address: ${part.label}`]
      : []),
    ...(scaffoldRemoved.length
      ? [`model narrated its own answering process; ${scaffoldRemoved.length} span(s) hidden: ${part.label}`]
      : []),
    // Real quotations from material the turn was not offered: the model
    // quoting past its evidence — typed, never silently warranted.
    ...quoteOpens(check.quotes),
    ...openQuestions(question, passages, check.refs),
    ...(text ? [] : [`part produced no text: ${part.label}`]),
  ];
  // `check.relations` was already computed above (the material's own edges,
  // read against this part's answer) but never left this function — the
  // caller had no way to narrate it live. Passed through verbatim, never
  // re-summarized here: summarizing is a rendering decision, not a check.
  onProgress?.("checked", part, { refs: check.refs, unsupported: check.unsupported, open, relations: check.relations });

  return {
    part,
    text,
    passages,
    corrections,
    ...check,
    quoteCorrections,
    links: linkReport,
    linkCorrections,
    open,
  };
}

/**
 * The whole task. `call(messages, opts)` is app.js's complete() or anything
 * with its shape — which is the entire local-model story: point complete() at
 * Ollama and every model call in here runs on the machine.
 */
export async function runHolonicTask({
  task,
  chunks = [],
  call,
  foldedRefs = [],
  maxParts = MAX_PARTS,
  passagesPerPart = PASSAGES_PER_PART,
  maxCorrections = MAX_CORRECTIONS,
  makeNameResolver = null,
  makeRelationReader = null,
  checkLink = null,
  chatHistory = [],
  discourse = "",
  planMode = "model",
  // Threaded straight to the flat part's chat branch (searchedVoid up top
  // says why) — a task-wide fact, since a preflight search runs once,
  // before the plan, never per-part.
  searchedVoid = null,
  // S1's own answer, task-wide for the identical reason searchedVoid is —
  // one fast pass ran once, before the plan, never per-part.
  priorPass = null,
  onProgress = null,
}) {
  if (!task || typeof task !== "string") throw new TypeError("runHolonicTask requires a task string");
  if (typeof call !== "function") throw new TypeError("runHolonicTask requires a call function");

  // The plan exists as inserts on an append-only log; everything after this
  // point reads the FOLD of the log, never the parse. The log is the
  // thought: what the turn believed the work was, how that belief was
  // amended, what each part established — appended, folded, projected into
  // the next small call. Two ways the thought can start:
  //
  //   planMode "flat"  — the question's own shape said one part
  //     (needsDecomposition), so the question IS the plan: one PROPOSE,
  //     basis "flat", NO model call spent deciding what was already
  //     decided mechanically. Every turn gets a log; a flat turn's log is
  //     just a short thought.
  //   planMode "model" — the shape said several parts; one bounded call
  //     names them, and the parse degrades typed when it fails.
  let log = createPlanLog(task);
  if (planMode === "flat") {
    log = appendPlan(log, {
      kind: PLAN_ENTRY_KINDS.PROPOSE,
      part_id: "p1",
      label: "the question",
      description: task,
      basis: "flat",
    });
  } else {
    onProgress?.("plan", null, {});
    let planRaw = "";
    try {
      planRaw = await call(
        [
          { role: "system", content: PLAN_SYSTEM_PROMPT },
          { role: "user", content: buildPlanPrompt(task, maxParts) },
        ],
        // The shape is grammar, not a request: a runtime that can take a
        // schema constrains decoding to the parts array; one that can't
        // falls back to plain JSON mode, and parsePlan handles whatever
        // shape arrives.
        { effort: "low", maxTokens: PLAN_MAX_TOKENS, json: PLAN_SCHEMA },
      );
    } catch {
      planRaw = "";
    }
    const parsed = parsePlan(planRaw, task, maxParts);
    for (const part of parsed.parts)
      log = appendPlan(log, {
        kind: PLAN_ENTRY_KINDS.PROPOSE,
        part_id: part.id,
        label: part.label,
        description: part.description,
        basis: parsed.degraded ? "degraded" : "plan",
        ...(parsed.degraded ? { reason: "plan did not parse" } : {}),
      });
  }
  let plan = foldPlan(log);
  onProgress?.("planned", null, { parts: plan.parts, degraded: plan.degraded });

  // Execution is the production closure: run what is live and unrun, let the
  // rules fire on the fold's own evidence, refold, repeat until the fold
  // stops moving. The one shipped rule retries a strayed part that matched
  // nothing, in the task's own words. Content (text, passages) stays here in
  // sections; the log holds what was established — so folding the log back
  // re-tells the run without re-doing it.
  const sectionsById = new Map();
  const seenRefs = [...foldedRefs];
  const runLive = async (t) => {
    const part = {
      id: t.part_id,
      label: t.label ?? t.part_id,
      // A retry part deliberately carries no description of its own: it runs
      // on the task's words, which is the whole repair.
      description: t.description || task,
    };
    const result = await runPart({
      part,
      task,
      discourse,
      chatHistory,
      chunks,
      call,
      // Passages an earlier part already grounded itself in are deprioritized
      // for later parts the same way an earlier turn's records deprioritize
      // retrieval — proportionally, so a genuinely central passage can still
      // win twice.
      foldedRefs: seenRefs,
      passagesPerPart,
      maxCorrections,
      makeNameResolver,
      makeRelationReader,
      checkLink,
      // planMode is task-wide, not per-part: a flat task runs exactly one
      // part (however many times retryStrayedRule retries it), so there is
      // no case where this callback runs for a part that isn't the flat one
      // when planMode is "flat".
      flat: planMode === "flat",
      searchedVoid,
      priorPass,
      onProgress,
    });
    seenRefs.push(...result.refs);
    sectionsById.set(t.part_id, result);
    return {
      refs: result.refs,
      channels: result.channels,
      unsupported: result.unsupported,
      unbacked: result.unbacked,
      open: result.open,
      corrections: result.corrections,
    };
  };
  const production = await producePlan(log, [retryStrayedRule], runLive);
  log = production.log;
  plan = foldPlan(log);
  onProgress?.("production", null, {
    steps: production.steps,
    halted_by: production.halted_by,
    open_gaps: production.open_gaps,
  });

  // Sections are read off the LIVE fold, so a superseded part's text drops
  // out of the assembly exactly as its entry dropped out of the live set.
  const sections = plan.parts.map((p) => sectionsById.get(p.id)).filter(Boolean);

  const output = sections
    .map((s) => {
      // An empty part is a typed gap (recorded above); the assembly says so
      // in place rather than shipping a dangling heading or an empty string.
      const text = s.text || "(this part produced no text — left open)";
      return plan.parts.length > 1 ? `## ${s.part.label}\n\n${text}` : text;
    })
    .join("\n\n");

  const refs = [...new Set(sections.flatMap((s) => s.refs))];
  const unsupported = [...new Set(sections.flatMap((s) => s.unsupported))];
  // Unbacked knowledge, unioned the same way: not a correction driver, but
  // the record still names it — disclosure is that list's whole treatment.
  const unbacked = [...new Set(sections.flatMap((s) => s.unbacked ?? []))];
  const open = [
    ...(plan.degraded ? ["plan did not parse; task ran as a single part"] : []),
    ...sections.flatMap((s) => s.open),
    // The guard tripping is not closure and must not read like it (the three
    // halt facts stay distinct all the way to the record).
    ...(production.halted_by === "max-steps-guard" ? ["production halted by max-steps guard"] : []),
  ];
  const channels = [...new Set(sections.flatMap((s) => s.channels))];

  return { task, plan, log, production, sections, output, refs, unsupported, unbacked, open, channels };
}
