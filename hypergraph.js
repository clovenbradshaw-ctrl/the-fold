// hypergraph.js — relation-level grounding: the answer read against the
// edges the material itself binds. P12's named future work, wired.
//
// The tier below this (grounding.js) asks whether the answer's TOKENS are in
// the bytes. This tier asks whether the answer's RELATIONS are: "Pierre
// married Dolokhov" passes every byte check — Pierre is in the material,
// married is in the material, Dolokhov is in the material — and is still an
// invention, because the text never bound that edge. Only a reading of the
// material's own relation structure can catch it, and only a reading of the
// answer WITH THE SAME ORGANS can be compared against it honestly.
//
// Everything measured here is the engine's: relation vocabulary is
// discovered, never typed in (perceiver/text/relations.js — the 90-word
// hand list was that file's own measured mistake); triples are extracted
// with polarity read, never asserted; endpoints resolve to REFERENTS
// through the same index cast.js's resolver projects (one implementation of
// "the same name", P11). This module composes those organs and types the
// verdicts; it measures nothing of its own.
//
// THE VERDICTS ARE FOUR-PLUS-ONE, NEVER A BIT. The field converged on this
// the hard way (FEVER's supported/refuted/not-enough-info; SAFE's
// supported/irrelevant/unsupported; AIS's "uninterpretable" refusal — see
// the prior-art survey in the PR that introduced this file): support,
// contradiction, absence of evidence, and beyond-the-instrument's-reach are
// FOUR DIFFERENT FACTS, and collapsing any two of them lies in one
// direction or the other.
//
//   bound        — the material binds this edge, same polarity. Carries the
//                  addresses that state it, and its corroboration: how many
//                  passages, across how many distinct sources. Support is
//                  graded by independent perspectives, never a boolean.
//   contradicted — the material binds this edge with the OPPOSITE polarity
//                  ("never married" against "married"). The most valuable
//                  finding this tier produces, and invisible to every byte
//                  check by construction.
//   unbound      — subject resolves, verb is in the material's own measured
//                  vocabulary, and no edge binds them: the "Pierre married
//                  Dolokhov" case. Carries the NEAREST edges the material
//                  does bind (same subject and verb, or same verb and
//                  object) so the reader sees what the text says instead —
//                  the affordance that turns a flag into an explanation.
//   beyond-reach — an endpoint does not resolve to any referent this
//                  material establishes (a pronoun subject, an abstract
//                  object). This tier cannot read the claim, and says so —
//                  disclosed as unreadable, never implied false.
//   unheard      — the claim's verb is outside the vocabulary the material
//                  itself measures. Same posture: the instrument's reach
//                  ends here, and the omission stays visible (the CLAUDE.md
//                  rule about lens-less terrains, applied to verbs).
//
// Pure, organs injected (the cast.js pattern): the engine's functions
// arrive as arguments because this module is imported by both the page
// (which loads them from /engine) and the node tests (which load them by
// relative path). The organs are used, never copied.

import { makeReferentIndex } from "./cast.js";
import { blankStructure } from "./grounding.js";
import { commonTerms, CORPUS_MINIMUM } from "./cite.js";
import { orderArm, standingOf } from "./asserted.js";

// ── declared numbers, each with its justification ───────────────────────────
//
// MIN_SURFACES_PER_VERB = 1. discoverRelationVocab refuses to default this —
// how much recurrence makes a pattern is the caller's to say — so it is said
// here, and justified WITHOUT reference to any golden or fixture (the
// eoreader6 rule about calibrating against the answer key): a turn's offered
// passages are an excerpt of a few paragraphs, far too small for
// cross-surface recurrence to be a fair gate on a verb; and the vocabulary
// only widens what this check can HEAR — extractRelations emits no triple
// without a literal match, so a wider vocabulary can never fabricate an
// edge, only read more of the ones the text states. corpus.js makes the
// same declaration at span scale (minSurfaces: 1) for the same reason.
export const MIN_SURFACES_PER_VERB = 1;

