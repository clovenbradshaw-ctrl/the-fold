// experiments/ground-void-test.mjs — does fold.js's ground carry a real
// distinction, measured through the real door, never asked of a model.
//
// The claim under test, stated precisely: fold.js's mechanical per-turn
// paraphrase (mechanicalFoldLine) — the thing System 1 actually accumulates
// as "the running summary" — carries more term-overlap with a turn's real
// content than a shuffled/null pairing would, across a real transcript.
//
// Nothing here is hand-thresholded and nothing here is asked of a model.
// Every organ is imported, not reimplemented: mechanicalFoldLine (fold.js),
// tokenize (source.js), the measuring door's own gate (measure.js's
// admit/runMeasurement, which is what actually calls nul), and grid.js's
// real composition-law parser/land/foldGrid to land the finding as three
// real void/define/evaluate lines.
//
// ── Where the real transcript came from, and the one disclosed substitution ──
//
// materials/dialogue-run7.af7ad5053139.json is a REAL captured run (50
// exchanges, gemma2:2b, corpus pg2600.txt): `asked` holds the real, verbatim
// question text for every turn — genuine, on-disk, never paraphrased here.
//
// No file in this repo holds the model's real generated ANSWER text for any
// dialogue run (confirmed by grepping every dialogue-run*/run*-turn-*.json
// and eval/results/*.jsonl in the repo for a literal `"answer":` key — zero
// hits; `answerChars` is a character COUNT everywhere, never the text). So
// this script does not invent one. Instead, for a turn whose real `record`
// field names a real citation (`checked against pg2600.txt#START-END` —
// dialogue-run7's turns carry this on 25 of 50 turns), the ANSWER side is
// the REAL bytes of pg2600.txt at that real, on-disk offset range — the
// actual passage the real system actually retrieved and cited for that
// exact turn. This is genuine, verbatim, on-disk material; it is not the
// model's prose, and it is named as a substitution, not silently passed off
// as the model's own words. For a turn with no citation in its real record
// (the real system found nothing to cite), the answer side is the empty
// string — an honest reflection of what that turn's real record says,
// rather than a fabricated stand-in.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { mechanicalFoldLine, RECENCY_WINDOW } from "../fold.js";
import { tokenize } from "../source.js";
import { admit, runMeasurement } from "../measure.js";
import { makeGrid } from "../grid.js";

import * as operators from "../../eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import * as nul from "../../eoreader6.1/nul/index.js";
import { bindLinks } from "../../eoreader6.1/packages/engine/emergence/binding.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

const line = (s = "") => console.log(s);
const section = (title) => {
  line();
  line(`── ${title} ${"─".repeat(Math.max(0, 70 - title.length))}`);
};

// ── 1. the real transcript ───────────────────────────────────────────────

section("loading the real transcript");

const RUN_PATH = join(REPO, "materials", "dialogue-run7.af7ad5053139.json");
const run = JSON.parse(readFileSync(RUN_PATH, "utf8"));
const questions = run.asked; // real, verbatim
const turnMeta = run.turns; // {turn, record, answerChars, ...} — real, mechanical

if (!Array.isArray(questions) || !Array.isArray(turnMeta) || questions.length !== turnMeta.length) {
  throw new Error(`unexpected shape in ${RUN_PATH}: asked=${questions?.length} turns=${turnMeta?.length}`);
}
const N = questions.length;
line(`run: ${RUN_PATH}`);
line(`model: ${run.model}, corpus: ${run.corpus}, exchanges: ${run.exchanges}, turns loaded: ${N}`);

const pgPath = join(REPO, run.corpus || "pg2600.txt");
const pgText = readFileSync(pgPath, "utf8");
line(`corpus loaded: ${pgPath} (${pgText.length.toLocaleString()} chars)`);

const CITE_RE = /pg2600\.txt#(\d+)-(\d+)/g;
function citedPassage(record) {
  const spans = [...String(record ?? "").matchAll(CITE_RE)].map((m) => [Number(m[1]), Number(m[2])]);
  return spans.map(([s, e]) => pgText.slice(s, e)).join(" ");
}

const answers = turnMeta.map((t) => citedPassage(t.record));
const citedCount = answers.filter((a) => a.length > 0).length;
line(`turns with a real cited passage as answer-substitute: ${citedCount}/${N}`);
line(`turns with no citation (answer = "", honest gap): ${N - citedCount}/${N}`);

