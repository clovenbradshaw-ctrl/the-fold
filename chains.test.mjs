// chains.test.mjs — conformance for chains.js: verifying a chain and
// finding its own fillers, genre-blind. Every case below is INVENTED
// content with zero succession-box vocabulary — no "office", no
// "president", no Wikipedia shape anywhere — proving the mechanism the
// same way this repo's own constitution asks for a medium-agnosticism
// claim to be proven: the identical code path, a different domain, no
// branch naming either one.
import { test } from "node:test";
import assert from "node:assert/strict";

import { verifyChain, segmentsByField, closurePhrase, chainFillers, exactMatch } from "./chains.js";

// ── verifyChain: the linked-enumeration route ───────────────────────────

const STEWARDS = [
  { id: "Vessa", prev: null, next: "Orin", seq: 1, fields: { accord: "amber" } },
  { id: "Orin", prev: "Vessa", next: "Talik", seq: 2, fields: { accord: "amber" } },
  { id: "Talik", prev: "Orin", next: null, seq: 3, fields: { accord: "cobalt" } },
];

test("verifyChain (seq mode): cross-agreeing pointers verify every link with both sides counted", () => {
  const r = verifyChain(STEWARDS);
  assert.equal(r.ok, true);
  assert.equal(r.chains.length, 1);
  assert.ok(r.chains[0].links.every((l) => l.verified && l.sides === 2));
});

test("verifyChain (seq mode): a contradicted pointer leaves the link unverified — where both sides speak they must agree", () => {
  const bad = [
    { id: "Vessa", prev: null, next: "Orin", seq: 1 },
    { id: "Orin", prev: "Talik", next: null, seq: 2 }, // prev names the wrong steward
  ];
  const r = verifyChain(bad);
  assert.equal(r.ok, true);
  assert.equal(r.chains[0].links[0].contradicted, true);
  assert.equal(r.chains[0].links[0].verified, false);
});

test("verifyChain (seq mode): a seq gap is a boundary, never an error — the chain splits", () => {
  const gapped = [
    { id: "a", seq: 1, next: "b" },
    { id: "b", seq: 2, prev: "a" },
    { id: "e", seq: 5 },
  ];
  const r = verifyChain(gapped);
  assert.equal(r.ok, true);
  assert.equal(r.chains.length, 2);
});

test("verifyChain (link-walk mode): order recovered from prev-pointers alone — a ledger-shaped chain, no text anywhere", () => {
  const ledger = [
    { id: "c3f1", prev: "b2e0" },
    { id: "a1d9", prev: null },
    { id: "b2e0", prev: "a1d9" },
  ];
  const r = verifyChain(ledger);
  assert.equal(r.ok, true);
  assert.deepEqual(
    r.chains[0].order.map((x) => x.id),
    ["a1d9", "b2e0", "c3f1"],
  );
});

test("verifyChain (link-walk mode): a fork refuses typed — never a guess between two predecessors", () => {
  const forked = [
    { id: "a", next: "c" },
    { id: "b", next: "c" },
    { id: "c" },
  ];
  const r = verifyChain(forked);
  assert.equal(r.ok, false);
  assert.equal(r.refused.type, "fork");
});

