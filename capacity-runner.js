// capacity-runner.js — TWO capacities actually execute from the terminal
// as of 2026-08-19: `cast` (cast.js::makeReferentIndex) and `relations`
// (hypergraph.js::makeRelationReader, capacities.js's own `terrain: "Link"`
// entry, wired the same day the fillers/queryReferents work landed —
// "can we now mechanically query the entire hypergraph" / "make sure this
// work with the sandboxed terminal too"). capacities.js's own header is
// explicit that its registry is "A DATA TABLE, NOT A RUNTIME" — this is the
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

import { chunkSource } from "./source.js";

/**
 * `makeCapacityRunner({ referentIndexFor, relationsFor })` →
 * `runCapacity(id, { text, name, query })`. `referentIndexFor` is
 * `cast.js::makeReferentIndex(organs)`; `relationsFor` is
 * `hypergraph.js::makeRelationReader(organs)` — the SAME organ bundle
 * app.js already builds for both (no new engine import).
 *
 * A SECOND capacity executes as of 2026-08-19 (user direction: "can we now
 * mechanically query the entire hypergraph" / "make sure this work with
 * the sandboxed terminal too") — `"relations"`, capacities.js's own
 * `terrain: "Link"` entry, sitting unwired since the terminal language
 * landed. `query` is optional: omitted, the capacity returns the whole
 * edge graph the material binds (the same "dump everything found" default
 * `cast` already has with no further refinement); given, it must leave
 * EXACTLY ONE of subject/object open (`hypergraph.js::queryReferents`'s
 * own contract — "who did Lincoln appoint" or "who appointed Hamlin,"
 * never both pinned or both open) and returns the distinct referent-aware
 * fillers for that slot, each with its own addresses. Referent-aware, not
 * a surface-string match: this runs INSIDE the reader's own closure, so
 * "Lincoln" and "President Lincoln" resolve by the same identity judge()
 * itself trusts (the standalone hypergraph.js::queryEdges/queryFillers are
 * the weaker, no-organs-needed siblings of this, disclosed as such in
 * their own header).
 */
