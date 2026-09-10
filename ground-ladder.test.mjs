import test from "node:test";
import assert from "node:assert/strict";
import { groundOf, groundLine, namesIn, TIERS } from "./ground-ladder.js";

const passages = [{ ref: "a.txt#0-60", text: "Amelia Hartley founded the Northgate Observatory in 1887." }, { ref: "b.txt#0-40", text: "The observatory opened in 1889." }];
const ctx = { passages, model: "gemma2:2b", resolveName: (n) => (/hartley|northgate/i.test(n) ? new Set(["r1"]) : new Set()) };

test("the ladder places a sentence on its highest rung and names the cell backstage", () => {
  const s = "Amelia Hartley founded the Northgate Observatory in 1887.";
  const bound = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "bound", spans: [{ ref: "a.txt#0-60", start: 0, end: 57 }] }] });
  assert.equal(bound.tier, "bound"); assert.equal(bound.cell, "CON·Figure"); assert.deepEqual(bound.addresses, ["a.txt#0-60"]);
  assert.match(groundLine(bound), /^stated at a\.txt#0-60$/);
  const wit = groundOf(s, { ...ctx, witness: { sentence: s, witness: "states", decider: "founded the Northgate Observatory in 1887" } });
  assert.equal(wit.tier, "witnessed"); assert.deepEqual(wit.addresses, ["a.txt#0-60"], "the passage holding the decider is the address");
  const rec = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "unbound" }], notes: [{ subject: "Amelia Hartley", verb: "founded", object: "the Northgate Observatory in 1887", witnesses: ["a.txt#0-60~r1", "c.txt#5-50~r1"] }] });
  assert.equal(rec.tier, "recorded"); assert.match(rec.phrase, /2 sources/); assert.deepEqual(rec.addresses, ["a.txt#0-60", "c.txt#5-50"]);
  const con = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "unbound" }], notes: [{ subject: "Amelia Hartley", verb: "founded", object: "the Northgate Observatory in 1887", witnesses: ["a.txt#0-60~r1"], disputedBy: ["b.txt"] }] });
  assert.equal(con.tier, "contested"); assert.equal(con.cell, "CON·Figure·CONTESTED");
  const dv = groundOf("Rowan Vale preceded Owen Blythe.", { ...ctx, resolveName: () => new Set(), derived: [{ subject: "Rowan Vale", verb: "preceded", object: "Owen Blythe", premises: ["p1", "p2"] }] });
  assert.equal(dv.tier, "derived"); assert.deepEqual(dv.addresses, ["p1", "p2"]);
  const named = groundOf("Amelia Hartley loved comets.", ctx);
  assert.equal(named.tier, "named"); assert.deepEqual(named.names, ["Amelia Hartley"]); assert.deepEqual(named.addresses, ["a.txt#0-60"]);
  // groundLine() concatenates phrase + address with a bare space (no connecting
  // word of its own) — the "named" tier's phrase must supply that connector
  // itself, or the chip reads as a broken sentence fragment glued to a raw
  // address (measured live 2026-09-09: "names established, claim not
  // web:search-results#0-2645").
  assert.equal(groundLine(named), "names established, claim not placed at a.txt#0-60");
  // A name can resolve to a known referent (resolveName succeeds) while the
  // PASSAGES HANDED TO THIS SENTENCE never state it (passageHolding finds no
  // match) — established.length > 0 with every ref null, so addresses is
  // empty. The phrase must not trail on the bare preposition "at" with
  // nothing to follow it.
  const namedNoAddress = groundOf("The Hartley Prize honors astronomers.", ctx);
  assert.equal(namedNoAddress.tier, "named");
  assert.deepEqual(namedNoAddress.addresses, [], "the name resolves, but no given passage states it");
  assert.equal(groundLine(namedNoAddress), "names established, claim not placed", "with no address to append, the phrase must stand alone rather than dangle on a bare preposition");
  const self = groundOf("The show ran nine seasons.", { ...ctx, witness: { witness: "refused" } });
  assert.equal(self.tier, "self"); assert.equal(self.cell, "self:model"); assert.equal(groundLine(self), "gemma2:2b — no source states this");
  const unasked = groundOf("The show ran nine seasons.", { ...ctx, witness: { witness: "skipped", why: "budget" } });
  assert.equal(unasked.tier, "self"); assert.match(unasked.detail, /not asked/); assert.equal(unasked.reached.witness, false, "a rung that never reached the sentence is said so");
  assert.deepEqual(TIERS, ["bound", "witnessed", "recorded", "derived", "contested", "named", "self"]);
});

