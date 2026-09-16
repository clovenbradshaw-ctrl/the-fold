// stability.js — the invariants that make "only improves, never breaks" a
// claim that can be refuted, checked against observations stability-rig.mjs
// makes of the real turn. Pure: no model, no IO, organs injected.
//
// Every check returns `ok: true | false | null`. `null` is UNMEASURED — the
// observation it needed does not exist (the turn threw, no draft was sent) —
// and is never read as a pass. Each invariant ships with a planted control in
// stability.test.mjs: a deliberate violation it must catch, because a check
// that cannot fail is a comment (II.23).
//
// THE INVARIANTS (the stack diagram's five rules, made checkable):
//   1 containment      every source passage handed verbatim below is still
//                      handed verbatim above                  (rule 1, additive)
//   2 fallOpen         a faulted layer yields the prompt of the stack without
//                      that layer, byte for byte                 (rule 2)
//   3 noVerdictsUp     no line a layer writes into the prompt is an instruction
//                      to the mouth                               (rule 4)
//   4 pareto           adding a layer turns no single question from pass to
//                      fail                           (rule 5; mouth-level, paired)
//   5 unrelatedInert   adding unrelated material changes no question's passages
//   6 blastRadius      what a turn adds to the record addresses only the
//                      material it was handed
//   7 earned           a layer that claims a measured effect has its
//                      pre-registered control on record, or it is unwired (rule 3)

const norm = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const promptText = (messages) => (messages ?? []).map((m) => String(m?.content ?? "")).join("\n");
const systemText = (messages) => (messages ?? []).filter((m) => m?.role === "system").map((m) => String(m.content ?? "")).join("\n");
const unmeasured = (invariant, detail, extra = {}) => ({ invariant, ok: null, gap: detail, ...extra });

// ── 1 containment ──────────────────────────────────────────────────────────

/** Every passage the lower rung handed verbatim is still handed verbatim above. */
export function containment(lower, upper) {
  const invariant = "containment";
  if (!lower?.draft) return unmeasured(invariant, `no draft call at ${lower?.rung ?? "the lower rung"}${lower?.error ? ` (threw: ${lower.error})` : ""}`);
  if (!upper?.draft) return unmeasured(invariant, `no draft call at ${upper?.rung ?? "the upper rung"}${upper?.error ? ` (threw: ${upper.error})` : ""}`);
  const below = norm(promptText(lower.draft));
  const above = norm(promptText(upper.draft));
  const handed = (lower.handedPassages ?? []).filter((p) => norm(p.text) && below.includes(norm(p.text)));
  // Nothing handed verbatim below makes the check vacuous, not passed: a rung
  // that already dropped the floor would otherwise "contain" everything.
  if (!handed.length) return unmeasured(invariant, `${lower.rung} handed no passage verbatim — nothing to contain`, { from: lower.rung, to: upper.rung, handed: 0 });
  const missing = handed.filter((p) => !above.includes(norm(p.text)));
  return {
    invariant, from: lower.rung, to: upper.rung,
    ok: missing.length === 0,
    handed: handed.length,
    missing: missing.map((p) => ({ ref: p.ref, text: norm(p.text).slice(0, 160) })),
  };
}

// ── 2 fallOpen ─────────────────────────────────────────────────────────────

/** A faulted layer's turn must send exactly what the turn without that layer sends. */
export function fallOpen(faulted, without) {
  const invariant = "fallOpen";
  if (!without?.draft) return unmeasured(invariant, `the reference turn (${without?.rung}) sent no draft`);
  if (faulted?.error) return { invariant, faults: faulted.faults, ok: false, reason: "the turn threw instead of falling open", error: faulted.error };
  if (!faulted?.draft) return { invariant, faults: faulted?.faults, ok: false, reason: "the faulted turn sent no draft" };
  const a = JSON.stringify(faulted.draft), b = JSON.stringify(without.draft);
  if (a === b) return { invariant, faults: faulted.faults, against: without.rung, ok: true };
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  return { invariant, faults: faulted.faults, against: without.rung, ok: false, reason: "the prompt differs", at: i, faulted: a.slice(Math.max(0, i - 40), i + 80), expected: b.slice(Math.max(0, i - 40), i + 80) };
}

// ── 3 noVerdictsUp ─────────────────────────────────────────────────────────

/**
 * traceLines(draft, { fixed, sources }) → [{ line, kind }]
 * Each sentence of the system message, typed by where it came from: `fixed`
 * (part of a declared system prompt), `source` (bytes of the material), or
 * `layer` (written by the stack). Only a layer's lines are checked.
 *
 * `sentences` is the splitter; pass the reader's own (eoreader7 spans.js
 * `splitSentences`). MEASURED 2026-09-16: the regex default cut "Ulysses S. |
 * Grant was born in Point Pleasant" once the reader kept that sentence whole,
 * and the detector then read the surname as a command ("grant …"). A harness
 * that splits differently from the product measures its own splitter.
 */
