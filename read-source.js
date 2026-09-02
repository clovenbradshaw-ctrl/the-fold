// read-source.js — what this instrument has READ, presented as a source
// `seek.js` can navigate. The adapter that makes P57's hyperlexicon and P58's
// Pattern-grain binder reachable by the walk that already answers.
//
// WHY IT EXISTS. `seek.js` is source-independent by construction — its own
// suite drives it over a software release history with semver extents — and
// `wikidata.js` was its only adapter. So a question the published record
// cannot answer was unanswerable, even when a page stating the answer plainly
// was sitting in `web/pages/` already fetched and already saved. Measured:
// "who was Queen Victoria's prime minister?" gaps on Wikidata with
// `no_relating_property` (the generic role Q14212 has no holders; the
// country-specific office is reached by P279, not the P31 the specialize step
// walks) while `List_of_prime_ministers_of_Queen_Victoria` sat on disk with
// all ten and their exact terms.
//
// TWO GIVERS, ONE INTERFACE. This is not a fallback in the sense of a lesser
// answer — it is a second witness reached by the identical four questions, and
// where both answer they can corroborate. What differs is provenance: a
// Wikidata binding carries a qid, one of these carries a byte range in a saved
// page, and both are addressed.
//
// WHAT IT REFUSES TO DO. It does not name what binds a system — `network.js`
// deliberately returns arrangements unlabelled (P58) and this file does not
// invent the label either. What it supplies is a slot per bound system, the
// source's own surrounding words as that slot's context, and the members
// pointing at it. Which system a question means is settled by `specialize`
// against the ANCHOR's own words, and a tie is not narrowed.

import { assertionId } from "../eoreader7/native/organs/index.js";
import { rangesIn } from "./network.js";

/** Content words only, so agreement is never carried by "of" and "the". */
const contentWords = (t) => new Set(String(t ?? "").toLowerCase().match(/\p{L}{4,}/gu) ?? []);

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

/**
 * An extent as a sortable ISO-ish string. A date the material stated at year
 * grain is FLOORED to that year's start rather than invented to a day — the
 * ordering is real, the precision is not implied. `readDate`'s own null month
 * and day are what carry the coarseness here.
 */
const iso = (d) =>
  `${String(d.year).padStart(4, "0")}-${String(d.month ?? 1).padStart(2, "0")}-${String(d.day ?? 1).padStart(2, "0")}`;

/**
 * makeReadSource({ binder, passages }) — passages are `{ref, text, title}`.
 * `title` is the source's own declared identity (P46's standing: a document's
 * claim about itself, real bytes, defeasible), used as context and never as a
 * relation name.
 *
 * The relation is a single constant, `RELATION`, and that is deliberate: this
 * source genuinely knows only that these members are LISTED IN that system.
 * Calling it "held office" would be a claim the arrangement never made. The
 * walk learns it by example like any other, through `inbound` (P59), because a
 * system built this way is a sink.
 */
export const RELATION = "listed-in";

