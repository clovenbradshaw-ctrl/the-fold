// arithmetic.js — a number is computed, never generated.
//
// L5's law at its smallest scale: a compliance-critical fact is never left
// to the model's own instruction-following. Measured live (2026-08-17,
// qwen2.5:14b, this repo's own trial): asked "What's 17 times 24?" the
// model answered 372. The real product is 408. Nothing in the app caught
// it, because nothing checked it — the model was the only arithmetic this
// instrument had.
//
// Detection is structural, P4's rule: a question is arithmetic when, after
// normalizing its English operator words to symbols (never computing
// anything itself — the same L2 discipline capitalization-veto uses:
// word classes FIND the shape, they never TYPE the value), what remains
// parses with the injected engine and contains no free symbol. A question
// about "the mayor" or "the year it was founded" never reaches evaluation;
// it is not this module's to answer.
//
// The engine is injected (the cast.js pattern) so this module stays pure
// and Node-testable: the browser page hands it the vendored mathjs global,
// tests hand it the same package imported directly. Neither this module
// nor its caller may fall back to computing an operator by hand — a hand-
// rolled `+`/`*` is exactly the untested arithmetic this module exists to
// replace.

/** English operator words this module will normalize, ordered longest-
 * phrase-first so "multiplied by" matches before a bare "by" ever could.
 * Order-reversing phrasing ("N subtracted from M" means M − N, not N − M)
 * is deliberately ABSENT: a wrong mechanical answer is worse than no
 * mechanical answer, so an ambiguous phrasing bails rather than guesses. */
