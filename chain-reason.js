// chain-reason.js — the model reasoning ALONG the dependency order (P149).
//
// User, 2026-09-06: "have we really experimented with reasoning that uses
// both the dependency order reasoning and the model?"
//
// No. Until this file, the two ran in opposition and in sequence. The
// mechanical doors answered first; failing that the model drafted ONCE with
// everything in the prompt; then the chain cut what it was allowed to keep.
// The dependency order was used as a CONSTRAINT applied after the model spoke
// (turn-order.js::admissible) and as a CONDITIONING STRUCTURE for a
// probability (prequential.js). The model never reasoned along it.
//
// A frontier model does chain-of-thought by emitting tokens that resemble
// steps: nothing is conditioned on anything, and the "steps" are a story told
// after the fact. This walks the cube's real dependency order instead, one
// narrow model call per cell, and — the part that makes it different in kind
// — WHAT PASSES FORWARD IS THE CHECKED FINDING, NOT THE PROSE. A cell's
// output is verified against the material before the next cell may condition
// on it, so a link that cannot be established stops the chain rather than
// being carried along as plausible-sounding context.
//
// Three rules, each of which the one-shot draft cannot follow:
//
//   1. EVERY CELL IS CHECKED BEFORE THE NEXT ONE RUNS. An unverified answer
//      never becomes a premise. In the one-shot arm every check happens after
//      the whole answer exists, by which time a false subject has already
//      shaped every sentence.
//   2. A CELL THAT CANNOT BE ESTABLISHED ENDS THE CHAIN with a typed null,
//      and the typed null IS the answer. "The subject resolves to no
//      referent" is a finding, not a failure to produce one.
//   3. ADDRESSES PASS FORWARD, NOT TEXT (holonic objects in slots). A later
//      cell receives the spans an earlier cell established, so the material
//      is never restated into the prompt and cannot drift on restatement.
//
// ── THE DIVISION OF LABOUR, AND IT IS KANT'S ─────────────────────────────
//
// User, 2026-09-06: "the mechanics for the logic and the model does non
// logical ideating. I think Kant would approve."
//
// The model supplies INTUITIONS — the manifold: what is this, what does the
// text say, which of these is about that. The chain supplies the CATEGORIES —
// the forms under which any of it can be judged: existence, incidence,
// necessity, what binds what. Concepts without intuitions are empty;
// intuitions without concepts are blind. Neither half is asked to do the
// other's work.
//
// Concretely, and this is enforced below rather than promised: the model is
// only ever asked to NAME, QUOTE, LIST, or CHOOSE FROM A GIVEN SET. It is
// never asked whether something follows, whether a claim is true, whether it
// is right, or why. Every "therefore" in this file is a line of code. That is
// the whole difference from a frontier model's chain-of-thought, where the
// therefores are also tokens the model emitted and no one checked.
//
// `IDEATING_ONLY` is the wall. An ask that puts an inferential question to
// the model is refused before it is sent, so the division cannot erode by
// someone later writing a slightly more convenient prompt.
// `splitSentences` is INJECTED, as everywhere else here: the sentence
// splitter is the engine's, and a module that imported its own would be
// reading the material by a different rule than the checks do.

/** The cells this walks, in the cube's order. NUL and SEG take no model call — nothing to ask. */
export const CELLS = Object.freeze(["NUL", "SIG", "INS", "CON", "DEF"]);

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (t) => fold(t).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

/**
 * THE WALL (P149). The model ideates; it does not infer. An ask carrying an
 * inferential move is refused before it is sent — not warned about, refused,
 * because the division is the experiment and a prompt that quietly crosses it
 * makes the arm measure nothing.
 *
 * Refused: therefore, follows, imply, conclude, deduce, infer, prove, because,
 * whether it is true/correct/right, why. Allowed: name, quote, list, which of
 * these, what does it say.
 */
