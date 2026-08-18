// term-lessons.js — the terminal's own tutor. Pure and mechanical (P18's
// posture): a fixed script of steps, each with a regex the learner's own
// typed line either matches or doesn't. No model reads this, no model
// grades it — the terminal is quizzing you on itself, nothing more.
//
// Kept separate from term.js so the lesson content is a plain data walk,
// testable without a DOM.

export const LESSONS = [
  { id: "help", match: /^help$/i, ask: "Every session starts the same way — type `help` to see everything this terminal can do.", done: "That's the whole map. Everything below comes from that list." },
  { id: "runtimes", match: /^runtimes$/i, ask: "Type `runtimes` — what can actually run here, and what's refused (with a reason).", done: "fold, js, python, sql. The refusals are typed, not a shrug — try `bash` sometime, it'll tell you exactly why not." },
  { id: "sources", match: /^sources$/i, ask: "Type `sources` — what's loaded into this session right now.", done: "Whatever's loaded is what `search` and `read` and the runtimes can see." },
  { id: "search", match: /^search\s+\S+/i, ask: "Type `search <word>` — try any word, e.g. `search the`.", done: "That's term-overlap retrieval — the same match the chat's evidence table counts." },
  { id: "folds", match: /^folds$/i, ask: "Type `folds` — the folds pane's own logs, from here.", done: "Every fold is an append-only log; this is how the terminal reads it." },
  { id: "enter-js", match: /^js$/i, ask: "Now a runtime. Type `js` to enter the JavaScript sandbox — its network is severed (P18).", done: "You're inside the js runtime now. The prompt changed to `js ›`." },
  { id: "run-js", match: /^(?!exit$).+/i, ask: "Run something — anything. Try `2 + 2`.", done: "That ran in a Worker with fetch, XMLHttpRequest, WebSocket and friends all severed — checked live in term.test.mjs." },
  { id: "exit-js", match: /^exit$/i, ask: "Type `exit` to leave the runtime and come back to `fold ›`. It stays warm — you could re-enter without rebooting it.", done: "Back in fold. The js runtime is still alive in the background." },
  { id: "enter-python", match: /^python$/i, ask: "Type `python` — pyodide, vendored, stdlib only. No pip: P1 allows nothing remote.", done: "You're in `py ›` now. First boot pulls ~13MB from this page's own vendored copy, nothing off-host." },
  { id: "exit-python", match: /^exit$/i, ask: "Type `exit` again to leave python.", done: "Back in fold." },
  { id: "enter-sql", match: /^sql$/i, ask: "Type `sql` — sqlite via sql.js. `.load <source>` would import a loaded CSV as a table.", done: "You're in `sql ›`. Any CSV in `sources` can become a table here." },
  { id: "exit-sql", match: /^exit$/i, ask: "Type `exit` once more to leave sql.", done: "Back in fold — all three runtimes you visited are still warm." },
  { id: "clear", match: /^clear$/i, ask: "`clear` wipes the screen. Type it now.", done: "Done. That's the whole sandboxed side — but this terminal also speaks a second, smaller language." },
  { id: "grid-legend", match: /^grid\s+legend$/i, ask: "Type `grid legend` — nine operators, nine terrains, nine postures, one grammar. The cheat sheet.", done: "Those are the eight verbs and the four named stances. An act is one verb, aimed at one terrain, held from one stance." },
  { id: "act-distinguish", match: /^act\s+distinguish\s+\S+\s+at\s+entity\s+from\s+encounter\s+ground\s+\S+\s+broken:\S+/i, ask: "Compose one. Type exactly: `act distinguish idea at Entity from encounter ground something broken:rotation`", done: "That landed on this session's own log — never saved, gone on reload. `grid` shows what's on it." },
  { id: "grid-fold", match: /^grid$/i, ask: "Type `grid` with no argument — the fold: everything landed so far, in order.", done: "That's every act you've composed, each one typed by operator and terrain." },
  { id: "capacities", match: /^capacities$/i, ask: "Last one: type `capacities` — the small, real things `synthesize` and a loaded-material `distinguish` can check themselves against.", done: "Only `cast` actually reads anything today. If a file is attached, try `act distinguish x at Entity from encounter ground <its name> broken:rotation` for a real read — it names who or what it finds. `help` any time you forget one of these — this lesson just walked its own list." },
];

/** Advance the lesson state by one typed line. Pure: no DOM, no I/O.
 * `at` is the current lesson index (or null if no lesson is running).
 * `tries` counts consecutive misses on the current step, for the hint. */
export function stepLesson(at, tries, raw) {
  if (at == null || at >= LESSONS.length) return { at: null, tries: 0, event: "inactive" };
  const step = LESSONS[at];
  if (step.match.test(raw.trim())) {
    const next = at + 1;
    if (next >= LESSONS.length) return { at: null, tries: 0, event: "finished", done: step.done };
    return { at: next, tries: 0, event: "advanced", done: step.done, ask: LESSONS[next].ask };
  }
  const t = tries + 1;
  return { at, tries: t, event: t >= 2 ? "hint" : "miss", ask: step.ask };
}
