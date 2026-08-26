// widget.test.mjs — an html widget, end to end, iterated by complaint.
//
// This is the whole path the user asked for, run over the REAL modules with
// no stub anywhere in the chain: the model's answer text → artifact.js's
// segment parse → widget.js's mechanical routing off the OPERATOR's words →
// build-log.js's append-only log over eoreader6's actual
// engine/holon/task-log.js → the projection, the cursor, the download, the
// replay. The one thing that is faked is the model, and only the model:
// every "answer" below is a literal string standing in for a turn's output,
// because what is under test is what the instrument does with an answer, not
// how it got one.
//
// The claim being pinned: "I don't like the colors" and "it's broken" land on
// the widget that already exists, as re-zeros on ITS log, and never as new
// builds — while "make me a countdown timer in python" still lands as a new
// build. Both halves matter. A router that never forks is as broken as one
// that always does; it just fails in the direction nobody notices until two
// unrelated artifacts are sharing one thread.

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { checkCubeProgression } from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { RENDERABLE, parseSegments, toDocument } from "./artifact.js";
import { makeBuildLog } from "./build-log.js";
import * as enginePriors from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { makeWidgetRouter } from "./widget.js";

// The router bound to the engine's REAL prior register — the same closed
// classes the page gets from /engine. No stub carries these walls either.
const { iterationTell, routeMessage, routeSegment } = makeWidgetRouter(enginePriors);

const buildLog = makeBuildLog(taskLog);

// ── the stand-in for a conversation ─────────────────────────────────────────
//
// A miniature of app.js's own publish path: builds in birth order, each one
// its log; a turn routes its segments and either opens a build or re-zeroes
// one. Deliberately small — if this needed app.js's DOM to be true, the
// routing would be living in the wrong place.

function makeDesk() {
  const builds = [];
  return {
    builds,
    /** One turn: the operator's words in, the model's answer, what happened. */
    turn(message, answer) {
      const acts = [];
      const landedThisTurn = [];
      for (const seg of parseSegments(answer)) {
        if (seg.type === "prose") continue;
        const route = routeSegment(
          seg,
          message,
          builds.map((b) => ({ n: b.n, ...kindOf(b), text: textOf(b) })),
          { landedThisTurn },
        );
        const landed = route.lang && route.lang !== seg.lang ? { ...seg, lang: route.lang } : seg;
        if (route.kind === "revise") {
          const t = builds.find((b) => b.n === route.n);
          t.log = buildLog.reviseBuild(t.log, { code: landed.code, reason: "restated" });
          acts.push({ act: "revise", n: t.n });
        } else if (route.kind === "rezero") {
          const target = builds.find((b) => b.n === route.n);
          const before = target.log.entries.length;
          target.log = buildLog.rezeroBuild(target.log, {
            seg: landed,
            code: landed.code,
            trigger: route.trigger,
            tell: route.tell,
          });
          acts.push({ act: "rezero", n: target.n, appended: target.log.entries.length - before });
          landedThisTurn.push({ n: target.n, type: landed.type, lang: landed.lang });
        } else {
          const n = builds.length + 1;
          builds.push({ n, log: buildLog.proposeBuild({ n, turn: builds.length + 1, seg, caption: seg.lang }) });
          acts.push({ act: "new", n, why: route.why });
          landedThisTurn.push({ n, type: seg.type, lang: seg.lang });
        }
      }
      return acts;
    },
  };
}

const kindOf = (b) => {
  const seg = buildLog.foldBuild(b.log).seg;
  return { type: seg.type, lang: seg.lang };
};
const project = (b) => buildLog.foldBuild(b.log);
/** A build's own words: its caption and its current projection. */
const textOf = (b) => {
  const f = buildLog.foldBuild(b.log);
  return `${f.caption ?? ""}\n${f.code ?? ""}`;
};

const WIDGET_V1 = `Here is a counter widget.

\`\`\`html
<div id="c" style="color:#f0f">0</div>
<button onclick="c.textContent=+c.textContent+1">+1</button>
\`\`\`
`;