const naiveSentences = (line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/);
export function traceLines(draft, { fixed = [], sources = [], sentences = naiveSentences } = {}) {
  const fixedText = fixed.map(norm);
  const sourceText = sources.map(norm);
  const rows = [];
  for (const raw of systemText(draft).split("\n")) {
    const line = norm(raw.replace(/^\s*[-•*]\s+/, ""));
    if (!line) continue;
    for (const sentence of sentences(line)) {
      const s = norm(sentence);
      if (!s) continue;
      const kind = fixedText.some((f) => f.includes(s)) ? "fixed" : sourceText.some((t) => t.includes(s)) ? "source" : "layer";
      rows.push({ line: s, kind });
    }
  }
  return rows;
}

/**
 * Universal Dependencies v2's open-class parts of speech (giver: UD, "Universal
 * POS tags" — open class words ADJ ADV INTJ NOUN PROPN VERB; the rest are
 * closed class). A word whose most frequent tag is closed-class ("what",
 * PRON 505 against VERB 1) does not head an imperative clause.
 *
 * MEASURED AND REPLACED, 2026-09-16: the first rule admitted any word ever
 * tagged VERB. It caught all 10 planted instructions and flagged all 7 real
 * layer lines it read as instructions — every one opening on "What". Recall
 * stayed the design goal; the fix is this received distinction, not a count.
 */
export const UD_OPEN_CLASSES = Object.freeze(new Set(["ADJ", "ADV", "INTJ", "NOUN", "PROPN", "VERB"]));

/** Can this word head an imperative, by a POS prior's counts? */
export function canHeadImperative(counts) {
  if (!counts || !(counts.VERB > 0)) return false;
  let top = null, n = -1;
  for (const [tag, c] of Object.entries(counts)) if (c > n) { top = tag; n = c; }
  return UD_OPEN_CLASSES.has(top);
}

/**
 * makeInstructionDetector({ garyCheck, verbAttested, isBaseForm })
 * Two checkers, reported apart so each one's recall can be measured:
 *   prohibition  Gary's own rule (gary.js `check`) — "do not", "never", …
 *   imperative   a clause that opens on a base-form verb and runs on for at
 *                least one more word — "read the sources", "say plainly".
 * The imperative rule favours recall: a missed instruction reaches the mouth,
 * a false flag costs a reader one look, and every flag is reported.
 */
