// logic-puzzle.js — knights-and-knaves, computed, never narrated.
//
// Live specimen this closes: a 5-archivist knight/knave puzzle, asked of
// gemma2:2b in two different surfaces of this instrument. In the-fold's own
// chat it hit `needsDecomposition` — five invented, disconnected section
// headings ("Establish the Identity of the Spy", "Determine the Ledger
// Location"…), one of which hallucinated "the White House has identified
// Donald J. Trump" out of nowhere. In eoreader7's TUI it free-narrated a
// step-by-step deduction that stalled mid-puzzle and, on the steps it did
// finish, reasoned about a Knight's OWN statement using the wrong polarity
// ("if A is a Knight... A's statement would be false, which contradicts
// the assumption that A is a Knight" — that isn't a contradiction, that IS
// the definition of a Knave, misapplied). Neither failure is a prompting
// problem. A knights-and-knaves puzzle is a closed boolean-consistency
// question over a small, enumerable space — arithmetic.js's own house rule
// (P2, "the model is just the mouth") applies exactly as it does to "17
// times 24": this instrument computes the answer by EXHAUSTIVE CHECK over
// every possible Knight/Knave assignment, never by narrated deduction.
//
// GROUNDED BY CONSTRUCTION, and AUDITABLE BY CONSTRUCTION: every one of the
// 2^n assignments is tried; a rejected assignment is rejected because a
// named statement, evaluated under it, disagrees with its speaker's own
// declared type — that pairing (assignment, statement, truth, consistent)
// is the whole audit trail, not a summary of one. A statement this module
// cannot parse into a Knight/Knave-typed claim (e.g. "the ledger is
// guarded by a Knave" — a claim ABOUT something outside the archivists'
// own types) is never silently dropped: it is named, kept apart from the
// consistency check, and disclosed as unresolved (P4: gaps are results).

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** A safety floor on how many speakers this brute-forces (2^n assignments) —
 * never hand-picked against a golden: 20 speakers is already 1,048,576
 * assignments, well past any real puzzle and still instant, so this is a
 * true ceiling, not a tuned one. */
const MAX_SPEAKERS = 20;

/**
 * Splits "A: "..." / "..." B: "..." ..." into { speakers, statements }.
 * A speaker mark is a single capital letter followed by a colon; everything
 * up to the next mark (or the end) is that speaker's turn, and every
 * double-quoted run inside it is one of their statements. Returns null when
 * fewer than two speakers are found — never a one-speaker "puzzle".
 */
export function parseArchivists(text) {
  const q = String(text ?? "");
  const markRe = /\b([A-Z]):\s*/g;
  const marks = [];
  let m;
  while ((m = markRe.exec(q))) marks.push({ letter: m[1], start: m.index, end: markRe.lastIndex });
  if (marks.length < 2) return null;
  const speakers = [];
  const statements = {};
  for (let i = 0; i < marks.length; i++) {
    const { letter, end } = marks[i];
    const stop = i + 1 < marks.length ? marks[i + 1].start : q.length;
    const segment = q.slice(end, stop);
    const quotes = [...segment.matchAll(/"([^"]+)"/g)].map((mm) => mm[1].trim()).filter(Boolean);
    if (!quotes.length) continue; // a stray "A:" with no quoted statement is not a speaker mark
    if (!speakers.includes(letter)) speakers.push(letter);
    statements[letter] = [...(statements[letter] ?? []), ...quotes];
  }
  if (speakers.length < 2 || speakers.length > MAX_SPEAKERS) return null;
  return { speakers, statements };
}

/**
 * One statement, parsed into a typed logical claim — a CLOSED grammar
 * (never a general English parser): a speaker's own type, a headcount, a
 * same/different-type pairing, or a "none of us" quantifier. Anything else
 * comes back `{ type: "unparsed", raw }`, named rather than guessed at.
 */
export function parseStatement(raw, speakers) {
  const s = String(raw ?? "").trim();
  let m;
  if ((m = /^([A-Z])\s+is\s+an?\s+(Knight|Knave)\.?$/i.exec(s))) {
    const who = m[1].toUpperCase();
    if (!speakers.includes(who)) return { type: "unparsed", raw: s };
    return { type: "isType", who, kind: m[2].toLowerCase() };
  }
  if ((m = /^none\s+of\s+us\s+(?:is|are)\s+an?\s*(Knight|Knave)s?\.?$/i.exec(s))) {
    return { type: "none", kind: m[1].toLowerCase() };
  }
  if ((m = /^exactly\s+(\w+)\s+of\s+us\s+(?:is|are)\s+Knight[s]?\.?$/i.exec(s))) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? (Number.isFinite(Number(m[1])) ? Number(m[1]) : null);
    if (n == null) return { type: "unparsed", raw: s };
    return { type: "count", n, kind: "knight" };
  }
  if ((m = /^exactly\s+(\w+)\s+of\s+us\s+(?:is|are)\s+Knave[s]?\.?$/i.exec(s))) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? (Number.isFinite(Number(m[1])) ? Number(m[1]) : null);
    if (n == null) return { type: "unparsed", raw: s };
    return { type: "count", n, kind: "knave" };
  }
  if ((m = /^([A-Z])\s+and\s+([A-Z])\s+are\s+the\s+same\s+type\.?$/i.exec(s))) {
    const a = m[1].toUpperCase(), b = m[2].toUpperCase();
    if (!speakers.includes(a) || !speakers.includes(b)) return { type: "unparsed", raw: s };
    return { type: "sameType", a, b };
  }
  if ((m = /^([A-Z])\s+and\s+([A-Z])\s+are\s+(?:different\s+types|not\s+the\s+same\s+type)\.?$/i.exec(s))) {
    const a = m[1].toUpperCase(), b = m[2].toUpperCase();
    if (!speakers.includes(a) || !speakers.includes(b)) return { type: "unparsed", raw: s };
    return { type: "diffType", a, b };
  }
  return { type: "unparsed", raw: s };
}