export function makeCapacityRunner({ referentIndexFor, relationsFor }) {
  return function runCapacity(id, { text, name, query, claim } = {}) {
    if (id !== "cast" && id !== "relations") {
      return {
        gap: "not_yet_executable",
        id,
        detail: `"${id}" is in the capacity registry but not yet wired to run from the terminal — only "cast" and "relations" execute this pass (capacities.js, CLAUDE.md: "the terminal language" section names the rest as open).`,
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
    if (id === "cast") {
      const index = referentIndexFor([{ text }]);
      const referents = [...index.referents]
        .map((rid) => ({ id: rid, surface: index.represent(rid) }))
        .sort((a, b) => a.surface.localeCompare(b.surface));
      return { id, name: name ?? null, count: referents.length, referents };
    }
    if (!relationsFor) {
      return { gap: "not_yet_executable", id, detail: `"relations" is registered but this page has not wired relationsFor in yet` };
    }
    // Real addresses, not a bare unaddressed blob: `cast` doesn't need refs
    // (it reports referent identities, not evidence), but a "relations"
    // result IS evidence — an edge or a filler with no address is a claim
    // with nothing a reader can verify it against. chunkSource is the
    // SAME chunker every attachment/preflight/priors source in this app
    // already goes through (source.js) — one addressing scheme, not a
    // second one invented for the terminal.
    const reader = relationsFor(chunkSource(name ?? "material", text));
    if (!reader.examined) {
      return { gap: "no_material", id, detail: `no relation vocabulary could be measured for "${name ?? "?"}"` };
    }
    // `claim` is EVA's own door: not a query over the graph (which/what
    // filler for an open slot) but a JUDGMENT of one stated claim against
    // it, via hypergraph.js's real `read(answer)` — the SAME judge()
    // every material-grounded chat answer is already checked against, so
    // an evaluate act gets no weaker a check than an ordinary turn does.
    // `claims` carries each sentence's own verdict (bound/contradicted/
    // unbound/beyond-reach/unheard/competing) with its real provenance
    // (`nearest`/`bound` edges, each an edgeFace carrying `refs`) — never
    // collapsed here into a caller's yes/no; that collapse, and the
    // deliberate refusal to guess on the three non-committal verdicts, is
    // `landAct`'s job below, not this dispatch's.
    if (claim) {
      const judged = reader.read(claim);
      // `edges` (the material's own real graph, not just this claim's
      // verdict) rides along too — squaring checks POLARITY; a bound
      // verdict can still be wrong in a second, different way a polarity
      // check cannot see (see checkObjectSpecificity below), and that
      // check needs the real matched edge's own object text, not just
      // the collapsed bound/contradicted/unbound label.
      return { id, name: name ?? null, claim, claims: judged.claims, edges: judged.edges };
    }
    if (!query) return { id, name: name ?? null, count: reader.edges.length, edges: reader.edges };
    const fillers = reader.queryReferents(query);
    if (fillers === null) {
      return {
        gap: "bad_query",
        id,
        detail: 'exactly one of subject/object must be left open — "who did X verb" or "who verb Y", never both pinned or both open',
      };
    }
    return { id, name: name ?? null, query, count: fillers.length, fillers };
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

// ── squaring polarity — a caller-side check, not an engine fix ─────────────
//
// hypergraph.js's own extractRelations reads a claim's polarity off a
// negation-scope window that (measured live, real diagnostic, not assumed)
// only ever tests text through the end of the SUBJECT capture — it never
// reaches the verb-to-object span. "Lincoln never appointed Hamlin" only
// negates correctly by ACCIDENT (the subject group's own greedy 2-token
// slot happens to swallow "never" when the subject is a single word);
// "Andrew Johnson was never the 17th president" and "Grand Canyon is never
// one of the most studied geologic landscapes" both have full 2-token
// subjects, leave "never" stranded past the checked window, and silently
// keep reading as affirmative. This is a real, disclosed bug in a widely-
// shared engine file (dozens of real callers across both repos, including
// a conformance test named for exactly this seam) — fixing it AT THE
// SOURCE is real, scoped, unattempted work, not undertaken here: its
// safety can't yet be certified against the engine's own conformance
// suite and the several already-published MINE-1 measurements that read
// off the same polarity field.
//
// What CAN be built without touching relations.js at all: a caller-side
// check that never trusts a single polarity reading. Evaluate the claim's
// own NEGATION the same mechanical way the claim itself gets evaluated; if
// the two readings genuinely DISAGREE (one holds, one refused), the
// extractor's negation detection is trustworthy for this sentence shape.
// If they AGREE — both read the same way — that agreement is itself the
// tell that negation silently failed on this construction, and the
// original verdict must not ship as a confident holds/refused; it
// downgrades to undetermined, the same discipline `arithmetic.js`'s own
// order-reversing-phrase refusal already holds elsewhere in this repo: an
// unconfirmed computed answer is worse than an honest gap.
const COPULAS = new Set(["was", "is", "are", "were", "am", "be", "been"]);
// Deliberately narrower than the engine's own NEGATION_WORDS (priors.js,
// giver lang/en) — this is a mechanical text-editing token list for
// constructing a candidate sentence, not a semantic negation-detection
// vocabulary, so it names only the single word this module's own
// insert/remove transform actually produces and recognizes.
const NEGATION_TOKENS = new Set(["never"]);

/**
 * Real, disclosed limit of this mechanical transform, validated against
 * this bug's own known specimens (Lincoln/Hamlin — transitive, negates
 * correctly; Andrew Johnson, Grand Canyon — copula, silently fails after
 * the copula but recovers before it): a single fixed insertion rule is
 * fragile (a naive "always before the verb" rule dodges the copula bug
 * entirely and would wrongly TRUST a broken reading; a naive "always
 * after" would wrongly DISTRUST a reading that "before" would have
 * confirmed). This tries several plausible insertion points instead of
 * guessing one, and returns them ALL as candidates — the caller only
 * needs ONE to disagree for the pair to be trustworthy. When a copula is
 * present, "never" is tried both immediately before and immediately
 * after it. When no copula is found, "never" is tried after the first
 * token (the transitive-verb pattern validated on "Lincoln never
 * appointed Hamlin") and after the second (the same pattern for a
 * two-word proper-name subject). An ALREADY-negated claim gets its
 * negation word REMOVED rather than doubled — stacking a second "never"
 * onto an already-negated sentence produces double-negation gibberish
 * this extractor was never going to parse sensibly.
 */
export function negationCandidates(claim) {
  const words = String(claim ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [];
  const candidates = new Set();
  const negationIdxs = words.map((w, i) => (NEGATION_TOKENS.has(w.toLowerCase()) ? i : -1)).filter((i) => i !== -1);
  if (negationIdxs.length) {
    for (const i of negationIdxs) {
      const without = [...words.slice(0, i), ...words.slice(i + 1)].join(" ");
      if (without) candidates.add(without);
    }
    return [...candidates];
  }
  const copulaIdx = words.findIndex((w) => COPULAS.has(w.toLowerCase()));
  const insert = (at) => [...words.slice(0, at), "never", ...words.slice(at)].join(" ");
  if (copulaIdx !== -1) {
    candidates.add(insert(copulaIdx));
    candidates.add(insert(copulaIdx + 1));
  } else {
    if (1 < words.length) candidates.add(insert(1));
    if (2 < words.length) candidates.add(insert(2));
  }
  return [...candidates];
}

/** bound -> holds, contradicted -> refused, everything else (unbound,
 * beyond-reach, unheard, competing) -> null — the material never decides
 * for those, so this never guesses one on their behalf. */
function collapseVerdict(judged) {
  return judged?.verdict === "bound" ? "holds" : judged?.verdict === "contradicted" ? "refused" : null;
}

/**
 * Square a computed verdict against its own claim's negation(s), all run
 * against the SAME ground text via the SAME `runCapacity("relations",
 * {claim})` door the primary read used. Returns `{ trusted, checked }` —
 * `checked` is the real candidate list and their real verdicts, kept for
 * disclosure even when trusted, never hidden once computed.
 */
function squarePolarity(runCapacity, groundText, groundName, claimText, primaryVerdict) {
  const candidates = negationCandidates(claimText);
  const checked = candidates.map((candidate) => {
    const result = runCapacity("relations", { text: groundText, name: groundName, claim: candidate });
    const judged = (result.claims ?? [])[0] ?? null;
    return { candidate, verdict: collapseVerdict(judged) };
  });
  const trusted = checked.some((c) => c.verdict && c.verdict !== primaryVerdict);
  return { trusted, checked };
}

// ── object specificity — a second, DIFFERENT check squaring cannot do ──────
//
// Found live, testing this exact wiring against real material (the
// original Andrew Johnson specimen this whole investigation started
// from): "Andrew Johnson was the 22nd president" (false — the material
// says 17th) computed `holds`, squared and confirmed. Squaring only
// checks POLARITY (does the claim's negation disagree) — it says nothing
// about whether a bound claim's own OBJECT is the material's real object
// or a substituted wrong one, because hypergraph.js's own
// `endpointsMatch` object fallback (`tokensShare`) requires only that
// SOME token stem-matches, not that the claim's own distinguishing
// tokens do. "22nd president" and "the 17th president of the United
// States" share "president" and nothing else, and that ONE shared word
// is enough for `tokensShare` to call them the same object.
//
// A first cut of this fix re-filtered the edge graph by an EXACT
// subject+verb string match — wrong, found live on the second real
// specimen tried: "Andrew Johnson was the 16th vice president" (TRUE —
// the material's own words) binds through a PRONOUN subject ("The 16th
// vice president, HE assumed..."), which judge()'s own referent-aware
// endpointsMatch correctly resolves but a bare string-equality re-filter
// does not — the true claim's own backing edge was invisible to it, and
// a genuinely true claim got wrongly downgraded. The fix: never
// re-derive which edge backed the claim — READ IT OFF `judged.refs`,
// the real address(es) judge() itself already used to bind the claim,
// and check THAT edge's object, not a re-guessed one. This also needed
// widening from numbers-only to every content token: "Andrew Johnson was
// the 17th vice president" (FALSE — Johnson was the 16th VP; 17th is his
// separate PRESIDENT ordinal) still wrongly matched a numbers-only check,
// because "17th" genuinely does appear in the material — just on the
// wrong office. Requiring every one of the claim's own content words
// (not just numbers) to appear on the SAME real backing edge catches
// this: "vice" is never on the edge that actually supplied "17th".
const STOPWORDS = new Set(["a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "was", "is", "are", "were", "be", "been", "am"]);

function contentTokens(text) {
  return new Set(
    String(text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t && !STOPWORDS.has(t)),
  );
}

/**
 * `edges` is the real material graph (runCapacity's "relations" `claim`
 * response now carries it alongside `claims`); `judgedRefs` is the SAME
 * claim's own `refs` — the real address(es) judge() used to bind it,
 * never re-derived. Returns `{ trusted, claimTokens, matchedTokens }` —
 * `trusted` is `true` when the claim's object carries no content token
 * to check (nothing to confirm, so nothing to doubt), when no real edge
 * can be found at the claim's own bound address (nothing to compare
 * against — an inconclusive check must not itself convict a verdict it
 * cannot examine), or when the real backing edge's own object states
 * EVERY one of the claim's content tokens, not merely one shared word.
 */
function checkObjectSpecificity(edges, judgedRefs, claimObjectText) {
  const claimTokens = contentTokens(claimObjectText);
  if (!claimTokens.size) return { trusted: true, claimTokens: [], matchedTokens: [] };
  const refSet = new Set(judgedRefs ?? []);
  if (!refSet.size) return { trusted: true, claimTokens: [...claimTokens], matchedTokens: [], inconclusive: "no address to check against" };
  const backing = (edges ?? []).filter((e) => (e.refs ?? []).some((r) => refSet.has(r)));
  if (!backing.length) return { trusted: true, claimTokens: [...claimTokens], matchedTokens: [], inconclusive: "no edge found at the claim's own bound address" };
  for (const e of backing) {
    const edgeTokens = contentTokens(e.object);
    if ([...claimTokens].every((t) => edgeTokens.has(t))) {
      return { trusted: true, claimTokens: [...claimTokens], matchedTokens: [...edgeTokens] };
    }
  }
  return {
    trusted: false,
    claimTokens: [...claimTokens],
    matchedTokens: [...new Set(backing.flatMap((e) => [...contentTokens(e.object)]))],
  };
}

/**
 * Parse `line` against `grid`, land it on `log`, and — only when it lands
 * as a `distinguish` or an `evaluate` whose `ground` clause names an
 * ALREADY-LOADED source (checked by key presence in `sources`, not
 * truthiness, so "nothing by that name is loaded" and "what's loaded
 * there is empty" stay the two different, correctly-typed facts term.js's
 * own comment already documented) — run the matching capacity for real
 * and attach what it found as a RESULT on the act's own entry.
 *
 * `distinguish` runs `cast` (referent identity), unchanged from before.
 *
 * `evaluate` — "EVA the hypergraph, with provenance" — runs ONLY when the
 * act carries no human-DECLARED `verdict:` clause (grid.js's own parse
 * already lets `verdict:` be omitted; this is what fills that gap in
 * rather than leaving it permanently open). The act's `object` is read as
 * the claim itself (grid.js's grammar already allows a quoted, full-
 * sentence object) and judged against the named ground's real text via
 * `runCapacity("relations", {claim})` — hypergraph.js's own judge(), the
 * SAME check an ordinary chat answer is graded against. Only two of
 * judge()'s five verdicts are strong enough to COMPUTE a holds/refused:
 * `bound` -> holds, `contradicted` -> refused. The other three (unbound,
 * beyond-reach, unheard) and `competing` all mean "the material does not
 * settle this," never "the material says no," and are left undetermined —
 * `foldGrid`'s existing DEF/EVA companion read already renders this
 * honestly as "wish, no verdict declared yet."
 *
 * A determined verdict is then SQUARED (see squarePolarity above) before
 * it ships: the claim's own negation is checked the same mechanical way,
 * and only a genuine disagreement between the two readings earns the
 * verdict enough trust to attach as holds/refused. An unconfirmed reading
 * downgrades to undetermined rather than shipping a wrong confident
 * answer — real, disclosed evidence (which candidates were tried, what
 * each computed) rides on the RESULT either way, never silently dropped.
 *
 * REC — "revise understanding as needed": before a squared-and-trusted
 * verdict lands, the live fold is checked for an EARLIER evaluate of the
 * SAME object (case-folded) already carrying a determined verdict. If the
 * new computation disagrees, `grid.concedeEvaluation` lands an
 * EVIDENCE·REC·Figure·produced entry FIRST — `concedes` naming the prior
 * act, `trigger` stating the verbatim disagreement — mirroring
 * `build-log.js`'s `rezeroBuild` shape exactly. Only then does the new
 * verdict attach. Re-confirming the same verdict lands no REC.
 *
 * Returns `{ ok: false, refusal }` on a parse/grammar refusal (nothing
 * lands, `log` is untouched), or `{ ok: true, log, ids, event, capacity }`
 * where `capacity` is `null` when no capacity was triggered (an ordinary
 * act, a `verdict:`-declared evaluate, or a `ground` candidate naming
 * nothing loaded — deliberately silent either way, matching the disclosed
 * rule above), or `{ result }` when one was: `result.gap === "no_material"`
 * on real-but-empty material (nothing attached), otherwise the real
 * capacity output found — attached either way, whether or not a verdict
 * was strong and squared-trustworthy enough to compute.
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
  if (
    parsed.event.verb === "evaluate" &&
    parsed.event.ground &&
    parsed.event.object &&
    !parsed.event.verdict &&
    runCapacity &&
    Object.hasOwn(sources, parsed.event.ground)
  ) {
    const groundText = sources[parsed.event.ground];
    const groundName = parsed.event.ground;
    const result = runCapacity("relations", { text: groundText, name: groundName, claim: parsed.event.object });
    if (result.gap !== "no_material") {
      const evaId = ids[ids.length - 1];
      const judged = (result.claims ?? [])[0] ?? null;
      const rawVerdict = collapseVerdict(judged);
      let squaring = null;
      let objectCheck = null;
      let computedVerdict = null;
      if (rawVerdict) {
        squaring = squarePolarity(runCapacity, groundText, groundName, parsed.event.object, rawVerdict);
        computedVerdict = squaring.trusted ? rawVerdict : null;
        // Squaring confirms POLARITY only — a "holds" that passed squaring
        // can still be a wrong number/office wearing a real edge's other
        // words (see checkObjectSpecificity's own header). Checked only
        // for `holds`: a `refused` verdict already means the material
        // explicitly disagrees, which is a different, already-decided case.
        if (computedVerdict === "holds") {
          objectCheck = checkObjectSpecificity(result.edges, judged?.refs, judged?.object);
          if (!objectCheck.trusted) computedVerdict = null;
        }
      }
      const objectKey = (parsed.event.object ?? "").toLowerCase();
      if (computedVerdict) {
        const priorDetermined = grid
          .foldGrid(finalLog)
          .acts.filter(
            (t) =>
              t.operator === "EVA" &&
              t.task_id !== evaId &&
              (t.object ?? "").toLowerCase() === objectKey &&
              (t.verdict === "holds" || t.verdict === "refused"),
          )
          .sort((a, b) => b.first_seq - a.first_seq)[0];
        if (priorDetermined && priorDetermined.verdict !== computedVerdict) {
          const conceded = grid.concedeEvaluation(finalLog, priorDetermined.task_id, {
            trigger: `re-checked against "${groundName}": was "${priorDetermined.verdict}", now computes "${computedVerdict}"`,
          });
          if (conceded.ok) finalLog = conceded.log;
        }
      }
      const attached = grid.attachResult(
        finalLog,
        evaId,
        { claim: parsed.event.object, judged, source: groundName, rawVerdict, squaring, objectCheck },
        computedVerdict ? { verdict: computedVerdict } : {},
      );
      if (attached.ok) finalLog = attached.log;
    }
    capacity = { result };
  }
  return { ok: true, log: finalLog, ids, event: parsed.event, capacity };
}