const WORD_OPS = [
  [/\bmultiplied\s+by\b/gi, "*"],
  [/\btimes\b/gi, "*"],
  [/\bdivided\s+by\b/gi, "/"],
  [/\bover\b/gi, "/"],
  [/\bplus\b/gi, "+"],
  [/\badded\s+to\b/gi, "+"],
  [/\bminus\b/gi, "-"],
  [/\bto\s+the\s+power\s+of\b/gi, "^"],
];
const PERCENT_OF_RE = /(-?\d[\d,]*(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(-?\d[\d,]*(?:\.\d+)?)/gi;
const SQUARE_ROOT_RE = /square\s+root\s+of\s+(-?\d[\d,]*(?:\.\d+)?)/gi;
const SQUARED_RE = /(-?\d[\d,]*(?:\.\d+)?)\s+squared\b/gi;
const CUBED_RE = /(-?\d[\d,]*(?:\.\d+)?)\s+cubed\b/gi;
/** Phrasing this module refuses rather than risk reading backwards. A
 * question carrying it never reaches evaluation. */
const ORDER_REVERSING_RE = /\bsubtracted\s+from\b|\bless\s+than\b|\bfewer\s+than\b|\bdivided\s+into\b/i;

/** Strip thousands separators only where a digit sits on both sides, so a
 * range like "1,000-2,000" is not silently welded into one number. */
const stripThousands = (s) => s.replace(/(\d),(\d{3})\b/g, "$1$2");

/**
 * English arithmetic phrasing, normalized to an operator string mathjs can
 * parse. Returns null on anything this module is not confident reading —
 * BAIL is a first-class outcome here, not an edge case: this module speaks
 * only where it is sure, per P4 ("gaps are results").
 */
export function normalizeArithmeticPhrase(question) {
  if (typeof question !== "string" || !question.trim()) return null;
  if (ORDER_REVERSING_RE.test(question)) return null;
  let s = stripThousands(question);
  s = s.replace(PERCENT_OF_RE, (_, pct, base) => `((${base})*(${pct})/100)`);
  s = s.replace(SQUARE_ROOT_RE, (_, n) => `sqrt(${n})`);
  s = s.replace(SQUARED_RE, (_, n) => `(${n})^2`);
  s = s.replace(CUBED_RE, (_, n) => `(${n})^3`);
  for (const [re, op] of WORD_OPS) s = s.replace(re, op);
  return s;
}

/** Everything an arithmetic expression is allowed to contain, once English
 * words are normalized to symbols: digits, the operators above, `sqrt`,
 * parentheses, whitespace, a leading `$`, and punctuation a question wraps
 * around one — nothing else. A stray letter means a name or a word this
 * module did not recognize survived normalization, and the honest response
 * is to not touch it, not to strip the letter and guess at what is left. */
const PURE_EXPRESSION_RE = /^[\s$]*[-+*/^().\d\s]*(?:sqrt\([-+*/^().\d\s]*\))?[-+*/^().\d\s]*[?!.]*[\s]*$/;
const HAS_DIGIT_RE = /\d/;
const HAS_OPERATOR_RE = /[-+*/^]|sqrt\(/;

/**
 * True when `question`, normalized, is a pure numeric expression — no free
 * symbol, at least one operator (a bare number is not "arithmetic", it is
 * just a number), and the injected engine can parse it with zero variable
 * dependencies. `evaluate` is never called here; detection and computation
 * stay two different acts; { evaluate } is required exactly where it is
 * used, in checkArithmetic below.
 */
// A named, explicit whitelist of conversational wrapper — not "any run of
// letters at the front", which once ate the `sqrt` off `sqrt(144)` because
// a function name and a wrapper word look identical to a blind strip. Every
// prefix this module is willing to discard is written out here; anything
// else stays, and a stray word left in place is what correctly fails the
// purity check right after.
const WRAPPER_RE = /^\s*(?:what'?s|what\s+is|calculate|compute|solve|evaluate|find)\s*:?\s*(?:the\s+)?/i;

export function detectArithmetic(question, { math } = {}) {
  const normalized = normalizeArithmeticPhrase(question);
  if (!normalized) return null;
  const stripped = normalized.replace(WRAPPER_RE, "").replace(/[?!.]+\s*$/, "").trim();
  if (!HAS_DIGIT_RE.test(stripped) || !HAS_OPERATOR_RE.test(stripped)) return null;
  if (!PURE_EXPRESSION_RE.test(stripped)) return null;
  if (!math || typeof math.parse !== "function") return { expression: stripped, parseable: null };
  try {
    const node = math.parse(stripped);
    const symbols = new Set();
    node.traverse((n) => {
      if (n.isSymbolNode && n.name !== "sqrt") symbols.add(n.name);
    });
    if (symbols.size) return null; // a real free variable, not arithmetic
    return { expression: stripped };
  } catch {
    return null; // a shape that looked numeric but does not parse — bail
  }
}

/**
 * Compute the expression with the injected engine and report it plainly:
 * the expression, the exact value, and a display string — the model is
 * never asked to restate any of these three, because restating a computed
 * number is exactly the step that produced 372 for 17×24. `tex` is the
 * SAME engine's own LaTeX rendering of the expression (mathjs Node#toTex),
 * never a hand-typed template — the display layer renders what mathjs says
 * the expression is, not a second, independently-maintained notion of it.
 * A `toTex` failure (there is no case this module's own test suite hits,
 * but mathjs is not asked to promise one) degrades `tex` to null rather
 * than losing the already-computed value.
 */
export function checkArithmetic(question, { math } = {}) {
  const found = detectArithmetic(question, { math });
  if (!found) return null;
  if (!math || typeof math.evaluate !== "function")
    return { expression: found.expression, gap: "the arithmetic engine is not available" };
  try {
    const value = math.evaluate(found.expression);
    if (typeof value !== "number" || !Number.isFinite(value))
      return { expression: found.expression, gap: "the expression did not evaluate to a plain number" };
    const rounded = Math.round(value * 1e9) / 1e9; // clear float noise, never the value's own precision
    const display = Number.isInteger(rounded) ? String(rounded) : String(rounded);
    let tex = null;
    if (typeof math.parse === "function") {
      try {
        tex = `${math.parse(found.expression).toTex()} = ${display}`;
      } catch {
        tex = null;
      }
    }
    return { expression: found.expression, value: rounded, display, tex };
  } catch (e) {
    return { expression: found.expression, gap: e.message };
  }
}

/** The claimed numeric answer inside a model draft, read the way `cite.js`
 * reads a figure: the LAST bare number in the text, since a worked answer
 * often restates the operands before stating the result ("17 times 24 is
 * 408" — 17 and 24 both appear earlier). Never the first number, which is
 * usually an operand, not the answer. */
export function claimedValue(text) {
  const nums = [...String(text ?? "").matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map((m) =>
    Number(m[0].replace(/,/g, "")),
  );
  return nums.length ? nums[nums.length - 1] : null;
}