const INFERENTIAL = /\b(therefore|thus|hence|follow|follows|imply|implies|conclude|deduce|infer|prove|reason(?:ing)? (?:that|why)|is (?:it|this) (?:true|correct|right|valid)|do you (?:think|believe|agree)|explain why|justify)\b/i;

export function ideatingOnly(ask) {
  const m = String(ask ?? "").match(INFERENTIAL);
  if (m) throw new Error(`chain-reason: this cell asked the model to infer ("${m[0]}"). The model ideates; the chain does the logic. Ask it to name, quote, list, or choose.`);
  return ask;
}

/** A step's record: what was asked, what came back, what the material said about it. */
const step = (cell, asked, said, verdict, detail) => ({ cell, asked, said, verdict, detail });

/**
 * NUL · Existence — is there material at all? No model call: there is nothing
 * to ask. An empty ground is `empty_material` and the walk ends there.
 */
export function nul(passages = []) {
  const real = (passages ?? []).filter((p) => String(p?.text ?? "").trim());
  return real.length
    ? { ok: true, passages: real, ...step("NUL", null, null, "material", `${real.length} passage(s) in hand`) }
    : { ok: false, ...step("NUL", null, null, "empty_material", "nothing was retrieved, so nothing can be established") };
}

/**
 * SIG · Existence — what does the question refer to, and is it here?
 *
 * The model NAMES the subject; the material decides whether it exists. A
 * subject the passages never mention is `beyond-reach`, and that ends the
 * walk: every later cell would be conditioning on a referent that is not
 * there, which is precisely how a one-shot draft invents a whole answer
 * around a name it was handed.
 */
