// socratic-epistemic.js — the epistemic arm of the Socratic partner.
//
// WHERE IT SITS. Before the confirmation gate. A question that CARRIES A CLAIM
// (the operator is not asking for information; they are asserting or assuming
// something and asking how to press it) is not an ambiguous request — it is a
// claim to be examined. The Socratic move: restate what they said, surface the
// premise it carries, and pose the refutation as a question. Never a verdict,
// never a lecture. The mouth is never told to "be Socratic" — this module
// COMPOSES the account mechanically (L5), grounded in the socratic-priors
// move-types (consumption → premise → question → aporia).
//
// MECHANICAL DETECTION (L5, no model): a "persuasion/claim" shape is a closed
// pattern set — the operator is asking how to convince / prove / argue /
// persuade, or the question presupposes a normative judgment ("is important",
// "should", "is the best way"). These carry a premise worth examining.
//
// The register mirrors the Meno: consumption (restate their words, from their
// own text — never paraphrased by a model), then surface the premise, then the
// aporia ("I know that I do not yet know what would convince them"), then one
// question. The account is composed from the operator's OWN words so it is
// grounded, not invented.

// Shapes that carry a claim to examine. All mechanical.
const PERSUASION = /\b(convince|persuade|prove|argue|make them (see|believe|understand)|get (someone|them|him|her) to|show (someone|them))[\w\s]*\b/;
const NORMATIVE = /\b(is|are|was|were)\s+(important|necessary|right|wrong|good|bad|justified|the best|essential)\b|\bshould\b|\bought to\b/;
const BEST_WAY = /\b(best|most effective|greatest|proper|right|easiest)\s+way\b/;

/** Is this question carrying a claim worth examining? Pure, mechanical. */
export function carriesClaim(question) {
  const t = String(question ?? "").toLowerCase();
  const persuasion = PERSUASION.test(t);
  const normative = NORMATIVE.test(t);
  const bestWay = BEST_WAY.test(t);
  if (!persuasion && !normative && !bestWay) return null;
  return {
    persuasion, normative, bestWay,
    reason: [persuasion && "asking how to convince", normative && "presupposes a normative claim", bestWay && "asks for the best way"].filter(Boolean).join("; "),
  };
}

/** The claim the question carries, extracted mechanically as its own text. */
function claimOf(question) {
  const t = String(question ?? "").trim();
  // "what's the best way to convince someone that X is important?" → the
  // premise is the "that X..." clause, or the normative object.
  const that = t.match(/that\s+(.+?)[.?]*$/);
  if (that) return that[1].trim();
  const norm = t.match(/(.+?\bis\s+(?:important|necessary|right|good|best|essential)[^.?]*)/);
  if (norm) return norm[1].trim();
  return t;
}

/** Compose the Socratic account — a SHORT, warm, personified register.
 *  No apparatus vocabulary, no bullet lists, no taxonomy names. The machine's
 *  real needs (goal clarity, what would ground the claim, the falsification
 *  question) are asked as human questions — the personification is complete;
 *  the machinery underneath is invisible but doing the work. */
export function composeSocratic(question, claim, subject) {
  const t = subject || claim || "this claim";
  return [
    `Let me make sure I understand what you're going for. Should we even be trying to "convince" someone? That's a real question, not a rhetorical one — if the goal is to move someone on ${t}, the research on what actually changes minds about deeply held beliefs matters more than any talking points I can hand you.`,
    `I can give you talking points. In my experience that's how you end up talking to a brick wall — the other person isn't a position to be managed, they're someone to actually talk with.`,
    `So before method — what would count as "working" here? And what's the one thing that, if it turned out to be true, would make you reconsider your own position on this? I'd rather start there.`,
  ].join("\n\n");
}

/** The terrain walk and void declaration remain available as machinery for a
 *  LATER turn — once the operator answers, the system can draw the lay of the
 *  land in human words. But they are NOT the first response: the first
 *  response is personified speech, not an apparatus report. */