const WIDGET_V2 = `Recoloured to a calmer palette.

\`\`\`html
<div id="c" style="color:#334155">0</div>
<button onclick="c.textContent=+c.textContent+1">+1</button>
\`\`\`
`;

const WIDGET_V3 = `The handler was referencing an id that was never bound. Fixed.

\`\`\`html
<div id="c" style="color:#334155">0</div>
<button onclick="document.getElementById('c').textContent=+document.getElementById('c').textContent+1">+1</button>
\`\`\`
`;

// ── the end-to-end walk ─────────────────────────────────────────────────────

test("e2e: an html widget is built, then iterated by complaint onto its own log", () => {
  const desk = makeDesk();

  // 1. The widget is asked for and born. An html segment is RENDERABLE — the
  //    artifact is the thing itself, and the document the preview frame gets
  //    is the document the download gets, because one injected toDocument
  //    produces both.
  const born = desk.turn("make me a counter widget in html", WIDGET_V1);
  assert.deepEqual(born.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 1);
  const widget = desk.builds[0];
  assert.equal(project(widget).seg.lang, "html");
  assert.ok(RENDERABLE.has(project(widget).seg.lang));
  assert.match(toDocument(project(widget).seg), /<button/);
  assert.equal(project(widget).ground, 1);
  assert.equal(project(widget).version, 1);

  // 2. "I don't like the colors" — no build named, no artifact demanded. It
  //    lands on the widget, as a RE-ZERO on the widget's own log.
  const complained = desk.turn("I don't like the colors", WIDGET_V2);
  assert.deepEqual(complained, [{ act: "rezero", n: 1, appended: 3 }]);
  assert.equal(desk.builds.length, 1, "a complaint must not fork the widget");
  assert.equal(project(widget).ground, 2);
  assert.match(project(widget).code, /#334155/);

  // 3. "it's broken" — the second re-zero, on the SAME log. Iteration is not
  //    a one-shot: a widget is complained at until it is right.
  const fixed = desk.turn("it's broken, the button does nothing", WIDGET_V3);
  assert.deepEqual(fixed, [{ act: "rezero", n: 1, appended: 3 }]);
  assert.equal(desk.builds.length, 1);
  assert.equal(project(widget).ground, 3);
  assert.match(project(widget).code, /getElementById/);

  // 4. Nothing was overwritten. Every ground the widget ever had is still on
  //    the log and still folds back at its own cursor position, byte-exact.
  // Each re-zero now lands three entries (concession, amended ask, rebirth).
  const seqs = widget.log.entries.map((e) => e.seq);
  assert.deepEqual(seqs, [0, 1, 2, 3, 4, 5, 6]);
  assert.match(buildLog.foldBuild(widget.log, 0).code, /#f0f/);
  assert.match(buildLog.foldBuild(widget.log, 3).code, /#334155/);
  assert.match(buildLog.foldBuild(widget.log, 6).code, /getElementById/);

  // 5. Downloadable at any cursor, as the rendered document, named by the
  //    address those bytes actually live at.
  const first = buildLog.exportAt(widget.log, 0, { toDocument });
  assert.equal(first.name, "build-1@0.html");
  assert.equal(first.mime, "text/html");
  assert.match(first.text, /#f0f/);
  assert.match(buildLog.exportAt(widget.log, null, { toDocument }).name, /^build-1@6\.html$/);

  // 6. The algebra never runs backward, across every ground — the engine's
  //    own checker, not a local restatement of it.
  assert.deepEqual(checkCubeProgression(widget.log), []);

  // 7. The log rebuilds from its serialized entries alone (P3's resumption
  //    property) — which is what makes the record, not the page, the truth.
  const replayed = buildLog.replayEntries(JSON.parse(JSON.stringify(widget.log.entries)));
  for (let s = 0; s < widget.log.nextSeq; s++) {
    assert.deepEqual(buildLog.foldBuild(replayed, s), buildLog.foldBuild(widget.log, s));
  }
});

test("e2e: a demand for a different artifact still forks, and does not touch the widget", () => {
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  desk.turn("I don't like the colors", WIDGET_V2);

  const forked = desk.turn(
    "now make me a countdown timer in python",
    "Sure.\n\n```python\nfor i in range(3, 0, -1):\n    print(i)\n```\n",
  );
  assert.deepEqual(forked.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 2);
  // The widget's log did not move: two grounds, four entries (the re-zero
  // lands concession + amended ask + rebirth), untouched.
  assert.equal(desk.builds[0].log.entries.length, 4);
  assert.equal(project(desk.builds[0]).seg.lang, "html");
  assert.equal(project(desk.builds[1]).seg.lang, "python");

  // And a complaint after the fork lands on the PYTHON build, because that is
  // what "it" now points at — same kind, most recent.
  desk.turn("it's broken", "```python\nfor i in range(3, 0, -1):\n    print(i)\nprint('go')\n```\n");
  assert.equal(desk.builds.length, 2);
  assert.equal(buildLog.foldBuild(desk.builds[1].log).ground, 2, "the python build took the complaint");
  assert.equal(desk.builds[0].log.entries.length, 4, "the widget's log did not move again");
});

test("e2e: a complaint answered in a different language is a new build, not a version of the widget", () => {
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  // The operator complains about the widget; the model answers with python.
  // A python file is not a version of an html widget, whatever the words
  // around it said, so the kind match refuses the route.
  const acts = desk.turn("it's broken", "```python\nprint('counter')\n```\n");
  assert.deepEqual(acts.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 2);
  assert.equal(buildLog.foldBuild(desk.builds[0].log).ground, 1);
});

test("a turn is one act: several blocks of one kind are versions, not siblings", () => {
  // Measured live against gemma2:2b (2026-08-17): asked for one counter
  // widget, it replied with FIVE html fences, and every one of them opened
  // its own build — one request, five orphans. This is that regression.
  const desk = makeDesk();
  const acts = desk.turn(
    "make me a counter widget in html",
    [
      "Here you go.", "", "```html", "<div>0</div>", "```", "",
      "Or with a button:", "", "```html", "<div>0</div><button>+1</button>", "```", "",
      "Or styled:", "", "```html", "<div style=\"color:#334155\">0</div><button>+1</button>", "```", "",
    ].join("\n"),
  );
  assert.deepEqual(acts.map((a) => a.act), ["new", "revise", "revise"]);
  assert.equal(desk.builds.length, 1, "one request, one build");
  const live = project(desk.builds[0]);
  assert.equal(live.version, 3, "each restatement is a version on the one log");
  assert.equal(live.ground, 1, "nobody judged anything, so no ground was conceded");
  assert.match(live.code, /#334155/, "the projection is the last block the turn produced");
  // Restatement is SUPERSEDE · SYN, never REC — a re-zero needs a judgment.
  assert.equal(desk.builds[0].log.entries.filter((e) => e.operator === "REC").length, 0);
  assert.deepEqual(checkCubeProgression(desk.builds[0].log), []);
});

test("two different kinds in one turn are still two builds", () => {
  const desk = makeDesk();
  const acts = desk.turn(
    "make me a counter widget and the python that generates it",
    "```html\n<div>0</div>\n```\n\n```python\nprint(0)\n```\n",
  );
  assert.deepEqual(acts.map((a) => a.act), ["new", "new"]);
  assert.equal(desk.builds.length, 2, "an html widget and a python script are not versions of each other");
});

test("an untagged fence is a gap, not a different kind: it lands where the words point", () => {
  // Measured live against gemma2:2b (2026-08-17): complained at about a
  // widget, it answered with a bare ``` fence holding the fix, and a strict
  // language match forked that onto a build of its own. Silence is not a
  // declaration of difference.
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  const acts = desk.turn("it's broken", "```\n<div id=\"c\">0</div><button>+1</button>\n```\n");
  assert.deepEqual(acts.map((a) => a.act), ["rezero"]);
  assert.equal(desk.builds.length, 1);
  // And the widget keeps its declared language — losing it would cost the
  // build its preview frame and its .html download.
  const live = project(desk.builds[0]);
  assert.equal(live.seg.lang, "html");
  assert.equal(live.ground, 2);
  assert.equal(buildLog.exportAt(desk.builds[0].log, null, { toDocument }).mime, "text/html");
});

test("a DECLARED different language still forks — silence is the only exception", () => {
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  const acts = desk.turn("it's broken", "```python\nprint('counter')\n```\n");
  assert.deepEqual(acts.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 2);
});

test("routeMessage: the pre-turn face — a complaint routes before any model call", () => {
  // This is what makes iteration reliable rather than probabilistic: the
  // decision is made from the operator's words alone, so the caller can run
  // a SIGHTED revision (the /fold machinery) instead of hoping the model
  // re-emits a fence into ordinary chat.
  const builds = [
    { n: 1, type: "code", lang: "html", text: 'html\n<div id="counter">0</div><button>+1</button>' },
    { n: 2, type: "code", lang: "python", text: "python\nprint(3)" },
  ];
  // Anaphora and judgment route to the NEWEST code build.
  assert.deepEqual(routeMessage("it's broken", builds), { n: 2, tell: "anaphora", trigger: "it's broken" });
  // A definite phrase routes to the build whose OWN bytes contain it.
  assert.equal(routeMessage("the button does nothing", builds).n, 1);
  // The number is the reference, read from the operator.
  assert.equal(routeMessage("build 1 is broken", builds).n, 1);
  // Creation demands and material questions do not route.
  assert.equal(routeMessage("make me a countdown timer", builds), null);
  assert.equal(routeMessage("what does the report say about funding", builds), null);
  // With nothing built, nothing routes.
  assert.equal(routeMessage("it's broken", []), null);
  // A table is not revisable by complaint.
  assert.equal(routeMessage("it's broken", [{ n: 1, type: "table", text: "a b" }]), null);
});

test("iterationTell: the html document's own wrapper tags never count as a content match", () => {
  // Measured live, 2026-08-17: a session with one existing html build (a
  // canvas drawing app) asked to build a SECOND, unrelated html widget —
  // "make me a spreadsheet grid in html, each cell editable" — and it
  // re-zeroed the drawing app instead of opening a new build, because
  // <!DOCTYPE html><html>...</html> contributes the token "html" to every
  // html-typed build's bytes by construction. That token can never
  // discriminate one build's content from another's, so it must not count.
  const drawingApp =
    '<!DOCTYPE html><html><head><title>Simple Drawing App</title></head>' +
    '<body><canvas id="myCanvas"></canvas><button id="clearButton">Clear</button></body></html>';
  assert.equal(iterationTell("make me a spreadsheet grid in html, each cell editable", drawingApp), null);
  // The wrapper tags are stripped; everything nested inside them is not —
  // a real referent living in <title> or the body still resolves exactly
  // as before this fix.
  assert.equal(iterationTell("the clear button is broken", drawingApp), "resolved");
  assert.equal(iterationTell("the drawing app's title is wrong", drawingApp), "resolved");

  // The SECOND source of the same token, found completing this same
  // measurement: production's `known` is always `caption + "\n" + code`
  // (app.js's buildWords), and an unrenamed caption defaults to the bare
  // language ("html") — so the string's own first line carries the same
  // non-discriminating token through a different field. routeMessage's own
  // build shape (n/type/lang/text) is exactly this concatenation.
  const builds = [{ n: 1, type: "code", lang: "html", text: "html\n" + drawingApp }];
  assert.equal(routeMessage("make me a spreadsheet grid in html, each cell editable", builds), null);
  assert.equal(routeMessage("the clear button is broken", builds).n, 1);
});

test("routeMessage/routeSegment: a resolved/judgment tell always discloses which words it matched on", () => {
  // A THIRD instance of the same failure shape surfaced completing this
  // measurement, and it was the diagnostic: build 1 had already been
  // (mis-)rezeroed once into carrying a generateGrid() using "row"/"col",
  // so the NEXT ask matched on real — if accidentally acquired — overlap,
  // and diagnosing that by hand meant fetching localStorage and reading
  // raw bytes. A routing decision must say what it matched on, on the
  // record, not only in a debugger. This does not fix the underlying
  // category error (span/token overlap standing in for referent identity,
  // the same gap P11 names for prose) — it makes each decision legible
  // enough that the next collision is a fast read, not a reproduction.
  const builds = [{ n: 1, type: "code", lang: "html", text: 'html\n<table><td row="1"></td></table>' }];
  const routed = routeMessage("the row is broken", builds);
  assert.equal(routed.tell, "resolved");
  assert.deepEqual(routed.matchedOn, ["row"]);

  // "named" and "anaphora" carry no span evidence to disclose — they are
  // already self-explaining from the tell alone, and evidenceOf says so
  // by omitting the field entirely rather than an empty array pretending
  // to be evidence.
  assert.equal(routeMessage("build 1 is broken", builds).matchedOn, undefined);
  assert.equal(routeMessage("it's broken", builds).matchedOn, undefined);
});

// ── the re-zero entry itself ────────────────────────────────────────────────

test("a re-zero is EVIDENCE · REC · Figure · produced, carrying the operator's words verbatim", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.rezeroBuild(log, {
    seg: { type: "code", lang: "html", code: "<p>b</p>" },
    code: "<p>b</p>",
    trigger: "I don't like the colors",
    tell: "judgment",
  });

  // entries: [PROPOSE] [REC concession] [NUL amended ask] [PROPOSE g2]
  const rec = log.entries[1];
  assert.equal(rec.kind, taskLog.ENTRY_KINDS.EVIDENCE);
  assert.equal(rec.operator, "REC");
  assert.equal(rec.grain, "Figure");
  assert.equal(rec.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  // The trigger is the reason the ground was conceded, and it is the
  // operator's sentence, not a paraphrase of it.
  assert.equal(rec.trigger, "I don't like the colors");
  assert.equal(rec.tell, "judgment");
  assert.equal(rec.concedes, "b1.v1");
  assert.equal(rec.concededVersion, 1);

  // The new ground is born the way any production is born, and does NOT
  // supersede — a re-zero concedes a ground, it does not compile a new whole
  // out of the old one.
  const seed = log.entries[3];
  assert.equal(seed.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(seed.operator, "INS");
  assert.equal(seed.task_id, "b1.g2.v1");
  assert.equal(seed.supersedes, undefined);
  assert.equal(seed.ground, 2);
});

test("a re-zeroed build is still editable, and the engine's checker stays silent", () => {
  // The whole reason a re-zero opens a ground: isProductionOrder("REC","SYN")
  // is FALSE, so a REC inside a thread would forbid every later edit on it.
  assert.equal(taskLog.isProductionOrder("SYN", "REC"), true);
  assert.equal(taskLog.isProductionOrder("REC", "SYN"), false);

  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.reviseBuild(log, { code: "<p>a1</p>", reason: "edit" });
  log = buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "it's broken" });
  log = buildLog.reviseBuild(log, { code: "<p>b1</p>", reason: "edit" });
  log = buildLog.rezeroBuild(log, { code: "<p>c</p>", trigger: "still wrong" });
  log = buildLog.reviseBuild(log, { code: "<p>c1</p>", reason: "edit" });

  assert.deepEqual(checkCubeProgression(log), []);
  const live = buildLog.foldBuild(log);
  assert.equal(live.code, "<p>c1</p>");
  assert.equal(live.ground, 3);
  assert.equal(live.version, 2);
  assert.equal(live.task_id, "b1.g3.v2");
  assert.equal(buildLog.groundCount(log), 3);
});

test("a run attaches to the ground that ran, and folds back there", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.attachRun(log, { params: { lang: "html" }, outcome: { ok: true, data: { rendered: true } } });
  log = buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "I don't like the colors" });
  assert.equal(buildLog.foldBuild(log).lastRun, null, "a new ground starts with no result of its own");
  assert.equal(buildLog.foldBuild(log, 1).lastRun.data.rendered, true);

  log = buildLog.attachRun(log, { params: { lang: "html" }, outcome: { ok: true, data: { rendered: true } } });
  const result = log.entries[log.entries.length - 1];
  assert.equal(result.task_id, "b1.g2.v1");
  assert.equal(result.operator, undefined, "results attach, they never re-type");
});

test("a re-zero that concedes nothing is churn, refused like an identical edit", () => {
  const seg = { type: "code", lang: "html", code: "<p>a</p>" };
  const log = buildLog.proposeBuild({ n: 1, turn: 1, seg, caption: "html" });
  assert.equal(buildLog.rezeroBuild(log, { seg, code: "<p>a</p>", trigger: "I don't like the colors" }), log);
});

test("a re-zero without the operator's words is refused — the reason is what makes it a re-zero", () => {
  const log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  assert.throws(() => buildLog.rezeroBuild(log, { code: "<p>b</p>" }), /trigger/);
  assert.throws(() => buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "  " }), /trigger/);
});

