// aristotle.js — one general mechanical-reasoning organ, never another
// puzzle-shaped module.
//
// THE RETIRED APPROACH, NAMED SO IT ISN'T RETRIED. `logic-puzzle.js` solved
// Knights-and-Knaves as its own bespoke file; the next riddle (bat-and-ball,
// or the one after that) would have become a THIRD bespoke file, forever —
// exactly the failure mode arithmetic.js's own P2 ("the model is just the
// mouth") was supposed to generalize past. This file replaces it with one
// shape and two solvers for that shape, not two modules.
//
// THE ONE SHAPE. A question states some UNKNOWNS and some RELATIONS between
// them, and asks for a value. An unknown is either:
//   DISCRETE — a small, closed set of possible values (a Knight/Knave puzzle
//     archivist has exactly 2: truth-teller or liar), solved by brute-force
//     enumeration of every combination, keeping only the ones where every
//     stated relation holds — this IS Knights-and-Knaves, now just the
//     discrete case of the one shape, not a special module for it.
//   CONTINUOUS — a real number (a price, a count), solved algebraically from
//     the stated linear relations (sum, difference) — this is bat-and-ball,
//     the SAME shape, a different solver for the SAME "unknowns + relations"
//     structure.
// Extraction is still a CLOSED GRAMMAR, never a general parser (this file's
// own honest limit, same as arithmetic.js's) — but the grammar produces a
// shape (unknowns, relations) that either solver can consume, rather than
// each puzzle type owning its own end-to-end pipeline.
//
// checkMechanicalReasoning(text, opts) tries every solver in one call. A
// caller (proxy.mjs, app.js) makes ONE call, not a growing `??` chain of
// puzzle modules.

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Strip a trailing plural "s" (and "ies" -> "y") — a real English parser is
 * out of scope for a closed-grammar door; this covers every rule sentence a
 * real puzzle actually phrases ("Knights"/"Truth-tellers"/"Liars"/"Sages"). */
const singularize = (w) => (/[a-z]ies$/i.test(w) ? w.replace(/ies$/i, "y") : w.replace(/s$/i, ""));

// ── the discrete solver: N small-domain unknowns, statements as relations ──
//
// Generalizes past the literal words "Knight"/"Knave": a puzzle's own type
// pair is DECLARED in its text ("Truth-tellers always tell the truth, and
// Liars always lie."), or defaults to Knight/Knave when that vocabulary is
// present instead. The internal representation is always a boolean per
// unknown (does this one hold the "truth-telling" value); only the parse
// boundary and the final display ever see the puzzle's own words.

const DEFAULT_TYPES = Object.freeze({ truthWord: "Knight", lieWord: "Knave" });

/**
 * detectTypeWords(text) — the puzzle's OWN declared type-pair, if it states
 * one. Never a general English parser — one narrow sentence shape,
 * singularized so it matches the per-speaker "X is a <Type>." statements
 * the same puzzle uses. Returns null when no such rule sentence is present.
 */
export function detectTypeWords(text) {
  const q = String(text ?? "");
  const m = /\b([A-Za-z][A-Za-z-]*)\s+(?:always\s+)?tells?\s+the\s+truth\b[^.]{0,60}?\b([A-Za-z][A-Za-z-]*)\s+(?:always\s+)?lies?\b/i.exec(q);
  if (!m) return null;
  const truthWord = singularize(m[1]), lieWord = singularize(m[2]);
  if (!truthWord || !lieWord || truthWord.toLowerCase() === lieWord.toLowerCase()) return null;
  return { truthWord, lieWord };
}

/** A safety floor on how many unknowns this brute-forces (2^n combinations)
 * — never hand-picked against a golden: 20 unknowns is already 1,048,576
 * combinations, well past any real puzzle and still instant, so this is a
 * true ceiling, not a tuned one. */
const MAX_UNKNOWNS = 20;

/**
 * Splits "A: "..." / "..." B: "..." ..." into { unknowns, statements}. An
 * unknown mark is a single capital letter followed by a colon; everything up
 * to the next mark (or the end) is that unknown's turn, and every
 * double-quoted run inside it is one of its statements. Returns null when
 * fewer than two unknowns are found — never a one-unknown "puzzle".
 */
