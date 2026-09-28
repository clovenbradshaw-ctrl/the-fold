import { stripCasualPreamble } from "./arithmetic.js";

// counting.js — a count is computed, never generated.
//
// arithmetic.js's law (L5, its own smallest scale) at a shape mathjs has
// nothing to parse: "how many times does the letter r appear in
// strawberry" is not a numeric EXPRESSION — there is no "17 * 24" hiding
// in it — so checkQuantity's own door correctly declines it and the
// question falls straight to the model. Letter-counting is the public,
// famous instance of the exact failure class arithmetic.js's header
// already names (measured there: qwen2.5 answering 17*24=372): a small
// model tallies characters inside its own token stream, not the bytes a
// person actually typed, and gets it wrong with total confidence. Nothing
// in this app caught THAT, because — same as arithmetic before L5 — nothing
// checked it.
//
// Detection is structural, the identical discipline: a question claims
// this door only when, after the same casual-preamble strip arithmetic.js
// already established (reused, not reinvented), it reduces to one whole-
// question shape naming BOTH a needle (a letter, a short substring, or a
// closed class — vowels/consonants) and a haystack, as literal text
// inside the question itself. A question naming neither a countable unit
// nor something to count it in stays untouched — the same "bail rather
// than guess" posture arithmetic.js's own "divided into" refusal already
// takes.
//
// TWO INDEPENDENT ENGINES, never one trusted alone — the discipline this
// repo's own perspective.js just earned the hard way (originOf/
// independentHolders, kernel/perspective.js: a single count is one
// witness, corroboration needs a second, INDEPENDENT one; a relay of the
// same computation is not a second witness any more than a relay of the
// same belief is). The JS count here is exact by construction (Array.from
// is code-point aware, so a combining mark or an astral character is
// never miscounted the way `.length` would double-count it) and needs no
// further engine to be correct. Where a caller injects `runPython` — this
// app's own already-vendored, already-running pyodide sandbox
// (term.js::runSandboxed("python", …), never a second hand-rolled
// counter — the identical operation is ALSO computed by a short,
// MECHANICALLY-CONSTRUCTED Python snippet (built here, never model-
// authored: the needle/haystack are embedded as JSON-escaped string
// literals, which double as valid Python string literals for every
// escape this module ever produces) and the two must agree. A
// disagreement is a typed gap, never silently resolved toward either
// engine — two independent, exact computations of one definite fact
// cannot honestly differ; if they do, one of them has a real bug, and
// shipping either number unreconciled would be exactly the kind of
// unverified fact this module exists to refuse. `runPython`'s contract
// matches term.js::runSandboxed's own return shape (frontier-25.mjs's own
// established `witness(task, answer, {runPython})` convention, reused
// rather than a third one invented here): `(code) => Promise<{code,
// stdout, stderr, timedOut}>`.
//
// Disclosed, not silently covered: this door does not yet defend a
// computed count against a later dispute the way arithmetic.js's own
// disputesQuantity/arithmeticDisputeTurn do (P209/P210/P212) — a person
// telling this app "that's wrong, it's actually 4" one turn later falls
// through to the model exactly as an arithmetic dispute did before P209
// existed. Real, scoped, un-attempted follow-up work, named rather than
// implied finished.

