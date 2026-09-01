// segmentation.js — a segment's own extent, and a pronoun's own referent,
// are claims like any other: PROPOSE at first sighting, SUPERSEDE when a
// LATER cursor's evidence revises them, REC when a stated ground is
// conceded. Never a silent recomputation; never a backdated correction.
//
// THE FAILURE THIS CLOSES. Found reading Bram Stoker's Dracula in full for
// the first time (2026-09-01, eo-constitution claims
// blank-furniture-sentence-drift and resolve-pronouns-sentence-drift):
// hypergraph.js used to rewrite a whole passage's text (pronoun subjects
// substituted, table furniture blanked) and then RE-SPLIT the rewritten
// copy, pairing its sentence COUNT against the original's. A single
// substituted surface carrying a title abbreviation ("Dr.", "Mrs.") is
// enough to desynchronize that count anywhere in an 800,000-character
// document, and because the check was PASSAGE-SCOPED, one such mismatch
// zeroed the span on every one of 15,149 extracted edges at once.
//
// hypergraph.js's own restructuring (2026-09-01, same pass) closes the
// re-split half: every rewrite now applies WITHIN one already-fixed
// original sentence, never across a re-split whole document, so there is
// no second count to disagree with the first. This module closes the
// second, sharper half, found while fixing the first — user direction,
// verbatim: "what if the first assertion of punctuation is wrong? we have
// a whole intelligence of search and seek and stuff. and yes its all
// append only" — and, on the referent-binding side: "now a reading later
// can always CHANGE our past reading, sometimes we get HE before the INS
// the character."
//
// TWO KINDS OF CLAIM, ONE SHAPE. An `extent` claim is "this span, read at
// this document position, is one sentence, with this text." A `binding`
// claim is "this pronoun occurrence, at this document position, refers to
// this referent." Both are SEG·Figure acts by the SAME reasoning
// `hyperlexicon.js`'s own header already gives for assertions being
// INS·Figure: a first sighting is a birth, a later sighting that changes
// nothing teaches nothing and appends nothing, a later sighting that
// DISAGREES is a witnessed SUPERSEDE, never an overwrite.
//
// THE CURSOR IS THE WHOLE POINT (S3: "lookahead is not reading"; P1:
// "recall is retrieval"). Every entry carries `cursor` — the document
// reading-order position (a byte offset, or a sentence's own `order`) the
// evidence for THIS entry was actually available at. The rule this module
// enforces, and the ONLY rule it enforces:
//
//   A correction's own cursor may never be EARLIER than the cursor already
//   on record for the thing it corrects.
//
// That is not "the past may never be revised" — it is exactly the
// opposite, stated precisely: the past MAY be revised, by evidence that
// arrived later, PROVIDED the correction is honestly dated to when that
// evidence actually arrived. What is refused is a correction pretending to
// have been available earlier than it was — the exact shape of the bug
// this module closes (a referent's fuller name, first individuated at
// document position 245,430, silently substituted into a pronoun at
// position 50,695, with nothing on any record marking that the knowledge
// came from 195,000 characters in the future).
//
// PURE, ORGANS INJECTED (the cast.js/hyperlexicon.js pattern): the engine's
// task-log primitives arrive as arguments, so this module reads no engine
// of its own and the page can load them from a mount.

/** The one identity for an extent claim: a span is what it is BY POSITION. */
export const extentId = (ref, start, end) => `extent:${ref}#${start}-${end}`;

/** The one identity for a binding claim: an occurrence is what it is BY POSITION. */
export const bindingId = (ref, offset, pronoun) => `binding:${ref}#${offset}:${String(pronoun ?? "").toLowerCase()}`;

/**
 * The one identity for a REFERENT-INDIVIDUATION claim: does this SURFACE
 * name its own being, or is it a fragment of a longer one? Keyed by the
 * surface string, not by position — unlike an extent or a binding, this
 * claim is about the SAME question every time the surface recurs, not
 * about one occurrence.
 *
 * WHY THIS EXISTS (user direction, 2026-09-01, verbatim): "even the act of
 * dividing things up is itself an art more than science, it is finding
 * signal from noise, and we can realize we were wrong... even if we got
 * confused and thought Van was a person in a sentence and wrote it as
 * such, we should be able to evolve the referent over time and get
 * realigned." Individuation (eoreader7's surfaces.js::discoverReferents)
 * is a ONE-SHOT batch decision today — a bare token like "Van" is admitted
 * as its own referent based on whatever the algorithm's own generic-fence
 * and partner-count rules concluded, and NOTHING revises that conclusion
 * as more of a document is read. This claim type is where that revision
 * lands: PROPOSE at first individuation, REC when later evidence — a
 * measured, exact, DECLARED signal, never a guess — shows the "referent"
 * was never independent at all, and a corrected PROPOSE naming what it
 * actually folds into.
 */
export const referentClaimId = (ref, surface) => `referent:${ref}#${String(surface ?? "").trim().toLowerCase()}`;

export const REFUSALS = Object.freeze({
  /** A correction's own cursor is earlier than the standing entry's. */
  BACKDATED: "backdated",
  /** No prior standing entry exists for the task this call names as `supersedes`/`concedes`. */
  NO_STANDING: "no_standing",
  /** The cursor itself is missing or not a finite number — every entry is dated or it does not land. */
  NO_CURSOR: "no_cursor",
});

