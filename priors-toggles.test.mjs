// priors-toggles.test.mjs — conformance for the priors organ's gate. The
// walls themselves: a prior arrives off; the most specific declaration
// decides and names itself; bad ledger lines are counted, never silently
// dropped; papers come through priors.js's one frontmatter reading with
// offsets that keep naming the file as it sits on disk.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  foldPriorToggles,
  effectivePrior,
  normalizePriorPath,
  declarationRows,
  declarationsFrom,
  papersOf,
  provenanceLine,
} from "./priors-toggles.js";

test("the ledger folds last-write-wins per path, counting bad lines", () => {
  const jsonl = [
    JSON.stringify({ path: "06-government-legal", on: true, at: "t1" }),
    "not json",
    JSON.stringify({ path: "06-government-legal", on: false, at: "t2" }),
    JSON.stringify({ path: 42, on: true }), // shapeless
    JSON.stringify({ path: "14-holy-texts/quran", on: true, at: "t3" }),
  ].join("\n");
  const { byPath, skipped } = foldPriorToggles(jsonl);
  assert.equal(skipped, 2);
  assert.equal(byPath.get("06-government-legal").on, false);
  assert.equal(byPath.get("14-holy-texts/quran").on, true);
});

test("a prior arrives off, and the default names no decider", () => {
  const { byPath } = foldPriorToggles("");
  assert.deepEqual(effectivePrior(byPath, "01-literature-books/gutenberg/moby.md"), { on: false, decidedBy: null, at: null });
});

test("the most specific declaration decides, and the decision names its level", () => {
  const { byPath } = foldPriorToggles(
    [
      JSON.stringify({ path: "", on: true, at: "t0" }), // the everything toggle
      JSON.stringify({ path: "06-government-legal", on: false, at: "t1" }), // genre off
      JSON.stringify({ path: "06-government-legal/world-legislation/de/ARBZG.md", on: true, at: "t2" }), // one statute back on
    ].join("\n"),
  );
  // the statute: its own path decides
  assert.deepEqual(effectivePrior(byPath, "06-government-legal/world-legislation/de/ARBZG.md"), {
    on: true,
    decidedBy: "06-government-legal/world-legislation/de/ARBZG.md",
    at: "t2",
  });
  // a sibling statute: the genre's off reaches it
  const sib = effectivePrior(byPath, "06-government-legal/world-legislation/de/BEAMTSTG.md");
  assert.equal(sib.on, false);
  assert.equal(sib.decidedBy, "06-government-legal");
  // a document in another genre: the root's on reaches it
  assert.deepEqual(effectivePrior(byPath, "14-holy-texts/quran/002.md"), { on: true, decidedBy: "", at: "t0" });
});

test("paths normalize to one shape before any comparison", () => {
  assert.equal(normalizePriorPath("/06-government-legal/"), "06-government-legal");
  assert.equal(normalizePriorPath("a\\b//c"), "a/b/c");
  const { byPath } = foldPriorToggles(JSON.stringify({ path: "/14-holy-texts/", on: true }));
  assert.equal(effectivePrior(byPath, "14-holy-texts/tanakh/genesis.md").on, true);
});

test("declarations round-trip the wire shape, sorted", () => {
  const { byPath } = foldPriorToggles(
    [JSON.stringify({ path: "b", on: true, at: "t1" }), JSON.stringify({ path: "a", on: false, at: "t2" })].join("\n"),
  );
  const rows = declarationRows(byPath);
  assert.deepEqual(rows.map((r) => r.path), ["a", "b"]);
  const back = declarationsFrom(rows);
  assert.equal(back.get("a").on, false);
  assert.equal(back.get("b").on, true);
});

test("papersOf reads the papers through priors.js's one parser, offsets naming the file", () => {
  const doc = `---\ntitle: "Arbeitszeitgesetz"\ncountry: "de"\npublication_date: "1994-06-06"\nstatus: "in_force"\nsource: "https://www.gesetze-im-internet.de/arbzg/"\ndepartment: "BMJ"\n---\n# Arbeitszeitgesetz\n`;
  const { provenance, line, bodyStart } = papersOf(doc);
  assert.equal(provenance.title, "Arbeitszeitgesetz");
  // the canonical aliases priors.js::provenanceOf fills are present
  assert.equal(provenance.url, "https://www.gesetze-im-internet.de/arbzg/");
  assert.equal(provenance.publisher, "BMJ");
  assert.equal(provenance.date, "1994-06-06");
  // the offset points into the UNTOUCHED text — the file on disk is the address space
  assert.equal(doc.slice(bodyStart, bodyStart + 19), "# Arbeitszeitgesetz");
  assert.equal(line, "Arbeitszeitgesetz · BMJ · DE · 1994-06-06 · in_force · https://www.gesetze-im-internet.de/arbzg/");
});

test("a document without a header has no papers, and that is a result", () => {
  const { provenance, line, bodyStart } = papersOf("Chapter one.\n\nIt began at sea.");
  assert.equal(provenance, null);
  assert.equal(line, null);
  assert.equal(bodyStart, 0);
});

test("the papers line is the canonical fields in declared order, or null", () => {
  assert.equal(provenanceLine(null), null);
  assert.equal(provenanceLine({}), null);
  assert.equal(provenanceLine({ publisher: "OHCHR", date: "1948-12-10" }), "OHCHR · 1948-12-10");
});
