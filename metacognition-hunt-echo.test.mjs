// node --test metacognition-hunt-echo.test.mjs
//
// The hunt gate's SECOND signal (metacognition.js::makeHuntMeter's optional
// `aposiopesis`/`splitSentences`/`normalize` organs, `ownDominatedSentences`,
// `wholePassageDominance`, `huntEchoOf`, `huntEchoed`) — a cheap, structural,
// shape-based pre-check disclosing when an arriving page is substantially an
// ECHO of material already gathered this hunt, alongside (never replacing)
// `huntSettled`'s own statistical surprise verdict. A SEPARATE file from
// metacognition-hunt.test.mjs on purpose, matching that file's own reasoning
// for splitting from metacognition.test.mjs: this needs the legacy engine's
// tiers.js (for the real surprise physiology `makeHuntMeter` still runs
// underneath) AND eoreader7's real aposiopesis.js/cite.js, so it honestly
// fails to load wherever either is absent — never a stand-in for the organ
// under test.
//
// Every specimen here is a fresh, DECLARED INVENTION (a fictional 19th-
// century timber mill, no recallable fact) — the same falsification-probe
// posture metacognition-hunt.test.mjs's own header states, so nothing here
// tests memorized world knowledge. Every prefix/overlap relationship
// asserted below was checked directly against the REAL `splitSentences`
// (eoreader7/native/organs/cite.js) and the REAL `aposiopesis.find()`
// before being pinned, not assumed from reading the specimen text.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeHuntMeter, huntSettled, huntEchoed } from "./metacognition.js";
import { createTierStack, foldThrough } from "../eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js";
import { splitSentences } from "../eoreader7/native/organs/cite.js";
import { makeAposiopesis } from "../eoreader7/native/organs/aposiopesis.js";

// The same normalize shape fact-block.js's own private `normalizeForDedup`
// uses, and the same stand-in aposiopesis.test.mjs already keeps for
// exactly this reason (a small, honest stand-in rather than reaching into
// fact-block.js's own unexported internals) — "construct an equivalent one
// the same way", this file's own task said, and this IS that way.
const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const aposiopesis = makeAposiopesis({ splitSentences, normalize });

function hunt() {
  return makeHuntMeter({ createTierStack, foldThrough, aposiopesis, splitSentences, normalize });
}

// ── specimens (declared invented — Verrow Timber Co., nothing recallable) ──

const FULL_TEXT =
  "Verrow Timber Co. was chartered in 1873 by Alden Meer, who ran the mill until his death in 1901. " +
  "His daughter Josephine Meer then took charge of the mill for the next two decades, expanding it to " +
  "three sawblades and a new floating dock on the Kessin River.";

// A byte-for-byte (post-normalize) PREFIX of FULL_TEXT — the shape of a
// thin second search result that turns out to be the same underlying page,
// truncated: real live traffic per the task's own gap description ("two
// search results that are literally the same underlying page").
const TRUNCATED_TEXT =
  "Verrow Timber Co. was chartered in 1873 by Alden Meer, who ran the mill until his death in 1901.";

// A search-engine snippet's own shape: trailing "…", and its own words are
// an EXACT byte-for-byte restatement of FULL_TEXT's own opening sentence —
// the P181 scenario itself, a search-results digest snippet later completed
// by the full page it previews.
const SNIPPET =
  "Verrow Timber Co. was chartered in 1873 by Alden Meer, who ran the mill until his death in 1901…";

// A page carrying its OWN genuinely new lead sentence plus a second
// sentence that trails off and is completed elsewhere — checked directly
// against the real organs above: whole-passage comparison reads neither
// dominated nor dominates (the lead sentence has no counterpart anywhere),
// while the sentence-level check still finds the one truncated sentence.
const ALREADY_GATHERED =
  "The Kessin River flooding in 1888 destroyed two of Verrow's original sawblades, forcing a costly " +
  "rebuild that delayed shipments for the whole autumn season.";