// ── 2. the real fold lines, via the real mechanicalFoldLine ────────────────

const foldLines = questions.map((q, i) => mechanicalFoldLine(q, answers[i]));
const foldLineWordSets = foldLines.map((f) => new Set(tokenize(f)));
const turnWordSets = questions.map((q, i) => new Set([...tokenize(q), ...tokenize(answers[i])]));

section("sample fold lines (mechanicalFoldLine, real question + real cited bytes)");
for (const i of [0, 2, 4]) {
  if (i < N) line(`turn ${i + 1}: ${JSON.stringify(foldLines[i])}`);
}

// ── 3. groundAsOf(t) / turnWords(t) / overlap(t), t = 2..N ─────────────────
//
// Metric choice, stated once: overlap(t) = |groundAsOf(t) ∩ turnWords(t)| /
// |turnWords(t)| — the fraction of turn t's OWN vocabulary that the running
// ground already carried before turn t happened. Not Jaccard: the question
// this experiment asks is "how much of what this turn turns out to be about
// was already sitting in the ground", which is a coverage/recall question
// about turnWords(t), not a symmetric-set-distance question. Applied
// identically to the real series and the decoy series below.
//
// Prequential firewall: groundAsOf(t) accumulates strictly turns 1..t-1 —
// turn t's own fold line is added to the ground only AFTER overlap(t) is
// scored, mirroring the same firewall ground-ledger.js already enforces.

section("computing groundAsOf(t) / turnWords(t) / overlap(t) for t=2.." + N);

const observed = [];
const turnIndex = []; // observed[k] is the overlap for turn turnIndex[k]
const ground = new Set();

for (let t = 1; t <= N; t++) {
  const i = t - 1;
  if (t >= 2) {
    const tw = turnWordSets[i];
    let hit = 0;
    for (const w of tw) if (ground.has(w)) hit++;
    observed.push(tw.size ? hit / tw.size : 0);
    turnIndex.push(t);
  }
  for (const w of foldLineWordSets[i]) ground.add(w); // turn t joins the ground only now
}
line(`observed[] length: ${observed.length} (turns 2..${N})`);
line(`observed[] sample (first 8): ${JSON.stringify(observed.slice(0, 8).map((v) => +v.toFixed(4)))}`);
line(`observed[] mean: ${(observed.reduce((a, b) => a + b, 0) / observed.length).toFixed(4)}`);

// ── 4. the decoy/known-null control series ──────────────────────────────
//
// decoyOverlap(t) replaces groundAsOf(t) with the word set of ONE randomly
// mismatched OTHER turn's fold line (never turn t's own) — same content
// pool (every fold line comes from this same real transcript), temporal
// pairing deliberately broken. A tiny seeded PRNG (mulberry32) makes the
// mismatch reproducible rather than reaching for true randomness for a
// result that is meant to be re-checkable.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DECOY_SEED = 0; // this repo's own standing seed default, reused rather than invented fresh
const rand = mulberry32(DECOY_SEED);

const decoyObserved = [];
const decoyPairing = [];
for (const t of turnIndex) {
  let r;
  do {
    r = 1 + Math.floor(rand() * N);
  } while (r === t);
  decoyPairing.push(r);
  const decoyGround = foldLineWordSets[r - 1];
  const tw = turnWordSets[t - 1];
  let hit = 0;
  for (const w of tw) if (decoyGround.has(w)) hit++;
  decoyObserved.push(tw.size ? hit / tw.size : 0);
}
section("decoy series (real content, temporal pairing broken)");
line(`decoy pairing sample (turn -> mismatched turn): ${JSON.stringify(turnIndex.slice(0, 8).map((t, k) => [t, decoyPairing[k]]))}`);
line(`decoyObserved[] mean: ${(decoyObserved.reduce((a, b) => a + b, 0) / decoyObserved.length).toFixed(4)}`);