// Display bound on the nearest-edge disclosure, not on belief: every edge
// stays in the report's own graph; only the per-claim nearest list is
// capped, and the cap is stated where it applies.
export const NEAREST_EDGES_MAX = 3;

// The same stem floor grounding.js and cast.js earned: four characters is
// the shortest thing that can be a stem rather than a coincidence.
const MIN_STEM = 4;

const sourceOf = (ref) => String(ref ?? "").split("#")[0] || null;

/**
 * `makeRelationReader(organs)` → `relationsFor(passages)` → a reader:
 *
 *   { examined, vocabulary, edges, read(answer) }
 *
 * `edges` is the material's own belief graph over these passages — every
 * edge keyed by referent identity where the index resolves one, carrying
 * every address that states it. `read(answer)` extracts the answer's
 * relation claims with the SAME vocabulary and organs and returns one typed
 * verdict per claim (shape above). Organs required: splitSentences,
 * extractSurfaces, discoverReferents, namesCorefer, diaNorm (the cast
 * organs), plus discoverRelationVocab, extractRelations, tokenize (the
 * relation organs). `relationsFor(passages, { pool })` — the pool is the
 * live corpus the closed-class measure runs over; omitted, the passages
 * stand in and the measure usually refuses itself (CORPUS_MINIMUM).
 *
 * `relationsFor(passages, { negationWords })` threads straight through to
 * discoverRelationVocab/extractRelations's own injected-prior seam
 * (relations.js, following bin/priors/lang/en.json's pattern in
 * eoreader6.1). Omitted, the engine's own English NEGATION_WORDS applies,
 * unchanged from before this option existed. Supplying a Set (e.g.
 * bin/priors/lang/eu.json's `negation` array for Basque) reads the
 * material's negation with that language's own vendored closed class
 * instead — never a second, hardcoded English list standing in for
 * material this tier was never measured against.
 *
 * Every edge additionally carries `assertion` — the extractor's own claim
 * about the material treated as a reader's hypothesis with disclosed
 * support (asserted.js): `standing` (`corroborated` at >= 2 independent
 * statements, `single-witness` below — the structural floor, givers named
 * there), `statements` (how many extracted occurrences folded into this
 * edge), and `verbSupport` (how many DISTINCT surfaces this verb followed
 * in the material's own vocabulary measure — a verb admitted on the
 * strength of one surface is itself a single-witness assertion). The
 * word-salad arm rides only behind `relationsFor(passages, { assert:
 * { draws, seed } })` — draws declared, never defaulted; the arm reports
 * counts (`orderArm: { draws, fired, seed }`), never a verdict, because no
 * cut has been earned (asserted.js's header carries the reasoning). None
 * of this convicts: relationFindings and relationsClean are unchanged, so
 * an edge's weak standing reaches the reader as disclosure, not as a mark
 * against the answer.
 */
