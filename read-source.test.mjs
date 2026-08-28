// read-source.test.mjs — what we have read, walked by the SAME seek.js that
// walks Wikidata. Against the real engine surface organ and the real saved
// page, with no hand-built entities anywhere.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { makeReadSource, RELATION } from "./read-source.js";
import { makeNetworkBinder, extentShape, surfaceShape } from "./network.js";
import { seekBindings } from "./seek.js";

const { extractSurfaces } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js");
const binder = makeNetworkBinder({ shapes: [extentShape, surfaceShape({ extractSurfaces })] });
const build = (passages) => makeReadSource({ binder, extractSurfaces, passages });

const PAGE = new URL("./web/pages/31a113281ca5cffa.txt", import.meta.url);
const havePage = existsSync(PAGE);

// The reign range as the live turn's own retrieved digest states it — a "to"
// separator, unlike the prose form ("…until her death on…") the reader
// deliberately does not stretch to reach.
const DIGEST =
  "The list of prime ministers of Queen Victoria enumerates the ten men who served as head of " +
  "His Majesty's Government in the United Kingdom during her reign from 20 June 1837 to 22 January 1901.";

test("a document with no arrangement yields no systems, and says so by having none", () => {
  const src = build([{ ref: "web:d", text: "Just some prose. Nothing is listed here at all.", title: "d" }]);
  assert.equal(src.systems().length, 0);
});

test("a dated name is dated IN A DOCUMENT — not gated on that passage holding a list", () => {
  // The bug this pins: the prose pass required a bound system in the SAME
  // passage, so the reign range — which arrives in a search-results digest
  // holding no record block at all — was skipped exactly where it mattered,
  // and the anchor stayed unscoped.
  const src = build([{ ref: "web:digest", text: DIGEST, title: "search results" }]);
  assert.equal(src.systems().length, 0, "the digest genuinely holds no arrangement");
  const victoria = src.all().find((e) => /^Queen Victoria$/i.test(e.label));
  assert.ok(victoria, `no Victoria among ${src.all().map((e) => e.label).join(", ")}`);
  assert.equal(victoria.relations.length, 1);
  assert.deepEqual(victoria.relations[0].scope, { from: "1837-06-20", to: "1901-01-22" });
  assert.equal(victoria.relations[0].fromProse, true, "prose-derived scope is marked as such");
});

test("a bound arrangement is never overwritten by a sentence that happens to date the same name", () => {
  const listed = "Ada Lovelace\n1842-1843\nGrace Hopper\n1944-1945";
  const prose = "Ada Lovelace worked from 1900 to 1999.";
  const src = build([{ ref: "web:x", text: `${listed}\n\n${prose}`, title: "x" }]);
  const ada = src.all().find((e) => e.label === "Ada Lovelace");
  assert.ok(ada.relations.every((r) => !r.fromProse), "the record block is the stronger evidence and it stands");
  assert.equal(ada.relations[0].scope.from, "1842-01-01");
});

test("members point at their system and the system points at nothing — the sink P59 exists for", async () => {
  const src = build([{ ref: "web:x", text: "Ada Lovelace\n1842-1843\nGrace Hopper\n1944-1945", title: "x" }]);
  const sys = src.systems()[0];
  assert.deepEqual(await src.neighbours(sys.id), [], "a system is a pure sink");
  const back = await src.inbound(sys.id);
  assert.equal(back.length, 2, "and both members are reachable by the inbound question");
});

test("a document is never the thing being asked about", async () => {
  // A list titled after the anchor matches the anchor's own words as strongly
  // as the anchor does, and `chooseAnchor` takes the first candidate holding a
  // bounded extent — so ordering decides what the walk commits to.
  const src = build([{ ref: "web:x", text: "Ada Lovelace\n1842-1843\nAda Lovelace\n1850-1851", title: "All about Ada Lovelace" }]);
  const ids = (await src.resolve("Ada Lovelace")).map((r) => r.id);
  assert.ok(ids.length > 1);
  assert.ok(!ids[0].startsWith("read:doc:"), `a document led the candidates: ${ids.join(", ")}`);
});

test("specialize refuses a tie rather than guessing which list was meant", async () => {
  const src = build([
    { ref: "a", text: "One Person\n1900-1901\nTwo Person\n1901-1902", title: "same words here" },
    { ref: "b", text: "Three Person\n1900-1901\nFour Person\n1901-1902", title: "same words here" },
  ]);
  const anchor = { words: "same words here" };
  assert.deepEqual(await src.specialize(null, { entity: anchor }), [], "equal overlap is ambiguity, not an answer");
});

test("THE WALK, over the real saved page plus the turn's own digest", { skip: !havePage }, async () => {
  const src = build([
    { ref: "web:list", text: readFileSync(PAGE, "utf8"), title: "List of prime ministers of Queen Victoria" },
    { ref: "web:search-results", text: DIGEST, title: "search results" },
  ]);
  const got = await seekBindings({ anchor: "Queen Victoria", slot: "prime minister" }, src);
  assert.ok(!got.gap, `expected bindings, got ${JSON.stringify(got.gap)}`);
  assert.equal(got.relation, RELATION, "the relation is LEARNED by example, never named by this file");

  const bound = (got.perScope ?? []).flatMap((p) => p.bound);
  const names = [...new Set(bound.map((b) => b.label))];
  assert.equal(names.length, 10, `ten people, twenty ministries — got ${names.length}: ${names.join(", ")}`);
  assert.equal(bound.length, 20);

  for (const pm of ["Melbourne", "Peel", "Russell", "Derby", "Aberdeen", "Palmerston", "Disraeli", "Gladstone", "Salisbury", "Rosebery"]) {
    assert.ok(names.some((n) => n.includes(pm)), `${pm} must be bound`);
  }
  // The same page lists New Zealand's premiers in the identical arrangement.
  // `specialize` picks by the ANCHOR's words, so they must not appear.
  for (const nz of ["Sewell", "Vogel", "Domett", "Whitaker"]) {
    assert.ok(!names.some((n) => n.includes(nz)), `${nz} is a New Zealand premier and must not be bound`);
  }
  // Every binding is addressed back to the bytes that produced it.
  for (const b of bound) assert.ok(b.span?.ref, "a binding carries its own provenance");
});
