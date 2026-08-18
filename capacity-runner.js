// capacity-runner.js — the one capacity actually executed from the
// terminal this pass: `cast` (cast.js::makeReferentIndex, over the
// engine's own perceiver organs). capacities.js's own header is explicit
// that its registry is "A DATA TABLE, NOT A RUNTIME" — this is the
// runtime, kept in its own file so that boundary stays visible rather than
// blurred into either the data table or the pure grid parser.
//
// Every OTHER registered capacity stays reference-only: asking to run one
// is a typed gap (`not_yet_executable`), never a silent no-op and never a
// fabricated result. Wiring the rest is named future work in CLAUDE.md, not
// implied done by this file existing.
//
// PURE, ORGANS INJECTED (the cast.js pattern, one level up): the real
// engine perceiver functions arrive as `referentIndexFor`, already bound
// by the caller (app.js reuses the exact organ bundle it already
// constructs for castFor/handlesFor/relationsFor — no new engine import),
// so this module loads by relative path in tests and needs nothing of its
// own from `/engine`.
//
// DISCLOSED, NOT SILENTLY ABSENT — two limits an adversarial review of this
// increment found and neither is fixed here, on purpose, under time
// pressure that would have risked a worse fix:
//
// 1. RUNS SYNCHRONOUSLY ON THE CALLING THREAD, with no size bound and no
//    interrupt. term.js's OTHER runtimes (js/python/sql) exist as Workers
//    specifically so a long-running or unbounded computation cannot freeze
//    the page and CAN be killed (term.js's own ✕/ctrl+c) — this capacity
//    runner has neither property. On a small excerpt this is instant; on a
//    large loaded source, `referentIndexFor` (cast.js → the engine's
//    `extractSurfaces`/`discoverReferents`) could take real, unbounded
//    time on the main thread with nothing the reader can do but wait. The
//    same disclosed posture skills.js already carries for its own
//    synchronous-body hole ("the run budget guards await points, and a
//    synchronous spin inside a body is the one hole it does not cover") —
//    named here rather than silently shipped as if it were bounded. Moving
//    capacity execution into a worker (mirroring term-py-worker.mjs's own
//    shape) is the natural fix and is not attempted in this pass.
//
// 2. A RESULT ATTACHED TO A LATER-SUPERSEDED ACT DISAPPEARS FROM THE LIVE
//    FOLD WITH IT. This is `grid.js`'s own append-only supersession rule,
//    applied consistently (task-log.js: "superseded tasks drop out of the
//    live set — but nothing is deleted from `log.entries`") — a cast
//    result attached to a `distinguish`'s INS entry is exactly as durable
//    as the entry it rides on, recoverable from the raw log at an earlier
//    cursor, gone from `foldGrid`'s live view once that entry is
//    superseded. Confirmed live, worth stating plainly rather than
//    assuming a reader infers it: `distinguish` lands TWO entries (SIG
//    then INS) and only the INS one ever carries a cast result; a `revise
//    … supersedes <the SIG id>` (superseding the wrong half of the pair)
//    leaves an orphaned INS-only entry with its result still live but no
//    surviving SIG partner in the fold — the pair is not kept atomic
//    under supersession. Not attempted here.

/**
 * `makeCapacityRunner({ referentIndexFor })` → `runCapacity(id, { text,
 * name })`. `referentIndexFor` is `cast.js::makeReferentIndex(organs)` —
 * a function from passages to `{ events, referents, resolve, represent }`.
 */