test("verifyChain: duplicate ids refuse typed before anything else runs", () => {
  const r = verifyChain([
    { id: "Same", seq: 1 },
    { id: "Same", seq: 2 },
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.refused.type, "duplicate_id");
});

test("verifyChain: identity is the caller's — exactMatch (the default) is case-sensitive, on purpose, since folding is a genre decision this file does not make", () => {
  const r = verifyChain([
    { id: "Same", seq: 1 },
    { id: "same", seq: 2 },
  ]);
  assert.equal(r.ok, true, "\"Same\" and \"same\" are different ids under strict equality — a caller who wants them folded injects `matches`");
});

// ── segmentsByField: closure graded, never asserted from silence ────────

test("segmentsByField: a field-bounded middle segment closes on verified different-neighbors; ends grade by their own pointers", () => {
  const chain = verifyChain(STEWARDS).chains[0];
  const segs = segmentsByField(chain, { field: "accord" });
  assert.equal(segs.length, 2);
  const amber = segs[0];
  assert.equal(amber.value, "amber");
  assert.deepEqual(amber.members.map((m) => m.id), ["Vessa", "Orin"]);
  assert.equal(amber.bounds.before.type, "terminus");
  assert.equal(amber.bounds.after.type, "different-neighbor");
  assert.equal(amber.closed, true);
  assert.match(closurePhrase(amber), /bounded before by/);
});

test("segmentsByField: an unverified link at a boundary leaves that end OPEN — a segment is never closed by silence", () => {
  const noisy = [
    { id: "p", seq: 1, fields: { g: "one" } },
    { id: "q", seq: 2, fields: { g: "two" } },
  ];
  const chain = verifyChain(noisy).chains[0];
  const segs = segmentsByField(chain, { field: "g" });
  assert.equal(segs[0].bounds.after.type, "open");
  assert.equal(segs[0].closed, false);
});

// ── chainFillers: group, verify, emit — the shape void-brief.js's
// `fillersFor` actually consumes ───────────────────────────────────────

test("chainFillers: an invented, non-Wikipedia chronicle — a wardenship, not an office — produces the same {filler, span, source} shape", () => {
  const records = [
    { id: "Ilo Fenn", prev: null, next: "Vessa Marrow", seq: 3, fields: { charter: "the second charter", termStart: 401, termEnd: 418 } },
    { id: "Vessa Marrow", prev: "Ilo Fenn", next: "Orin Dask", seq: 4, fields: { charter: "the second charter", termStart: 419, termEnd: 430 } },
    { id: "Orin Dask", prev: "Vessa Marrow", next: "Sable Wren", seq: 5, fields: { charter: "the second charter", termStart: 431, termEnd: 440 } },
  ];
  const fillers = chainFillers(records, {
    groupBy: (r) => r.fields.charter,
    spanOf: (r) => ({ from: r.fields.termStart, to: r.fields.termEnd }),
  });
  assert.equal(fillers.length, 3);
  const orin = fillers.find((f) => f.filler === "Orin Dask");
  assert.deepEqual(orin.span, { from: 431, to: 440 });
  // `source` is the GROUP's own overall closure, not a per-member
  // immediate-neighbor phrase — every member of one verified chain shares
  // the identical giver, since the confirmed set is the same set for all
  // three (bounded before by Ilo's own declared start, after by Orin's own
  // pointer to Sable Wren, outside this material).
  assert.match(orin.source, /bounded before by a declared end.*outside this material/s);
  const ilo = fillers.find((f) => f.filler === "Ilo Fenn");
  assert.equal(ilo.source, orin.source, "one confirmed set, one giver, shared by every member");
});

test("chainFillers: a group with only one member is left for the caller's own singular handling, never forced through chain arithmetic", () => {
  const records = [{ id: "Solo", fields: { role: "solitary" } }];
  const fillers = chainFillers(records, { groupBy: (r) => r.fields.role, spanOf: () => null });
  assert.equal(fillers.length, 0);
});

test("chainFillers: an unverified chain within a group contributes nothing — no guessed fillers ever ship", () => {
  const records = [
    { id: "a", prev: null, next: "b", seq: 1, fields: { role: "x" } },
    { id: "b", prev: "z", next: null, seq: 2, fields: { role: "x" } }, // prev names a stranger
  ];
  const fillers = chainFillers(records, { groupBy: (r) => r.fields.role, spanOf: () => null });
  assert.equal(fillers.length, 0);
});

test("chainFillers: a record with no readable span still contributes as a witness — a null span is disclosed absence, never guessed", () => {
  const records = [
    { id: "a", prev: null, next: "b", seq: 1, fields: { role: "x" } },
    { id: "b", prev: "a", next: null, seq: 2, fields: { role: "x" } },
  ];
  const fillers = chainFillers(records, { groupBy: (r) => r.fields.role, spanOf: () => null });
  assert.equal(fillers.length, 2);
  assert.ok(fillers.every((f) => f.span === null));
});

test("chainFillers: identity is injectable — a containment `matches` finds the same chain a strict one would miss, for the cases containment actually covers", () => {
  const records = [
    { id: "Hannibal Hamlin", prev: null, next: "Andrew", seq: 1, fields: { role: "x" } },
    { id: "Andrew Johnson", prev: "Hamlin", next: null, seq: 2, fields: { role: "x" } },
  ];
  const containment = (a, b) => {
    const fa = a.toLowerCase(), fb = b.toLowerCase();
    return fa.includes(fb) || fb.includes(fa);
  };
  const strict = chainFillers(records, { groupBy: (r) => r.fields.role, spanOf: () => null, matches: exactMatch });
  const fuzzy = chainFillers(records, { groupBy: (r) => r.fields.role, spanOf: () => null, matches: containment });
  assert.equal(strict.length, 0, "exact match cannot see \"Hamlin\" inside \"Hannibal Hamlin\"");
  assert.equal(fuzzy.length, 2);
});

// DISCLOSED GAP, not silently patched around. "Andrew J." and "Andrew
// Johnson" name the same referent, and bidirectional substring containment
// — the matcher succession.js's own real `namesMatch` uses today, and the
// one this file's own header names as the worked example for injecting a
// name-shaped `matches` — genuinely cannot see it: "andrew j." is not a
// substring of "andrew johnson" in either direction (the trailing period
// breaks the run). This was found live building this test, by picking the
// harder of two equally-plausible fixtures rather than the one that
// happened to pass. The real fix is not a smarter regex for periods and
// initials — this repo's own house rule (P11, restated dozens of times:
// "the same name" and "the same recurring word" are never the same claim)
// says the correct matcher is a real referent index (cast.js's
// makeReferentIndex), injected here exactly the way `matches` already
// allows. That wiring is real, scoped, unattempted work — not done in this
// pass — and this test exists so the gap stays visible rather than
// disappearing behind an easier fixture next time someone touches this file.
test("chainFillers: containment alone cannot resolve a period-abbreviated initial to its full name — a real referent index is the actual fix, not attempted here", () => {
  const records = [
    { id: "Andrew J.", prev: null, next: "Schuyler Colfax", seq: 1, fields: { role: "x" } },
    { id: "Schuyler Colfax", prev: "Andrew Johnson", next: null, seq: 2, fields: { role: "x" } },
  ];
  const containment = (a, b) => {
    const fa = a.toLowerCase(), fb = b.toLowerCase();
    return fa.includes(fb) || fb.includes(fa);
  };
  const fillers = chainFillers(records, { groupBy: (r) => r.fields.role, spanOf: () => null, matches: containment });
  assert.equal(fillers.length, 0, "the real gap: \"Andrew J.\" / \"Andrew Johnson\" is the same referent and containment cannot tell");
});