test("the cursor says why the ground moved, in the operator's own words", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "I don't like the colors" });
  log = buildLog.reviseBuild(log, { code: "<p>b1</p>", reason: "edit" });
  assert.deepEqual(
    buildLog.timeline(log).map((r) => r.label),
    ["v1 · built", "re-zero · ground 2 · I don't like the colors", "ask · I don't like the colors", "g2 v1 · rebuilt", "g2 v2 · edit"],
  );
  assert.deepEqual(buildLog.timeline(log).map((r) => r.operator), ["INS", "REC", "NUL", "INS", "SYN"]);
});

test("a log that never re-zeroes is addressed exactly as it always was", () => {
  // Ground 1 keeps the plain b<n>.v<k> address, so a stored log written
  // before grounds existed replays unchanged rather than migrating.
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "python", code: "print(1)" }, caption: "python" });
  log = buildLog.reviseBuild(log, { code: "print(2)" });
  assert.deepEqual(log.entries.map((e) => e.task_id), ["b1.v1", "b1.v2"]);
  assert.equal(log.entries[1].supersedes, "b1.v1");
  assert.equal(buildLog.groundCount(log), 1);
});

// ── the router's own walls ──────────────────────────────────────────────────

test("the tell is read from closed classes and the build's own bytes, never a word list", () => {
  // The widget's own words are what a definite phrase resolves against.
  const known = 'html\n<div id="counter" style="color:#f0f">0</div><button class="reset">+1</button>';

  // ANAPHORA — the form itself says the object is already here.
  for (const m of ["it's broken", "it doesn't work", "make it bigger", "center it", "this is hideous", "that's too big"])
    assert.equal(iterationTell(m, known), "anaphora", m);

  // JUDGMENT — negation with a first-person subject, LABELLING a tell that
  // still has to resolve: "the colors" resolves against the build's own
  // color: bytes through the register's inflection class (forms of one
  // referent — the quotient, not the spelling). A judgment of something
  // the build does not hold ("the palette") points at nothing and stays
  // unrouted — judging is not pointing.
  for (const m of ["I don't like the colors", "I don\u2019t like the colors"])
    assert.equal(iterationTell(m, known), "judgment", m);
  assert.equal(iterationTell("I do not like the palette", known), null);
  // A judgment that also carries an anaphor is reported as the anaphor: both
  // are true, and the pointer is the more specific fact.
  assert.equal(iterationTell("I do not like this palette", known), "anaphora");

  // RESOLUTION — a content word of the message is a form the artifact's
  // own bytes hold. No determiner needed on either side: "fix the counter"
  // and "fix counter" resolve identically, because the reading is of
  // forms, not grammar words.
  for (const m of ["fix the counter", "the button does nothing", "the button is wrong", "buttons bigger please"])
    assert.equal(iterationTell(m, known), "resolved", m);

  // A demand whose words resolve into NOTHING built stays unrouted — the
  // introduction of something new needs no article to say so; its words
  // simply are not this artifact's.
  for (const m of [
    "make me a countdown timer",
    "build a dashboard",
    "write a python script",
    "give me an svg logo",
    "another one, but for temperature",
  ])
    assert.equal(iterationTell(m, known), null, m);

  // The material's questions stay the material's — no possessive, no
  // anaphor, and nothing in them that this widget's bytes contain.
  for (const m of [
    "what does the report say about funding",
    "who is mentioned most often",
    "summarise the third chapter",
    "",
  ])
    assert.equal(iterationTell(m, known), null, m);
});