export function makeSegmentation(taskLog) {
  const { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS, GRAIN_RANK } = taskLog;
  const FIGURE = Object.keys(GRAIN_RANK).find((g) => GRAIN_RANK[g] === 1);

  const createLog = () => createTaskLog();

  // NO cellFields() HERE, ON PURPOSE — task-log.js::projectTasks already
  // computes `cell` itself, from `operator`+`grain`, the moment both are on
  // the entry: `cellOf(nextOperator, nextGrain)`, a real {op, grain, mode,
  // domain, terrain, stance} object. A caller-supplied `cell` FIELD on the
  // entry is silently OVERWRITTEN by that computation on every projection —
  // found by this module's own test suite asserting against it and getting
  // the raw object back where a hand-built string was expected.
  // hyperlexicon.js writes the identical string under the identical key and
  // has the SAME defect, invisibly, only because nothing there ever reads
  // `.cell` back off a projected task (foldHyperlexicon never surfaces it).
  // The fix here is not to fight projectTasks's own computation — it is
  // free, correct, and already running — so this module supplies only
  // `operator`/`grain` and reads `standing.cell.op`/`.grain`/`.stance`/
  // `.terrain`/`.mode`/`.domain` straight off what task-log.js already
  // computed, never a second copy.

  const standingOf = (log, taskId) => projectTasks(log).find((t) => t.task_id === taskId) ?? null;

  /**
   * propose(log, {taskId, cursor, payload}, {witness}) — first sighting or
   * an unchanged re-sighting (a no-op, exactly `hyperlexicon.js::hear`'s own
   * rule: a re-sighting that teaches nothing appends nothing).
   */
  function propose(log, { taskId, cursor, payload = {} } = {}, { witness = null } = {}) {
    if (!Number.isFinite(cursor)) return { log, refused: { type: REFUSALS.NO_CURSOR, detail: "every claim is dated — cursor is the document reading-order position this evidence was available at" } };
    const prior = standingOf(log, taskId);
    if (prior && prior.cursor === cursor && sameShape(prior.payload, payload)) return { log, refused: null, noop: true };
    const kind = prior ? ENTRY_KINDS.SUPERSEDE : ENTRY_KINDS.PROPOSE;
    const operator = prior ? "SYN" : "INS";
    const next = append(log, {
      kind, task_id: taskId, operator, operator_basis: OPERATOR_BASIS.PRODUCED, grain: FIGURE,
      description: `${prior ? "revised" : "proposed"}: ${taskId}`,
      cursor, payload, witnesses: witness ? [witness] : [],
    });
    return { log: next, refused: null, noop: false };
  }

  /**
   * concede(log, {taskId, cursor, trigger}, {witness}) — REC, mirroring
   * `grid.js::concedeEvaluation` exactly: the ground is conceded before
   * anything new attaches, carrying the trigger verbatim, no `supersedes`
   * (a concession ends a thread, it does not compile a new whole from it).
   *
   * Refused BACKDATED if `cursor` is earlier than the standing entry's own
   * cursor — the one enforcement this whole module exists for.
   */
  function concede(log, { taskId, cursor, trigger } = {}, { witness = null } = {}) {
    if (!Number.isFinite(cursor)) return { log, refused: { type: REFUSALS.NO_CURSOR, detail: "a concession is dated too — when was this ground given up?" } };
    const prior = standingOf(log, taskId);
    if (!prior) return { log, refused: { type: REFUSALS.NO_STANDING, taskId, detail: "nothing stands to concede — propose it first" } };
    if (cursor < prior.cursor) {
      return {
        log,
        refused: {
          type: REFUSALS.BACKDATED, taskId, standingCursor: prior.cursor, proposedCursor: cursor,
          detail: `a correction dated at ${cursor} cannot concede a claim already standing as of ${prior.cursor} — the evidence must have arrived AT OR AFTER what it revises, or this is a backdated correction, not a real one`,
        },
      };
    }
    const next = append(log, {
      kind: ENTRY_KINDS.EVIDENCE, task_id: taskId, operator: "REC", operator_basis: OPERATOR_BASIS.PRODUCED, grain: FIGURE,
      description: `conceded: ${taskId}`,
      concedes: taskId, cursor, because: trigger ?? null, witnesses: witness ? [witness] : [],
    });
    return { log: next, refused: null, noop: false };
  }

  /**
   * correct(log, {taskId, cursor, payload, trigger}, {witness}) — the
   * composed operation this module is actually for: concede the standing
   * claim (REC, dated and guarded), then propose the revised one fresh, at
   * the SAME cursor as the concession — the moment the new evidence
   * arrived, never backdated to the position being corrected.
   *
   * This is how "a later reading changes our past reading" is done
   * honestly: `taskId` still names the ORIGINAL span or occurrence (so a
   * reader asking "what does the record say about position 50,695 now"
   * finds the correction), but `cursor` on the new entry says truthfully
   * WHEN that correction became knowable — 245,430, not 50,695.
   */
  function correct(log, { taskId, cursor, payload, trigger } = {}, { witness = null } = {}) {
    const conceded = concede(log, { taskId, cursor, trigger }, { witness });
    if (conceded.refused) return conceded;
    return propose(conceded.log, { taskId, cursor, payload }, { witness });
  }

  /** The live standing for one ref: every non-conceded entry, sorted by position. */
  function fold(log, ref) {
    return projectTasks(log)
      .filter((t) => t.task_id.startsWith(`extent:${ref}#`) || t.task_id.startsWith(`binding:${ref}#`))
      .filter((t) => t.operator !== "REC" || !isConceded(log, t.task_id)) // a REC entry itself never stands as content
      .map((t) => ({ taskId: t.task_id, cursor: t.cursor, payload: t.payload, witnesses: t.witnesses ?? [] }))
      .sort((a, b) => a.cursor - b.cursor);
  }

  function isConceded(log, taskId) {
    return log.entries.some((e) => e.kind === ENTRY_KINDS.EVIDENCE && e.operator === "REC" && e.concedes === taskId);
  }

  return { createLog, propose, concede, correct, fold, standingOf, REFUSALS };
}

function sameShape(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}