export function parseSpeakers(text) {
  const q = String(text ?? "");
  const markRe = /\b([A-Z]):\s*/g;
  const marks = [];
  let m;
  while ((m = markRe.exec(q))) marks.push({ letter: m[1], start: m.index, end: markRe.lastIndex });
  if (marks.length < 2) return null;
  const unknowns = [];
  const statements = {};
  for (let i = 0; i < marks.length; i++) {
    const { letter, end } = marks[i];
    const stop = i + 1 < marks.length ? marks[i + 1].start : q.length;
    const segment = q.slice(end, stop);
    const quotes = [...segment.matchAll(/"([^"]+)"/g)].map((mm) => mm[1].trim()).filter(Boolean);
    if (!quotes.length) continue; // a stray "A:" with no quoted statement is not an unknown mark
    if (!unknowns.includes(letter)) unknowns.push(letter);
    statements[letter] = [...(statements[letter] ?? []), ...quotes];
  }
  if (unknowns.length < 2 || unknowns.length > MAX_UNKNOWNS) return null;
  return { unknowns, statements };
}

/**
 * One statement, parsed into a typed logical claim — a CLOSED grammar
 * (never a general English parser): an unknown's own value, a headcount, a
 * same/different pairing, or a "none of us" quantifier. Anything else comes
 * back `{ type: "unparsed", raw }`, named rather than guessed at.
 *
 * Internally every node carries `kind: "truth"|"lie"` regardless of the
 * puzzle's own vocabulary — only the parse and the final display translate
 * to/from the puzzle's own declared type words.
 */
export function parseStatement(raw, unknowns, types = DEFAULT_TYPES) {
  const s = String(raw ?? "").trim();
  const T = escapeRegex(types.truthWord), L = escapeRegex(types.lieWord);
  let m;
  if ((m = new RegExp(`^([A-Z])\\s+is\\s+an?\\s+(${T}|${L})\\.?$`, "i").exec(s))) {
    const who = m[1].toUpperCase();
    if (!unknowns.includes(who)) return { type: "unparsed", raw: s };
    return { type: "isValue", who, kind: m[2].toLowerCase() === types.truthWord.toLowerCase() ? "truth" : "lie" };
  }
  if ((m = new RegExp(`^none\\s+of\\s+us\\s+(?:is|are)\\s+an?\\s*(${T}|${L})s?\\.?$`, "i").exec(s))) {
    return { type: "none", kind: m[1].toLowerCase() === types.truthWord.toLowerCase() ? "truth" : "lie" };
  }
  if ((m = new RegExp(`^exactly\\s+(\\w+)\\s+of\\s+us\\s+(?:is|are)\\s+(?:an?\\s+)?${T}s?\\.?$`, "i").exec(s))) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? (Number.isFinite(Number(m[1])) ? Number(m[1]) : null);
    if (n == null) return { type: "unparsed", raw: s };
    return { type: "count", n, kind: "truth" };
  }
  if ((m = new RegExp(`^exactly\\s+(\\w+)\\s+of\\s+us\\s+(?:is|are)\\s+(?:an?\\s+)?${L}s?\\.?$`, "i").exec(s))) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? (Number.isFinite(Number(m[1])) ? Number(m[1]) : null);
    if (n == null) return { type: "unparsed", raw: s };
    return { type: "count", n, kind: "lie" };
  }
  if ((m = /^([A-Z])\s+and\s+([A-Z])\s+are\s+the\s+same\s+type\.?$/i.exec(s))) {
    const a = m[1].toUpperCase(), b = m[2].toUpperCase();
    if (!unknowns.includes(a) || !unknowns.includes(b)) return { type: "unparsed", raw: s };
    return { type: "sameValue", a, b };
  }
  if ((m = /^([A-Z])\s+and\s+([A-Z])\s+are\s+(?:different\s+types|not\s+the\s+same\s+type)\.?$/i.exec(s))) {
    const a = m[1].toUpperCase(), b = m[2].toUpperCase();
    if (!unknowns.includes(a) || !unknowns.includes(b)) return { type: "unparsed", raw: s };
    return { type: "diffValue", a, b };
  }
  return { type: "unparsed", raw: s };
}

/** A parsed statement's truth value under one candidate assignment
 * (`{[letter]: boolean}`, true = "truth" value). `null` for an unparsed
 * statement — it is never evaluated, never silently treated as true or
 * false. */
export function evaluateStatement(node, assignment) {
  switch (node.type) {
    case "isValue": return assignment[node.who] === (node.kind === "truth");
    case "none": {
      const wantTruth = node.kind === "truth"; // "none ... is <truth-value>" refuses any true value
      return Object.values(assignment).every((v) => (wantTruth ? v === false : v === true));
    }
    case "count": {
      const truths = Object.values(assignment).filter(Boolean).length;
      return node.kind === "truth" ? truths === node.n : (Object.keys(assignment).length - truths) === node.n;
    }
    case "sameValue": return assignment[node.a] === assignment[node.b];
    case "diffValue": return assignment[node.a] !== assignment[node.b];
    default: return null;
  }
}

