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

  return function relationsFor(passages, { pool = null } = {}) {
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
    if (surfaces.length) {
      try {
        verbs = discoverRelationVocab(text, { surfaces, functionWords, minSurfaces: MIN_SURFACES_PER_VERB }).verbs;
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
    const edges = [];
    for (const p of list) {
      let triples = [];
      try {
        triples = verbs.size ? extractRelations(p.text, { verbs, functionWords }) : [];
      } catch {
        triples = [];
      }
      for (const t of triples) {
        const subjectEnd = endpoint(t.subject);
        const objectEnd = endpoint(t.object);
        const existing = edges.find(
          (e) =>
            e.verb === t.verb &&
            e.polarity === t.polarity &&
            endpointsMatch(e.subjectEnd, subjectEnd) &&
            endpointsMatch(e.objectEnd, objectEnd),
        );
        if (existing) {
          if (!existing.refs.includes(p.ref)) existing.refs.push(p.ref);
        } else {
          edges.push({
            subject: t.subject,
            verb: t.verb,
            object: t.object,
            polarity: t.polarity,
            subjectEnd,
            objectEnd,
            refs: [p.ref].filter(Boolean),
          });
        }
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
          reason:
            "the subject does not resolve to a referent this material establishes — pronoun binding and descriptor synonymy are model-tier gaps, disclosed, never judged",
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
          reason: "the object carries nothing this tier can compare — no referent, no content token",
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
      return { subject: e.subject, verb: e.verb, object: e.object, polarity: e.polarity, refs: e.refs };
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
                reason: "this verb is outside the relation vocabulary the material itself measures — beyond this tier's reach, disclosed",
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
export function relationFindings(report) {
  const lines = [];
  for (const c of report?.claims ?? []) {
    const edge = `${c.subject} —${c.verb}${c.polarity === "-" ? " (negated)" : ""}→ ${c.object}`;
    if (c.verdict === "contradicted") {
      lines.push(`edge contradicted: ${edge} — the material binds the opposite polarity [${(c.refs ?? []).join("; ")}]`);
    } else if (c.verdict === "unbound") {
      const near = c.nearest?.[0];
      lines.push(
        `edge never bound: ${edge}` +
          (near ? ` (the material binds ${near.subject} —${near.verb}→ ${near.object})` : ""),
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