test("witnessed tier: the engine's own placeholder span.ref (witness-sentences.js's joined 'passages' source) is never leaked as the address — the real per-passage ref is recovered instead (live bug, 2026-09-10)", () => {
  const s = "The observatory opened in 1889.";
  // The exact shape witness-sentences.js's rowFor/corroboration.js's span
  // builder actually produce: `span.ref` is the literal string "passages"
  // — the label for the ONE text every passage got joined into before the
  // witness was asked — never a real, individually addressable passage.
  const wit = groundOf(s, {
    ...ctx,
    witness: { sentence: s, witness: "states", decider: "The observatory opened in 1889.", span: { ref: "passages", at: "passages#12-44", text: "The observatory opened in 1889." } },
  });
  assert.equal(wit.tier, "witnessed");
  assert.deepEqual(wit.addresses, ["b.txt#0-40"], "the real passage holding the decider, never the engine's own internal placeholder");
  assert.doesNotMatch(groundLine(wit), /passages/, "the placeholder never reaches the reader's own line");
  assert.equal(groundLine(wit), "a passage states this b.txt#0-40");
});

test("a witness refusal on THIS sentence outranks the named tier's bare name-match — the stronger, more specific check wins the display (live bug, 2026-09-09)", () => {
  // "Amelia Hartley loved comets" alone lands "named" (checked above): her
  // name resolves, nothing placed the claim, and no witness was ever asked
  // about it. But when a witness WAS asked about this exact sentence and
  // came back empty, that is strictly more informative than the bare name
  // match — showing "named, not placed" here reads as a weaker, almost
  // contradictory answer sitting in front of the real one.
  const refused = groundOf("Amelia Hartley loved comets.", { ...ctx, witness: { witness: "refused" } });
  assert.equal(refused.tier, "self");
  assert.equal(refused.refused, true);
  assert.match(refused.detail, /witness was asked and no passage states it/);
  // A witness that DID find a passage still wins outright at tier 2 — this
  // fix only ever touches the case a witness came back empty, never a case
  // it came back with an answer.
  const stated = groundOf("Amelia Hartley loved comets.", { ...ctx, witness: { witness: "states", decider: "Amelia Hartley loved comets." } });
  assert.equal(stated.tier, "witnessed");
  // No witness asked at all (null/skipped) still falls through to "named" —
  // this fix narrows the named tier's reach, it does not remove it.
  const noWitness = groundOf("Amelia Hartley loved comets.", ctx);
  assert.equal(noWitness.tier, "named");
});

test("tier 4 (derived) compares referent identity when the index is available, not bare token containment — recall gained on a differently-worded alias, a false match refused between two distinct referents", () => {
  // RECALL: a derived fact phrased with a wholly different name for the
  // SAME referent (zero shared tokens with the sentence) is missed by
  // pure bag-of-words containment but found once both sides resolve
  // through the same referent index — the "holograph" comparison this
  // ladder's own header names, not a string one.
  const alias = { passages, model: "gemma2:2b", resolveName: (n) => {
    const s = n.toLowerCase();
    if (s === "amelia hartley" || s === "doctor reyes") return new Set(["r1"]);
    return new Set();
  } };
  const recall = groundOf("Amelia Hartley discovered the comet.", { ...alias, derived: [{ subject: "Doctor Reyes", verb: "discovered", object: "the comet", premises: ["p1"] }] });
  assert.equal(recall.tier, "derived", "an alias with no shared tokens still resolves to the same referent as the sentence's own name");

  // PRECISION: a derived fact's subject shares a token (the surname) with
  // the sentence's own longer name purely by coincidence — the old
  // bag-of-words subset check would have credited the sentence with a
  // fact about a DIFFERENT, distinctly-resolved referent.
  const distinct = { passages, model: "gemma2:2b", resolveName: (n) => {
    const s = n.toLowerCase();
    if (s === "amelia jane hartley") return new Set(["r1"]);
    if (s === "amelia hartley") return new Set(["r2"]);
    return new Set();
  } };
  const precision = groundOf("Amelia Jane Hartley discovered the comet.", { ...distinct, derived: [{ subject: "Amelia Hartley", verb: "discovered", object: "the comet", premises: ["p1"] }] });
  assert.notEqual(precision.tier, "derived", "the subject's tokens are a literal subset of the sentence's, but they resolve to a DIFFERENT referent — must not be credited as derived");

  // When neither side has a resolvable name (index absent, or the
  // phrasing has no capitalised name at all), this falls through to the
  // existing token check exactly as before — nothing that worked
  // regresses.
  const noIndex = groundOf("Rowan Vale preceded Owen Blythe.", { passages, model: "gemma2:2b", resolveName: () => new Set(), derived: [{ subject: "Rowan Vale", verb: "preceded", object: "Owen Blythe", premises: ["p1", "p2"] }] });
  assert.equal(noIndex.tier, "derived", "with no resolvable identity either side, the token check still applies");
});

test("names in a sentence are capitalised runs, never sentence-initial function words", () => {
  assert.deepEqual(namesIn("The X-Files was created by Chris Carter and aired on Fox."), ["X-Files", "Chris Carter", "Fox"]);
  assert.deepEqual(namesIn("Some viewers loved \"I Want to Believe\" and its tagline Trust No One, said Chris Carter."), ["Trust No One", "Chris Carter"], "a lone capitalised word at the sentence's start or inside a quoted title is capitalisation, not a name; a multi-word run still counts");
  assert.deepEqual(namesIn("Despite these successes, Mulder returned."), ["Mulder"], "a lone name mid-sentence counts");
});