/**
 * Exhaustively tries every 2^n discrete assignment. An unknown's OWN
 * statements must all be true under the "truth" value and all false under
 * the "lie" value — the puzzle's one rule, applied mechanically, never
 * narrated. Returns every trial (the full audit trail), which assignments
 * are `valid` (consistent on every parseable statement), and the statements
 * this module could not type at all (`external`).
 */
export function solveDiscrete({ unknowns, statements, types = DEFAULT_TYPES }) {
  const parsed = {};
  const external = [];
  for (const who of unknowns) {
    parsed[who] = (statements[who] ?? []).map((raw) => {
      const node = parseStatement(raw, unknowns, types);
      if (node.type === "unparsed") external.push({ speaker: who, raw: node.raw });
      return node;
    });
  }
  const n = unknowns.length;
  const total = 1 << n;
  const trials = [];
  const valid = [];
  for (let bits = 0; bits < total; bits++) {
    const assignment = {};
    unknowns.forEach((who, i) => { assignment[who] = Boolean(bits & (1 << i)); });
    const detail = [];
    let ok = true;
    for (const who of unknowns) {
      for (const node of parsed[who]) {
        if (node.type === "unparsed") continue; // never evaluated — see `external`
        const truth = evaluateStatement(node, assignment);
        const consistent = assignment[who] === truth;
        detail.push({ speaker: who, node, truth, consistent });
        if (!consistent) ok = false;
      }
    }
    trials.push({ assignment: { ...assignment }, ok, detail });
    if (ok) valid.push({ ...assignment });
  }
  return { unknowns, valid, trials, external, totalTried: total };
}

/** Claims a question only when it is genuinely shaped like this: at least
 * two lettered unknowns each making a quoted statement, AND a
 * truth-teller/liar type-pair present — narrow on purpose, the same
 * discipline `detectArithmetic` already holds for a bare numeric
 * expression. The literal words "Knight"/"Knave" are the default and always
 * work; `detectTypeWords` additionally claims any OTHER puzzle that states
 * its own rule — same engine underneath, whatever the puzzle calls its two
 * values. Never claims a question with neither vocabulary present. */
export function detectDiscreteConstraints(question) {
  const q = String(question ?? "");
  const hasKnightKnave = /\bKnights?\b/i.test(q) && /\bKnaves?\b/i.test(q);
  const types = hasKnightKnave ? DEFAULT_TYPES : detectTypeWords(q);
  if (!types) return null;
  const parsed = parseSpeakers(q);
  if (!parsed) return null;
  const anyParseable = parsed.unknowns.some((who) =>
    (parsed.statements[who] ?? []).some((raw) => parseStatement(raw, parsed.unknowns, types).type !== "unparsed"));
  if (!anyParseable) return null;
  return { kind: "discrete-constraints", ...parsed, types };
}

/**
 * Computed, not generated: solves and renders. `display` states the
 * exhaustive-search posture plainly, names the (usually unique) consistent
 * assignment, and discloses — by name, never by omission — any statement
 * this module could not type at all.
 */
export function checkDiscreteConstraints(question) {
  const found = detectDiscreteConstraints(question);
  if (!found) return null;
  const solved = solveDiscrete(found);
  const { unknowns, valid, external, totalTried } = solved;
  const { truthWord: T, lieWord: L } = found.types;
  const pair = `${T}/${L}`;
  let display;
  if (valid.length === 1) {
    const roles = unknowns.map((who) => `${who}: ${valid[0][who] ? T : L}`).join(" · ");
    display = `Checked all ${totalTried} possible ${pair} assignments for ${unknowns.join(", ")}; exactly one is self-consistent (every statement a ${T} makes is true, every statement a ${L} makes is false):\n${roles}\n— computed by exhaustive check, not narrated.`;
  } else if (valid.length === 0) {
    display = `Checked all ${totalTried} possible ${pair} assignments for ${unknowns.join(", ")}; none is self-consistent — as parsed, the statements contradict each other and this puzzle has no solution.`;
  } else {
    const options = valid.map((a) => unknowns.map((who) => `${who}:${a[who] ? T[0] : L[0].toLowerCase()}`).join(" ")).join("  |  ");
    display = `Checked all ${totalTried} possible ${pair} assignments for ${unknowns.join(", ")}; ${valid.length} are self-consistent (the puzzle as parsed underdetermines it): ${options}`;
  }
  if (external.length) {
    const named = external.map((e) => `${e.speaker}: "${e.raw}"`).join(" · ");
    display += `\n${external.length} statement(s) refer to something outside the ${pair} types and were not used to decide this: ${named} — whatever established those facts is not something this puzzle text (as given) states.`;
  }
  return { ...found, valid, external, totalTried, display, tex: null };
}