test("a definite phrase the artifact does not contain does not route — the stated limit", () => {
  // Disclosed in this module's header rather than bought back with a verb
  // list: the list would have caught this one phrasing and silently
  // mis-routed every phrasing outside itself.
  const known = 'html\n<div id="counter">0</div>';
  assert.equal(iterationTell("change the background to blue", known), null);
  // The affordance is narrower, never absent: an anaphor routes the same ask.
  assert.equal(iterationTell("make it blue", known), "anaphora");
  // And it resolves once the artifact does contain the thing.
  assert.equal(iterationTell("change the background to blue", 'html\n<div style="background:#fff">0</div>'), "resolved");
  // Inflection resolves through the register's received class — forms of
  // one referent (colors ↔ color:). Dialect spelling does NOT (colour needs
  // a received spelling prior with its own giver; a missing giver is a
  // wall, never a derivation) — the typed limit, stated.
  assert.equal(iterationTell("the colors are wrong", 'html\n<b style="color:#fff">x</b>'), "resolved");
  assert.equal(iterationTell("the colours are wrong", 'html\n<b style="color:#fff">x</b>'), null);
});

test("the closed classes come from the engine's register, never from this repo", () => {
  // The register is the giver (Amendment IV): every class names where it came
  // from. A router built on lists this repo typed out would have no giver to
  // name, which is the whole difference.
  assert.equal(enginePriors.INDEFINITE_DETERMINERS_META.giver, "lang/en");
  assert.equal(enginePriors.ANAPHORIC_PRONOUNS_META.giver, "lang/en");
  assert.equal(enginePriors.DEFINITE_DETERMINERS_META.giver, "lang/en");
  assert.equal(enginePriors.NEGATION_WORDS_META.giver, "lang/en");
  assert.equal(enginePriors.INFLECTIONAL_SUFFIXES_META.giver, "lang/en");
  // And a router handed something that is not the register refuses to exist.
  assert.throws(() => makeWidgetRouter({}), /prior register/);
  assert.throws(
    () => makeWidgetRouter({ ...enginePriors, ANAPHORIC_PRONOUNS: new Set() }),
    /ANAPHORIC_PRONOUNS/,
  );
});

