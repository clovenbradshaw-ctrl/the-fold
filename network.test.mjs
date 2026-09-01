// network.test.mjs — CON at Pattern grain, against the REAL engine surface
// organ and the REAL saved page whose reading failure produced this module.
//
// The specimen is `web/pages/31a113281ca5cffa.txt` — "List of prime ministers
// of Queen Victoria", fetched live, saved by the web organ, and read by the
// Link-grain extractor for ZERO edges.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { makeNetworkBinder, extentShape, surfaceShape, readDate, RECURRENCE_FLOOR } from "./network.js";

const { extractSurfaces } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js");
const binder = makeNetworkBinder({ shapes: [extentShape, surfaceShape({ extractSurfaces })] });

const PAGE = new URL("./web/pages/31a113281ca5cffa.txt", import.meta.url);
const havePage = existsSync(PAGE);

test("an extent line is one that is ENTIRELY extents — prose holding a range is not", () => {
  assert.ok(extentShape.read("20 June 1837 – 30 August 1841"));
  assert.ok(extentShape.read("March 4, 1861 – March 4, 1865"), "month-first is read too, not only day-first");
  assert.ok(extentShape.read("1834-1835; 1841-1846"), "bare years, several ranges on a line");
  // The exhaustiveness is what stops ordinary sentences joining an arrangement.
  assert.equal(extentShape.read("he served from 1841 to 1846 with distinction"), null);
  assert.equal(extentShape.read("Sir Robert Peel"), null);
});

test("a bare year states a year — no month or day is invented for it", () => {
  assert.deepEqual(readDate("1846"), { year: 1846, month: null, day: null, text: "1846" });
  assert.deepEqual(readDate("30 August 1841"), { year: 1841, month: 8, day: 30, text: "30 August 1841" });
  assert.deepEqual(readDate("March 4, 1861"), { year: 1861, month: 3, day: 4, text: "March 4, 1861" });
  assert.equal(readDate("sometime in the 1840s"), null);
});

test("A CYCLE OF ONE SHAPE BINDS NOTHING — CON relates, and a run of like lines does not", () => {
  const twoNames = "Sir Robert Peel\nLord John Russell\nBenjamin Disraeli";
  assert.deepEqual(binder.bindRecurring(twoNames).systems, [], "three names in a row is three names");
});

test("an unrecognized line is a hole, never a wildcard a pattern may cross", () => {
  // The middle line is prose: it has a terminator, so no shape reads it. A
  // binder that treated an unknown line as "anything" would happily bind
  // across it and report one system where there are two records and a gap.
  const holed = "Sir Robert Peel\n30 August 1841 – 29 June 1846\nHe was a Conservative.\nLord John Russell\n30 June 1846 – 21 February 1852";
  const { systems } = binder.bindRecurring(holed);
  for (const s of systems) {
    for (const inst of s.instances) {
      assert.ok(!inst.rows.some((r) => /Conservative/.test(r.text)), "prose never lands inside a bound system");
    }
  }
});

test("the floor is two instances — one arrangement is a coincidence", () => {
  assert.equal(RECURRENCE_FLOOR, 2);
  const one = "Sir Robert Peel\n30 August 1841 – 29 June 1846";
  assert.deepEqual(binder.bindRecurring(one).systems, []);
  const two = `${one}\nLord John Russell\n30 June 1846 – 21 February 1852`;
  assert.equal(binder.bindRecurring(two).systems.length, 1);
});

test("the organ does not know it is reading offices — swap the shapes, read a changelog", () => {
  // The generality claim, exercised rather than asserted. A version-shape and
  // a bare-year extent, same binder, no change to it.
  const versionShape = { name: "version", read: (l) => (/^v\d+\.\d+\.\d+$/.test(l.trim()) ? { version: l.trim() } : null) };
  const b = makeNetworkBinder({ shapes: [extentShape, versionShape] });
  const changelog = "v1.0.0\n2019-2020\nv1.4.0\n2020-2021\nv2.0.0\n2021-2022";
  const { systems } = b.bindRecurring(changelog);
  assert.equal(systems.length, 1);
  assert.deepEqual(systems[0].shape, ["version", "extent"]);
  assert.equal(systems[0].count, 3);
});

test("THE SPECIMEN: the whole real page, and the ten holders the Link-grain organ could not reach", { skip: !havePage }, () => {
  const page = readFileSync(PAGE, "utf8");
  // The WHOLE page is handed over — no hand-cut block, so the organ has to
  // find its own systems among 709 lines of navigation, headings and prose.
  const { systems } = binder.bindRecurring(page, { ref: "web:list" });

  assert.equal(systems.length, 2, "two record blocks on this page, and no noise");
  for (const s of systems) assert.deepEqual(s.shape, ["surface", "extent"]);

  const uk = systems.find((s) => s.instances.some((i) => /Melbourne/.test(i.rows[0].text)));
  assert.ok(uk, "the United Kingdom block is found");
  assert.equal(uk.count, 10, "ten prime ministers served Victoria");

  const named = uk.instances.map((i) => i.rows[0].text);
  for (const pm of ["Melbourne", "Peel", "Russell", "Derby", "Aberdeen", "Palmerston", "Disraeli", "Gladstone", "Salisbury", "Rosebery"]) {
    assert.ok(named.some((n) => n.includes(pm)), `${pm} is one of the ten and must be bound`);
  }

  // Discontinuous service is kept as several extents, never flattened to one
  // span from first to last — Gladstone was prime minister four separate
  // times and a single 1868–1894 range would be a fact nobody stated.
  const gladstone = uk.instances.find((i) => /Gladstone/.test(i.rows[0].text));
  assert.equal(gladstone.rows[1].read.length, 4);

  // P5.2 at Pattern grain: every span reproduces its own bytes.
  for (const s of systems) {
    for (const inst of s.instances) {
      const sliced = page.slice(inst.span.start, inst.span.end).split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
      assert.equal(sliced, inst.span.text);
    }
  }
});

test("THE CONTROL: the Link-grain organ really does get zero here, so this is a grain gap", { skip: !havePage }, async () => {
  // Without this the whole diagnosis is an assertion. A vocabulary gap
  // degrades; a grain mismatch floors — and it floors.
  const E = "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/";
  const { makeRelationReader } = await import("./hypergraph.js");
  const { splitSentences } = await import(`${E}spans.js`);
  const { discoverReferents, namesCorefer, diaNorm } = await import(`${E}surfaces.js`);
  const { discoverRelationVocab, extractRelations } = await import(`${E}relations.js`);
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(`${E}material.js`);

  // THE EXACT BYTES the Pattern-grain organ bound, taken from its own spans —
  // never a hand-cut region, which is how the first version of this control
  // accidentally included surrounding prose and measured 23 edges from
  // sentences that were never part of the record block.
  const page = readFileSync(PAGE, "utf8");
  const uk = binder
    .bindRecurring(page, { ref: "web:list" })
    .systems.find((sys) => sys.instances.some((i) => /Melbourne/.test(i.rows[0].text)));
  const block = uk.instances.map((i) => i.span.text).join("\n\n");
  assert.match(block, /Gladstone/, "the control has to be reading the real block");
  const P = [{ ref: "web:list", text: block }];
  const reader = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet,
  })(P, { pool: P });

  assert.equal((reader.edges ?? []).length, 0, "zero, not few — there is no connector in a record block");
});
