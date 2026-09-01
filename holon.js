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
import { officeHolderGroups, parseSuccessionBoxes, resolveBoxSubjects } from "./succession.js";
import { buildFactBlock, dedupeSourceText } from "./fact-block.js";
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
  "You are writing one part of a larger piece. Write plain prose for that part, and only that part, in your own words. Say what is established below — do not copy sentences out of it, and do not restate the question back. Where the answer is not there, say so plainly instead of filling the gap.";

// The no-material reply's other face. A prompt that matched no material is
// not necessarily a research gap — a greeting, a question of taste, a joke —
// and a model ordered to "say what the part would need" on "hi" says "the
// question is: hi". This prompt is the one place chat is allowed to be chat:
// no material framing, no citation grammar, just a reply to a person.
export const CHAT_SYSTEM_PROMPT =
  "A friendly conversation. Reply directly, briefly, and naturally, the way a person would. Do not repeat back what was just said; say something new.";

// S1's own face: think out loud, give a first take, not a finished answer.
// The hedge IS the character — it makes S2's arrival feel natural ("I
// checked myself") rather than mechanical ("a second agent verified").
// Measured against gemma2:2b/qwen3:8b: third-person framing ("A first pass
// answered") makes S2 narrate checking; first-person framing ("Your first
// take was") makes S2 just answer. Plain conversation exempted so "hi"
// stays "hi".
export const S1_SYSTEM_PROMPT =
  `${CHAT_SYSTEM_PROMPT} Think out loud — give your first take, the way you'd start to answer before stopping to check yourself. A hedge or a second thought is fine; a finished answer is too polished for a first pass. Plain conversation doesn't need any of that.`;

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
// The void keeps its FORCE and loses its MACHINERY (firewall, 2026-08-27).
// P32's point stands — a confirmed absence must not read to the model like
// an absence nobody checked — but "a web search ran… it was not skipped"
// tells the model how this instrument is built in order to say so. What
// the model needs is that the emptiness is real and is not its to fill.
export const SEARCHED_VOID_PREFIX = "Nothing could be found on this. The emptiness is real and confirmed — say so plainly; it is not yours to fill in.";

// The System 1 / System 2 pass: first-person framing so S2 understands it's
// following up on its OWN initial reaction, not investigating someone else's.
// Measured against gemma2:2b: "A faster, unchecked first pass already answered
// this" → S2 narrates ("Correct.", "The answer is"); "Your first take was" →
// S2 just answers. The prompt tells S2 what to DO (confirm/extend/correct)
// and what NOT to do (restate, make a ceremony of it), never HOW to phrase it.
// A caller with no S1 pass simply never calls it, so every existing caller of
// runPart/runHolonicTask is byte-identical to before this existed.
export const priorPassFor = (text) =>
  `Your first take was: "${String(text ?? "").trim()}" — check it against what you find. Confirm, extend, or correct it. Don't restate what you said; answer the question from what the checking turns up. If your first take was right, you can say so briefly and move on — don't make a ceremony of it.`;

// When priorPass exists (S2 following S1), frame the system prompt so the
// model understands it's continuing its own thinking, not starting fresh.
// Prepended before the base system prompt + priorPass suffix. Information,
// not behavioral — the same posture priorPassFor already holds.
const S2_FRAME_PREFIX = "";

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
// FIREWALL (2026-08-27, firewall.js): this string used to say "Passages
// retrieved for this turn follow… do not describe the message or the
// passages" — naming our own parts three times while instructing the model
// not to name them. Measured live, it complied with the vocabulary and not
// the instruction: "The prompt specifically identifies Hannibal Hamlin…".
// Nothing here names a part of this instrument now, so there is no word to
// borrow. `firewall.test.mjs` fails if one comes back.
export const FLAT_EXECUTE_SYSTEM_PROMPT =
  "You are talking with someone. Answer what they asked, in your own words, the way a person would — not a summary of the question and not a description of what you were given. Everything below is yours to answer from. If the answer is not there, say plainly that it is not, rather than filling the gap.";

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

/**
 * DEF → EVA → REC-guard → REDEFINE, for a claim EVA already found
 * malformed by cardinality (clusterFillers/officeHolderGroups computed a
 * closed, confirmed set of more than one filler for a slot the question's
 * own singular phrasing presupposed unique — the Strawson/Russell gap
 * P33's own header names). The redefinition is not a critique of the
 * prior draft; it is a REWRITE OF THE TASK — the confirmed set folded in
 * as a stated given — run through the ordinary, uncritical
 * buildExecutePrompt rather than buildCorrectionPrompt.
 *
 * Measured live 2026-08-20, three rounds, same Lincoln/Hamlin/Johnson
 * question, real fetched Wikipedia material, gemma2:2b — every one a
 * buildCorrectionPrompt("incomplete") wording fix, and every one dodged a
 * NEW way: round 1 echoed the correction's own escape phrase back as
 * its opening sentence; round 2 (that phrase removed) described the
 * QUESTION instead of the material ("The question mentions…"); round 3
 * (forbidding that too) invented a real-but-unconfirmed third name off
 * the raw succession-box text sitting right below the critique, then
 * (once the finding was reworded as a closed set) still narrated with a
 * verb ("concerns") the mechanical narration-stripper's own hand-typed
 * list did not carry. Three different dodges from three different
 * wording fixes is not a wording problem — every one of them was a
 * response to being told "your prior draft was wrong, fix it," which
 * is a directive ABOUT the task, and this file's own repeated lesson
 * (2026-08-17 EXECUTE_SYSTEM_PROMPT history, 2026-08-19's escaped
 * phrase, both above) is that a directive about the task produces a
 * description of the task. There is no fix for that within the
 * critique framing; the framing itself is the defect. Redefining the
 * question and asking it fresh — no "your draft", nothing to react
 * to — has nothing left to narrate about.
 */
export function buildRedefinedPart(part, findings) {
  if (!findings?.length) return part;
  // "The record confirms exactly this" was the wording here until
  // 2026-08-27, and it was measured leaking — not inferred, READ, in a
  // reasoning model's own visible thinking on a live turn: "the prompt says
  // 'the record confirms exactly this, and nothing beyond it'. So I should
  // emphasize... But must not say 'the record' since that's from the
  // prompt." The model spent real tokens working out that a phrase in its
  // own instructions was not a phrase it was allowed to use. That is the
  // whole cost of scaffolding vocabulary: it becomes a thing to comply
  // with rather than a fact to use. Named plainly instead — the findings
  // are what several sources establish, and "several sources establish" is
  // a fact about the world, not a term of art from a rulebook.
  return {
    ...part,
    description: `${part.description} These are established, and are the complete set, even if other names or claims sit nearby: ${findings.join("; ")}.`,
  };
}