// ── 5. through the real measuring door ──────────────────────────────────
//
// statistic:windowMean, perturbation:shuffle — the one pair nul/index.js's
// own LICENSED table actually establishes (measure.js's `admit` refuses any
// other pair by name; going through admit/runMeasurement is what makes this
// the real gate rather than a hand-rolled shortcut).
//
// draws:200 — this repo's own standing null-arm default (measure.js's own
// probe examples, measure-real-data.mjs, measure.test.mjs's own literal).
// window: RECENCY_WINDOW (fold.js's own declared "reach of the present",
// reused rather than a fresh number invented for this script — the same
// discipline CLAUDE.md's measuring-door section names: "window 8 = a patrol
// shift, a unit of the world the material came from").
// seed:0 — this repo's own standing seed default.
//
// Declared once, before either series was measured, and not revisited.

const DRAWS = 200;
const WINDOW = RECENCY_WINDOW; // = 4
const SEED = 0;
const STATISTIC = "windowMean";
const PERTURBATION = "shuffle";

section("declaration (fixed before either run, not revisited)");
line(`statistic:${STATISTIC} perturbation:${PERTURBATION} draws:${DRAWS} window:${WINDOW} seed:${SEED}`);

function asTable(series) {
  return { head: ["overlap"], rows: series.map((v) => [v]) };
}

function declFor(label, series) {
  return {
    kind: "series",
    file: label,
    draws: DRAWS,
    window: WINDOW,
    seed: SEED,
    column: "overlap",
    channel: null,
    frame: undefined,
    across: false,
    statistic: STATISTIC,
    perturbation: PERTURBATION,
    candidate: false,
    direction: null,
  };
}

function measureSeriesThroughDoor(label, series) {
  const decl = declFor(label, series);
  const gateRefusal = admit(decl, nul);
  line(`admit(${label}) gate: ${gateRefusal ? "REFUSED — " + JSON.stringify(gateRefusal) : "passed"}`);
  const result = runMeasurement(decl, asTable(series), { nul, bindLinks });
  return result;
}

section("REAL series through the door");
const realResult = measureSeriesThroughDoor("real-observed-ground-overlap", observed);
line(`real result: ${JSON.stringify(realResult, null, 2)}`);

section("DECOY series through the door");
const decoyResult = measureSeriesThroughDoor("decoy-shuffled-turn-pairing-overlap", decoyObserved);
line(`decoy result: ${JSON.stringify(decoyResult, null, 2)}`);

// ── 6. the verdict, on the strongest available bar ──────────────────────
//
// holds ONLY if the real series censors above every one of the 200 nulls
// (nul's own `exceeds_witness`/direction:"above" — the observed statistic
// exceeds the max of every shuffle draw). Anything less decisive — a placed
// rank no matter how low, a censor below, a refusal — declares refused. The
// actual number is always printed, never hidden behind the label.

section("verdict");

const realCensoredAbove = !!realResult && !realResult.refused && realResult.censored === "above";
const declaredVerdict = realCensoredAbove ? "holds" : "refused";

let realStrengthLine;
if (realResult.refused) {
  realStrengthLine = `REAL series was refused by the door: ${JSON.stringify(realResult.refused)}`;
} else if (realResult.censored) {
  realStrengthLine = `REAL series censored ${realResult.censored} — observed ${realResult.observed} against support [${realResult.support?.[0]}, ${realResult.support?.[1]}], floor 1/draws = ${realResult.floor}`;
} else {
  realStrengthLine = `REAL series placed at rank ${realResult.rank} (of draws=${DRAWS}; lower rank = higher in the null's tail), observed ${realResult.observed}, support [${realResult.support?.[0]}, ${realResult.support?.[1]}]`;
}
line(realStrengthLine);

let decoyStrengthLine;
if (decoyResult.refused) {
  decoyStrengthLine = `DECOY series was refused by the door: ${JSON.stringify(decoyResult.refused)}`;
} else if (decoyResult.censored) {
  decoyStrengthLine = `DECOY series censored ${decoyResult.censored} — observed ${decoyResult.observed} against support [${decoyResult.support?.[0]}, ${decoyResult.support?.[1]}], floor 1/draws = ${decoyResult.floor}`;
} else {
  decoyStrengthLine = `DECOY series placed at rank ${decoyResult.rank} (of draws=${DRAWS}), observed ${decoyResult.observed}, support [${decoyResult.support?.[0]}, ${decoyResult.support?.[1]}]`;
}
line(decoyStrengthLine);