export function composeTerrainWalk(claim, subject) {
  const t = subject || claim || "this claim";
  const lines = TERRAIN_WALK.map((r) => `· ${r.plain} (${r.terrain}): ${r.frame.replace(/~/g, t)}`);
  return [
    `Here's the lay of the land — and this is the part I can only draw because I hold the whole record, not just the answer. Walking ${t} down from the paradigm to the gaps:`,
    ...lines,
    `The bottom is where the elenchus actually lives: the premise "${t}" has no ground under it yet — that's the gap worth staring at before any talking point.`,
  ].join("\n");
}

export function composeVoidDeclaration(claim, subject) {
  const t = subject || claim || "this claim";
  const cells = VOID_SPEECH.map(([field, ask]) => `· ${field} — ${ask.replace(/~/g, t)}`);
  return [
    `Now the honest part — the part that matters more than any answer. What do we actually NOT know about ${t}?`,
    `Let me lay out the void, cell by cell — each one is something we'd have to know to hold "${t}" as a claim rather than a hope:`,
    ...cells,
    `That is the aporia made concrete. I don't know these things about ${t} — and until some of them are filled, the claim is a declaration of intent, not a ground. The definition of the void IS the first honest move.`,
  ].join("\n");
}

/** Full Socratic epistemic account: the FIRST response is the personified
 *  register only — short, warm, human. The terrain walk and void declaration
 *  are kept available (for a later turn, once the operator answers) but are
 *  NOT dumped on the first exchange. */
export function socraticTurn(question) {
  const carried = carriesClaim(question);
  if (!carried) return null;
  const claim = claimOf(question);
  const subject = topicOf(question, claim);
  return {
    carried,
    claim,
    subject,
    text: composeSocratic(question, claim, subject),
  };
}

/** The topic (subject) of the claim, mechanically — e.g. "gun safety
 *  legislation". Falls back to the claim itself. */