/**
 * Land the completeness gate's finding as a REAL belief on the shared
 * task-log, not just a fact this function's own local variables happen to
 * hold for the length of one call — user direction (2026-08-20): "this
 * requires having the hypergraph record beliefs, assertions, etc... it is
 * believed BY AN EXPERIENCER, not just given by a source."
 *
 * Composed from organs this repo already owns, never a parallel mechanism:
 * `grid.js`'s `evaluate` verb already computes a real verdict via
 * `hypergraph.js::read()` and lands it as a task-log RESULT (P36, "EVA
 * computes, REC concedes") — `landAct` (capacity-runner.js) is the ONE
 * tested orchestration of parse → land → run → attach for it, proven live
 * on exactly this pattern (`capacity-runner.test.mjs`'s own "a SECOND
 * evaluate... lands a REC conceding the first"). This calls that same
 * organ rather than hand-building a `grid.land()` event, for the identical
 * reason `hl-acquire.js`'s own header gives for reusing the grammar lens
 * instead of re-deriving grammar: the refusal rules (stance resolution,
 * terrain lookup, the ground+broken requirement) already exist, tested,
 * and reimplementing them here would be the second-mechanism drift this
 * codebase's postmortems keep naming.
 *
 * `because <trigger>` names the EXPERIENCER — which reading, for which
 * part, formed this belief — because a verdict with no one attached to it
 * is exactly the "given by a source" framing the user's direction rejects;
 * every belief on this log says who was reading when they came to hold it.
 * SPACE-separated, like `ground`/`at`/`from` — NOT colon-suffixed like
 * `broken:`/`warrant:` (grid.js's own composition-law comment: `[because
 * <trigger>]`, a clause keyword, unlike the colon-suffixed fields that
 * live INSIDE a clause). Kept to word characters and hyphens only (grid.js's own tokenizer reads
 * `because` as free text up to the next clause keyword — "at"/"from"/
 * "ground"/"supersedes" — so those five words are avoided here, not
 * merely convenient ones).
 *
 * Failure is never fatal to the turn: a claim shaped in a way `evaluate`'s
 * own grammar refuses (a subject/object containing a clause keyword, an
 * empty claim) returns the log UNCHANGED — this is a durability layer on
 * top of the completeness gate's own existing, unconditional signal, never
 * a new requirement for it to fire.
 */