export function checkSubject(named, passages) {
  const cands = String(named ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const found = [];
  for (const c of cands) {
    const ws = words(c);
    if (!ws.length) continue;
    const hit = passages.find((p) => { const t = fold(p.text); return ws.every((w) => t.includes(w)); })
      ?? passages.find((p) => { const t = fold(p.text); return ws.some((w) => w.length > 4 && t.includes(w)); });
    if (hit) found.push({ name: c, ref: hit.ref });
  }
  return found.length
    ? { ok: true, subjects: found, ...step("SIG", "what does this ask about", named, "resolved", found.map((f) => `${f.name} → ${f.ref}`).join("; ")) }
    : { ok: false, subjects: [], ...step("SIG", "what does this ask about", named, "beyond-reach", `nothing read mentions ${cands.join(", ") || "any subject"}`) };
}

/**
 * INS · Generation — what does the material SAY about that subject?
 *
 * The model quotes; the material verifies. A quotation that is not in the
 * passages verbatim does not pass, and nothing downstream may use it. This is
 * the cell where a one-shot draft's paraphrase-that-drifts becomes an
 * unbacked sentence twenty words later.
 */
export function checkQuotes(quoted, passages, { splitSentences } = {}) {
  const lines = String(quoted ?? "").split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter((l) => l.length > 12);
  const established = [], refused = [];
  for (const line of lines.slice(0, 6)) {
    const needle = fold(line).replace(/\s+/g, " ");
    const hit = passages.find((p) => fold(p.text).replace(/\s+/g, " ").includes(needle));
    if (hit) { established.push({ text: line, ref: hit.ref }); continue; }
    // A near miss is still a miss, but the sentence it came closest to is the
    // useful thing to carry: it is what the material actually says.
    const near = splitSentences ? nearest(line, passages, splitSentences) : null;
    refused.push({ said: line, ...(near ? { material: near } : {}) });
  }
  return { ok: established.length > 0, established, refused,
    ...step("INS", "quote what the sources say", quoted, established.length ? "established" : "unverified",
      `${established.length} of ${lines.length} quotation(s) are in the material verbatim`) };
}

function nearest(line, passages, splitSentences) {
  const ws = new Set(words(line));
  let best = null, bestScore = 0;
  // The engine's splitter returns SPANS, not strings — a sentence carries its
  // own offset, which is what makes an address possible at all.
  for (const p of passages) for (const s of splitSentences(p.text ?? "")) {
    const text = String(s?.text ?? s);
    const sw = words(text); if (!sw.length) continue;
    const share = sw.filter((w) => ws.has(w)).length / sw.length;
    if (share > bestScore) { bestScore = share; best = { text: text.trim(), ref: p.ref }; }
  }
  return bestScore >= 0.5 ? best : null;
}

/**
 * CON · Structure — which of what survived actually bears on the question?
 *
 * The model selects from the ESTABLISHED set by index; it cannot introduce
 * anything, because the only thing it may return is a number. This is the
 * cell where the fold's silent dropping of non-bearing passages (P142) turns
 * into a recorded decision.
 */
export function checkSelection(picked, established) {
  const idx = [...String(picked ?? "").matchAll(/\d+/g)].map((m) => Number(m[0]) - 1)
    .filter((i) => i >= 0 && i < established.length);
  const chosen = [...new Set(idx)].map((i) => established[i]);
  const dropped = established.filter((e) => !chosen.includes(e));
  return chosen.length
    ? { ok: true, chosen, dropped, ...step("CON", "which of these bear on the question", picked, "borne", `${chosen.length} bear, ${dropped.length} read and set aside`) }
    : { ok: false, chosen: [], dropped: established,
        ...step("CON", "which of these bear on the question", picked, "no_incidence", `${established.length} established, none bearing on what was asked`) };
}

/**
 * DEF · Interpretation — the answer, composed from what the walk ESTABLISHED
 * and from nothing else.
 *
 * The model writes prose here, which is ideation of the plainest kind: it is
 * putting established findings into English. It is handed the findings as
 * ADDRESSED SPANS (holonic slots) rather than as restated material, so there
 * is nothing in its prompt to drift from — the bytes it is arranging are the
 * bytes the material carries, already checked at INS and already selected at
 * CON. What it may not do is add a claim, and that is checked mechanically
 * afterwards, not asked of it.
 */
export function composeAsk(question, chosen) {
  const slots = chosen.map((c, i) => `(${i + 1}) "${c.text}"  — ${c.ref}`).join("\n");
  return ideatingOnly(
    `Answer this question using only the sentences below, which are the exact words of the sources.\n\n` +
    `Question: ${question}\n\nThe sentences:\n${slots}\n\n` +
    `Write two or three sentences of plain English. Name the source address after anything you take from it. Say nothing the sentences above do not say.`,
  );
}

/** The asks each cell puts to the model. Every one of them names, quotes or chooses; none of them infers. */
export const ASKS = Object.freeze({
  SIG: (question) => ideatingOnly(`What person, place, thing or term does this question ask about? Reply with the name only, nothing else.\n\nQuestion: ${question}`),
  INS: (subject, passages) => ideatingOnly(
    `Below are passages from the sources. Copy out, word for word, any sentence that mentions ${subject}. ` +
    `Copy exactly — do not summarise or rephrase. One sentence per line. If none mentions it, reply: none.\n\n` +
    passages.map((p) => p.text).join("\n\n")),
  CON: (question, established) => ideatingOnly(
    `Question: ${question}\n\nNumbered sentences:\n` +
    established.map((e, i) => `${i + 1}. ${e.text}`).join("\n") +
    `\n\nWhich of these numbers are about what the question asks? Reply with the numbers only, separated by commas. If none, reply: none.`),
});

/** The typed nulls this walk can end on, each of which IS an answer. */
export const ENDINGS = Object.freeze({
  empty_material: "Nothing was retrieved, so there is nothing to answer from.",
  "beyond-reach": "Nothing in the sources mentions what this asks about.",
  unverified: "Nothing that could be quoted from the sources survived checking against them.",
  no_incidence: "The sources speak, but nothing they say bears on what was asked.",
});

/** The sentence the walk ends on when a cell could not be established — the finding, said plainly, with what was checked. */
export function endingFor(steps) {
  const last = steps[steps.length - 1];
  const base = ENDINGS[last?.verdict] ?? "Nothing here settles this.";
  return last?.detail ? `${base} (${last.detail})` : base;
}

/**
 * THE WALK. One narrow model call per cell, each checked before the next runs.
 *
 * `ask(prompt)` is the caller's model. Returns the answer and the full record
 * of what each cell established — which is the point: a one-shot draft can be
 * scored but it cannot be inspected, because there is nowhere in it that a
 * particular claim was decided.
 *
 * A cell that cannot be established ENDS THE WALK and its typed null becomes
 * the answer. That is not a failure path; it is the honest one, and it is
 * reached without ever having drafted prose around a subject that is not there.
 */
export async function walk({ question, passages = [], ask, splitSentences } = {}) {
  if (typeof ask !== "function") throw new TypeError("chain-reason.walk: the model is injected as ask(prompt)");
  const steps = [];
  let calls = 0;
  const say = async (prompt) => { calls += 1; return String(await ask(ideatingOnly(prompt)) ?? "").trim(); };

  // NUL — no model call: there is nothing to ask about nothing.
  const n = nul(passages);
  steps.push(n);
  if (!n.ok) return { text: endingFor(steps), steps, calls, ended: "NUL" };

  // SIG — the model names; the material decides whether it is there.
  const named = await say(ASKS.SIG(question));
  const sig = checkSubject(named, n.passages);
  steps.push(sig);
  if (!sig.ok) return { text: endingFor(steps), steps, calls, ended: "SIG" };

  // INS — the model quotes; the material verifies verbatim.
  const quoted = await say(ASKS.INS(sig.subjects.map((s) => s.name).join(" or "), n.passages));
  const ins = checkQuotes(quoted, n.passages, { splitSentences });
  steps.push(ins);
  if (!ins.ok) return { text: endingFor(steps), steps, calls, ended: "INS" };

  // CON — the model chooses from what survived, by number, and can add nothing.
  const picked = await say(ASKS.CON(question, ins.established));
  const con = checkSelection(picked, ins.established);
  steps.push(con);
  if (!con.ok) return { text: endingFor(steps), steps, calls, ended: "CON" };

  // DEF — the answer, arranged from established spans handed over as slots.
  const text = await say(composeAsk(question, con.chosen));
  steps.push(step("DEF", "put these into plain English", text, "composed", `${con.chosen.length} established span(s)`));
  return { text, steps, calls, ended: null, established: con.chosen, setAside: con.dropped };
}

// ── THE GROUND PROCEDURE (P151) ────────────────────────────────────────────
//
// The walk above is a FIGURE procedure: resolve a named thing, quote what
// mentions it, answer about it. Measured (P150), 283 of 869 real turns asked
// a GROUND-grained question — "tell me more", "what else", "summarise" — and
// got figure treatment, failing at 62% against Figure's 39%.
//
// A Ground question names nothing, so asking the model to name its subject is
// the worst possible first move: that is the cell where it answered "Buddha".
// There is no figure to find. The question is about the EXTENT.
//
// So the cells are different, and that is the whole point of the third face:
//
//   NUL · Ground   is there an extent at all
//   SEG · Ground   → terrain FIELD, stance CLEARING: bound it. Which sources,
//                    which addresses, how much — mechanically, no model.
//   INS · Ground   → the model copies out what the extent carries. Ideating:
//                    quote, do not summarise. Checked verbatim, as ever.
//   DEF · Ground   → the answer states the extent, what it carries, AND what
//                    is not in it — the VOID terrain (Existence · Ground) is
//                    part of the answer to a Ground question, not a failure
//                    of it.
//
// The last is the part a one-shot draft structurally cannot do: asked to
// "tell me more", it has no way to say how much more there is, because
// nothing told it what it was holding.

/** SEG · Ground — the extent, bounded mechanically. No model call: this is arithmetic over addresses. */
export function bound(passages = []) {
  const bySource = new Map();
  for (const p of passages) {
    const src = String(p?.ref ?? "").split("#")[0] || "(unaddressed)";
    const g = bySource.get(src) ?? { source: src, refs: [], chars: 0 };
    g.refs.push(p.ref); g.chars += String(p?.text ?? "").length;
    bySource.set(src, g);
  }
  const sources = [...bySource.values()];
  return {
    ok: sources.length > 0, sources,
    chars: sources.reduce((s, x) => s + x.chars, 0),
    ...step("SEG", null, null, sources.length ? "bounded" : "empty_material",
      sources.length
        ? `${passages.length} passage(s) from ${sources.length} source(s): ${sources.map((s) => `${s.source} (${s.refs.length})`).join(", ")}`
        : "there is no extent to bound"),
  };
}

/**
 * The extent, said plainly — and what is NOT in it.
 *
 * `unread` is what the caller knows it did not put in front of the reader:
 * the rest of the source, the turns not retrieved. A Ground answer that does
 * not say how much it is standing on is not answering a Ground question, and
 * this is the sentence that a one-shot draft has no way to produce.
 */
export function extentLine(bounded, { unread = null } = {}) {
  if (!bounded?.ok) return "";
  const where = bounded.sources.map((s) => `${s.source} (${s.refs.length} passage${s.refs.length === 1 ? "" : "s"})`).join(", ");
  // A share that rounds to zero is not zero: some of it WAS read, and saying
  // "0%" says none of it was, which is false. Under a hundredth it is said as
  // a fraction of the whole rather than as a percentage that lies.
  let rest = "";
  if (unread && Number.isFinite(unread.chars) && unread.chars > 0) {
    const share = bounded.chars / (bounded.chars + unread.chars);
    const said = share >= 0.01 ? `${Math.round(share * 100)}%` : `about one part in ${Math.round(1 / share).toLocaleString("en-US")}`;
    rest = ` That is ${said} of what these sources hold; the rest was not read for this answer.`;
  }
  return `What is in hand: ${where}.${rest}`;
}

export const GROUND_ASKS = Object.freeze({
  INS: (passages) => ideatingOnly(
    `Below are passages from the sources. Copy out, word for word, the sentences that carry the most of what these passages are about. ` +
    `Copy exactly — do not summarise, do not rephrase, do not add anything. One sentence per line, at most six.\n\n` +
    passages.map((p) => p.text).join("\n\n")),
});

/**
 * THE GROUND WALK. No subject is named, because the question names none — the
 * cell that hallucinated in the figure walk is simply not run.
 */
export async function walkGround({ question, passages = [], ask, splitSentences, unread = null } = {}) {
  if (typeof ask !== "function") throw new TypeError("chain-reason.walkGround: the model is injected as ask(prompt)");
  const steps = [];
  let calls = 0;
  const say = async (prompt) => { calls += 1; return String(await ask(ideatingOnly(prompt)) ?? "").trim(); };

  const n = nul(passages);
  steps.push(n);
  if (!n.ok) return { text: endingFor(steps), steps, calls, ended: "NUL" };

  // SEG · Ground — mechanical.
  const b = bound(n.passages);
  steps.push(b);
  if (!b.ok) return { text: endingFor(steps), steps, calls, ended: "SEG" };

  // INS · Ground — the model copies; the material verifies.
  const quoted = await say(GROUND_ASKS.INS(n.passages));
  const ins = checkQuotes(quoted, n.passages, { splitSentences });
  steps.push(ins);
  const line = extentLine(b, { unread });
  if (!ins.ok) {
    // Even here there is a real answer: the extent is known, only its content
    // could not be quoted. That is more than "I don't know" and it is true.
    return { text: `${line} Nothing in it could be quoted back and checked, so nothing is claimed about what it says.`, steps, calls, ended: "INS", bounded: b };
  }

  // DEF · Ground — the extent, then what it carries, then what it does not.
  const composed = await say(composeAsk(question, ins.established));
  steps.push(step("DEF", "put these into plain English", composed, "composed", `${ins.established.length} established span(s)`));
  return { text: `${line}\n\n${composed}`, steps, calls, ended: null, established: ins.established, bounded: b };
}