export function makeReadSource({ binder, passages = [], extractSurfaces = null } = {}) {
  // Sentence-grain surfaces come from the engine's own organ, INJECTED — this
  // file never decides what a name looks like. Without it the prose pass below
  // is skipped entirely rather than guessed at.
  const surfacesIn = (sentence) => {
    if (typeof extractSurfaces !== "function") return [];
    return (extractSurfaces([{ text: sentence }]) ?? [])
      .map((x) => (typeof x === "string" ? x : x?.text ?? x?.surface))
      .filter((x) => x && x.length > 3);
  };
  const entities = new Map();
  const systems = [];

  const put = (e) => { entities.set(e.id, e); return e; };

  for (const p of passages) {
    const text = String(p?.text ?? "");
    if (!text.trim()) continue;
    const found = binder.bindRecurring(text, { ref: p.ref ?? null });
    for (const sys of found.systems) {
      // One slot per bound system. Collapsing them merged two different lists
      // on one page into a single set (P59) — Britain's ten prime ministers
      // and New Zealand's fifteen premiers, indistinguishable by arrangement.
      const id = `read:${slug(p.ref ?? "source")}:${systems.length}`;
      const context = [p.title, ...(sys.context ?? []).map((c) => c.text)].filter(Boolean).join(" ");
      const slot = put({ id, label: p.title || String(p.ref ?? "a list"), kinds: [], relations: [], words: context, spans: (sys.context ?? []).map((c) => c.span) });
      systems.push(slot);

      for (const inst of sys.instances) {
        const label = inst.rows.find((r) => r.shape === "surface")?.text;
        const extents = inst.rows.find((r) => r.shape === "extent")?.read ?? [];
        if (!label || !extents.length) continue;
        const mid = `read:${slug(label)}`;
        const member = entities.get(mid) ?? put({ id: mid, label, kinds: [], relations: [], words: label, spans: [] });
        member.spans.push(inst.span);
        for (const e of extents) {
          member.relations.push({
            relation: RELATION,
            value: id,
            scope: { from: iso(e.from), to: iso(e.to) },
            // The bytes that produced this binding, so a reader can walk to
            // them exactly as a qid walks to an entity page (P56: the custody
            // is kept even though the model never sees it).
            span: inst.span,
            assertion: assertionId(label, RELATION, slot.label),
          });
        }
      }
    }
  }

  // ── the anchor's own extent, read from prose ──────────────────────────────
  //
  // The walk binds by extent, so an anchor holding nothing bounded is refused
  // before it can reach any member — measured: "Queen Victoria" resolved to
  // two systems, neither held a scope, and the walk gapped with the answer
  // sitting in the same file. Her reign IS stated there, in a sentence:
  // "…monarch of the United Kingdom … from 20 June 1837 until her death on 22
  // January 1901."
  //
  // So the SAME name-and-extent pairing the binder does at Pattern grain runs
  // here at sentence grain. No new notion, and nothing specific to monarchs,
  // offices or wikis: a sentence that dates a name dates it.
  //
  // A BOUND ARRANGEMENT IS NEVER OVERWRITTEN by one. A record block is
  // stronger evidence than a name and a date happening to share a sentence,
  // so an entity that already carries relations keeps them.
  for (const p of passages) {
    const text = String(p?.text ?? "");
    if (!text.trim()) continue;
    // THE DOCUMENT ITSELF is what a dated name is dated IN, and that is the
    // honest value for this relation. Requiring a bound system in the SAME
    // passage was a real bug: the reign range that anchors this whole walk
    // ("…from 20 June 1837 to 22 January 1901") arrives in a search-results
    // digest, which holds no record block at all, so the pass was skipped
    // exactly where it mattered and the anchor stayed unscoped.
    const home = put({
      id: `read:doc:${slug(p.ref ?? "source")}`,
      label: p.title || String(p.ref ?? "a document"),
      kinds: [],
      relations: [],
      words: p.title ?? "",
      spans: [],
      isDocument: true,
    });
    for (const sentence of text.split(/(?<=[.!?])\s+|\n/)) {
      const ranges = rangesIn(sentence);
      if (!ranges.length) continue;
      for (const surface of surfacesIn(sentence)) {
        const id = `read:${slug(surface)}`;
        const e = entities.get(id) ?? put({ id, label: surface, kinds: [], relations: [], words: surface, spans: [] });
        if (e.relations.length) continue;
        e.words = `${e.words} ${sentence}`.trim();
        for (const r of ranges) {
          e.relations.push({ relation: RELATION, value: home.id, scope: { from: iso(r.from), to: iso(r.to) }, fromProse: true });
        }
      }
    }
  }

  return {
    name: "read",
    systems: () => systems.slice(),
    all: () => [...entities.values()],

    async resolve(surface) {
      const s = String(surface ?? "").toLowerCase().trim();
      if (!s) return [];
      const hit = (e) => e.label.toLowerCase().includes(s) || (e.words ?? "").toLowerCase().includes(s);
      // A NAMED THING BEFORE A CONTAINER. `chooseAnchor` takes the first
      // candidate holding a bounded extent, so ordering decides which reading
      // of a surface the walk commits to — and a list titled after the anchor
      // matches the anchor's own words as strongly as the anchor does.
      // Documents go last and are never the thing being asked about.
      const rank = (e) => (e.isDocument ? 2 : systems.includes(e) ? 1 : 0);
      return [...entities.values()].filter(hit).sort((a, b) => rank(a) - rank(b)).map((e) => ({ id: e.id, label: e.label }));
    },

    async entity(id) { return entities.get(id) ?? null; },
    async entities(ids) { return (ids ?? []).map((i) => entities.get(i)).filter(Boolean); },

    // Members point at their system and a system points at nothing, so the
    // outbound question is honestly empty here — which is exactly the sink
    // P59 was written for, and why `inbound` below is not optional in practice.
    async neighbours(id) { return (entities.get(id)?.relations ?? []).map((r) => r.value); },

    async inbound(id) {
      return [...entities.values()].filter((e) => e.relations.some((r) => r.value === id)).map((e) => e.id);
    },

    async membersOf(relation, valueId) {
      return [...entities.values()]
        .filter((e) => e.relations.some((r) => r.relation === relation && r.value === valueId))
        .map((e) => e.id);
    },

    /**
     * WHICH LIST IS THIS ANCHOR'S. Not the slot's own words — measured, both
     * of one real page's two systems say "prime minister", New Zealand's in as
     * many words. The anchor's words settle it: what the material says about
     * Queen Victoria ("Queen of the United Kingdom") overlaps one block's
     * context and not the other.
     *
     * A TIE IS NOT AN ANSWER. Two systems the anchor agrees with equally are
     * ambiguous, and guessing between them is the coin flip this whole walk
     * exists to avoid — so nothing is returned and the generic slot stands.
     */
    async specialize(_slotId, { entity } = {}) {
      const anchorWords = contentWords(entity?.words ?? entity?.label);
      if (!anchorWords.size || systems.length < 2) return [];
      const scored = systems
        .map((sys) => {
          let overlap = 0;
          for (const w of contentWords(sys.words)) if (anchorWords.has(w)) overlap++;
          return { id: sys.id, overlap };
        })
        .sort((a, b) => b.overlap - a.overlap);
      if (!scored[0].overlap || scored[0].overlap === scored[1].overlap) return [];
      return [scored[0].id];
    },
  };
}