function landCompletenessBelief(grid, gridLog, runCapacity, landAct, { claim, sourceKey, sourceText, experiencer }) {
  if (!grid || !gridLog || !runCapacity || !landAct) return gridLog;
  const safe = (s) => String(s ?? "").replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  const subject = safe(claim.subject);
  const verb = safe(claim.verb);
  const object = safe(claim.object);
  if (!subject || !verb || !object) return gridLog;
  const line = `evaluate ${subject} ${verb} ${object} at Link from differentiate ground ${sourceKey} broken:rotation because ${safe(experiencer)}`;
  let out;
  try {
    out = landAct(grid, gridLog, line, { sources: { [sourceKey]: sourceText }, runCapacity });
  } catch {
    return gridLog;
  }
  return out?.ok ? out.log : gridLog;
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
    // Measured live 2026-08-19: an earlier draft of this prompt offered "say
    // plainly that the material lists more than one" as an escape hatch for
    // the genuinely-ambiguous case — gemma2:2b instead echoed that exact
    // clause back as its OWN answer's opening sentence ("The material lists
    // more than one vice president...") even on a draft that WAS able to
    // name every filler. A copy-pastable phrase in a correction prompt is an
    // instruction the model can obey too literally — the same lesson this
    // file's own EXECUTE_SYSTEM_PROMPT history already carries (a directive
    // about the task produces a description of the task). Reworded to name
    // what to DO (state every filler directly, plainly) without supplying
    // any sentence shaped to be echoed.
    //
    // Measured live again 2026-08-20 (the same Lincoln/Hamlin/Johnson
    // question): with that fix in place, gemma2:2b still dodged — not by
    // echoing the escape hatch, but by describing the QUESTION instead of
    // the material ("The question mentions two vice presidents: Hannibal
    // Hamlin and Andrew Johnson."), since the instruction only forbade
    // describing "the material itself" and said nothing about the question.
    // Every other mode above already forbids both in one breath (echo:
    // "restates the prompt instead of answering it"; narrated: "describes
    // the passage instead of answering the question"); this mode had
    // dropped the question half when it was written. provenance.js's own
    // narration stripper does not catch this sentence either and correctly
    // so — "mentions" only cuts wholesale text with no complement worth
    // keeping (details?/describe[sd]/etc.), and this sentence's complement
    // IS the two names the completeness gate exists to preserve; stripping
    // it would ship an empty or gutted answer, worse than the narration it
    // removes. The fix belongs at the source, same as the 2026-08-19 one.
    //
    // A third, deeper thing measured in that same 2026-08-20 run, once the
    // wording fixes above were both in place and re-tested: the model still
    // named a THIRD person ("Schuyler Colfax") who is real text sitting in
    // the material but was never confirmed for this slot. Replaying the
    // exact retrieved passages through both completeness signals directly
    // (bypassing the model) proved the finding itself was already correct
    // — a Wikipedia succession box sits one office's record directly beside
    // the NEXT office-holder's own record, so a small model shown the raw
    // box text a second time, under pressure to "find more", keeps reading
    // past the confirmed slot into the next one. `failures` above is now
    // the FULL confirmed set for each slot, phrased as closed ("confirms
    // exactly: X, Y (nothing else)") rather than a delta — this is the
    // actual fix: give the model nothing left to hunt for, instead of
    // asking it not to hunt.
    return (
      `Your draft for "${part.label}" answers as if there is only one, but the material states more than one. ` +
      `Here is the material's own COMPLETE, CONFIRMED answer for each — nothing beyond this list is confirmed, even if other names appear nearby in the passages below:\n` +
      failures.map((f) => `- ${f}`).join("\n") +
      `\n\nRewrite your answer to name every one of them directly, by name, the way you would if you had known all along — never describe the material or the question itself, and never add a name that is not on the confirmed list above, even one you recognize or see mentioned nearby. ` +
      `If you genuinely cannot tell which the material means, name the ones you can and say which part is unclear. ` +
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
// Measured live 2026-08-20 ("who was Abraham Lincoln's vice president?"
// against real fetched material): raw overlap-count alone let a bare
// infobox row ("President Abraham Lincoln", 3 words, all 3 querytokens)
// outrank a genuine, more informative sentence in the SAME passage whose
// matching words were fewer relative to its length — the row is
// splitSentences's own honest reading of a succession box's "In office /
// President X / Preceded by Y / Succeeded by Z" lines, which have no
// sentence-final punctuation because they were never sentences.
// MECHANICAL-COVERAGE-INVESTIGATION.md already names this exact class
// ("the sentence splitter never breaks on bare newlines... 'Preceded by
// X' / 'Succeeded by Y' lines glue into garbage edges") for hypergraph.js's
// relation extraction; this is the identical furniture leaking through one
// layer over, into the fallback's own sentence choice. Terminal punctuation
// is the same structural tell this repo uses elsewhere to separate real
// prose from page furniture (blankStructure, stripContainer) — cheap,
// never a guess at content, and it only ever REORDERS which true, verbatim
// passage text gets quoted; it can't invent or drop material a passage
// doesn't have. A passage whose only positive-overlap candidate is a bare
// fragment still surfaces it — never nothing when something exists.
const SENTENCE_END_RE = /[.!?]["'”’)]*$/;

export function mechanicalAnswer(question, passages) {
  const qTokens = new Set(tokenize(String(question ?? "")));
  if (!qTokens.size) return "";
  const lines = [];
  for (const p of passages ?? []) {
    const best = splitSentences(String(p.text ?? ""))
      .map((s) => {
        const t = String(s).trim();
        return { t, n: tokenize(t).filter((w) => qTokens.has(w)).length, sentence: SENTENCE_END_RE.test(t) };
      })
      .filter((x) => x.t && x.n > 0)
      .sort((a, b) => (b.sentence - a.sentence) || (b.n - a.n))[0];
    if (best) lines.push(`“${best.t}”${p.ref ? ` [${p.ref}]` : ""}`);
  }
  if (!lines.length) return "";
  // NO FRAMING SENTENCES. This used to open "Here's what the material itself
  // says about this:" and close "That's everything the material offers on
  // the question's own words." — user direction, 2026-08-27, shown this
  // exact output for the third time: "i never want to see output 'talking'
  // content like this."
  //
  // Both sentences were meta-commentary ABOUT the material rather than an
  // answer, and both used the generic scaffolding word the same session had
  // already had removed from `buildSourceBlock` and `buildRedefinedPart`
  // ("just have it be like 'Wikipedia, Retrieved...'"). A reader asking what
  // the capital of France is does not want to be told what a corpus offers;
  // the quoted sentences already say it, verbatim and addressed, and they
  // say it better without a narrator introducing them.
  //
  // What ships is now exactly what this function was always honest about
  // being: the material's own sentences, each with its address, and nothing
  // in this instrument's voice wrapped around them.
  return lines.join("\n\n");
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
  // HOW BIG THE ANSWER SHOULD BE, measured before the model drafts — never
  // a length the model guesses at (2026-08-27, user direction: "the vast
  // majority of 'reasoning' [should] be mechanical, and the result of the
  // reasoning is a very simple prompt to the model, with the smallest
  // context possible").
  //
  // The measured failure this closes: "What is the capital of France?" —
  // one city, one word — came back as five sentences of hedged
  // meta-commentary ("The passages consistently establish that Paris
  // functions as France's capital city, with multiple sources explicitly
  // identifying it as such...") after two correction rounds and 214
  // seconds. The model was not being evasive; it had no idea how much
  // answer was wanted, so it padded to the size of its own uncertainty and
  // the checker then punished the padding as unsupported claims. AN
  // UNMEASURED SLOT GETS FILLED WITH HEDGING.
  //
  // The size is not a new measurement — it is `void-brief.js`'s already-
  // declared cardinality, which app.js computes BEFORE this call (moments 1
  // and 2, both ahead of any drafting). A caller with no void passes null
  // and every branch below is byte-identical to before this existed.
  answerShape = null,
  // S1's own answer text, or null when there was no fast pass (or the S2
  // gate never fired). Flat only, reaching both the chat branches and the
  // flat material branch (unlike searchedVoid, S1's answer stays relevant
  // once material exists too — "here's what a fast pass said, check it
  // against what you now have"). See priorPassFor, above.
  priorPass = null,
  onProgress = null,
  // The shared, app-wide belief record (P38's own "the hypergraph records
  // beliefs" direction) — the SAME log `/act`/the terminal already write
  // to (CLAUDE.md, "the chat's own /act door": `state.gridLog`, one log,
  // not per-conversation). All four null together (the default) is
  // byte-identical to before this existed — landCompletenessBelief's own
  // header states the same backward-compatibility discipline every other
  // organ in this file already holds. `grid`/`runCapacity`/`landAct` are
  // the organs (grid.js's makeGrid instance, capacity-runner.js's two
  // exports); `gridLog` is the mutable state threaded in and the updated
  // state threaded back out via this function's own return value, the
  // same accumulation shape `foldedRefs`/`seenRefs` already use one level
  // up in runHolonicTask.
  grid = null,
  gridLog = null,
  runCapacity = null,
  landAct = null,
  // The typed-note ledger (hyperlexicon.js, P57) — same shape and same
  // backward-compatibility discipline as grid/gridLog just above: `hyperlexicon`
  // is the organ bundle (makeHyperlexicon's own {admit, foldHyperlexicon, ...}),
  // `hyperlexiconLog` is the mutable, app-wide, cross-turn state threaded in and
  // threaded back out. Both null (the default) is byte-identical to before this
  // existed — no existing caller's behavior changes.
  hyperlexicon = null,
  hyperlexiconLog = null,
  // The door's own grammar gate (hyperlexicon.js::admit's classifyConnector
  // — asymmetric, P56: a settled non-verb connector is refused with its
  // giver, an out-of-vocabulary word admits). Threaded, never built here:
  // the lens is app.js's to construct from the POS prior it already
  // fetches, and `null` (the default for every existing caller) leaves the
  // admit call byte-identical to before this existed — a check that did
  // not run never reports a pass (P41), and the door's own header says the
  // same. Measured need (eval/hyperlexicon-door-probe.mjs): unthreaded,
  // 18 of 29 notes admitted from real prose carried a closed-class label
  // (—and→, —of→, —to→…) into the belief ledger.
  classifyConnector = null,
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
  // THE SEARCH DIGEST IS PINNED, never left to win a retrieval slot.
  //
  // gatherPreflightMaterial already combines every search result's snippet
  // into ONE chunk (`web:search-results`) precisely because the snippets
  // are pre-snipped, high-relevance, already-paid-for material — its own
  // comment says so. But it was then dropped into `live` alongside the
  // fetched full pages and had to out-score them: measured live 2026-08-26,
  // one Lincoln turn had 1,449 passages competing for 3 slots, the digest
  // lost, and the model answered from three Johnson-heavy page passages
  // while the digest sentence sitting unused read "Hannibal Hamlin and
  // Andrew Johnson, the two vice presidents of Abraham Lincoln". Same
  // question on another draw won the digest and answered correctly — the
  // variance was never about the model, it was a retrieval lottery.
  //
  // Why pinning rather than re-ranking: the digest is not competing on
  // relevance, it is a different KIND of material — a whole results page
  // condensed, ~2.7KB, complete by construction, where a full page is
  // 50-160K of prose with one relevant paragraph. Scoring them against each
  // other on keyword overlap is the category error; every snippet repeats
  // the query's own words, which is exactly why they tie and why the
  // tie-break decides the answer. Cost is one extra passage per part,
  // bounded and cheap, and it is additive: retrieval's own picks are
  // untouched, so nothing that used to reach the model stops reaching it.
  const digestChunk = live.find((c) => String(c?.ref ?? "").startsWith("web:search-results"));
  if (digestChunk && !passages.some((p) => p.ref === digestChunk.ref)) {
    passages = [digestChunk, ...passages];
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

  // hyperlexicon.js (P57): admit this part's own bound claims into the
  // shared, cross-turn ledger — accumulation, not re-derivation on every
  // part. `hyperlexicon`/`hyperlexiconLog` absent (the default for every
  // existing caller) leaves `beliefNotes` at `hyperlexiconLog` (null) and
  // touches nothing downstream — byte-identical to before this existed,
  // the same discipline `grid`/`gridLog` already hold above.
  let beliefNotes = hyperlexiconLog;
  if (hyperlexicon && relations) {
    for (const p of passages) {
      const text = String(p?.text ?? "");
      if (!text.trim()) continue;
      const claims = relations.read(text)?.claims ?? [];
      const edges = claims
        .filter((c) => c.verdict === "bound")
        .map((c) => ({ subject: c.subject, verb: c.verb, object: c.object, spans: c.spans ?? [] }));
      if (!edges.length) continue;
      beliefNotes = hyperlexicon.admit(
        beliefNotes ?? hyperlexicon.createHyperlexicon(),
        edges,
        // minShare stays the door's own declared default — no second number
        // is introduced here; classifyConnector null = the gate does not
        // run, admit's own disclosed behaviour.
        { witness: p.ref ?? null, classifyConnector },
      ).log;
    }
  }

  // HYPERGRAPH-FIRST-GENERATION.md, Phase 2: the material's own extracted
  // facts, read BEFORE the model drafts — reusing the SAME `relations`
  // reader `inspect` (below) uses to check a draft, called here on the
  // passages themselves instead. Real, disclosed partial coverage
  // (fact-block.js's own header); supplements `sourceBlock`, never
  // replaces it. `null` on a decomposed part with no `relations` organ
  // injected, or on any part where nothing bound — every existing caller
  // that never reaches this line is unaffected.
  const factBlock = relations ? buildFactBlock(relations, passages, question) : null;

  // The ledger's own standing beyond what this part just read — notes
  // corroborated across MORE THAN ONE witness (`foldHyperlexicon` sorts
  // most-witnessed first), from earlier parts or earlier turns this part's
  // own reading did not happen to touch again. Deduped against `factBlock`'s
  // own fresh lines so nothing doubles. Firewall-clean (firewall.js's
  // `APPARATUS_TERMS`): no "passage"/"retrieved"/"this turn" — "read in N
  // places" is the same natural-corroboration phrasing this repo's own
  // proof-seeking tier already uses ("stated by N of M pages").
  const HYPERLEXICON_LEDGER_LINES = 5;
  const ledgerBlock = (() => {
    if (!hyperlexicon || !beliefNotes) return null;
    const shown = new Set((factBlock?.allLines ?? []).map((l) => l.toLowerCase()));
    const standing = hyperlexicon
      .foldHyperlexicon(beliefNotes)
      .filter((n) => n.witnesses.length >= 2)
      .filter((n) => !shown.has(`${n.subject} — ${n.verb}→ ${n.object}`.toLowerCase()))
      .slice(0, HYPERLEXICON_LEDGER_LINES);
    if (!standing.length) return null;
    return (
      `From earlier reading, confirmed independently in more than one place:\n` +
      standing.map((n) => `- ${n.subject} — ${n.verb}→ ${n.object} (read in ${n.witnesses.length} places)`).join("\n")
    );
  })();

  // The salience gate's other half (fact-block.js's own header): the raw
  // MATERIAL block, deduplicated of near-identical restatements BEFORE it
  // reaches the model — real, measured need, same live pass: a
  // `web:search-results` chunk's own ordinary shape (several pages'
  // short bios concatenated) restated "Hannibal Hamlin, 15th vice
  // president, 1861-65" in six differently-worded snippets in one real
  // captured prompt. `dedupedSourceBlock` is PROMPT-ONLY — `sourceBlock`
  // itself (untouched, above) still backs succession-box parsing, the
  // correction prompts, and everything else this function's own
  // `sourceBlock` comment already disclosed staying out of this dedup's
  // reach.
  const dedupedSourceBlock = passages.length ? buildSourceBlock(dedupeSourceText(passages, relations)) : sourceBlock;

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
    // `stripFraming(text)`, NOT bare `text` (2026-08-20): this `inspect`
    // runs mid-loop, on a retry's raw completion, before the ship-time cut
    // (below, now just a call to the same stripFraming) has ever run — and
    // a correction retry echoing the question back as its opening line is
    // exactly the shape the ship-time cut exists to clean. Left unstripped,
    // that echoed line reaches relations.read() as content and the
    // extractor reads the QUESTION's own words as claims about the world.
    // stripFraming's own header has the measured incident (turn 23,
    // material-dialogue-stress-703.jsonl) and the direct reproduction.
    const relationReport = relations ? relations.read(stripFraming(text)) : null;
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
  // `t` with its leading and trailing framing sentences cut, byte-exact
  // except for the cut itself — the ship-time text below is defined as a
  // call to this function; nothing after this point recomputes the cut a
  // second, divergent way. Factored out 2026-08-20 so inspect()'s relation
  // tier (below) can read the SAME text the page, the fold, and the record
  // eventually see, instead of the model's raw, still-framed completion.
  // Measured live: eval/results/material-dialogue-stress-703.jsonl turn 23,
  // question "Where is Saturn in the order of planets from the Sun?" — the
  // logged `shippedText` is clean ("The passage confirms that Saturn is the
  // sixth planet from the Sun.", no echo, no question), but the logged
  // `relationClaims` carries THREE entries, not one: the real bound claim
  // (subject "that Saturn", verb "is", object "the sixth planet from the
  // Sun") riding beside two claims extracted from the QUESTION itself
  // (subject "Where" / verb "is" / object "Saturn in the order of planets
  // from the Sun?", verdict beyond-reach; subject "is Saturn" / verb "in" /
  // object "the order of planets from the Sun?", verdict unheard) — neither
  // string appears in `shippedText` OR the logged first `draftText`, so the
  // only place they could have come from is a correction retry's raw
  // completion, read before this cut had ever run (it previously lived
  // only here, AFTER the correction loop settles). hypergraph.js's SVO
  // extractor doesn't know "framing" is not part of the answer — it read
  // the question's own words as claims. Downstream cost is not cosmetic:
  // capacity-runner.js's `candidates = claims.filter(c => c.verdict !==
  // "bound")` (the per-source triangulation gate) spends real model calls
  // chasing claims that were never part of the answer.
  const stripFraming = (t) => {
    const raw = String(t ?? "").trim();
    const sentences = splitSentences(raw.replace(ADDRESS_RE, " "))
      .map((s) => s.trim())
      .filter(Boolean);
    const firstContent = passages.length ? sentences.findIndex((s) => !isFraming(s)) : sentences.length ? 0 : -1;
    if (firstContent < 0) return "";
    let lastContent = -1;
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (!isFraming(sentences[i])) {
        lastContent = i;
        break;
      }
    }
    const from = firstContent === 0 ? 0 : raw.indexOf(sentences[firstContent]);
    if (from < 0) return raw;
    let to = raw.length;
    if (passages.length && lastContent < sentences.length - 1) {
      const lastAt = raw.lastIndexOf(sentences[lastContent]);
      if (lastAt >= 0) {
        const end = lastAt + sentences[lastContent].length;
        const tail = raw.slice(end).match(/^[.!?…)\]"'”’]*/);
        to = end + (tail ? tail[0].length : 0);
      }
    }
    return raw.slice(from, to).trim();
  };
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
    // A reasoning-capable model (qwen3, deepseek-r1) streams its own
    // deliberation through Ollama's own separate `message.thinking` field —
    // app.js's completeOnce now captures it and fires this the SAME way
    // onDelta already fires, so it reaches the page through the SAME
    // onProgress channel every other phase already uses, one new phase name
    // rather than a second callback surface. Never read by anything in this
    // file: the draft that gets checked, corrected and recorded is still
    // built from `onDelta`'s own accumulation alone. A model that has
    // nothing to call `.thinking` (gemma2:2b, this app's default) simply
    // never fires this — completeOnce only calls it when Ollama actually
    // sends the field.
    onThinking: (partial) => onProgress?.("thinking", part, { partial }),
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
  const s2Frame = priorPass ? S2_FRAME_PREFIX : "";
  const searchedVoidSuffix = flat && searchedVoid ? ` ${searchedVoid}` : "";
  // Stated as a FACT about the answer's shape, in the positive, never as a
  // prohibition ("do not write more than…"). Tonight's own measurement is
  // why: a reasoning model spent visible tokens working out how to comply
  // with a phrase in its prompt rather than using it. A size it can simply
  // aim at is information; a length limit is one more rule to satisfy.
  const shapeSuffix = answerShape ? ` ${answerShape}` : "";
  // Phase 2's own material, for the INITIAL draft prompt only — `sourceBlock`
  // itself stays untouched everywhere else in this function (succession-box
  // parsing at parseSuccessionBoxes below reads raw material text and must
  // never see this block's synthetic lines; the correction prompts below
  // stay exactly as they were, Phase 3's own "measure before touching the
  // correction loop" scope). Facts first, raw passages after — orient with
  // the pre-digested read, then let the fuller text supply what the
  // extractor's own disclosed limits couldn't reach — the fuller text
  // being `dedupedSourceBlock` (above), not raw `sourceBlock`: the
  // salience gate's other half, cutting near-identical restatements
  // rather than adding a structured list ON TOP of an unfiltered raw one.
  // TWO REGISTERS, AND THE SPANS ARE ONLY THE ONES THE NOTES REST ON.
  // User direction, 2026-08-28: "never give it the raw text alone, we
  // always feed it the hyperlexicon's surf and fold with the minimal raw
  // spans from the original"; then "use only the spans linked to the
  // precise hyperlexicon elements."
  //
  // So the notes go first, saying plainly that they are notes and that a
  // source beats them; then the sentences that actually bound those notes,
  // each under its own address. The whole retrieved chunk no longer goes:
  // measured live, it carried page furniture ("'President Lincoln' and
  // 'Mr. Lincoln' redirect here") into a prompt as though it were evidence.
  //
  // THE ONE FALLBACK, disclosed rather than silent: when nothing bound,
  // there are no notes AND no spans, and sending neither would leave a
  // model with nothing at all on a question the raw text may well answer —
  // this repo's own extraction gap is large enough that this is the common
  // case, not the corner. So a no-note turn still gets the deduplicated
  // raw block, with the notes block already stating that nothing could be
  // read out of it.
  const spanBlock =
    factBlock?.spans?.length
      ? factBlock.spans.map((sp) => `${sp.ref}:
"${sp.text}"`).join("\n\n")
      : null;
  const draftMaterial = factBlock
    ? [factBlock.text, ledgerBlock, spanBlock ?? dedupedSourceBlock].filter(Boolean).join("\n\n")
    : [ledgerBlock, dedupedSourceBlock].filter(Boolean).join("\n\n");
  const executeMessages = passages.length
    ? flat
      ? [
          {
            role: "system",
            content: [s2Frame + FLAT_EXECUTE_SYSTEM_PROMPT + shapeSuffix + priorPassSuffix, draftMaterial].join("\n\n") + chatContext,
          },
          ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: task || `${part.label}. ${part.description}` },
        ]
      : [
          { role: "system", content: EXECUTE_SYSTEM_PROMPT },
          { role: "user", content: buildExecutePrompt(part, draftMaterial, discourse) },
        ]
    : chatHistory.length
      ? [
          { role: "system", content: `${s2Frame}${CHAT_SYSTEM_PROMPT}${searchedVoidSuffix}${priorPassSuffix}${chatContext}` },
          ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: task },
        ]
      : [
          { role: "system", content: `${s2Frame}${CHAT_SYSTEM_PROMPT}${searchedVoidSuffix}${priorPassSuffix}` },
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
  // Succession-box completeness (2026-08-19, user direction) — additive to,
  // never a replacement for, the hypergraph-based signal directly below:
  // that one reads a BOUND claim's own `fillers` cardinality, which only
  // exists when extractRelations bound an SVO sentence in the first place.
  // A Wikipedia succession box never states "Lincoln's vice presidents were
  // Hamlin and Johnson" as a sentence — it states two separate records, each
  // with its own "Preceded by"/"Succeeded by" fields, so no claim with
  // `fillers.length > 1` is ever produced from this material shape and
  // isIncomplete below stays permanently false no matter how many
  // corrections run. succession.js's own header discloses the scope this
  // reads (Wikipedia-style succession boxes only); this is the second,
  // disclosed way "incomplete" becomes true, OR'd with the hypergraph
  // signal, never touching its mechanics, its mode-priority order, or its
  // per-mode budget.
  const successionIncompleteFindings = (draftText) => {
    if (!sourceBlock) return [];
    const boxes = resolveBoxSubjects(parseSuccessionBoxes(sourceBlock), sourceBlock);
    const groups = officeHolderGroups(boxes);
    if (!groups.length) return [];
    const dt = foldTypography(String(draftText ?? "")).toLowerCase();
    const findings = [];
    for (const g of groups) {
      // The same relevance gate incompleteClaimsOf already holds itself to:
      // only check completeness of an office the draft already talks about
      // — never nag about a succession box nobody asked about.
      const named = g.holders.filter((h) => dt.includes(foldTypography(h).toLowerCase()));
      if (!named.length) continue;
      const missing = g.holders.filter((h) => !named.includes(h));
      if (missing.length) {
        // The FULL confirmed set, not just the delta — "also states: Johnson"
        // leaves the model to keep hunting the raw box text for a complete
        // answer, and a small model reading a succession box's own chain
        // structure (this office's box literally sits beside another box
        // naming the NEXT office-holder after these two) will keep pulling in
        // names the record never actually confirms for THIS office+president
        // pairing. Stating the closed set — all of it, not the gap — turns
        // "find more" into "copy this", which is a task a small model can
        // actually do without inventing.
        findings.push(`${g.president}'s ${g.office} — the material confirms exactly: ${g.holders.join(", ")} (nothing else)`);
      }
    }
    return findings;
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
      // Bound gate loosened 2026-08-26 (user direction: "let's loosen the
      // bound gates for now and just see how accurate the local model can
      // be"), the same change and the same reason as competingSubjectsOf
      // below. `fillers` is attached by hypergraph.js to every verdict that
      // reaches its cardinality point, UNBOUND ONES INCLUDED — so what the
      // material states for a slot was already computed and was being
      // thrown away whenever the draft's own sentence failed to bind, which
      // is precisely when the draft most needs correcting.
      if (!(claim.fillers?.length > 1)) continue;
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
  // The MIRROR of incompleteClaimsOf, added the same day (user direction,
  // live: "make some simple EOT statement about Abraham Lincoln's VP and
  // see that there is a conflict" — run for real first, not assumed:
  // `extractRelations` bound "Hannibal Hamlin —was→ Abraham Lincoln's vice
  // president" and "Andrew Johnson —was→ Abraham Lincoln's vice president"
  // as two REAL edges, and querying that slot with subject left open
  // returned both subjects directly — the exact P32 `competing` shape,
  // never wired into the completeness gate before now.
  //
  // Queries `relations.queryReferents`, NOT the standalone `queryFillers`
  // export — user direction, verbatim, both times this exact seam has been
  // built: "we need to point at REFERENTs not extant spans." Caught live
  // building this: a test fixture spelled the object "Lincoln's" in one
  // place and "Lincolns" in another, and `queryFillers`'s own disclosed
  // contract (hypergraph.js's own header: "matching here is on
  // report.edges's own exposed SURFACE STRINGS, not referent IDs") missed
  // the match entirely — a real, reproduced instance of exactly the gap
  // `queryReferents` (hypergraph.js, 2026-08-19, "remember to point
  // towards referents not spans") already exists to close, RUN INSIDE the
  // reader's own closure so "Lincoln's vice president" resolves by the
  // SAME referent identity `judge()` itself trusts internally, not by
  // string luck. `relations` (this closure's own injected reader,
  // `makeRelationReader`'s return value) is what carries it — never the
  // plain `edges` array once it has left that closure.
  //
  // incompleteClaimsOf asks "does this subject+verb bind more than one
  // OBJECT" (Lincoln —appointed→ {Hamlin, Johnson}); this asks "does this
  // verb+object bind more than one SUBJECT" ({Hamlin, Johnson} —was→
  // Abraham Lincoln's vice president) — the question's own phrasing can
  // outrun the material on either end, and only checking one end is why
  // this signal sat unused even after P32 itself computed `competing`
  // per-claim: that field only fires on an UNBOUND claim (the answer's own
  // subject choice, checked against the slot), never surfaced independent
  // of what the answer happened to guess. Querying the slot directly finds
  // it regardless of which (or whether any) subject the draft picked.
  const competingSubjectsOf = (c) => {
    const claims = c?.relations?.claims ?? [];
    if (!relations || !claims.length) return [];
    const seenSlots = new Set();
    const result = [];
    for (const claim of claims) {
      // NOT gated on `verdict === "bound"`, and this is the whole point of
      // querying the slot rather than reading the draft's own field. What
      // the MATERIAL confirms for a slot does not depend on whether the
      // draft's sentence happened to bind — and the case that most needs
      // this correction is exactly the one where it did not: measured live
      // 2026-08-26, "who was lincoln's vp?" drafted "Lincoln's VP was
      // Andrew Johnson", failed to bind (the answer carried its own "∅ not
      // in the material" mark), and so skipped this gate entirely — even
      // though the fetched material stated BOTH Hamlin and Johnson and
      // this function would have found them. An unbound claim still
      // carries the verb and object the draft asserted, which is all
      // queryReferents needs; a garbled one simply returns fewer than two
      // subjects and is skipped by the guard below, exactly as before.
      // This comment's own paragraph above already argued for it —
      // "querying the slot directly finds it regardless of which (or
      // whether any) subject the draft picked" — the gate just never
      // matched the argument.
      if (!claim?.verb || !claim?.object) continue;
      let subjects;
      try {
        subjects = relations.queryReferents({ verb: claim.verb, object: claim.object });
      } catch {
        subjects = null;
      }
      if (!subjects || subjects.length < 2) continue;
      // The slot's own identity is the MATERIAL's confirmed subject set for
      // this verb, never the draft's own object text — a second real bug in
      // the same family as the queryFillers one above, caught the same way
      // (measured, not assumed): a corrected draft's second sentence added
      // one trailing word ("...vice president TOO") and, keyed by object
      // string, that read as a SECOND, unrelated slot — each sentence then
      // saw only itself as "already named" and reported the OTHER subject
      // as still missing, forever. `subjects` already came from a single
      // referent-resolved query; keying on ITS OWN sorted identity is what
      // "point at referents, not spans" means applied to slot dedup itself,
      // not just to the query that feeds it. `named` follows the same
      // widening: any bound claim sharing this VERB is a candidate for
      // "already covers one of the confirmed subjects," not only a claim
      // whose own object string happens to match exactly.
      const slot = `${claim.verb}|${subjects.map((s) => foldTypography(s.subject).toLowerCase()).sort().join(",")}`;
      if (seenSlots.has(slot)) continue;
      const named = claims.filter((c2) => c2.verdict === "bound" && c2.verb === claim.verb).map((c2) => foldTypography(c2.subject).toLowerCase());
      const uncovered = subjects.filter((f) => {
        const ft = foldTypography(f.subject).toLowerCase();
        return !named.some((t) => t.includes(ft) || ft.includes(t));
      });
      if (uncovered.length) {
        seenSlots.add(slot);
        result.push({ ...claim, competingSubjects: subjects, uncoveredSubjects: uncovered });
      }
    }
    return result;
  };
  // `t` (the draft text) is only ever consumed by the succession-box signal
  // — the hypergraph signal reads solely off `c`, unchanged.
  const isIncomplete = (t, c) =>
    incompleteClaimsOf(c).length > 0 || competingSubjectsOf(c).length > 0 || successionIncompleteFindings(t).length > 0;
  // The concrete diagnosis buildCorrectionPrompt's "incomplete" mode needs:
  // not "be more complete" (teaches nothing, judge()'s own stated reason
  // every mode here names what actually went wrong) but the real fillers,
  // by name, so the model is told exactly what the material states rather
  // than asked to guess what "more" might mean.
  //
  // Measured live 2026-08-20 (the same Lincoln/Hamlin/Johnson question,
  // real fetched Wikipedia material, gemma2:2b): phrased as `uncovered` —
  // the DELTA still missing, not the whole set — a corrected draft named
  // Johnson (the one real gap) but ALSO invented "Schuyler Colfax" and even
  // listed Lincoln himself as a "Vice President". Traced by replaying the
  // exact retrieved passages through both completeness signals directly
  // (bypassing the model entirely): officeHolderGroups and clusterFillers
  // BOTH computed the correct, closed set — {Hamlin, Johnson}, nothing
  // else — so this was never a bad finding, it was a small model re-mining
  // the raw succession-box text it was shown a second time under pressure
  // to "add more", and a Wikipedia succession box sits its Lincoln-VP
  // record directly beside the NEXT office-holder's own record (Colfax
  // succeeded Johnson as VP, under a different president) — real text, a
  // real name, just not confirmed for THIS slot. A delta ("also states:
  // Johnson") leaves the model free to keep hunting; the FULL confirmed
  // set, stated as closed, gives it nothing left to invent — "copy this
  // list, and no one else" is a task a small model can actually do.
  const incompleteFindings = (t, c) => [
    ...incompleteClaimsOf(c).map(
      (claim) =>
        `"${claim.subject} ${claim.verb} ${claim.object}" — the material confirms exactly: ${claim.fillers.map((f) => f.object).join(", ")} (nothing else)`,
    ),
    ...competingSubjectsOf(c).map(
      (claim) =>
        `"${claim.verb} ${claim.object}" — the material confirms exactly: ${claim.competingSubjects.map((f) => f.subject).join(", ")} (nothing else)`,
    ),
    ...successionIncompleteFindings(t),
  ];
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
            incomplete: isIncomplete(t, c),
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
  // The mode a round's failure is filed under — the SAME priority order as
  // before (reproduced > echoed > narrated > incomplete > unsupported),
  // pulled into its own function so the budget below can key on it.
  const modeOf = (v, c) =>
    v.reproduced
      ? "reproduction"
      : v.echoed
        ? "echo"
        : v.narrated
          ? "narrated"
          : v.incomplete
            ? "incomplete"
            : c.unsupported.length
              ? "unsupported"
              : null;
  let mode = modeOf(verdict, check);

  // A correction budget spent per FAILURE MODE, not per call: without this,
  // the loop's one shot went to whichever failure the priority order named
  // first, and a different failure that only became visible once the first
  // was fixed (the live Lincoln/Hamlin/Johnson specimen: reproduction fired
  // on a bare "Hannibal Hamlin", its own fix produced a fuller draft, THAT
  // draft was incomplete — missing Johnson — and the budget was already
  // spent) never got a turn. `mode` has exactly five possible values plus
  // null, so bounding each at `maxCorrections` attempts bounds the whole
  // loop at 5*maxCorrections iterations structurally — no new hand-picked
  // ceiling (P9: no number where a structural rule will do).
  const triedCounts = new Map();
  // Threaded forward through this loop and out via the return value below
  // — landCompletenessBelief's own header has the full reasoning. Landed
  // ONCE per incomplete claim, at the moment the gate first sees it,
  // before the redefine round spends its one shot: the belief this
  // records is "as of THIS material, the question's presupposed-singular
  // claim does not hold" — true regardless of how the redefine round's
  // own draft turns out, so recording it does not wait on that outcome.
  let beliefLog = gridLog;

  while (
    mode &&
    // The correction prompt answers "from the material" — with no passages
    // it cannot, and a material-framed rewrite of a passage-less echo just
    // produces a diagnosis of the prompt. The chat path above is the whole
    // answer to a passage-less echo; nothing in this loop fixes it.
    passages.length &&
    (triedCounts.get(mode) ?? 0) < maxCorrections
  ) {
    corrections++;
    triedCounts.set(mode, (triedCounts.get(mode) ?? 0) + 1);
    const correctionFailures = mode === "incomplete" ? incompleteFindings(draft, check) : check.unsupported;
    if (mode === "incomplete" && (triedCounts.get(mode) ?? 0) === 1) {
      const experiencer = `holon-relation-tier reading for part ${part.label ?? part.id ?? "unlabeled"} of task ${task}`;
      const sourceKey = `${part.id ?? "part"}-material`;
      for (const claim of incompleteClaimsOf(check)) {
        beliefLog = landCompletenessBelief(grid, beliefLog, runCapacity, landAct, {
          claim,
          sourceKey,
          sourceText: sourceBlock ?? "",
          experiencer,
        });
      }
      // The mirror case: one verb+object slot, several competing subjects
      // (the "Abraham Lincoln's vice president" specimen) — one EOT
      // statement landed per candidate subject, against the SAME ground,
      // so a reader of the shared log sees both beliefs sitting side by
      // side with their own real, independently-computed verdicts, not a
      // single collapsed guess at which subject the question "really"
      // meant.
      for (const claim of competingSubjectsOf(check)) {
        for (const filler of claim.competingSubjects) {
          beliefLog = landCompletenessBelief(grid, beliefLog, runCapacity, landAct, {
            claim: { subject: filler.subject, verb: claim.verb, object: claim.object },
            sourceKey,
            sourceText: sourceBlock ?? "",
            experiencer,
          });
        }
      }
    }
    // "incomplete" is the one mode that is not a mistake to fix — it is a
    // malformed DEF (the question presupposed a unique answer the material
    // does not have). buildRedefinedPart's own header has the measured
    // reason this runs through buildExecutePrompt (a fresh, uncritical
    // write-this-part task) rather than buildCorrectionPrompt (which frames
    // every OTHER mode correctly, because those really are mistakes in a
    // prior draft to point at and fix).
    const correctionMessages =
      mode === "incomplete"
        ? [
            { role: "system", content: EXECUTE_SYSTEM_PROMPT },
            { role: "user", content: buildExecutePrompt(buildRedefinedPart(part, correctionFailures), sourceBlock, discourse) },
          ]
        : [
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
    mode = modeOf(verdict, check);
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
  // Now just a call to stripFraming (2026-08-20, defined above alongside
  // contentSentencesOf/isFraming): same cut, same result, but no longer the
  // only place it runs — see stripFraming's own header for why.
  const text = stripFraming(draft);
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
    ...(verdict.incomplete ? incompleteFindings(draft, check).map((f) => `answer names only one of several the material states: ${f}`) : []),
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
    // The updated shared log, threaded back to the caller — `gridLog`
    // unchanged (byte-identical `===`) when no organ was injected or
    // nothing was landed; a real, new log state when a belief was
    // recorded. landCompletenessBelief's own header, and this parameter's.
    gridLog: beliefLog,
    // The updated hyperlexicon, same threading discipline: unchanged when
    // no organ was injected or nothing bound this part.
    hyperlexiconLog: beliefNotes,
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
  // The measured answer size (void-narration.js::answerShapeLine), task-wide
  // for the identical reason searchedVoid is: the void is declared once per
  // TURN, before any part runs. null → byte-identical to before.
  answerShape = null,
  // S1's own answer, task-wide for the identical reason searchedVoid is —
  // one fast pass ran once, before the plan, never per-part.
  priorPass = null,
  onProgress = null,
  // The shared belief record — see runPart's own header for the full
  // reasoning (P38, "the hypergraph records beliefs, held by an
  // experiencer"). Threaded through every part's runPart call and
  // accumulated across parts the SAME way `seenRefs` already accumulates
  // refs below; the final state rides out on this function's own return
  // value as `gridLog` for the caller (app.js) to persist.
  grid = null,
  gridLog = null,
  runCapacity = null,
  landAct = null,
  // Same shape, same threading, same default-null backward compatibility
  // as grid/gridLog just above — see runPart's own header for the full
  // reasoning (P57's own hyperlexicon.js; classifyConnector: the door's
  // grammar gate, P73).
  hyperlexicon = null,
  hyperlexiconLog = null,
  classifyConnector = null,
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
  // Accumulated across every part this task runs, same shape as `seenRefs`
  // — a later part's belief-landing sees the log a prior part already
  // updated, so two parts of one turn never race each other into two
  // divergent forks of what should be one shared record.
  let sharedGridLog = gridLog;
  let sharedHyperlexiconLog = hyperlexiconLog;
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
      answerShape,
      priorPass,
      onProgress,
      grid,
      gridLog: sharedGridLog,
      runCapacity,
      landAct,
      hyperlexicon,
      hyperlexiconLog: sharedHyperlexiconLog,
      classifyConnector,
    });
    seenRefs.push(...result.refs);
    sharedGridLog = result.gridLog;
    sharedHyperlexiconLog = result.hyperlexiconLog;
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

  return { task, plan, log, production, sections, output, refs, unsupported, unbacked, open, channels, gridLog: sharedGridLog, hyperlexiconLog: sharedHyperlexiconLog };
}
