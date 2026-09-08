// relative.test.mjs — the keyless field and the pattern over ground and figure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Field, sdrOf, overlap, tokensOf, isWord, hash32, SDR_BITS } from "./relative.js";
import { drift, reanchor, correspond, fragmentOf } from "./relative-pattern.js";
import { resolveAddress } from "./record-log.js";

const PASSAGES = [
  "Prince Andrew rode along the line of the troops, looking at the faces of the men he was to lead.",
  "The battery on the mound fired without pause, and the smoke lay over the field like a fog.",
  "Pierre, in his white hat, wandered between the guns, and the soldiers laughed at him kindly.",
  "Kutuzov sat on the bench with his head bowed, and said nothing when the adjutants reported.",
  "By evening the redoubt had changed hands three times, and no one could say who held it.",
  "The wounded were carried back past the reserves, who stood in ranks and did not look.",
];
function corpus() {
  const source = PASSAGES.join("\n\n"); const sources = { tolstoy: source };
  const ground = PASSAGES.map((p) => ({ text: p, at: `tolstoy#${source.indexOf(p)}-${source.indexOf(p) + p.length}` }));
  const field = new Field();
  for (const g of ground) field.admit(g.text, { source: "tolstoy", at: g.at });
  return { source, sources, ground, field };
}

test("a state: the same words light the same bits anywhere; order is part of it; overlap is one for the same text and zero for nothing shared", () => {
  assert.deepEqual(sdrOf("the war and the peace"), sdrOf("the war and the peace"));
  assert.ok(sdrOf("x").every((b) => b >= 0 && b < SDR_BITS));
  assert.equal(overlap(sdrOf("a b c"), sdrOf("a b c")), 1);
  assert.equal(overlap(sdrOf("apples"), sdrOf("zebras")), 0);
  const ordered = overlap(sdrOf("war and peace"), sdrOf("peace and war"));
  assert.ok(ordered > 0 && ordered < 1, `order matters: ${ordered}`);
  assert.equal(tokensOf("War, and peace!").filter(isWord).join(" "), "war and peace");
  assert.equal(hash32("kutuzov"), hash32("kutuzov"));
});

test("the field has no keys: nothing is looked up, everything is reached from a cue or a neighbour", () => {
  const { field, ground } = corpus();
  assert.equal(typeof field.get, "undefined");
  assert.equal(field.size, 6);
  const r = field.recall("Pierre in his white hat between the guns");
  assert.equal(r[0].node.text, ground[2].text);
  assert.equal(field.after(r[0].node).text, ground[3].text, "one synapse forward is the passage admitted next");
  assert.equal(field.before(r[0].node).text, ground[1].text);
  assert.equal(field.after(field.nodes.at(-1)), null);
});

test("a recall is one only above the null band; a cue of nothing is 'nothing'; two equal figures are 'ambiguous'", () => {
  const { field, ground } = corpus();
  const good = field.recallAgainstNull("Kutuzov sat on the bench with his head bowed", { draws: 60 });
  assert.equal(good.kind, "figure"); assert.equal(good.top.node.text, ground[3].text);
  assert.ok(good.top.activation > good.band.hi, "above what chance pulls out");
  const nothing = field.recallAgainstNull("zebra zebra zebra", { draws: 60 });
  assert.equal(nothing.kind, "nothing");
  const f2 = new Field(); f2.admit("the same words twice over"); f2.admit("the same words twice over");
  assert.equal(f2.recallAgainstNull("the same words twice over", { draws: 30 }).kind, "ambiguous");
});

test("serialization names neighbours by signature, so a shuffled store rebuilds the same field: same recall, same synapses", () => {
  const { field, ground } = corpus();
  const rows = field.serialize().reverse();
  assert.ok(rows.every((r) => !("index" in r) && !("seq" in r)), "no positions in the store");
  const again = Field.deserialize(rows);
  const cue = fragmentOf(ground[4].text, 0, 0.4);
  assert.equal(again.recall(cue)[0].node.text, field.recall(cue)[0].node.text);
  assert.equal(again.after(again.recall(ground[1].text)[0].node).text, ground[2].text);
});