test("a creation demand carrying a pointer now routes BY the pointer — the doctrine flip, disclosed", () => {
  // Before: any indefinite determiner vetoed routing, so "make me another
  // one, I don't like the colors on this" forked a sibling. The user
  // refused the veto outright ("no hardcoded list of english articles"),
  // and the cost cuts the other way now: a demand-for-a-sibling whose
  // words also point at the existing build ROUTES TO IT. Both errors
  // existed; this doctrine chooses resolution over introduction because
  // resolution is a reading and introduction-by-article was a word list.
  // The residue is disclosed here, not papered over: an operator who
  // wants a true sibling of an existing build says so without pointing
  // ("make me a second counter in html" forks — nothing resolves), or
  // forks from the panel.
  const known = 'html\n<div style="color:#f0f">0</div>';
  assert.equal(iterationTell("make me another one, I don't like the colors on this", known), "judgment");
  assert.equal(iterationTell("that's broken — build a new one from scratch", known), "anaphora");
  // Without a resolving word or an anaphor, a creation demand stays its
  // own act, articles or none.
  assert.equal(iterationTell("make me another one, nicer", known), null);
});

test("the number is the reference, and it is read from the operator, never the model", () => {
  const html = { type: "code", lang: "html", code: "<p>x</p>" };
  const builds = [
    { n: 1, type: "code", lang: "html" },
    { n: 2, type: "code", lang: "html" },
  ];
  assert.equal(routeSegment(html, "build 1 is broken", builds).n, 1);
  assert.equal(routeSegment(html, "it's broken", builds).n, 2, "unnamed goes to the present one");
  // A number that names no build of this kind forks rather than guessing.
  assert.equal(routeSegment(html, "build 7 is broken", builds).kind, "new");
});

