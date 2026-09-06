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
 * is deliberately ABSENT here — a same-shape one-token swap would read it
 * backwards — and handled instead by its own two-number regexes below,
 * each reconstructing the expression with the operands in the order the
 * phrase actually means. */
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
/** "N subtracted from M" / "N less than M" / "N fewer than M" all read as
 * M − N, and each has exactly one standard reading — unlike "divided
 * into" below, nobody means anything else by "5 subtracted from 12".
 * Checked, not assumed: a genuine yes/no comparison ("Is 3 less than
 * 10?") is never at risk of being mis-read as this arithmetic reading,
 * because "Is" sits outside WRAPPER_RE's stripped set — it survives
 * normalization as a stray, non-numeric word and fails PURE_EXPRESSION_RE
 * downstream regardless of what this reversal computes (pinned in
 * arithmetic.test.mjs). */
const reverseSubtract = (_, n, m) => `((${m})-(${n}))`;
const SUBTRACTED_FROM_RE = /(-?\d[\d,]*(?:\.\d+)?)\s+subtracted\s+from\s+(-?\d[\d,]*(?:\.\d+)?)/gi;
const LESS_THAN_RE = /(-?\d[\d,]*(?:\.\d+)?)\s+less\s+than\s+(-?\d[\d,]*(?:\.\d+)?)/gi;
const FEWER_THAN_RE = /(-?\d[\d,]*(?:\.\d+)?)\s+fewer\s+than\s+(-?\d[\d,]*(?:\.\d+)?)/gi;
/** "N divided into M" is left refused: real usage splits between the
 * classic long-division idiom (M/N — "5 divided into 20" is 4, the way
 * the phrase is taught) and a common colloquial one (N/M — "20 divided
 * into 5 groups" said loosely for plain division), with no structural way
 * to tell which one a bare question means. A wrong mechanical answer is
 * worse than none, so this one phrase still bails rather than guesses. */
const ORDER_REVERSING_RE = /\bdivided\s+into\b/i;

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
  s = s.replace(SUBTRACTED_FROM_RE, reverseSubtract);
  s = s.replace(LESS_THAN_RE, reverseSubtract);
  s = s.replace(FEWER_THAN_RE, reverseSubtract);
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

// ── THE SHAPED QUESTIONS (added 2026-09-05) ──────────────────────────────────
//
// The pure-expression door above bails on "5 miles to km", "10 choose 3",
// "the median of 3, 9, 1", "the derivative of x^3 + 2x at x = 2", "solve
// 3x + 5 = 20" and "how many days between 2026-01-01 and 2026-09-05" — each
// a computation, each measured on the app's own 2b mouth as a number
// generated rather than computed. They join this organ rather than a new
// one because they are the same law at the same seam: detection is
// structural (one whole-question regex per shape after the same wrapper
// strip; the engine must parse the capture with no free symbol beyond the
// declared unknown; anything else is null), computation is the injected
// engine's OWN operation (math.unit, combinations, factorial, mean/median/
// std, derivative, rationalize's polynomial coefficients — the quadratic
// root is `math.evaluate` over the formula as a string), and the mouth is
// never asked to restate the result. No operator is hand-rolled here; the
// calendar's engine is the host's proleptic-Gregorian Date.UTC, declared as
// such, the way mathjs is declared for numbers.
//
// `checkArithmetic` is unchanged for every question it already answered:
// the shapes are tried only after the pure door returns null, and each
// shape needs a word the pure door never accepts.