/** A parsed statement's truth value under one candidate assignment
 * (`{[letter]: boolean}`, true = Knight). `null` for an unparsed statement
 * — it is never evaluated, never silently treated as true or false. */
export function evaluateStatement(node, assignment) {
  switch (node.type) {
    case "isType": return assignment[node.who] === (node.kind === "knight");
    case "none": {
      const wantKnight = node.kind === "knight"; // "none ... is a Knight" refuses any true value
      return Object.values(assignment).every((v) => (wantKnight ? v === false : v === true));
    }
    case "count": {
      const knights = Object.values(assignment).filter(Boolean).length;
      return node.kind === "knight" ? knights === node.n : (Object.keys(assignment).length - knights) === node.n;
    }
    case "sameType": return assignment[node.a] === assignment[node.b];
    case "diffType": return assignment[node.a] !== assignment[node.b];
    default: return null;
  }
}

/**
 * Exhaustively tries every 2^n Knight/Knave assignment. A speaker's OWN
 * statements must all be true if they are a Knight and all false if they
 * are a Knave — the puzzle's one rule, applied mechanically, never
 * narrated. Returns every trial (the full audit trail), which assignments
 * are `valid` (consistent on every parseable statement), and the
 * statements this module could not type at all (`external`).
 */
export function solveKnightsKnaves({ speakers, statements }) {
  const parsed = {};
  const external = [];
  for (const who of speakers) {
    parsed[who] = (statements[who] ?? []).map((raw) => {
      const node = parseStatement(raw, speakers);
      if (node.type === "unparsed") external.push({ speaker: who, raw: node.raw });
      return node;
    });
  }
  const n = speakers.length;
  const total = 1 << n;
  const trials = [];
  const valid = [];
  for (let bits = 0; bits < total; bits++) {
    const assignment = {};
    speakers.forEach((who, i) => { assignment[who] = Boolean(bits & (1 << i)); });
    const detail = [];
    let ok = true;
    for (const who of speakers) {
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
  return { speakers, valid, trials, external, totalTried: total };
}

/** Claims a question only when it is genuinely shaped like this puzzle: at
 * least two lettered speakers each making a quoted statement, AND the
 * Knight/Knave vocabulary itself present — narrow on purpose, the same
 * discipline `detectArithmetic` already holds for a bare numeric
 * expression. Never claims a question with no Knight/Knave words at all,
 * whatever its punctuation looks like. */
export function detectLogicPuzzle(question) {
  const q = String(question ?? "");
  if (!/\bKnight\b/i.test(q) || !/\bKnave\b/i.test(q)) return null;
  const parsed = parseArchivists(q);
  if (!parsed) return null;
  const anyParseable = parsed.speakers.some((who) =>
    (parsed.statements[who] ?? []).some((raw) => parseStatement(raw, parsed.speakers).type !== "unparsed"));
  if (!anyParseable) return null;
  return { kind: "logic-puzzle", ...parsed };
}

const nameOf = (letter) => letter; // archivists are addressed by their own letter throughout

/**
 * Computed, not generated: solves and renders. `display` states the
 * exhaustive-search posture plainly, names the (usually unique) consistent
 * assignment, and discloses — by name, never by omission — any statement
 * this module could not type at all.
 */
export function checkLogicPuzzle(question) {
  const found = detectLogicPuzzle(question);
  if (!found) return null;
  const solved = solveKnightsKnaves(found);
  const { speakers, valid, external, totalTried } = solved;
  let display;
  if (valid.length === 1) {
    const roles = speakers.map((who) => `${nameOf(who)}: ${valid[0][who] ? "Knight" : "Knave"}`).join(" · ");
    display = `Checked all ${totalTried} possible Knight/Knave assignments for ${speakers.join(", ")}; exactly one is self-consistent (every statement a Knight makes is true, every statement a Knave makes is false):\n${roles}\n— computed by exhaustive check, not narrated.`;
  } else if (valid.length === 0) {
    display = `Checked all ${totalTried} possible Knight/Knave assignments for ${speakers.join(", ")}; none is self-consistent — as parsed, the statements contradict each other and this puzzle has no solution.`;
  } else {
    const options = valid.map((a) => speakers.map((who) => `${who}:${a[who] ? "K" : "k"}`).join(" ")).join("  |  ");
    display = `Checked all ${totalTried} possible Knight/Knave assignments for ${speakers.join(", ")}; ${valid.length} are self-consistent (the puzzle as parsed underdetermines it): ${options}`;
  }
  if (external.length) {
    const named = external.map((e) => `${e.speaker}: "${e.raw}"`).join(" · ");
    display += `\n${external.length} statement(s) refer to something outside the archivists' own Knight/Knave types and were not used to decide this: ${named} — whatever established those facts is not something this puzzle text (as given) states.`;
  }
  return { ...found, valid, external, totalTried, display, tex: null };
}