test("routing carries the trigger, capped, so the re-zero can record it", () => {
  const html = { type: "code", lang: "html", code: "<p>x</p>" };
  const builds = [{ n: 1, type: "code", lang: "html", text: 'widget <b style="color:#eee">x</b>' }];
  const route = routeSegment(html, "  I don't\n like  the colors  ", builds);
  assert.equal(route.kind, "rezero");
  assert.equal(route.trigger, "I don't like the colors", "whitespace folded, words untouched");
  assert.equal(route.tell, "judgment");

  const long = routeSegment(html, `it's broken ${"x".repeat(500)}`, builds);
  assert.equal(long.kind, "rezero");
  assert.ok(long.trigger.length <= 200);
  assert.ok(long.trigger.endsWith("…"), "the cap is visible, never a silent truncation");
});

test("with nothing of this kind built, every turn is a new build", () => {
  const html = { type: "code", lang: "html", code: "<p>x</p>" };
  assert.equal(routeSegment(html, "it's broken", []).kind, "new");
  assert.equal(routeSegment(html, "it's broken", [{ n: 1, type: "code", lang: "python" }]).kind, "new");
  assert.equal(routeSegment(html, "it's broken", [{ n: 1, type: "table" }]).kind, "new");
});

test("language aliases are one runtime, not two builds", () => {
  const js = { type: "code", lang: "js", code: "1" };
  assert.equal(routeSegment(js, "it's broken", [{ n: 1, type: "code", lang: "javascript" }]).kind, "rezero");
  const sh = { type: "code", lang: "bash", code: "ls" };
  assert.equal(routeSegment(sh, "it's broken", [{ n: 1, type: "code", lang: "shell" }]).kind, "rezero");
});