const SHAPE_WRAPPER_RE = /^\s*(?:please\s+)?(?:what'?s|what\s+is|what\s+are|what\s+was|calculate|compute|solve|evaluate|find|work\s+out|tell\s+me|how\s+much\s+is)\s*:?\s*(?:the\s+)?/i;
const SHAPE_TAIL_RE = /[?!.]+\s*$/;
const SHAPE_NUM = "-?\\d[\\d,]*(?:\\.\\d+)?";
const shapeClean = (q) => stripThousands(String(q ?? "")).replace(SHAPE_WRAPPER_RE, "").replace(SHAPE_TAIL_RE, "").trim();

const UNIT_CONVERT_RE = new RegExp(`^(?:convert\\s+)?(${SHAPE_NUM})\\s*([A-Za-z°/^\\d]+(?:\\s+per\\s+[A-Za-z]+)?)\\s+(?:to|in|into|as)\\s+([A-Za-z°/^\\d]+(?:\\s+per\\s+[A-Za-z]+)?)$`, "i");
const HOW_MANY_UNITS_RE = new RegExp(`^how\\s+many\\s+([A-Za-z]+)\\s+(?:are|is)\\s+(?:there\\s+)?in\\s+(${SHAPE_NUM})\\s*([A-Za-z]+)$`, "i");
const DERIVATIVE_RE = /^(?:the\s+)?derivative\s+of\s+(.+?)(?:\s+with\s+respect\s+to\s+([a-z]))?(?:\s+at\s+([a-z])\s*=\s*(-?\d+(?:\.\d+)?))?$/i;
const CHOOSE_RE = new RegExp(`^(${SHAPE_NUM})\\s+choose\\s+(${SHAPE_NUM})$`, "i");
const COMBINATIONS_RE = new RegExp(`^(?:number\\s+of\\s+)?(?:ways\\s+to\\s+choose|combinations\\s+of)\\s+(${SHAPE_NUM})\\s+(?:items?\\s+)?(?:from|out\\s+of)\\s+(${SHAPE_NUM})`, "i");
const FACTORIAL_RE = new RegExp(`^(${SHAPE_NUM})\\s*(?:!|factorial)$`, "i");
const STATISTIC_RE = /^(mean|average|median|standard\s+deviation|std|sum|total|variance|max|maximum|min|minimum)\s+of\s*:?\s*(.+)$/i;
const STATISTIC_FN = Object.freeze({ mean: "mean", average: "mean", median: "median", "standard deviation": "std", std: "std", sum: "sum", total: "sum", variance: "variance", max: "max", maximum: "max", min: "min", minimum: "min" });
const SOLVE_RE = /^(?:solve\s+)?(?:for\s+([a-z])\s*[:,]?\s*)?([^=]+)=([^=]+?)(?:\s+for\s+([a-z]))?$/i;
const SOLVE_ALPHABET_RE = /^[\d\sxyz+\-*/^().=]+$/i;

// mathjs spells a few everyday units its own way. This maps the WORD to
// the engine's spelling; the conversion itself stays the engine's.
const UNIT_SPELLING = Object.freeze({ miles: "mile", mile: "mile", km: "km", kilometers: "km", kilometres: "km", kilometer: "km", kilometre: "km", meters: "m", metres: "m", meter: "m", metre: "m", feet: "ft", foot: "ft", inches: "inch", inch: "inch", pounds: "lb", pound: "lb", lbs: "lb", kilograms: "kg", kilogram: "kg", kg: "kg", grams: "g", gram: "g", ounces: "oz", ounce: "oz", celsius: "degC", fahrenheit: "degF", kelvin: "K", "°c": "degC", "°f": "degF", liters: "L", litres: "L", liter: "L", litre: "L", gallons: "gal", gallon: "gal", hours: "hour", hour: "hour", minutes: "minute", minute: "minute", seconds: "second", second: "second", days: "day", day: "day", mph: "mi/h", kph: "km/h" });
const unitWord = (w) => { const k = String(w).trim().toLowerCase().replace(/\s+per\s+/, "/"); return UNIT_SPELLING[k] ?? k; };

/** Detect one of the shaped questions and read its parts. No computation. */
export function detectShaped(question, { math } = {}) {
  if (typeof question !== "string" || !question.trim()) return null;
  const q = shapeClean(question);
  let m;
  if ((m = HOW_MANY_UNITS_RE.exec(q))) return { kind: "units", value: m[2], from: m[3], to: m[1] };
  if ((m = UNIT_CONVERT_RE.exec(q))) return { kind: "units", value: m[1], from: m[2], to: m[3] };
  if ((m = DERIVATIVE_RE.exec(q))) return { kind: "derivative", expression: m[1].trim(), variable: (m[2] ?? m[3] ?? "x").toLowerCase(), at: m[4] != null ? Number(m[4]) : null };
  if ((m = CHOOSE_RE.exec(q))) return { kind: "combinations", n: m[1], k: m[2] };
  if ((m = COMBINATIONS_RE.exec(q))) return { kind: "combinations", n: m[2], k: m[1] };
  if ((m = FACTORIAL_RE.exec(q))) return { kind: "factorial", n: m[1] };
  if ((m = STATISTIC_RE.exec(q))) {
    const nums = m[2].split(/[\s,;]+(?:and\s+)?/).filter(Boolean);
    if (nums.length < 2 || !nums.every((n) => /^-?\d+(?:\.\d+)?$/.test(n))) return null;
    return { kind: "statistic", statistic: m[1].toLowerCase().replace(/\s+/g, " "), values: nums.map(Number) };
  }
  if ((m = SOLVE_RE.exec(q)) && SOLVE_ALPHABET_RE.test(q.replace(/\bfor\s+[a-z]\b/i, "").replace(/^solve\s+/i, ""))) {
    const lhs = m[2].trim();
    const rhs = m[3].trim();
    const vars = new Set((lhs + rhs).match(/[a-z]/gi) ?? []);
    const declared = (m[1] ?? m[4] ?? "").toLowerCase();
    if (vars.size !== 1) return null;
    const variable = [...vars][0].toLowerCase();
    if (declared && declared !== variable) return null;
    if (math?.parse) { try { math.parse(lhs); math.parse(rhs); } catch { return null; } }
    return { kind: "solve", lhs, rhs, variable };
  }
  return null;
}

const roundNoise = (v) => Math.round(v * 1e9) / 1e9;
const fmtValue = (v) => (typeof v === "number" ? String(roundNoise(v)) : String(v));
const texOf = (math, expression) => { try { return typeof math?.parse === "function" ? math.parse(expression).toTex() : null; } catch { return null; } };

/** Compute a detected shape with the engine's own operation; {kind, expression, value, display, tex} or a typed gap. */
export function checkShaped(question, { math } = {}) {
  const found = detectShaped(question, { math });
  if (!found) return null;
  if (!math || typeof math.evaluate !== "function") return { ...found, expression: found.expression ?? null, gap: "the arithmetic engine is not available" };
  try {
    switch (found.kind) {
      case "units": {
        const expression = `${found.value} ${unitWord(found.from)} to ${unitWord(found.to)}`;
        const u = math.evaluate(expression);
        if (!u || typeof u.toNumber !== "function") return { ...found, expression, gap: "the engine did not read that as a unit conversion" };
        const value = roundNoise(u.toNumber(unitWord(found.to)));
        return { ...found, expression, value, display: `${value} ${unitWord(found.to)}`, tex: null };
      }
      case "solve": {
        const poly = `(${found.lhs}) - (${found.rhs})`;
        const expression = `${found.lhs} = ${found.rhs}`;
        const c = math.rationalize(poly, {}, true)?.coefficients;
        if (!c || c.length < 2) return { ...found, expression, gap: "the engine found no polynomial in the unknown" };
        if (c.length === 2) {
          const value = roundNoise(math.evaluate(`-(${c[0]}) / (${c[1]})`));
          return { ...found, expression, value, display: `${found.variable} = ${value}`, tex: null };
        }
        if (c.length === 3) {
          const [c0, c1, c2] = c;
          const disc = math.evaluate(`(${c1})^2 - 4*(${c2})*(${c0})`);
          if (disc < 0) return { ...found, expression, gap: "no real root: the discriminant is negative" };
          const r1 = roundNoise(math.evaluate(`(-(${c1}) + sqrt(${disc})) / (2*(${c2}))`));
          const r2 = roundNoise(math.evaluate(`(-(${c1}) - sqrt(${disc})) / (2*(${c2}))`));
          const value = r1 === r2 ? [r1] : [r2, r1].sort((a, b) => a - b);
          return { ...found, expression, value, display: `${found.variable} = ${value.join(" or ")}`, tex: null };
        }
        return { ...found, expression, gap: `degree ${c.length - 1}: the engine's coefficients are not rooted here beyond a quadratic` };
      }
      case "derivative": {
        const d = math.derivative(found.expression, found.variable);
        const expression = `d/d${found.variable} (${found.expression})`;
        if (found.at == null) return { ...found, expression, value: d.toString(), display: d.toString(), tex: null };
        const value = roundNoise(d.evaluate({ [found.variable]: found.at }));
        return { ...found, expression: `${expression} at ${found.variable} = ${found.at}`, value, display: `${d.toString()} → ${value}`, tex: null };
      }
      case "combinations": {
        const expression = `combinations(${found.n}, ${found.k})`;
        const value = math.evaluate(expression);
        return { ...found, expression, value, display: fmtValue(value), tex: texOf(math, expression) };
      }
      case "factorial": {
        const expression = `factorial(${found.n})`;
        const value = math.evaluate(expression);
        return { ...found, expression, value, display: fmtValue(value), tex: texOf(math, expression) };
      }
      case "statistic": {
        const expression = `${STATISTIC_FN[found.statistic]}(${found.values.join(", ")})`;
        const value = roundNoise(math.evaluate(expression));
        return { ...found, expression, value, display: fmtValue(value), tex: texOf(math, expression) };
      }
      default:
        return null;
    }
  } catch (e) {
    return { ...found, expression: found.expression ?? null, gap: e.message };
  }
}

// ── THE CALENDAR: the host's Date.UTC is the engine, declared ─────────────────
// ISO (2026-09-05), Month D, YYYY and D Month YYYY are read exactly; "next
// Tuesday", "today" and "last month" are relative to a now this module is
// not handed, so they bail. A day count is the difference (exclusive of the
// start) unless the question says "inclusive".
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_RE = MONTHS.map((m) => m.slice(0, 3) + "[a-z]*").join("|");
const DATE_RE = `(?:(\\d{4})-(\\d{2})-(\\d{2})|(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})\\.?,?\\s+(\\d{4}))`;
const DATE_ALONE_RE = new RegExp(`^\\s*${DATE_RE}\\s*$`, "i");
const monthIndex = (w) => MONTHS.findIndex((m) => m.startsWith(String(w).toLowerCase().slice(0, 3)));
const DAY_MS = 86_400_000;

/** A date this module reads exactly, as {y, m, d, iso, utc} — or null (Feb 30 is null, not March 2). */
export function readDate(s) {
  const m = DATE_ALONE_RE.exec(String(s ?? ""));
  if (!m) return null;
  let y, mo, d;
  if (m[1]) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if (m[4]) { mo = monthIndex(m[4]) + 1; d = +m[5]; y = +m[6]; }
  else { d = +m[7]; mo = monthIndex(m[8]) + 1; y = +m[9]; }
  if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return null;
  const utc = Date.UTC(y, mo - 1, d);
  const back = new Date(utc);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return { y, m: mo, d, iso: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, utc };
}
const BETWEEN_RE = new RegExp(`^how\\s+many\\s+days\\s+(?:are\\s+there\\s+|are\\s+|is\\s+it\\s+)?(?:between|from)\\s+(${DATE_RE})\\s+(?:and|to|until)\\s+(${DATE_RE})(\\s+inclusive)?$`, "i");
const WEEKDAY_RE = new RegExp(`^(?:what\\s+)?(?:day\\s+of\\s+the\\s+week|weekday|day)\\s+(?:is|was|will\\s+be|does|did)?\\s*(?:it\\s+)?(?:on\\s+)?(${DATE_RE})(?:\\s+fall\\s+on)?$`, "i");
const OFFSET_RE = new RegExp(`^(?:what\\s+)?date\\s+(?:is|was|will\\s+be|falls)\\s+(\\d+)\\s+days\\s+(after|before|from)\\s+(${DATE_RE})$`, "i");

export function detectCalendar(question) {
  const q = String(question ?? "").replace(SHAPE_WRAPPER_RE, "").replace(SHAPE_TAIL_RE, "").trim();
  let m;
  if ((m = BETWEEN_RE.exec(q))) {
    const from = readDate(m[1]);
    const to = readDate(m[11]);
    return from && to ? { kind: "calendar", op: "between", from, to, inclusive: !!m[21] } : null;
  }
  if ((m = WEEKDAY_RE.exec(q))) { const date = readDate(m[1]); return date ? { kind: "calendar", op: "weekday", date } : null; }
  if ((m = OFFSET_RE.exec(q))) { const date = readDate(m[3]); return date ? { kind: "calendar", op: "offset", days: +m[1], direction: m[2].toLowerCase() === "before" ? -1 : 1, date } : null; }
  return null;
}

export function checkCalendar(question) {
  const found = detectCalendar(question);
  if (!found) return null;
  if (found.op === "between") {
    const diff = Math.abs(Math.round((found.to.utc - found.from.utc) / DAY_MS));
    const value = found.inclusive ? diff + 1 : diff;
    return { ...found, expression: `days(${found.from.iso} → ${found.to.iso})${found.inclusive ? " inclusive" : ""}`, value, display: `${value} days`, tex: null };
  }
  if (found.op === "weekday") {
    const value = WEEKDAYS[new Date(found.date.utc).getUTCDay()];
    return { ...found, expression: `weekday(${found.date.iso})`, value, display: value, tex: null };
  }
  const t = new Date(found.date.utc + found.direction * found.days * DAY_MS);
  const value = t.toISOString().slice(0, 10);
  return { ...found, expression: `${found.date.iso} ${found.direction > 0 ? "+" : "−"} ${found.days} days`, value, display: `${value} (${WEEKDAYS[t.getUTCDay()]})`, tex: null };
}

/**
 * Every computed answer this organ can give, in order of how little it
 * reads into the question: the pure expression first (unchanged), then the
 * shaped questions, then the calendar. Null when none claims it — the
 * question is not this organ's to answer.
 */
// ── COMPARISON: ordering and distance, computed, never generated ───────────
//
// The same law as the top of this file, at the shape a question actually
// takes about material: "which of these two is earlier, and how far apart are
// they?" Measured live (S77, the long-stream run): gemma2:2b answered ten
// such probes and got the arithmetic right zero times, while getting the
// ORDERING right twice — it can sometimes see which is bigger and essentially
// never subtract. That is not a prompting problem. Ordering and difference
// over two stated values are the instrument's to compute and the mouth's only
// to say (P2, "the model is just the mouth").
//
// GROUNDED BY CONSTRUCTION: the values are read out of the QUESTION's own
// text. This module never goes looking for numbers elsewhere, and never
// invents one — if the question does not carry two comparable values, it
// returns null and the turn proceeds exactly as before.
const COMPARE_RE = /\b(?:which|what)\b[^?]{0,80}?\b(is|was|are|were)\b[^?]{0,40}?\b(earlier|later|earliest|latest|larger|largest|bigger|biggest|greater|greatest|smaller|smallest|lesser|least|higher|highest|lower|lowest|older|oldest|younger|youngest|more|fewer|less)\b/i;
const DISTANCE_RE = /\b(?:how (?:many|much|far)\b[^?]{0,40}?\b(?:apart|between|difference|older|younger|longer|shorter|more|less|bigger|smaller)|by (?:exactly )?how much|what (?:is|was) the difference)\b/i;
/** The unit a distance is asked in, when the question names one. */
const APART_UNIT_RE = /\b(\d[\d,.]*)\s*(years?|months?|days?|hours?|minutes?)\b/i;

const EARLIER_WORDS = /^(earlier|earliest|smaller|smallest|lesser|least|lower|lowest|fewer|less|younger|youngest|older|oldest)$/i;
// "older" over YEARS means an earlier year; over a plain quantity it means larger.
/**
 * A question with its quoted material removed — what the person themselves
 * asked. Naive pairing is not enough: a memory probe quoting a memory probe
 * quoting a comparison nests quotes, the pairs come out misaligned, and the
 * inner ask leaks back into the "person's own words" (measured 2026-09-06 —
 * two such probes survived the first fix). When quoting is nested or
 * unbalanced, everything from the first quote mark to the last is treated as
 * one quoted span, which is the conservative reading: whatever is in there,
 * the person is reporting it, not asking it.
 */
const unquoted = (t) => {
  const text = String(t ?? "");
  const marks = (text.match(/["“”]/g) ?? []).length;
  if (marks > 2) {
    const first = text.search(/["“”]/);
    const last = text.lastIndexOf('"') > -1 ? Math.max(text.lastIndexOf('"'), text.lastIndexOf("”"), text.lastIndexOf("“")) : text.length;
    return (text.slice(0, first) + " " + text.slice(last + 1)).trim();
  }
  return text.replace(/["“][^"”]*["”]/g, " ").replace(/[‘'][^’']{6,}[’']/g, " ");
};
const numbersIn = (t) => [...String(t ?? "").matchAll(/(?<![\w.])(-?\d{1,3}(?:,\d{3})+|-?\d+(?:\.\d+)?)(?![\w])/g)].map((m) => Number(m[1].replace(/,/g, "")));
const isYear = (n) => Number.isInteger(n) && n >= 1000 && n <= 2999;

/**
 * detectComparison(question) → { values, wants, unit } | null
 * `wants`: "order" (which one), "distance" (how far apart), or "both".
 */
export function detectComparison(question) {
  if (typeof question !== "string" || !question.trim()) return null;
  // THE ASK IS THE PERSON'S OWN WORDS, NOT THE MATERIAL THEY QUOTE (measured
  // 2026-09-06). A memory question — 'Earlier I asked you: "…which of these
  // is earlier…?" What did you answer then?' — quotes a comparison it is not
  // making. Reading the whole string, this door fired on seven such probes in
  // a live run and would have answered "what did you answer?" with a
  // subtraction. So the SHAPE is looked for outside quoted spans; the VALUES
  // are still read from the whole question, because a legitimate comparison
  // often quotes its sources ("According to A: '…1805…' … which is earlier?").
  const asked = unquoted(question);
  const order = COMPARE_RE.exec(asked);
  const distance = DISTANCE_RE.test(asked);
  if (!order && !distance) return null;
  // The values the question itself names, deduplicated in the order asked.
  const values = [...new Set(numbersIn(question))];
  if (values.length < 2) return null;
  // A question naming many numbers is not a two-way comparison; the ordering
  // is still well defined but the distance is ambiguous, so only take the
  // clear case (P9: an ambiguous ask is refused, never guessed at).
  if (values.length > 4) return null;
  const word = order ? order[2].toLowerCase() : null;
  const unit = APART_UNIT_RE.test(question) ? null : (/\byears?\b/i.test(question) && values.every(isYear) ? "years" : null);
  return {
    values,
    word,
    wants: order && distance ? "both" : order ? "order" : "distance",
    unit: unit ?? (values.every(isYear) ? "years" : null),
  };
}

/**
 * checkComparison(question, { math }) → { kind: "comparison", values, first, difference, display, sentence } | null
 * The engine does the arithmetic (this module may not hand-roll a subtraction
 * — see the header); the sentence is a plain statement of the result, for the
 * turn to hand the mouth as a FACT rather than a sum to attempt.
 */
export function checkComparison(question, { math } = {}) {
  const found = detectComparison(question);
  if (!found) return null;
  const { values, word, unit } = found;
  const sorted = [...values].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (!math || typeof math.evaluate !== "function") return { kind: "comparison", ...found, gap: "the arithmetic engine is not available" };
  let difference;
  try { difference = math.evaluate(`${high} - ${low}`); }
  catch { return { kind: "comparison", ...found, gap: "the engine could not take the difference" }; }
  const picksLow = word ? EARLIER_WORDS.test(word) : null;
  // "older"/"oldest" of YEARS is the earlier year; of a plain count it is the larger.
  const first = word == null ? null : (/^(older|oldest)$/i.test(word) ? (unit === "years" ? low : high) : picksLow ? low : high);
  const u = unit === "years" ? " years" : "";
  const parts = [];
  if (first != null) parts.push(`Of the two, ${first} is the one asked for (${low} is the smaller, ${high} the larger).`);
  parts.push(`The difference between them is ${difference}${u}.`);
  return {
    kind: "comparison", values, word, unit, wants: found.wants,
    low, high, first, difference,
    display: first != null ? `${first}, by ${difference}${u}` : `${difference}${u}`,
    sentence: parts.join(" "),
  };
}

/**
 * enforceComparison(text, comparison, { splitSentences }) → { text, fixed }
 *
 * A COMPUTED VALUE IS NOT ADVICE (the lesson P125 already had to learn once:
 * a check that only advises is not a check). Measured live: with the engine
 * wired and the worked-out difference handed to the mouth as a fact — "the
 * difference between them is 36 years" — gemma2:2b answered "There are 46
 * years between them." Without the fact it said 41. Neither is 36. Telling a
 * small model the answer does not make it say the answer.
 *
 * So the instrument keeps the number. Any sentence that asserts a distance
 * and carries a figure the computation contradicts is replaced by the
 * computed statement itself, mechanically, with no model call. A sentence
 * that states the right figure, or asserts no distance at all, is untouched.
 */
const DISTANCE_CLAIM_RE = /\b(?:apart|between them|difference|years? between|older|younger|earlier|later|larger|smaller|greater|more|less)\b/i;
export function enforceComparison(text, comparison, { splitSentences } = {}) {
  const body = String(text ?? "");
  if (!comparison || comparison.gap || typeof splitSentences !== "function" || !body.trim()) return { text: body, fixed: [] };
  const right = new Set([comparison.difference, comparison.low, comparison.high, comparison.first].filter((v) => v != null).map(Number));
  const fixed = [];
  const kept = [];
  let stated = false;
  for (const raw of splitSentences(body)) {
    const sent = String(raw?.text ?? raw ?? "");
    if (!sent.trim()) continue;
    const nums = [...sent.matchAll(/(?<![\w.])(-?\d{1,3}(?:,\d{3})+|-?\d+(?:\.\d+)?)(?![\w])/g)].map((m) => Number(m[1].replace(/,/g, "")));
    const wrong = DISTANCE_CLAIM_RE.test(sent) && nums.length > 0 && nums.some((n) => !right.has(n));
    if (!wrong) { kept.push(sent); if (nums.includes(Number(comparison.difference))) stated = true; continue; }
    fixed.push({ sentence: sent, said: nums.filter((n) => !right.has(n)), computed: comparison.difference });
    if (!stated) { kept.push(comparison.sentence); stated = true; }
  }
  if (!fixed.length) return { text: body, fixed: [] };
  // The computed statement always survives, even if the draft was nothing but wrong sentences.
  if (!kept.length) kept.push(comparison.sentence);
  return { text: kept.join(" ").replace(/\s{2,}/g, " ").trim(), fixed };
}

export function checkQuantity(question, { math } = {}) {
  return checkArithmetic(question, { math }) ?? checkShaped(question, { math }) ?? checkCalendar(question) ?? checkComparison(question, { math });
}