const PARTIALLY_ECHOING_PAGE =
  "Verrow's rebuilding effort drew workers from as far as Dellring. The Kessin River flooding in 1888 " +
  "destroyed two of Verrow's original sawblades…";

// Genuinely novel, zero shared vocabulary with any of the above.
const NOVEL_PAGE =
  "Marbled fritillary moths cross the Kessin valley each autumn, guided by ridge-line thermals rather " +
  "than any scent trail their larvae once followed.";

test("wholePassageDominance: a later, thinner arrival that is a byte-for-byte prefix of an already-gathered page is DOMINATED", () => {
  const h = hunt();
  const m = h.create([]);
  const full = h.arrive(m, FULL_TEXT);
  assert.equal(full.echo.dominated, false, "nothing gathered yet to dominate the first page");
  assert.equal(full.echo.dominates, false);
  const truncated = h.arrive(m, TRUNCATED_TEXT);
  assert.equal(truncated.echo.dominated, true, "the truncated arrival is a strict prefix of the fuller page already held");
  assert.equal(truncated.echo.exact, false, "a strict prefix, not an exact duplicate");
  assert.equal(truncated.echo.dominates, false);
  assert.equal(huntEchoed(truncated), true, "the convenience reading agrees: this whole arrival is substantially an echo");
});

test("wholePassageDominance: a fuller arrival that COMPLETES an already-gathered truncated seed DOMINATES it — never flagged as an echo", () => {
  // The realistic gatherPreflightMaterial ordering: the search-results
  // snippet digest is seeded BEFORE any page is fetched (app.js:
  // `huntMeter.create([task, discourse, digest])`), and the full page
  // arrives afterward via `arrive`.
  const h = hunt();
  const m = h.create([SNIPPET]);
  const full = h.arrive(m, FULL_TEXT);
  assert.equal(full.echo.dominates, true, "the arriving full page completes the seeded snippet");
  assert.equal(full.echo.dominated, false, "the arriving page is the fuller one — it is not itself the echo");
  assert.equal(huntEchoed(full), false, "dominates is the OPPOSITE of an echo: real, new, completing information, never grounds to stop hunting on its own");
});

test("wholePassageDominance: an exact normalized duplicate is DOMINATED with exact:true", () => {
  const h = hunt();
  const m = h.create([]);
  h.arrive(m, FULL_TEXT);
  // Same words, different incidental punctuation/casing only — the same
  // "nothing gained either way" case this file's own header names.
  const dupe = h.arrive(m, FULL_TEXT.toUpperCase());
  assert.equal(dupe.echo.dominated, true);
  assert.equal(dupe.echo.exact, true);
  assert.equal(huntEchoed(dupe), true);
});

test("ownDominatedSentences: a page with real new content AND one truncated sentence completed elsewhere reports the sentence, without flagging the whole page", () => {
  const h = hunt();
  const m = h.create([ALREADY_GATHERED]);
  const obs = h.arrive(m, PARTIALLY_ECHOING_PAGE);
  assert.equal(obs.echo.sentenceDominated.length, 1, "exactly the one trailing-ellipsis sentence, not the fresh lead sentence beside it");
  assert.ok(obs.echo.sentenceDominated[0].includes("kessin river flooding"));
  assert.equal(obs.echo.dominated, false, "the WHOLE page is not a prefix of, or exactly, anything already gathered");
  assert.equal(obs.echo.dominates, false);
  assert.equal(huntEchoed(obs), false, "a single echoed sentence inside an otherwise-fresh page must not read as 'stop, this whole arrival is redundant'");
});

test("a genuinely novel page shares no sentence and no passage-level prefix with anything gathered — correctly NOT flagged as an echo", () => {
  const h = hunt();
  const m = h.create([FULL_TEXT, ALREADY_GATHERED, SNIPPET]);
  const obs = h.arrive(m, NOVEL_PAGE);
  assert.deepEqual(obs.echo.sentenceDominated, []);
  assert.equal(obs.echo.dominated, false);
  assert.equal(obs.echo.dominates, false);
  assert.equal(obs.echo.exact, false);
  assert.equal(huntEchoed(obs), false);
});