test("a determiner is read on the MATCHED term's own phrase — introducing never routes, pointing still does", () => {
  const known = 'html\n<div id="counter" style="color:#f0f">0</div><button class="button">+1</button>';

  // THE SYMMETRIC FALSE POSITIVE (2026-08-18 diagnosis): a birth request
  // whose indefinite phrase happens to share a word with a standing build.
  // Content-word overlap alone cannot tell "introduces a referent that
  // shares a word" from "points at something already here"; the determiner
  // governing the matched term's own phrase can, and it is the register's
  // own closed class ("an indefinite determiner INTRODUCES its noun" —
  // priors.js, giver lang/en), never a word list of this repo's.
  for (const m of ["make me a counter widget", "build me a counter for laps", "I want another counter"])
    assert.equal(iterationTell(m, known), null, m);

  // THE CANONICAL COMPLAINT that killed the old per-message veto stays
  // routable — this is why the reading is PER TERM: "the counter" and
  // "the buttons" point while "some color" in the same sentence
  // introduces. The old veto refused the whole message for the one
  // indefinite; the old deletion routed the birth request above. Both
  // pinned here so the decision does not oscillate a third time.
  assert.equal(
    iterationTell("I don't like the counter widget, make the buttons bigger with some color", known),
    "judgment",
  );

  // Definite and bare terms keep pointing exactly as before — the
  // determiner reading only ever SUPPRESSES an introduced term, so nothing
  // routable yesterday stops routing today.
  assert.equal(iterationTell("fix counter", known), "resolved");
  assert.equal(iterationTell("the counter is off by one", known), "resolved");

  // The determiner walk stays inside its own clause: the indefinite in the
  // second clause cannot reach back and suppress the pointer in the first.
  assert.equal(iterationTell("the counter is broken, give me a fix", known), "resolved");

  // The routers agree with the tell, both faces.
  const builds = [{ n: 1, type: "code", lang: "html", text: known }];
  assert.equal(routeMessage("make me a counter widget", builds), null);
  assert.equal(
    routeSegment({ type: "code", lang: "html", code: "<p>new</p>" }, "make me a counter widget", builds).kind,
    "new",
  );
  assert.equal(routeMessage("I don't like the counter", builds)?.n, 1);

  // The disclosed evidence is what DROVE the decision: an introduced term
  // never appears in matchedOn — a match the router declined to act on
  // must not ride the record as if it had.
  const routed = routeMessage("I don't like the counter, give it some color", builds);
  assert.equal(routed?.n, 1);
  assert.ok(routed.matchedOn.includes("counter"));
  assert.ok(!routed.matchedOn.some((t) => t.startsWith("color")));
});