function topicOf(question, claim) {
  const t = String(claim ?? "");
  // "gun safety legislation is important" → take up to the copula
  const m = t.match(/^(.+?)\s+(?:is|are|was|were)\s+(?:important|necessary|right|good|best|essential)\b/);
  if (m) return m[1].trim();
  const first = t.match(/^(.{4,60}?)(?:[,.]|\s+that\s+)/);
  if (first && first[1].split(" ").length >= 2) return first[1].trim();
  return t.slice(0, 80);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE A — the dialogue state machine (spec §3-§8). All pure, all testable.
// ─────────────────────────────────────────────────────────────────────────────

/** The nine void cells, in VOID_OPERATORS order (void-shape.js). */
export const VOID_CELLS = Object.freeze([
  "slot", "anchor", "admits", "extent", "relation",
  "composition", "cardinality", "admission", "reopensOn",
]);

/** Cell priority for the NEXT question — load-bearing first (spec §7). */
const CELL_PRIORITY = Object.freeze([
  "anchor", "admits", "admission", "extent", "relation",
  "composition", "cardinality", "slot", "reopensOn",
]);

export const STAGES = Object.freeze({
  EXAMINING: "examining",
  APORIA: "aporia",
  RESOLVING: "resolving",
  CLOSED: "closed",
});

/** Create a fresh dialogue for a claim-carrying question. Pure. */
export function newDialogue(question) {
  const carried = carriesClaim(question);
  if (!carried) return null;
  const claim = claimOf(question);
  const subject = topicOf(question, claim);
  const cells = {};
  for (const c of VOID_CELLS) cells[c] = { asked: null, answered: null };
  return {
    claim, subject,
    cells,
    stage: STAGES.EXAMINING,
    aporia: null,
    startedAt: null,
    closedAt: null,
  };
}

/** Is this turn an ANSWER (fills the last-asked cell) or a fresh question?
 *  Mechanical: a turn that ENDS in a question (trailing ?) or is a fresh
 *  interrogative ask is a question; a statement or reply — even one with a
 *  rhetorical mid-sentence "?" — is an answer. */
export function isAnswer(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (/[?؟]\s*$/.test(t)) return false;         // ends in a question
  if (/^(what|why|how|who|when|where|should|can|could|would|is|are)\b/i.test(t) && t.length < 120) return false;
  return true;
}

/** Did the operator pivot to something actionable (email/code/task) while a
 *  dialogue is open? Mechanical closed patterns. */
export function isActionableRequest(text) {
  const t = String(text ?? "").toLowerCase();
  return /\b(write|draft|help me (write|draft|build|make)|build|make|fix|send|code|email|create)\b/.test(t) &&
         !/\b(but|however|yet)\b/.test(t.slice(0, 40));
}

/** Assign an answer to the last-asked cell, with the assignment disclosed
 *  (spec §6 v1). Returns the updated cells. Pure. */
export function assignAnswer(cells, text, turn) {
  // the last-asked cell is the highest asked-with-null-answer by the register's
  // own asking order — the cells carry `asked` seq numbers.
  let last = null, lastSeq = -1;
  for (const c of VOID_CELLS) {
    const cell = cells[c];
    if (cell && cell.asked != null && cell.answered == null && cell.asked > lastSeq) {
      lastSeq = cell.asked; last = c;
    }
  }
  if (!last) return { cells, assigned: null };
  const next = { ...cells, [last]: { asked: cells[last].asked, answered: { text: String(text ?? "").trim(), at: turn }, assignedBy: "last-asked" } };
  return { cells: next, assigned: last };
}

/** The next cell to ask — load-bearing priority, skipping asked/answered.
 *  Returns null when all are asked or answered (the dialogue is exhausted). */
export function nextCell(cells) {
  for (const c of CELL_PRIORITY) {
    const cell = cells[c];
    if (cell && cell.asked == null) return c;
  }
  return null;
}

/** Mechanical aporia detection (spec §8). Pure; returns { fired, kind, note }
 *  or null. `lastAsked` is the cell the answer is being assigned to (the
 *  router passes it in). The conviction trigger is cell-INDEPENDENT: the
 *  operator can volunteer "nothing would change my mind" at any point —
 *  that's the aporia arriving early, and the register must honor it. */
export function detectAporia(dialogue, answerText, lastAsked = null) {
  const t = String(answerText ?? "").toLowerCase();
  // 1. reopensOn answered as "nothing" — the claim is a conviction. Fires on
  //    ANY cell: a volunteered "nothing would change my mind" is the aporia
  //    regardless of which question preceded it.
  const conviction = /\b(nothing|not\s+anything|nothing\s+would|no\s+idea|can't\s+think\s+of\s+anything|don't think anything|wouldn't change|would not change)\b/;
  const changeMind = /\b(change\s+my\s+mind|change\s+it|reconsider|convince\s+me|make\s+me\s+reconsider)\b/;
  if (conviction.test(t) && (lastAsked === "reopensOn" || changeMind.test(t))) {
    return { fired: true, kind: "reopensOn-nothing", note: "nothing would change the operator's mind — the claim is a conviction, not a hypothesis" };
  }
  // 2. explicit surrender on a question the operator is best placed to answer
  if (/\b(i don't know|i dont know|i can't think of anything|no idea|i give up)\b/.test(t) && t.length < 90) {
    return { fired: true, kind: "surrender", note: "the aporia arrival — treat as the opening, not the defeat" };
  }
  // 3. anchor contradiction: the operator's answer states the claim itself as
  //    its own ground ("it's important because it's important")
  if (new RegExp(`\\b${escapeRe(subjectWords(dialogue))}\\b`).test(t) && /\b(because it (is|'s)|it just is|it's obvious|everyone knows)\b/.test(t)) {
    return { fired: true, kind: "anchor-circular", note: "the ground given is the claim itself" };
  }
  return null;
}

function escapeRe(s) {
  return String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
}

function subjectWords(dialogue) {
  return (dialogue?.subject || dialogue?.claim || "it").split(/\s+/).slice(0, 3).join(" ");
}

/** The aporia-name — composed, never model-generated (spec §5.2). Includes
 *  the anti-helplessness line: the gap is in the claim, not the person. */
export function composeAporia(dialogue, kind) {
  const s = dialogue?.subject || "this claim";
  const core = {
    "reopensOn-nothing": `Here's the honest part — you've said nothing would change your mind on ${s}. Then what we have isn't a claim yet, it's a conviction. That's not a criticism of you — it's just the truth about the claim: it isn't testable until something could count against it.`,
    "surrender": `That "I don't know" is the realest thing we've said. Good. Not knowing is where knowing starts — the gap is in the claim, not in you. Let's look at what we'd need to know to fill it.`,
    "anchor-circular": `The ground you've given for ${s} is ${s} itself. That's a circle, honestly — and it's the most common one there is. The claim needs a ground outside itself before it can stand.`,
  };
  const body = core[kind] || `Here's the honest part — I don't know that this holds yet, and I'd rather say that than pretend. The claim doesn't stand yet; that's about the claim, not about you.`;
  return [body, `So — what would, if it turned out to be true, make you reconsider?`].join("\n\n");
}

/** The push move (spec §5.3): every turn ends in a question or a gentle
 *  refutation — never validation alone. Composed per cell. */
export function composeCellQuestion(dialogue, cell) {
  const s = dialogue?.subject || "this claim";
  const q = {
    anchor: `What would have to be true for ${s} to actually stand — what's the one thing underneath it that everything else depends on?`,
    admits: `What would count as evidence for ${s} — what kind of thing could you even look at?`,
    admission: `What test would a piece of evidence have to pass to actually support ${s}, rather than just feel like it does?`,
    extent: `How far does ${s} reach — what does it cover, and in what units would you measure that?`,
    relation: `What binds the evidence to ${s}? How does the data actually connect to the claim?`,
    composition: `How do the pieces of evidence fit together across that ground — do they add up, or just sit side by side?`,
    cardinality: `How many grounds would be enough — is one case enough, or do you need many?`,
    slot: `What space is ${s} actually claiming — marked off from everything it is not?`,
    reopensOn: `What's the one thing that, if it turned out to be true, would make you reconsider your position on ${s}?`,
  };
  return q[cell] || q.anchor;
}

/** The consumption move: restate what the operator just said, then the next
 *  question — the micro-gesture from the corpus (consumption → question). */
export function composeConsumptionAndAsk(dialogue, answerText, cell) {
  const restated = String(answerText ?? "").trim().replace(/[.?!]+$/, "");
  const first = restated.charAt(0).toLowerCase() + restated.slice(1);
  return `So you said: "${first}". Let me build on that. ${composeCellQuestion(dialogue, cell)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC STEERING — the operator's answer classifies mechanically, and the
// classification picks the NEXT move from the real Socratic transition
// pathways (the corpus arcs: consumption → question → refutation → aporia →
// midwifery). The wording is composed per-class in the human register — the
// move is chosen by where the conversation actually is, not a fixed script.
// ─────────────────────────────────────────────────────────────────────────────

/** Answer classes — mechanical, mutually exclusive in priority order. */
export const ANSWER_CLASSES = Object.freeze({
  CONVICTION: "conviction",      // nothing would change my mind
  NOT_KNOWING: "not-knowing",    // i don't know / can't think
  CIRCULAR: "circular",          // the claim is its own ground
  CONFIDENT: "confident",        // assertive, specific, offers grounds
  UNCERTAIN: "uncertain",        // i guess / maybe / probably / i think
  AGREEING: "agreeing",          // yes / right / true / exactly
  OTHER: "other",
});

const CONVICTION_RE = /\b(nothing|not\s+anything|nothing\s+would|wouldn'?t\s+change|don'?t think anything)\b.*\b(change\s+my\s+mind|reconsider|convince\s+me)\b|\b(change\s+my\s+mind|reconsider)\b.*\b(nothing|wouldn'?t)\b/;
const NOT_KNOWING_RE = /\b(i\s+don'?t\s+know|i\s+dont\s+know|can'?t\s+think\s+of\s+anything|no\s+idea|i\s+give\s+up|not\s+sure)\b/;
const CIRCULAR_RE = /\b(because\s+it\s+(is|'s)|it\s+just\s+is|it'?s\s+obvious|everyone\s+knows)\b/;
const CONFIDENT_RE = /[A-Za-z]{4,}/;
// "I think X" asserts X — confident. Real hedges only: i guess / maybe /
// probably / suppose / sort of / not really / i think so.
const UNCERTAIN_RE = /\b(i\s+guess|maybe|probably|suppose|somewhat|sort\s+of|not\s+really|i\s+think\s+so|i'm\s+not\s+sure)\b/;
// Agreement with or without a trailing confirmation: "yes", "yes, exactly",
// "yeah, right", "that's right", "exactly". Short turns only.
const AGREEING_RE = /^(yes|yeah|yep|right|true|exactly|correct|sure|okay|ok|definitely|i\s+agree|that'?s\s+right|fair\s+enough)[.,!]?\s*(exactly|right|true|yeah|sure)?\s*[.!]?\s*$/i;

/** Classify the operator's answer. Pure, mechanical. */
export function classifyAnswer(text) {
  const t = String(text ?? "").trim().toLowerCase();
  if (!t) return ANSWER_CLASSES.OTHER;
  if (CONVICTION_RE.test(t)) return ANSWER_CLASSES.CONVICTION;
  if (NOT_KNOWING_RE.test(t)) return ANSWER_CLASSES.NOT_KNOWING;
  if (CIRCULAR_RE.test(t)) return ANSWER_CLASSES.CIRCULAR;
  if (AGREEING_RE.test(t)) return ANSWER_CLASSES.AGREEING;
  if (UNCERTAIN_RE.test(t)) return ANSWER_CLASSES.UNCERTAIN;
  if (CONFIDENT_RE.test(t)) return ANSWER_CLASSES.CONFIDENT;
  return ANSWER_CLASSES.OTHER;
}

/** The next move, chosen by the answer class + the dialogue's current stage —
 *  the real transition pathways. Pure. */
export function nextMove(dialogue, answerClass) {
  const stage = dialogue?.stage;
  if (stage === "aporia") return "renew";
  switch (answerClass) {
    case ANSWER_CLASSES.CONVICTION: return "aporia";
    case ANSWER_CLASSES.NOT_KNOWING: return "midwifery";   // the arrival — offer to look together
    case ANSWER_CLASSES.CIRCULAR:    return "refutation";  // name the circle
    case ANSWER_CLASSES.AGREEING:    return "probe";       // agreement is a door, not a destination
    case ANSWER_CLASSES.UNCERTAIN:   return "question";    // gentle, deepen
    case ANSWER_CLASSES.CONFIDENT:   return "probe";       // test the confident ground
    default: return "question";
  }
}

/** Compose the move in the human register, weaving in the operator's own
 *  words. The move is chosen by where the conversation actually is. */
export function composeMove(dialogue, answerText, move, subject) {
  const t = subject || dialogue?.subject || "this claim";
  const restated = String(answerText ?? "").trim().replace(/[.?!]+$/, "");
  const first = restated.charAt(0).toLowerCase() + restated.slice(1);
  const probe = [
    `So you said: "${first}". Let me push on that a little — what would it take for that to be true, not just felt?`,
    `You said "${first}". I want to test that — what's the strongest thing that could count against it, and how would you answer it?`,
    `"${first}" — okay. And if someone showed you a case where that was false, what would you say back?`,
  ];
  const question = [
    `So you said: "${first}". That's a start — what sits underneath it? What would ${t} actually depend on?`,
    `"${first}" — go on. What else is part of it, or is that the whole ground?`,
  ];
  const refutation = [
    `Here's the thing — "${first}" is a circle: it gives ${t} itself as its own ground. What would make it stand from outside itself?`,
    `"${first}" — but that's the claim wearing a costume. What's the thing outside ${t} that would actually hold it up?`,
  ];
  const midwifery = [
    `"I don't know" is the realest thing we've said. Good — that's where it starts. Do you want to go look at what's actually been studied about ${t} together?`,
    `Not knowing is fine — it's the door. So what would actually count as ground for ${t}, if we went and looked together?`,
  ];
  const aporia = [
    `You've said nothing would change your mind on ${t}. Then it isn't a claim yet — it's a conviction. That's not a criticism of you; it's the truth about the claim: it isn't testable until something could count against it. So — what would, if it turned out to be true, make you reconsider?`,
    `If nothing could change your mind on ${t}, we're not examining a claim — we're holding a conviction. And I'd rather be honest with you than perform agreement. What's the one thing that would, if it were true, shake it?`,
  ];
  const renew = [
    `So — what would, if it turned out to be true, make you reconsider ${t}?`,
    `What's the one thing that, if it were true, would shake your position on ${t}?`,
  ];
  const pool = { probe, question, refutation, midwifery, aporia, renew }[move] || question;
  return pool[Math.floor(Math.random() * pool.length)];
}