// ── the continuous solver: N numeric unknowns, sum/difference relations ────
//
// The bat-and-ball shape: two named quantities, a stated total and a stated
// difference — solved exactly by algebra (y=(total-diff)/2, x=(total+diff)/2)
// rather than the model attempting mental arithmetic on the WRONG
// intuition (the classic "$0.10" answer, which ignores the stated
// difference and just splits the total in half).

/**
 * detectLinearRelations(text) — two named items, a stated combined total,
 * and a stated difference between them. A CLOSED grammar (two sentence
 * shapes), never a general word-problem parser. Returns
 * `{ itemA, itemB, total, difference }` (itemA is the more expensive one,
 * matching how "X costs $N more than Y" is phrased) or null.
 */
export function detectLinearRelations(text) {
  const q = String(text ?? "");
  const totalM = /\ban?\s+([a-z][a-z\s-]*?)\s+and\s+an?\s+([a-z][a-z\s-]*?)\s+(?:together\s+)?cost[s]?\s+\$?([\d.]+)(?:\s+in\s+total)?\b/i.exec(q);
  if (!totalM) return null;
  const diffM = /\bthe\s+([a-z][a-z\s-]*?)\s+costs?\s+\$?([\d.]+)\s+more\s+than\s+the\s+([a-z][a-z\s-]*?)\b/i.exec(q);
  if (!diffM) return null;
  const norm = (s) => s.trim().toLowerCase().replace(/\.$/, "");
  const [itemA1, itemB1] = [norm(totalM[1]), norm(totalM[2])];
  const [pricier, diffStr, cheaper] = [norm(diffM[1]), diffM[2], norm(diffM[3])];
  const total = Number(totalM[3]), difference = Number(diffStr);
  if (!Number.isFinite(total) || !Number.isFinite(difference)) return null;
  // The two items named in the difference sentence must be the same two
  // named in the total sentence — never guessed at if they don't match.
  const sameSet = new Set([itemA1, itemB1]);
  if (!sameSet.has(pricier) || !sameSet.has(cheaper) || pricier === cheaper) return null;
  return { itemA: pricier, itemB: cheaper, total, difference };
}

/**
 * checkLinearRelations(question, opts) — solves the exact 2x2 linear system
 * (x+y=total, x-y=difference) and reports both values; if the question's
 * own final clause names one of the two items, that value alone is
 * highlighted as the answer — never guessed when it doesn't.
 */
export function checkLinearRelations(question) {
  const found = detectLinearRelations(question);
  if (!found) return null;
  const { itemA, itemB, total, difference } = found;
  const priceA = (total + difference) / 2; // the pricier item
  const priceB = (total - difference) / 2; // the cheaper item
  if (priceB < 0) return null; // an impossible relation — never forced to an answer
  const money = (n) => `$${n.toFixed(2)}`;
  const askedFor = (() => {
    const q = question.toLowerCase();
    const lastClause = q.split(/[?.]/).filter(Boolean).pop() ?? q;
    if (lastClause.includes(itemB)) return itemB;
    if (lastClause.includes(itemA)) return itemA;
    return null;
  })();
  let display = `Solved exactly: the ${itemA} + the ${itemB} = ${money(total)}, and the ${itemA} costs ${money(difference)} more than the ${itemB} — two linear relations, two unknowns:\nthe ${itemA} costs ${money(priceA)} · the ${itemB} costs ${money(priceB)}\n— computed by solving the stated relations exactly, not estimated.`;
  if (askedFor) {
    const answer = askedFor === itemA ? priceA : priceB;
    display += `\nThe question asks for the ${askedFor}: ${money(answer)}.`;
  }
  return { kind: "linear-relations", itemA, itemB, total, difference, priceA, priceB, askedFor, display };
}

// ── the one dispatcher every caller uses ───────────────────────────────────

/**
 * checkMechanicalReasoning(question, opts) — the one call a caller makes.
 * Tries every solver this file has for the ONE shape (unknowns + stated
 * relations); returns the first that claims the question, or null if none
 * does (in which case the question is genuinely open-ended and belongs to
 * the model, never forced through a mechanism that doesn't fit it).
 */
export function checkMechanicalReasoning(question, opts = {}) {
  return checkDiscreteConstraints(question) ?? checkLinearRelations(question, opts);
}