export function makeRelationReader(organs) {
  const {
    splitSentences,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
  } = organs;
  const indexFor = makeReferentIndex(organs);

  return function relationsFor(passages, { pool = null, assert = null, negationWords = undefined } = {}) {
    const list = (passages ?? []).filter((p) => p && typeof p.text === "string" && p.text.trim());
    const emptyReport = (examined) => ({
      examined,
      vocabulary: { verbs: 0, minSurfaces: MIN_SURFACES_PER_VERB },
      edges: [],
      claims: [],
    });
    if (!list.length) {
      return { examined: false, vocabulary: { verbs: 0, minSurfaces: MIN_SURFACES_PER_VERB }, edges: [], read: () => emptyReport(false) };
    }

    const text = list.map((p) => p.text).join("\n\n");
    const index = indexFor(list);

    // The closed class is measured from the POOL (the whole live corpus,
    // when the caller has one), never from the turn's few offered passages,
    // and by DOCUMENT FREQUENCY, not token share: material.js's
    // functionWordSet thresholds on a word's share of all tokens (~0.6%),
    // which is the right measure at book scale and degenerates at turn
    // scale — on a few-hundred-token pool every twice-occurring word
    // crosses it, and this fixture's own "married" was classified as a
    // function word while building. The organ for "what the corpus says
    // everywhere" at THIS scale already exists and is already earned:
    // cite.js::commonTerms — present in more than half the pool's chunks —
    // with its own declared floor (CORPUS_MINIMUM: below it, a frequency
    // is not a frequency and nothing counts as common; the filter simply
    // does not run, the engine's optional-filter discipline, and the
    // disclosed residue is auxiliary noise in the vocabulary — which can
    // widen what the reader hears but never fabricate an edge, since
    // extractRelations emits nothing without a literal match).
    let functionWords = null;
    try {
      const chunks = (pool?.length >= CORPUS_MINIMUM ? pool : list).map((p) => ({
        terms: p?.terms instanceof Set ? p.terms : new Set(tokenize(p?.text ?? "")),
      }));
      const common = commonTerms(chunks);
      functionWords = common.size ? common : null;
    } catch {
      functionWords = null;
    }

    // The vocabulary is measured from THE MATERIAL — the answer is read with
    // the material's own verbs, because "supported" means the material could
    // have said it. Surfaces are the index's own established surfaces, so
    // vocabulary discovery and endpoint resolution see the same cast.
    const surfaces = [...new Set(index.events.map((e) => e.surface))];
    let verbs = new Set();
    // How many DISTINCT surfaces each admitted verb followed — the
    // vocabulary measure's own candidates list, kept rather than dropped,
    // so an edge can disclose that its verb entered the vocabulary on the
    // strength of one surface (itself a single-witness assertion).
    const verbSurfaces = new Map();
    if (surfaces.length) {
      try {
        const measured = discoverRelationVocab(text, { surfaces, functionWords, minSurfaces: MIN_SURFACES_PER_VERB, negationWords });
        verbs = measured.verbs;
        for (const c of measured.candidates ?? []) verbSurfaces.set(c.verb, c.surfaces);
      } catch {
        verbs = new Set();
      }
    }

    // ── endpoint resolution ──────────────────────────────────────────────
    // An endpoint is read two ways at once, and both ride the comparison:
    // the REFERENTS it mentions (any established surface appearing in it,
    // word-bounded and folded, plus the index's own resolution of the whole
    // string) and its content TOKENS (folded, function words dropped). Two
    // endpoints match when they share a referent, or — only when neither
    // resolves to any referent — when they share a content token. Referent
    // identity outranks token overlap because a name is a reference to a
    // referent, never a byte sequence (P11).
    const surfacePatterns = surfaces.map((s) => ({
      surface: s,
      re: new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(diaNorm(s))}(?:$|[^\\p{L}\\p{N}])`, "iu"),
    }));
    const referentsBySurface = new Map();
    for (const e of index.events) {
      if (!referentsBySurface.has(e.surface)) referentsBySurface.set(e.surface, new Set());
      referentsBySurface.get(e.surface).add(e.referent_id);
    }

    function endpoint(str) {
      const referents = new Set(index.resolve(str));
      const folded = diaNorm(String(str ?? ""));
      for (const { surface, re } of surfacePatterns) {
        if (re.test(folded)) for (const id of referentsBySurface.get(surface)) referents.add(id);
      }
      const tokens = new Set();
      for (const t of folded.toLowerCase().split(/[^\p{L}\p{N}'’]+/u)) {
        if (t.length < 3) continue;
        if (functionWords?.has(t)) continue;
        tokens.add(t);
      }
      return { text: String(str ?? ""), referents, tokens };
    }

    const stemEq = (a, b) =>
      a === b || (Math.min(a.length, b.length) >= MIN_STEM && (a.startsWith(b) || b.startsWith(a)));
    const intersects = (a, b) => {
      for (const x of a) if (b.has(x)) return true;
      return false;
    };
    const tokensShare = (a, b) => {
      for (const x of a) for (const y of b) if (stemEq(x, y)) return true;
      return false;
    };
    const endpointsMatch = (a, b) => {
      if (a.referents.size && b.referents.size) return intersects(a.referents, b.referents);
      if (a.referents.size || b.referents.size) {
        // One side names a referent and the other does not — fall through to
        // tokens: "the young count" cannot resolve, but may still share a
        // content token with what the material captured.
        return tokensShare(a.tokens, b.tokens);
      }
      return tokensShare(a.tokens, b.tokens);
    };

    // ── the material's edges, each with every address that states it ─────
    // Existing edges are bucketed by an EXACT, cheap key (verb + polarity —
    // never a guessed match, so no edge can hide from its own bucket) so the
    // fuzzy endpointsMatch scan below only ever runs over edges that already
    // share a verb, not the whole graph. Same organ emergence/graph.js
    // already earned for full-document scale (`edgeKey`, a Map-keyed belief
    // graph) — that module expects pre-resolved referent ids as its identity
    // and this tier's identity is fuzzier (referent-or-token, via
    // endpointsMatch), so its exact key is reused for the bucket a verb's
    // edges live in, and the fuzzy match still decides membership WITHIN
    // that bucket. Found by running: a linear `.find()` over the full edge
    // list, per triple, is O(triples x edges) — quadratic — and was never
    // exercised past a turn's handful of retrieved passages before a
    // full-novel eval (eval/crosslingual-eval.mjs) ran it over 11,132
    // passages and did not finish in ten minutes. Bucketing changes nothing
    // about WHICH edges merge — endpointsMatch's own verdict is unchanged,
    // pinned by the existing hypergraph.test.mjs corroboration cases — only
    // how many candidates are checked to find out.
    const edges = [];
    const bucketOf = (verb, polarity) => `${verb}|${polarity}`;
    const buckets = new Map();
    for (const p of list) {
      let triples = [];
      try {
        triples = verbs.size ? extractRelations(p.text, { verbs, functionWords, negationWords }) : [];
      } catch {
        triples = [];
      }
      for (const t of triples) {
        const subjectEnd = endpoint(t.subject);
        const objectEnd = endpoint(t.object);
        const bucketKey = bucketOf(t.verb, t.polarity);
        let bucket = buckets.get(bucketKey);
        if (!bucket) buckets.set(bucketKey, (bucket = []));
        const existing = bucket.find(
          (e) => endpointsMatch(e.subjectEnd, subjectEnd) && endpointsMatch(e.objectEnd, objectEnd),
        );
        if (existing) {
          if (!existing.refs.includes(p.ref)) existing.refs.push(p.ref);
          // Statement grain, not passage grain: a restatement inside one
          // passage is a second witness too. (Exact repeats within one
          // passage dedupe inside extractRelations itself — that residue
          // is the extractor's, disclosed here rather than papered over.)
          existing.statements += 1;
        } else {
          const fresh = {
            subject: t.subject,
            verb: t.verb,
            object: t.object,
            polarity: t.polarity,
            subjectEnd,
            objectEnd,
            refs: [p.ref].filter(Boolean),
            statements: 1,
          };
          edges.push(fresh);
          bucket.push(fresh);
        }
      }
    }

    // ── the assertion tier: the extractor's own claim, support disclosed ─
    // Standing and statement count are always on (they cost a lookup); the
    // word-salad arm runs only when the caller declares its resolution.
    for (const e of edges) {
      e.assertion = {
        standing: standingOf(e.statements),
        statements: e.statements,
        verbSupport: verbSurfaces.get(e.verb) ?? 0,
      };
    }
    if (assert && edges.length) {
      // The arm re-hears the SAME material with each sentence's words
      // shuffled, through the SAME vocabulary-bound extraction — never a
      // re-measured vocabulary, never a second extractor. Matching a
      // shuffled-copy triple to an edge uses the same endpointsMatch the
      // edges themselves were folded with (one implementation of "the same
      // edge"), on shape only — polarity under shuffle is noise by
      // construction (the negation window is an order fact).
      const arm = orderArm({
        passages: list,
        splitSentences,
        extract: (t) => extractRelations(t, { verbs, functionWords, negationWords }),
        draws: assert.draws,
        seed: assert.seed ?? 0,
      });
      const endpoints = new Map(); // per sample triple, computed once
      const endFor = (str) => {
        if (!endpoints.has(str)) endpoints.set(str, endpoint(str));
        return endpoints.get(str);
      };
      for (const e of edges) {
        let fired = 0;
        for (const sample of arm.samples) {
          if (
            sample.some(
              (t) =>
                t.verb === e.verb &&
                endpointsMatch(endFor(t.subject), e.subjectEnd) &&
                endpointsMatch(endFor(t.object), e.objectEnd),
            )
          )
            fired++;
        }
        e.assertion.orderArm = { draws: arm.draws, fired, seed: arm.seed };
      }
    }

    const corroboration = (refs) => ({
      passages: refs.length,
      sources: [...new Set(refs.map(sourceOf).filter(Boolean))].length,
    });

    // ── one claim, one typed verdict ─────────────────────────────────────
    function judge(sentence, t) {
      const claim = {
        sentence,
        subject: t.subject,
        verb: t.verb,
        object: t.object,
        polarity: t.polarity,
      };
      const subj = endpoint(t.subject);
      const obj = endpoint(t.object);
      if (!subj.referents.size) {
        return {
          ...claim,
          verdict: "beyond-reach",
          reason: `“${t.subject}” doesn't resolve to anyone or anything this material establishes — a limit of this check, not a mark against the answer`,
        };
      }
      const sameSubjVerb = edges.filter(
        (e) => e.verb === t.verb && intersects(e.subjectEnd.referents, subj.referents),
      );
      const matching = sameSubjVerb.filter((e) => endpointsMatch(e.objectEnd, obj));
      if (matching.length) {
        const agree = matching.filter((e) => e.polarity === t.polarity);
        const oppose = matching.filter((e) => e.polarity !== t.polarity);
        if (agree.length) {
          const refs = [...new Set(agree.flatMap((e) => e.refs))];
          return {
            ...claim,
            verdict: "bound",
            refs,
            corroboration: corroboration(refs),
            // The material stating BOTH polarities is a fact worth carrying,
            // never averaged away: divergence between perspectives is a
            // signal, not noise to smooth.
            ...(oppose.length ? { contested: [...new Set(oppose.flatMap((e) => e.refs))] } : {}),
          };
        }
        const refs = [...new Set(oppose.flatMap((e) => e.refs))];
        return {
          ...claim,
          verdict: "contradicted",
          refs,
          corroboration: corroboration(refs),
          bound: oppose.slice(0, NEAREST_EDGES_MAX).map(edgeFace),
        };
      }
      if (!obj.referents.size && !obj.tokens.size) {
        return {
          ...claim,
          verdict: "beyond-reach",
          reason: `“${t.object}” carries nothing comparable — no name and no content word — a limit of this check, not a mark against the answer`,
        };
      }
      // No edge binds this claim. Show what the material DOES bind around
      // it: same subject and verb first (what the subject actually did),
      // then same verb and object (who actually did this to the object).
      const sameVerbObj = edges.filter(
        (e) => e.verb === t.verb && !sameSubjVerb.includes(e) && endpointsMatch(e.objectEnd, obj),
      );
      const nearest = [...sameSubjVerb, ...sameVerbObj].slice(0, NEAREST_EDGES_MAX).map(edgeFace);
      return { ...claim, verdict: "unbound", nearest };
    }

    function edgeFace(e) {
      return {
        subject: e.subject,
        verb: e.verb,
        object: e.object,
        polarity: e.polarity,
        refs: e.refs,
        // The disclosure travels with the edge, so a claim's `bound` /
        // `nearest` lists carry it for free — a conviction resting on a
        // single-witness edge says so wherever that edge is shown.
        ...(e.assertion ? { assertion: e.assertion } : {}),
      };
    }

    const sentencesOf = (answer) => {
      // The same structural furniture grounding.js blanks: a Title-Case
      // heading must not read as a subject, an address's digits as an
      // object. Length-preserving, so the sentence text is the answer's own.
      let sents = [];
      try {
        sents = splitSentences(blankStructure(answer));
      } catch {
        return [];
      }
      return sents.map((s) => (typeof s === "string" ? s : s?.text ?? "")).filter((s) => s.trim());
    };

    function read(answer) {
      const report = {
        examined: true,
        vocabulary: { verbs: verbs.size, minSurfaces: MIN_SURFACES_PER_VERB },
        edges: edges.map(edgeFace),
        claims: [],
      };
      if (!verbs.size) {
        // A material too small or too nameless to measure a vocabulary from
        // is a typed gap, not a clean bill: this tier did not run, and the
        // report says so instead of implying "no relation drift".
        report.vocabulary.gap =
          "no relation vocabulary could be measured from this material — the relation tier did not run";
        return report;
      }
      for (const sentence of sentencesOf(answer)) {
        let heard = [];
        try {
          heard = extractRelations(sentence, { verbs, functionWords });
        } catch {
          heard = [];
        }
        for (const t of heard) report.claims.push(judge(sentence, t));

        // The claims this tier CANNOT hear: verbs the answer uses after an
        // established surface that the material's vocabulary never measured.
        // Typed `unheard` and disclosed — an instrument that only reports
        // what it can check, without saying where its reach ends, implies
        // silence means support.
        try {
          const { verbs: answerVerbs } = discoverRelationVocab(sentence, {
            surfaces,
            functionWords,
            minSurfaces: 1,
          });
          const unheardVerbs = new Set([...answerVerbs].filter((v) => !verbs.has(v)));
          if (unheardVerbs.size) {
            for (const t of extractRelations(sentence, { verbs: unheardVerbs, functionWords })) {
              const subj = endpoint(t.subject);
              if (!subj.referents.size) continue; // a pronoun subject is noise here, not a claim about the cast
              report.claims.push({
                sentence,
                subject: t.subject,
                verb: t.verb,
                object: t.object,
                polarity: t.polarity,
                verdict: "unheard",
                reason: `the material never uses the verb “${t.verb}”, so there is nothing to compare this against — a limit of this check, not a mark against the answer`,
              });
            }
          }
        } catch {
          /* the disclosure pass declining is itself fine — the heard claims stand */
        }
      }
      return report;
    }

    return {
      examined: true,
      vocabulary: { verbs: verbs.size, minSurfaces: MIN_SURFACES_PER_VERB },
      edges: edges.map(edgeFace),
      read,
    };
  };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The claims that belong on a record's unsupported list: contradiction and
 * unbound edges are claims of fact the material does not make. beyond-reach
 * and unheard stay OUT — they are limits of the instrument, and putting them
 * on the record would punish the answer for the reader's reach. */