const QUOTE_RE = /^[\s'"“”‘’`]+|[\s'"“”‘’`]+$/g;
export function unquoteCounting(s) {
  return String(s ?? "").replace(QUOTE_RE, "").trim();
}

const TAIL_RE = /[?!.]+\s*$/;
function clean(question) {
  return stripCasualPreamble(String(question ?? ""))
    .replace(/^\s*please\s+/i, "")
    .replace(TAIL_RE, "")
    .trim();
}

/** Unicode code-point split — never `.length` (which counts UTF-16 code
 * units and double-counts an astral character or a combining mark's own
 * base+mark pair as two things). */
function codepoints(s) {
  return Array.from(String(s ?? ""));
}

const VOWELS = new Set([..."aeiouAEIOU"]);

// One whole-question regex per shape (arithmetic.js's own convention) —
// each produces the SAME normalized `{kind, needle?, haystack?, cls?}`,
// never a shape-specific field a downstream reader has to branch on by
// which regex fired.
const OCCURS_RE = /^how\s+many\s+times\s+(?:does|do|is|are)\s+(?:the\s+letter\s+)?(.+?)\s+(?:appears?|occurs?|show\s+up|shows\s+up)\s+in\s+(.+?)$/i;
const ARE_IN_RE = /^how\s+many\s+(.+?)'s\s+are\s+(?:there\s+)?in\s+(.+?)$/i;
const DOES_HAVE_RE = /^how\s+many\s+(.+?)'s\s+does\s+(.+?)\s+have$/i;
const COUNT_IMPERATIVE_RE = /^count\s+(?:the\s+)?(?:number\s+of\s+)?(?:times\s+)?(?:the\s+letter\s+)?(.+?)'?s?\s+(?:appears?|occurs?|in)\s+in\s+(.+?)$/i;
const COUNT_IN_RE = /^count\s+(?:the\s+)?(?:number\s+of\s+)?(?:letter\s+)?(.+?)'?s?\s+in\s+(.+?)$/i;
const CLASS_ARE_IN_RE = /^how\s+many\s+(vowels|consonants)\s+are\s+(?:there\s+)?in\s+(.+?)$/i;
const CLASS_DOES_HAVE_RE = /^how\s+many\s+(vowels|consonants)\s+does\s+(.+?)\s+have$/i;
const WORDS_ARE_IN_RE = /^how\s+many\s+words\s+are\s+(?:there\s+)?in\s+(.+?)$/i;
const WORDS_DOES_HAVE_RE = /^how\s+many\s+words\s+does\s+(.+?)\s+have$/i;

/** Detect one of the counting shapes and read its parts. No computation —
 * `checkCounting` below is the only function this module has that computes
 * anything, exactly the split arithmetic.js's own detect-then-check pair holds. */
export function detectCounting(question) {
  const q = clean(question);
  if (!q) return null;
  let m;
  if ((m = OCCURS_RE.exec(q))) return { kind: "occurrence", needle: unquoteCounting(m[1]), haystack: unquoteCounting(m[2]) };
  if ((m = ARE_IN_RE.exec(q))) return { kind: "occurrence", needle: unquoteCounting(m[1]), haystack: unquoteCounting(m[2]) };
  if ((m = DOES_HAVE_RE.exec(q))) return { kind: "occurrence", needle: unquoteCounting(m[1]), haystack: unquoteCounting(m[2]) };
  if ((m = COUNT_IMPERATIVE_RE.exec(q))) return { kind: "occurrence", needle: unquoteCounting(m[1]), haystack: unquoteCounting(m[2]) };
  if ((m = COUNT_IN_RE.exec(q))) return { kind: "occurrence", needle: unquoteCounting(m[1]), haystack: unquoteCounting(m[2]) };
  if ((m = CLASS_ARE_IN_RE.exec(q))) return { kind: "class", cls: m[1].toLowerCase(), haystack: unquoteCounting(m[2]) };
  if ((m = CLASS_DOES_HAVE_RE.exec(q))) return { kind: "class", cls: m[1].toLowerCase(), haystack: unquoteCounting(m[2]) };
  if ((m = WORDS_ARE_IN_RE.exec(q))) return { kind: "words", haystack: unquoteCounting(m[1]) };
  if ((m = WORDS_DOES_HAVE_RE.exec(q))) return { kind: "words", haystack: unquoteCounting(m[1]) };
  return null;
}

/** Non-overlapping occurrence count, case-insensitive, code-point safe. A
 * single character counts by code point; a multi-character needle counts
 * the way String.prototype.split does (the ordinary, colloquial reading
 * of "how many times does X appear" — an OVERLAPPING count is a
 * different, rarer question this module does not guess at, the same
 * "one standard reading or bail" rule arithmetic.js's SUBTRACTED_FROM_RE
 * family already holds). Null on an empty needle — nothing to count. */
export function occurrenceCount(needle, haystack) {
  const n = String(needle ?? "").toLowerCase();
  if (!n) return null;
  const h = String(haystack ?? "").toLowerCase();
  if (codepoints(n).length === 1) return codepoints(h).filter((ch) => ch === n).length;
  return h.split(n).length - 1;
}

/** Vowels/consonants among the letters only — digits, spaces and
 * punctuation are neither and are excluded from both counts, never folded
 * into "consonants" as a silent catch-all. */
export function classCount(cls, haystack) {
  const letters = codepoints(String(haystack ?? "")).filter((ch) => /[a-zA-Z]/.test(ch));
  return cls === "vowels"
    ? letters.filter((ch) => VOWELS.has(ch)).length
    : letters.filter((ch) => !VOWELS.has(ch)).length;
}

/** Whitespace-delimited word count — the same unit a person means by
 * "words" in ordinary prose; a hyphenated compound is one word, matching
 * how the haystack itself was typed. */
export function wordCount(haystack) {
  return String(haystack ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function pyStr(s) {
  // JSON's double-quoted string syntax is a strict subset of Python's own
  // double-quoted string syntax for every escape this ever produces
  // (\", \\, \n, \t, \uXXXX) — reused rather than a second, hand-rolled
  // Python-literal escaper that could drift from the JS one.
  return JSON.stringify(String(s ?? ""));
}

/** The mechanically-constructed Python snippet for a detected shape — the
 * model never sees or authors this text. `print`'s own stdout is the sole
 * channel back; nothing here can be conflated with a model's own words. */
export function pythonSnippetFor(found) {
  if (found.kind === "occurrence") {
    return `h = ${pyStr(found.haystack)}.lower()\nn = ${pyStr(found.needle)}.lower()\nprint(h.count(n) if n else "")`;
  }
  if (found.kind === "class") {
    const test = found.cls === "vowels" ? "c in 'aeiouAEIOU'" : "c not in 'aeiouAEIOU'";
    return `h = ${pyStr(found.haystack)}\nprint(sum(1 for c in h if c.isalpha() and (${test})))`;
  }
  if (found.kind === "words") {
    return `h = ${pyStr(found.haystack)}\nprint(len(h.split()))`;
  }
  return null;
}

function parsePyCount(stdout) {
  const n = Number(String(stdout ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Compute a detected counting shape — the JS engine always, a second
 * independent Python computation whenever `runPython` is injected. Returns
 * null when nothing claims the question, `{..., gap}` when the two
 * engines disagree or the count could not be taken, or `{..., value,
 * display, verified}` otherwise. `verified` is `null` when no second
 * engine was offered — never dressed up as confirmed when only one engine
 * ever ran, the same distinction `validatePython`'s own `ok`/`findings`
 * split holds for a code artifact.
 */
export async function checkCounting(question, { runPython } = {}) {
  const found = detectCounting(question);
  if (!found) return null;

  let value = null;
  let expression = null;
  if (found.kind === "occurrence") {
    value = occurrenceCount(found.needle, found.haystack);
    expression = `count("${found.needle}", in: "${found.haystack}")`;
  } else if (found.kind === "class") {
    value = classCount(found.cls, found.haystack);
    expression = `${found.cls}("${found.haystack}")`;
  } else if (found.kind === "words") {
    value = wordCount(found.haystack);
    expression = `words("${found.haystack}")`;
  }
  if (value == null || !Number.isFinite(value)) return { ...found, expression, gap: "nothing to count — the needle or haystack was empty" };

  let verified = null;
  if (typeof runPython === "function") {
    try {
      const snippet = pythonSnippetFor(found);
      const r = await runPython(snippet);
      if (r?.timedOut) {
        verified = { ok: false, detail: "the python cross-check timed out" };
      } else if (r?.code !== 0) {
        verified = { ok: false, detail: `python exited ${r?.code}: ${String(r?.stderr ?? "").split("\n").filter(Boolean).slice(-1)[0] ?? ""}`.slice(0, 200) };
      } else {
        const pyValue = parsePyCount(r.stdout);
        if (pyValue == null) {
          verified = { ok: false, detail: "python produced no parseable count" };
        } else if (pyValue !== value) {
          return {
            ...found, expression,
            gap: `the JS and Python counts disagree (js=${value}, python=${pyValue}) — nothing shipped, since a definite fact cannot honestly differ between two exact computations`,
            jsValue: value, pyValue,
          };
        } else {
          verified = { ok: true };
        }
      }
    } catch (e) {
      verified = { ok: false, detail: String(e?.message ?? e).slice(0, 200) };
    }
  }

  return { ...found, expression, value, display: String(value), verified };
}