line(`DECLARED VERDICT: ${declaredVerdict} (real series censored-above required for "holds"; got censored=${JSON.stringify(realResult.censored ?? null)})`);

const rankForReport = realResult.refused
  ? null
  : realResult.censored === "above"
    ? 0 // censored above: the true rank is strictly below the measurable floor (1/draws) — reported as 0 to mean "beyond the floor", not a literal computed rank
    : realResult.censored === "below"
      ? 1 // censored below: strictly above every null draw — the opposite tail, reported as 1
      : realResult.rank;
line(`rank reported for structured output: ${rankForReport} (see notes for what this number means when censored)`);

// ── 7. land it on the real composition-law grid ─────────────────────────
//
// Terrain: Atmosphere (Interpretation domain, Ground grain). Chosen because
// this claim is about the ground itself (fold.js's running S1 summary), not
// an individuated figure pulled out of it, so a Ground-grain terrain is
// required; between Structure's Field and Interpretation's Atmosphere,
// Atmosphere is picked because this repo's own CLAUDE.md already names
// exactly this kind of thing "ambient ground" under Interpretation's Ground
// grain (the REC section: "operators.js types REC as rezero: Generate ·
// Interpretation, 'a new ambient ground begins'") — a running discourse
// paraphrase is that same kind of ambient, atmosphere-of-the-conversation
// ground, not a structural link/network claim.
//
// Stance: "differentiate" for void/evaluate (checking a figure against its
// own ground — the same stance the research's own worked examples use for
// both verbs), "generate" for define (making a claim — same as the worked
// example `define finding at Field from generate`).

section("landing on the real composition-law grid");

const TERRAIN = "Atmosphere";
const CHECK_STANCE = "differentiate";
const CLAIM_STANCE = "generate";
const GROUND_LABEL = "real-vs-shuffled-turn-pairing";
const CLAIM_TEXT = "the fold's ground produces a distinction that makes a difference";

const voidLine = `void "fold ground overlap series" at ${TERRAIN} from ${CHECK_STANCE} ground "${GROUND_LABEL}" broken:shuffle`;
const defineLine = `define "${CLAIM_TEXT}" at ${TERRAIN} from ${CLAIM_STANCE}`;
const evaluateLine = `evaluate "${CLAIM_TEXT}" at ${TERRAIN} from ${CHECK_STANCE} ground "${GROUND_LABEL}" broken:shuffle verdict:${declaredVerdict}`;

line(`void line:     ${voidLine}`);
line(`define line:   ${defineLine}`);
line(`evaluate line: ${evaluateLine}`);

const grid = makeGrid({ operators, taskLog });
let log = grid.createLog();

function landLine(text) {
  const parsed = grid.parseAct(text, { log });
  if (!parsed.ok) {
    line(`PARSE REFUSED for: ${text}`);
    line(JSON.stringify(parsed.refusal, null, 2));
    throw new Error(`grid refused a line this script expected to land: ${text}`);
  }
  const landed = grid.land(log, parsed.event);
  log = landed.log;
  line(`landed: ${text}  -> ids ${JSON.stringify(landed.ids)}`);
  return landed.ids;
}

landLine(voidLine);
landLine(defineLine);
landLine(evaluateLine);

const { landings, progression } = grid.foldGrid(log);

section("grid landing status");
line(JSON.stringify(landings, null, 2));
const claimLanding = landings.find((l) => (l.object || "").toLowerCase() === CLAIM_TEXT.toLowerCase());
line(`claim landing status: ${claimLanding ? claimLanding.status : "NOT FOUND"}`);
line(`checkCubeProgression (should be empty/clean): ${JSON.stringify(progression)}`);

// ── 8. summary ────────────────────────────────────────────────────────

section("SUMMARY");
line(`transcript: ${RUN_PATH} (${N} turns, ${citedCount} with a real cited-passage answer substitute)`);
line(`series length: ${observed.length} (t=2..${N})`);
line(`declaration: as:${STATISTIC} broken:${PERTURBATION} draws:${DRAWS} window:${WINDOW} seed:${SEED}`);
line(realStrengthLine);
line(decoyStrengthLine);
line(`declared verdict: ${declaredVerdict}`);
line(`grid landing status: ${claimLanding ? claimLanding.status : "NOT FOUND"}`);
line(`checkCubeProgression clean: ${progression.length === 0}`);