test("makeHuntMeter: an injected aposiopesis needs its own splitSentences/normalize beside it, exactly like makeAposiopesis itself", () => {
  assert.throws(() => makeHuntMeter({ createTierStack, foldThrough, aposiopesis }), TypeError);
  assert.throws(() => makeHuntMeter({ createTierStack, foldThrough, aposiopesis, splitSentences }), TypeError);
  assert.throws(() => makeHuntMeter({ createTierStack, foldThrough, aposiopesis, normalize }), TypeError);
});

test("huntEchoed: reads only obs.echo.dominated — absent echo, or a merely-partial/dominates echo, both read false", () => {
  assert.equal(huntEchoed(null), false);
  assert.equal(huntEchoed(undefined), false);
  assert.equal(huntEchoed({}), false, "no echo key at all — the existing, unextended shape");
  assert.equal(huntEchoed({ echo: { dominated: false, dominates: true, sentenceDominated: [] } }), false);
  assert.equal(huntEchoed({ echo: { dominated: false, dominates: false, sentenceDominated: ["x"] } }), false, "a partial sentence echo alone is not the whole-page signal");
  assert.equal(huntEchoed({ echo: { dominated: true, dominates: false, sentenceDominated: [] } }), true);
});

// ── the load-bearing requirement: byte-identical when the new parameter is omitted ──

test("makeHuntMeter: the existing surprise-based behavior is BYTE-IDENTICAL when aposiopesis/splitSentences/normalize are omitted", () => {
  const withEcho = makeHuntMeter({ createTierStack, foldThrough, aposiopesis, splitSentences, normalize });
  const withoutEcho = makeHuntMeter({ createTierStack, foldThrough });

  const seeds = [FULL_TEXT, "the discourse line", "a search query"];
  const pages = [TRUNCATED_TEXT, NOVEL_PAGE, PARTIALLY_ECHOING_PAGE];

  const mWith = withEcho.create(seeds);
  const mWithout = withoutEcho.create(seeds);
  const obsWith = pages.map((p) => withEcho.arrive(mWith, p));
  const obsWithout = pages.map((p) => withoutEcho.arrive(mWithout, p));

  for (const o of mWithout.arrivals) assert.ok(!("echo" in o), "no echo key is ever added when the organ is omitted — the observation's own shape is unchanged, not merely a null field");
  for (const o of mWith.arrivals) assert.ok("echo" in o, "supplied, every observation carries the new field");

  // Strip `echo` from the WITH-organ run and compare every other field —
  // the surprise computation and settlement verdict must not move by so
  // much as one bit because a second, independent check now also runs.
  const strip = (o) => { const { echo, ...rest } = o; return rest; };
  assert.deepEqual(mWith.arrivals.map(strip), mWithout.arrivals.map(strip));

  // And the app.js call site itself — `makeHuntMeter({ createTierStack,
  // foldThrough })`, no third argument at all — must still construct and
  // run without ever throwing on the new optional parameters' absence.
  assert.doesNotThrow(() => makeHuntMeter({ createTierStack, foldThrough }));
});

test("huntSettled's own cut is untouched by any of this — a settled surprise verdict and an echo verdict are independent signals", () => {
  // The convergent-stream specimen this repo already trusts
  // (metacognition-hunt.test.mjs) restated here with fresh, unrelated
  // words so this file stays self-contained; the point is only that
  // `.settled` still reads exactly the way `huntSettled` documents,
  // regardless of whether `.echo` is present on the same observation.
  const h = hunt();
  const m = h.create([FULL_TEXT]);
  const obs = h.arrive(m, FULL_TEXT.toUpperCase());
  assert.equal(obs.settled, huntSettled(obs), "settled is still read off the surprise fields alone");
  assert.equal(obs.echo.dominated, true, "and the echo signal fired independently, on the same observation");
});