export function makeInstructionDetector({ garyCheck, verbAttested, isBaseForm, sentences = naiveSentences }) {
  const OPENERS = new Set(["please", "then", "and", "also", "just", "only", "so", "now"]);
  return (line) => {
    const out = { prohibition: [], imperative: [] };
    if (typeof garyCheck === "function") {
      const r = garyCheck([{ role: "system", content: line }]);
      for (const f of r?.findings ?? []) if (f.rule === "information-not-prohibition") out.prohibition.push(...(f.clauses ?? []));
    }
    const clauses = sentences(line).flatMap((sentence) => sentence.split(/\s*(?:[.;:!?]\s*$|[;:!?]|,\s|\s—\s|\s-\s)\s*/));
    for (const clause of clauses) {
      const words = clause.split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < words.length && OPENERS.has(words[i].toLowerCase())) i += 1;
      const head = (words[i] ?? "").toLowerCase().replace(/[^\p{L}'’]/gu, "");
      if (!head || words.length - i < 2) continue;
      if (verbAttested(head) && isBaseForm(head)) out.imperative.push(clause.trim());
    }
    return out;
  };
}

export function noVerdictsUp(obs, { fixed = [], detect, sentences = naiveSentences }) {
  const invariant = "noVerdictsUp";
  if (!obs?.draft) return unmeasured(invariant, `no draft call at ${obs?.rung}${obs?.error ? ` (threw: ${obs.error})` : ""}`);
  const rows = traceLines(obs.draft, { fixed, sources: Object.values(obs.sources ?? {}), sentences });
  const flagged = [];
  for (const r of rows.filter((x) => x.kind === "layer")) {
    const d = detect(r.line);
    if (d.prohibition.length || d.imperative.length) flagged.push({ line: r.line, ...d });
  }
  return { invariant, rung: obs.rung, ok: flagged.length === 0, layerLines: rows.filter((x) => x.kind === "layer").length, flagged };
}

// ── 4 pareto ───────────────────────────────────────────────────────────────

/**
 * pareto(lowerScores, upperScores) — per question, never an average. A score
 * is { name, pass } for one question at one rung under one mouth; a question
 * that passed below and fails above is a flip, and one flip refutes.
 */
export function pareto(lower, upper) {
  const invariant = "pareto";
  const below = new Map(lower.map((s) => [s.name, s]));
  const flips = [], gains = [], missing = [];
  for (const u of upper) {
    const l = below.get(u.name);
    if (!l) { missing.push(u.name); continue; }
    if (l.pass === true && u.pass === false) flips.push(u.name);
    if (l.pass === false && u.pass === true) gains.push(u.name);
  }
  if (!upper.length) return unmeasured(invariant, "no scored questions above");
  return { invariant, ok: flips.length === 0, flips, gains, compared: upper.length - missing.length, missing };
}

/**
 * scoreAnswer(answer, item, { falseAbsenceOf, snips }) — mechanical, no model.
 * pass = every gold fact present AND no sentence falsely denies what the
 * material states (snip-check.js::falseAbsenceOf over the whole material).
 */
export function scoreAnswer(answer, item, { falseAbsenceOf, snips }) {
  const text = String(answer ?? "");
  const lower = text.toLowerCase();
  const goldMissing = (item.gold ?? []).filter((g) => !lower.includes(String(g).toLowerCase()));
  const denials = typeof falseAbsenceOf === "function"
    ? text.split(/(?<=[.!?])\s+/).map((s) => falseAbsenceOf(s, snips)).filter(Boolean)
    : [];
  return { name: item.name, pass: goldMissing.length === 0 && denials.length === 0, goldMissing, falseAbsences: denials.map((d) => d.detail ?? d.reason) };
}

// ── 5 unrelatedInert ───────────────────────────────────────────────────────

/** Adding unrelated material changes nothing a question retrieves. */
export function unrelatedInert(base, withUnrelated) {
  const invariant = "unrelatedInert";
  if (base?.error || withUnrelated?.error) return unmeasured(invariant, `a turn threw: ${base?.error ?? withUnrelated?.error}`);
  const a = [...(base.retrieved ?? [])].sort(), b = [...(withUnrelated.retrieved ?? [])].sort();
  const same = a.length === b.length && a.every((x, i) => x === b[i]);
  return { invariant, rung: base.rung, ok: same, base: a, withUnrelated: b, entered: b.filter((x) => !a.includes(x)), left: a.filter((x) => !b.includes(x)) };
}

// ── 6 blastRadius ──────────────────────────────────────────────────────────

const sourceOf = (address) => String(address ?? "").split("~")[0].split("#")[0].replace(/^[a-z]+:/i, "");

/** Every record entry a turn adds addresses only material that turn was handed. */
export function blastRadius(obs) {
  const invariant = "blastRadius";
  if (obs?.error) return unmeasured(invariant, `the turn threw: ${obs.error}`);
  if (!(obs.added ?? []).length) return unmeasured(invariant, `${obs.rung} added nothing to the record — nothing to bound`, { rung: obs.rung, added: 0 });
  const allowed = new Set(Object.keys(obs.sources ?? {}));
  const outside = [];
  for (const e of obs.added ?? []) {
    const addresses = [...(e.witnesses ?? []), ...(e.spans ?? []).map((s) => s?.at ?? s?.ref ?? s), ...(e.evidence ?? [])].filter((x) => typeof x === "string" && x.includes("#"));
    const foreign = addresses.filter((a) => !allowed.has(sourceOf(a)));
    if (foreign.length) outside.push({ task: e.task_id, foreign });
  }
  return { invariant, rung: obs.rung, ok: outside.length === 0, added: (obs.added ?? []).length, outside };
}

// ── 7 earned ───────────────────────────────────────────────────────────────

/**
 * earned(layer, registry) — a layer that claims a measured effect is wired
 * only with its pre-registered control on record. A layer with no entry is
 * `null` with its reason; it is never counted as earned.
 */
export function earned(layer, registry = {}) {
  const invariant = "earned";
  const entry = registry[layer];
  if (!entry) return unmeasured(invariant, `no pre-registered control for "${layer}" — it stays unwired`, { layer });
  const ok = entry.p != null && entry.alpha != null && entry.p < entry.alpha && (entry.models ?? []).length >= 2 && entry.heldOut === true;
  return { invariant, layer, ok, entry };
}

// ── the ratchet ────────────────────────────────────────────────────────────

/** Names that passed before must still pass; new passes may be added, never removed. */
export function ratchet(baseline = [], results = []) {
  const byName = new Map(results.map((r) => [r.name, r]));
  const regressed = baseline.filter((n) => byName.get(n)?.ok !== true);
  const newlyPassing = results.filter((r) => r.ok === true && !baseline.includes(r.name)).map((r) => r.name);
  return { ok: regressed.length === 0, regressed, newlyPassing };
}
