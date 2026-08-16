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

import { buildSourceBlock, checkCitations, foldDiacritics, openQuestions, retrieve, tokenize } from "./source.js";
import { checkGrounding, unsupportedClaims } from "./grounding.js";
import { attribute, attributedRefs, splitSentences } from "./cite.js";
import { stripScaffoldNarration } from "./provenance.js";

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
  const q = String(question || "").trim();
  if (!q) return false;
  const clauses = q
    .split(CLAUSE_SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.split(/\s+/).filter(Boolean).length >= MIN_CLAUSE_WORDS);
  if (clauses.length < MIN_SUBSTANTIVE_CLAUSES) return false;
  if (clauses.length >= 4) return true;
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
export const EXECUTE_SYSTEM_PROMPT =
  "You are writing one part of a larger piece. Write plain prose for the part you are given, and only that part, in your own words. Say what the material establishes about the prompt — do not copy sentences from it, and do not just restate the prompt back. When material is supplied, write from it and cite the address in square brackets exactly as it appears. Where the material does not cover the part, say so plainly instead of filling the gap.";

// The no-material reply's other face. A prompt that matched no material is
// not necessarily a research gap — a greeting, a question of taste, a joke —
// and a model ordered to "say what the part would need" on "hi" says "the
// question is: hi". This prompt is the one place chat is allowed to be chat:
// no material framing, no citation grammar, just a reply to a person.
export const CHAT_SYSTEM_PROMPT =
  "A friendly conversation with no source material. The user's message matched no document to cite, so reply to it directly, briefly, and naturally, as a person would. Do not restate the message back; say something new in response.";

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
      `quoting at most one sentence, and cite the address in square brackets.\n\nThe draft:\n${draft}\n\n${sourceBlock ?? ""}`
    );
  }
  if (mode === "echo") {
    return (
      `Your draft for "${part.label}" restates the prompt instead of answering it. ` +
      `Answer it from the material in your own words, citing the address in square brackets; ` +
      `if the material does not answer it, say so plainly.\n\nThe draft:\n${draft}\n\n${sourceBlock ?? ""}`
    );
  }
  return (
    `Your draft for the part "${part.label}" contains statements the supplied material does not support:\n` +
    failures.map((f) => `- ${f}`).join("\n") +
    `\n\nRewrite the part using only what the passages state, citing addresses in square brackets. ` +
    `Where the material is silent, say so instead.\n\nThe draft:\n${draft}\n\n${sourceBlock ?? ""}`
  );
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
  chunks,
  call,
  foldedRefs = [],
  passagesPerPart = PASSAGES_PER_PART,
  maxCorrections = MAX_CORRECTIONS,
  makeNameResolver = null,
  onProgress = null,
}) {
  const question = `${part.label} ${part.description}`;
  const live = chunks ?? [];
  const passages = live.length ? retrieve(live, question, passagesPerPart, foldedRefs) : [];
  const sourceBlock = buildSourceBlock(passages);
  onProgress?.("research", part, { passages: passages.map((p) => p.ref) });

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

  const inspect = (text) => {
    // The label is model-authored output that ships as a heading, so it is
    // checked with the draft — a figure invented in a label is the same
    // failure as one invented in a sentence, and must land in the same list.
    const shipped = `${part.label}\n${text}`;
    const { used, unsupported } = checkCitations(shipped, passages);
    const grounding = checkGrounding(shipped, passages, {
      question: `${task} ${part.description}`,
      resolveName,
    });
    const attributions = attribute(text, passages, live);
    const attributed = attributedRefs(attributions);
    return {
      used,
      attributed,
      refs: [...new Set([...used, ...attributed])],
      channels: [
        ...(used.length ? ["cited"] : []),
        ...(attributed.length ? ["attributed"] : []),
      ],
      unsupported: [...unsupported, ...unsupportedClaims(grounding)],
      attributions,
      grounding,
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
  //                  whole-copy case), OR MORE OF THE ANSWER'S OWN
  //                  SENTENCES ARE VERBATIM COPIES THAN ARE NOT — the same
  //                  "present more often than absent" cut cite.js's
  //                  commonTerms already uses for terms (`cut =
  //                  pool.length / 2`), applied here to sentences. The
  //                  second test is the one the first version of this check
  //                  missed live: real commentary sentences interleaved
  //                  between long verbatim quotations break contiguity, but
  //                  an answer that is mostly quotation with a little
  //                  commentary stitched between the quotes has still not
  //                  answered the question — it has annotated a photocopy.
  // Either verdict is a FAILURE that triggers the same bounded correction
  // pass as an unsupported claim, with the rewrite told exactly which
  // failure it is fixing. A draft still failing when the budget runs out
  // fails the part: no refs, typed open — an answer that does not answer
  // earns nothing.
  const questionWords = new Set(tokenize(`${task} ${question}`));
  const ADDRESS_RE = /\[?[^\s\]]+#\d+-\d+\]?/g;
  const foldWs = (s) => foldDiacritics(String(s).toLowerCase()).replace(/\s+/g, " ").trim();
  const passagesFolded = passages.map((p) => foldWs(p.text));
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
  ]);
  const isFraming = (sentence) => {
    const toks = tokenize(sentence);
    return toks.length > 0 && toks.every((w) => questionWords.has(w) || ACT_WORDS.has(w));
  };
  /** Sentences of `t` with addresses stripped, framing (question-echo) sentences removed. */
  const contentSentencesOf = (t) =>
    splitSentences(String(t ?? "").replace(ADDRESS_RE, " "))
      .map((s) => s.replace(ADDRESS_RE, " ").trim())
      .filter(Boolean)
      .filter((s) => !isFraming(s));
  // A sentence needs SOME content to count as evidence either way — the
  // same magnitude of floor MIN_CLAUSE_WORDS and MIN_RUN already use
  // elsewhere in this codebase for "enough to mean something."
  const MIN_CONTENT_TOKENS = 3;
  const isVerbatimSentence = (sentence) => {
    if (tokenize(sentence).length < MIN_CONTENT_TOKENS) return false;
    const sf = foldWs(sentence);
    return sf.length > 0 && passagesFolded.some((pf) => pf.includes(sf));
  };
  /** Reproduction, from an already-extracted list of non-framing sentences. */
  const reproducedFromContent = (content) => {
    if (!content.length) return false;
    const contentText = foldWs(content.join(" "));
    const wholeBlockCopied = contentText.length > 0 && passagesFolded.some((pf) => pf.includes(contentText));
    const verbatimCount = content.filter(isVerbatimSentence).length;
    return wholeBlockCopied || verbatimCount > content.length / 2;
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
  const executeMessages = passages.length
    ? [
        { role: "system", content: EXECUTE_SYSTEM_PROMPT },
        { role: "user", content: buildExecutePrompt(part, sourceBlock, discourse) },
      ]
    : [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        { role: "user", content: task },
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
  const clean = (raw) => {
    const { text: t, removed } = stripScaffoldNarration(raw);
    scaffoldRemoved.push(...removed);
    return t;
  };

  draft = clean(await call(executeMessages, { effort: "low", maxTokens: EXECUTE_MAX_TOKENS, ...streaming }));
  check = inspect(draft);
  let verdict = judge(draft);

  // A prompt that matched no material and whose draft only restates it is
  // plain chat, not a research gap: "hi" should be greeted, not diagnosed.
  // The material correction loop below has nothing to correct against — no
  // passages — and a material-framed rewrite of a greeting just echoes the
  // greeting again, so it is skipped in favour of ONE neutral conversational
  // call. Whatever a material-framed prompt cannot answer as a finding it
  // may still answer as a person.
  if (verdict.echoed && !passages.length) {
    const chat = clean(
      await call(
        [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          { role: "user", content: task },
        ],
        { effort: "low", maxTokens: EXECUTE_MAX_TOKENS },
      ),
    );
    const chatVerdict = judge(chat);
    if (!chatVerdict.echoed && !chatVerdict.reproduced) draft = chat;
    else verdict = chatVerdict;
  }

  while (
    (check.unsupported.length || verdict.echoed || verdict.reproduced) &&
    // The correction prompt answers "from the material" — with no passages
    // it cannot, and a material-framed rewrite of a passage-less echo just
    // produces a diagnosis of the prompt. The chat path above is the whole
    // answer to a passage-less echo; nothing in this loop fixes it.
    passages.length &&
    corrections < maxCorrections
  ) {
    corrections++;
    const mode = verdict.reproduced ? "reproduction" : verdict.echoed ? "echo" : "unsupported";
    const correctionMessages = [
      { role: "system", content: EXECUTE_SYSTEM_PROMPT },
      { role: "user", content: buildCorrectionPrompt(part, sourceBlock, draft, check.unsupported, mode) },
    ];
    onProgress?.("correct", part, {
      failures: check.unsupported,
      mode,
      promptChars: correctionMessages.reduce((n, m) => n + m.content.length, 0),
    });
    draft = clean(await call(correctionMessages, { effort: "low", maxTokens: EXECUTE_MAX_TOKENS, ...streaming }));
    check = inspect(draft);
    verdict = judge(draft);
  }

  // The output ships without its framing: a sentence that names the act of
  // prompting is never an answer, and a draft that opens by echoing the
  // prompt must not carry that echo to the page, the fold, or the record.
  // The SAME sentences judge() already classified are the ones shipped, so
  // what was judged is what leaves. A draft that is nothing but framing
  // ships nothing — the typed gap below says why.
  const raw = String(draft ?? "").trim();
  const sentences = splitSentences(raw.replace(ADDRESS_RE, " "))
    .map((s) => s.trim())
    .filter(Boolean);
  const firstContent = sentences.findIndex((s) => !isFraming(s));
  const text = firstContent < 0 ? "" : firstContent > 0 ? sentences.slice(firstContent).join(" ") : raw;
  if (verdict.echoed || verdict.reproduced) {
    check = { ...check, refs: [], used: [], attributed: [], channels: [] };
  }
  const open = [
    ...(strayed ? [`part searched on words the task never used: ${part.label}`] : []),
    ...(verdict.echoed ? [`answer restates the prompt; nothing established: ${part.label}`] : []),
    ...(verdict.reproduced
      ? [`answer reproduces the material verbatim; it does not answer the prompt: ${part.label}`]
      : []),
    ...(scaffoldRemoved.length
      ? [`model narrated its own answering process; ${scaffoldRemoved.length} span(s) hidden: ${part.label}`]
      : []),
    ...openQuestions(question, passages, check.refs),
    ...(text ? [] : [`part produced no text: ${part.label}`]),
  ];
  onProgress?.("checked", part, { refs: check.refs, unsupported: check.unsupported, open });

  return {
    part,
    text,
    passages,
    corrections,
    ...check,
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
  discourse = "",
  planMode = "model",
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
      onProgress,
    });
    seenRefs.push(...result.refs);
    sectionsById.set(t.part_id, result);
    return {
      refs: result.refs,
      channels: result.channels,
      unsupported: result.unsupported,
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
  const open = [
    ...(plan.degraded ? ["plan did not parse; task ran as a single part"] : []),
    ...sections.flatMap((s) => s.open),
    // The guard tripping is not closure and must not read like it (the three
    // halt facts stay distinct all the way to the record).
    ...(production.halted_by === "max-steps-guard" ? ["production halted by max-steps guard"] : []),
  ];
  const channels = [...new Set(sections.flatMap((s) => s.channels))];

  return { task, plan, log, production, sections, output, refs, unsupported, open, channels };
}