export function makeCapacityRunner({ referentIndexFor }) {
  return function runCapacity(id, { text, name } = {}) {
    if (id !== "cast") {
      return {
        gap: "not_yet_executable",
        id,
        detail: `"${id}" is in the capacity registry but not yet wired to run from the terminal — only "cast" executes this pass (capacities.js, CLAUDE.md: "the terminal language" section names the rest as open).`,
      };
    }
    if (!text || !text.trim()) {
      // This module only ever sees bytes (or their absence) — it cannot
      // itself distinguish "no source by this name is loaded" from "one
      // is loaded and it is empty." Callers that can tell the two apart
      // (term.js checks source-key presence before ever calling this) do
      // so on their own side; the wording here stays true either way.
      return { gap: "no_material", id, detail: `no material to read for "${name ?? "?"}" — either nothing by that name is loaded, or what is loaded there is empty` };
    }
    const index = referentIndexFor([{ text }]);
    const referents = [...index.referents]
      .map((rid) => ({ id: rid, surface: index.represent(rid) }))
      .sort((a, b) => a.surface.localeCompare(b.surface));
    return { id, name: name ?? null, count: referents.length, referents };
  };
}

// ── landAct: the one shared "parse a line, land it, maybe execute a
// capacity" orchestration (added when the chat grew its own /act door
// alongside the terminal's) ─────────────────────────────────────────────
//
// Before this, "distinguish's ground names an already-loaded source →
// run cast for real → attach the result" lived ONLY inside term.js's own
// `act` fold-command handler — the CHECK (`parsed.event.verb ===
// "distinguish" && parsed.event.ground && Object.hasOwn(sources,
// parsed.event.ground)`) was policy, not formatting, and policy embedded
// in one DOM-bound handler is exactly the shape of bug this pass's own
// postmortem already caught twice (grid.test.mjs: DEF/EVA's Array.find
// first-match bug, synthesize's String.includes substring bug — both
// "one correct implementation, and a second place nobody kept in sync
// with it," just not yet a SECOND place at the time they were fixed). The
// chat's /act door needs the identical policy, so rather than copy the
// check into app.js and hope the two never drift, it moved here once and
// both callers (term.js's `act` handler, app.js's `actTurn`) call this.
//
// This is still not a third module's worth of scope: it composes grid.js
// (injected as `grid`, the same `makeGrid(...)` instance both callers
// already hold) and `runCapacity` (this file's own export, above) — no
// new engine import, no new organ.

/**
 * Parse `line` against `grid`, land it on `log`, and — only when it lands
 * as a `distinguish` whose `ground` clause names an ALREADY-LOADED source
 * (checked by key presence in `sources`, not truthiness, so "nothing by
 * that name is loaded" and "what's loaded there is empty" stay the two
 * different, correctly-typed facts term.js's own comment already
 * documented) — run `cast` for real and attach the referents found as a
 * RESULT on the act's own INS entry.
 *
 * Returns `{ ok: false, refusal }` on a parse/grammar refusal (nothing
 * lands, `log` is untouched), or `{ ok: true, log, ids, event, capacity }`
 * where `capacity` is `null` when no capacity was triggered (an ordinary
 * act, OR a `ground` candidate naming nothing loaded — deliberately
 * silent either way, matching the disclosed rule above), or
 * `{ result }` when one was: `result.gap === "no_material"` on real-but-
 * empty material (nothing attached), otherwise the real referents `cast`
 * found (`{ id, name, count, referents }`, attached).
 *
 * Callers own ALL formatting/recording — this function only computes what
 * landed and what (if anything) ran; it never touches a DOM, a chat
 * message, or the durable record itself.
 */
export function landAct(grid, log, line, { sources = {}, runCapacity } = {}) {
  const parsed = grid.parseAct(line, { log });
  if (!parsed.ok) return { ok: false, refusal: parsed.refusal };
  const { log: landedLog, ids } = grid.land(log, parsed.event);
  let finalLog = landedLog;
  let capacity = null;
  if (parsed.event.verb === "distinguish" && parsed.event.ground && runCapacity && Object.hasOwn(sources, parsed.event.ground)) {
    const result = runCapacity("cast", { text: sources[parsed.event.ground], name: parsed.event.ground });
    if (result.gap !== "no_material") {
      const insId = ids[ids.length - 1];
      const attached = grid.attachResult(finalLog, insId, result);
      if (attached.ok) finalLog = attached.log;
    }
    capacity = { result };
  }
  return { ok: true, log: finalLog, ids, event: parsed.event, capacity };
}