export function relationFindings(report, { verdicts = ["contradicted", "unbound"] } = {}) {
  // Callers choose which verdicts count as findings, because the two are
  // different kinds of fact (amended 2026-08-17, propose-then-check): a
  // CONTRADICTED edge is the answer disagreeing with the material's own
  // words — a lie about the given, worth a correction pass; an UNBOUND edge
  // is the model saying something the material is merely silent on — its own
  // knowledge, which ships marked rather than being rewritten away. The
  // default keeps both, so every existing caller reads as before.
  const want = new Set(verdicts);
  const lines = [];
  for (const c of report?.claims ?? []) {
    const edge = `${c.subject} —${c.verb}${c.polarity === "-" ? " (negated)" : ""}→ ${c.object}`;
    if (c.verdict === "contradicted" && want.has("contradicted")) {
      lines.push(`the material says otherwise: ${edge} [${(c.refs ?? []).join("; ")}]`);
    } else if (c.verdict === "unbound" && want.has("unbound")) {
      const near = c.nearest?.[0];
      lines.push(
        `the material never says: ${edge}` +
          (near ? ` (closest it does say: ${near.subject} —${near.verb}→ ${near.object})` : ""),
      );
    }
  }
  return lines;
}

/** True when no claim was contradicted or unbound. Clean and examined are
 * different facts here exactly as they are in checkGrounding. */
export function relationsClean(report) {
  return !(report?.claims ?? []).some((c) => c.verdict === "contradicted" || c.verdict === "unbound");
}