test("the ground: drift says exact, shifted, moved or gone — and never rewrites anything", () => {
  const { sources, ground, source } = corpus();
  assert.equal(drift(ground[1].at, ground[1].text, sources).kind, "exact");
  const shifted = drift(ground[1].at, ground[1].text, { tolstoy: "PREFACE " + source });
  assert.equal(shifted.kind, "shifted"); assert.equal(resolveAddress(shifted.at, { tolstoy: "PREFACE " + source }).text, ground[1].text);
  const moved = drift(ground[1].at, ground[1].text, { elsewhere: source });
  assert.equal(moved.kind, "moved"); assert.equal(moved.source, "elsewhere");
  const gone = drift(ground[1].at, ground[1].text, { tolstoy: "nothing of it remains" });
  assert.equal(gone.kind, "gone"); assert.ok(gone.gap);
  assert.equal(resolveAddress(ground[1].at, sources).text, ground[1].text, "the record itself is untouched");
});

test("the figure re-anchors the ground: a partial memory finds its bytes in a shifted, renamed source; a cue of nothing is a typed gap", () => {
  const { field, ground, source } = corpus();
  const now = { tolstoy_v2: "A NEW PREFACE.\n\n" + source };
  const r = reanchor(fragmentOf(ground[2].text, 0, 0.4), field, now, { draws: 60 });
  assert.equal(r.ok, true); assert.equal(resolveAddress(r.at, now).text, ground[2].text);
  assert.match(r.at, /^tolstoy_v2#\d+-\d+$/);
  const none = reanchor("zebra giraffe okapi", field, now, { draws: 60 });
  assert.equal(none.ok, false); assert.equal(none.gap.type, "figure_absent");
  const unheld = reanchor(ground[2].text, field, { other: "no such passage here" }, { draws: 60 });
  assert.equal(unheld.ok, false); assert.equal(unheld.gap.type, "figure_unheld");
});

test("the pattern: agree when ground and figure name the same bytes; repaired when the ground broke and the figure found them; apart when neither can", () => {
  const { field, ground, sources, source } = corpus();
  assert.equal(correspond(ground[0].at, ground[0].text, field, sources, { draws: 60 }).kind, "agree");
  const shifted = correspond(ground[0].at, ground[0].text, field, { tolstoy: "X".repeat(50) + source }, { draws: 60 });
  assert.equal(shifted.kind, "repaired"); assert.notEqual(shifted.at, ground[0].at); assert.equal(shifted.was, ground[0].at);
  const apart = correspond(ground[0].at, ground[0].text, field, { tolstoy: "the text is gone" }, { draws: 60 });
  assert.equal(apart.kind, "apart"); assert.equal(apart.at, null);
});

test("nullBand and recallAgainstNull thread steps/spread through — a band measured at one hop count is the wrong control for a recall measured at another", () => {
  const { field } = corpus();
  // A band measured at more hops is not the same distribution as one
  // measured at hop 1 — the field's own connectivity keeps mixing chance
  // cues toward each other as spreading continues, so hi/margin move.
  const bandHop1 = field.nullBand(8, { draws: 80, steps: 1 });
  const bandHop4 = field.nullBand(8, { draws: 80, steps: 4 });
  assert.equal(bandHop1.steps, 1);
  assert.equal(bandHop4.steps, 4);
  assert.notDeepEqual(bandHop1, bandHop4, "hop count is a real condition of the band, not cosmetic");
  // recallAgainstNull with an explicit steps and no band measures its OWN
  // band at that same steps — never silently falling back to hop 1.
  const cue = "Prince Andrew rode along the line";
  const r1 = field.recallAgainstNull(cue, { draws: 80, steps: 1 });
  const r4 = field.recallAgainstNull(cue, { draws: 80, steps: 4 });
  assert.equal(r1.band.steps, 1);
  assert.equal(r4.band.steps, 4);
  // Omitted, both default to the field's own steps — every existing caller
  // (this file's own tests above) is byte-identical.
  const implicit = field.recallAgainstNull(cue, { draws: 80 });
  assert.equal(implicit.band.steps, field.steps);
});
