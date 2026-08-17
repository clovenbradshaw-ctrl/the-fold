// node --test cite.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { attribute, attributedRefs, coverage, namesIn, overlap, splitSentences } from "./cite.js";
import { chunkSource, readRange } from "./source.js";
import { classifySentences } from "./provenance.js";

const DOC = `The Kessington Report was commissioned by the Marrowfen Harbour Board in 1974 and delivered eleven months late.

The report put the silting figure at 12 percent per decade, a number the harbour committee disputed at length and never formally adopted.

An unrelated annex covers shipping lanes, tariff schedules, and the disposal of dredged spoil at the Halloway grounds.`;

const NOISE = `Rainfall in the western catchment averaged 900 millimetres annually across the survey period.

Ferry patronage declined steadily between 1968 and 1979 for reasons the operators never established.

The lighthouse keeper's logs record 41 storms in the same decade, most of them in autumn.`;

const chunks = chunkSource("kess.txt", DOC);
const pool = [...chunks, ...chunkSource("other.txt", NOISE)];

test("sentences split on stops and on newlines", () => {
  assert.deepEqual(splitSentences("One. Two!\nThree"), ["One.", "Two!", "Three"]);
  assert.deepEqual(splitSentences(""), []);
});

test("overlap is the longest run of terms shared in order", () => {
  const c = { text: "the silting figure was disputed at length" };
  assert.equal(overlap(["silting", "figure"], c), 2);
  // Same words, wrong order: not a phrase.
  assert.equal(overlap(["figure", "silting"], c), 1);
  // Present but scattered.
  assert.equal(overlap(["silting", "unrelated", "figure"], c), 1);
  assert.equal(overlap([], c), 0);
  assert.equal(overlap(["nothing", "here"], c), 0);
});

test("a sentence taken from a passage is attributed to it", () => {
  const offered = chunks;
  const answer = "The report put the silting figure at 12 percent per decade.";
  const [entry] = attribute(answer, offered, pool);
  assert.ok(entry.ref, "expected an address");
  assert.equal(entry.ref, chunks.find((c) => c.text.includes("12 percent")).ref);
  assert.ok(entry.score > entry.floor);
});

test("a sentence the material did not source gets no address", () => {
  // Every term here is generic; nothing in the passages carries it, and an
  // address on this sentence would be a manufactured warrant.
  const answer = "I would need to check that before saying anything definite.";
  const [entry] = attribute(answer, chunks, pool);
  assert.equal(entry.ref, null);
});

test("a sentence about something else entirely gets no address", () => {
  const answer = "Ferry patronage declined steadily through the 1970s.";
  const entries = attribute(answer, chunks, pool);
  // The offered passages are the Kessington ones; the ferry sentence belongs
  // to material this turn never retrieved, so it must not be attributed.
  assert.equal(entries[0].ref, null);
});

test("the null is what stops a common word from carrying an address", () => {
  const answer = "The report is a report about a report.";
  const [entry] = attribute(answer, chunks, pool);
  assert.equal(entry.ref, null, `attributed on score ${entry.score} vs floor ${entry.floor}`);
});

test("names in the claim must be present in the evidence", () => {
  // The failure this rule exists for, from a live run over ALPR search
  // records: the model wrote a sentence attributing a search to an agency
  // that had run none, and the phrase it used really did appear in the
  // material — in a different agency's row. The phrase matched; the subject
  // was invented; the address would have warranted a thing that never
  // happened.
  const rows = chunkSource(
    "searches.csv",
    "agency,reason\nHendersonville TN PD,MNPD BOLO\nHendersonville TN PD,MNPD SID TITANS\n",
  );
  const invented = "Bryan TX PD ran a search whose reason was MNPD BOLO.";
  assert.equal(attribute(invented, rows, rows)[0].ref, null);

  // The same sentence about the agency that is actually there is attributed.
  const real = "Hendersonville TN PD ran a search whose reason was MNPD BOLO.";
  assert.ok(attribute(real, rows, rows)[0].ref);
});

test("names are runs of capitals and bare acronyms, not sentence starts", () => {
  assert.deepEqual(namesIn("The report was clear."), []);
  assert.deepEqual(namesIn("Kansas Highway Patrol searched."), ["Kansas Highway Patrol"]);
  assert.deepEqual(namesIn("MNPD and TBI both did."), ["MNPD", "TBI"]);
});

// The corpus this instrument is built on writes Pávlovna, Bezúkhov and
// Hélène. The first extraction read ASCII only — `[A-Z]` and `\w` with no /u
// flag — so a name broke at its first accent or vanished entirely, and the
// veto that refuses an invented subject an address simply stopped running.
// Same class as the foldDiacritics lesson (P11): an organ comparing text to
// text that does not read the alphabet retrieval reads.

const WAR = `Anna Pávlovna Schérer, maid of honor to the Empress Márya Fëdorovna, greeted Prince Vasíli Kurágin with the words of her invitation.

Pierre Bezúkhov entered the drawing room, and Hélène Kurágina turned toward the door as he passed the little princess.

The soirée at Anna Pávlovna's continued until late, and the guests dispersed toward the Nevsky without further ceremony.`;

const war = chunkSource("war.txt", WAR);

test("an accented name is extracted whole, not truncated at its accent", () => {
  // Read as ASCII, "Anna Pávlovna" came out as "Anna P" — and "P" is one
  // character, which namesSupported drops, so the name reduced to "Anna".
  assert.deepEqual(namesIn("Anna Pávlovna spoke to Prince Vasíli."), ["Anna Pávlovna", "Prince Vasíli"]);
  assert.deepEqual(namesIn("Pierre Bezúkhov married Hélène Kurágina."), ["Pierre Bezúkhov", "Hélène Kurágina"]);
  // Whole capitals, accented: the old acronym pattern cut "HÉLÈNE" down to
  // the fragment "NE".
  assert.deepEqual(namesIn("HÉLÈNE and TBI."), ["HÉLÈNE", "TBI"]);
  // What the run rule means is unchanged by reading a wider alphabet: a
  // single capital at a sentence's start is grammar, and a capital inside a
  // word does not open a name.
  assert.deepEqual(namesIn("Éloise stopped."), []);
  assert.deepEqual(namesIn("iPhone Pro units shipped."), []);
});

test("an invented accented subject is vetoed, exactly as an invented ASCII one is", () => {
  // The Hendersonville failure again, with an accent on the invented agency.
  // Read as ASCII, "Éloise Dupré" was invisible — É is not [A-Z] and "Dupré"
  // alone cannot make a run of two — so the only names the veto saw were
  // "MNPD BOLO", which really is in the material, and the sentence took the
  // address the identical ASCII sentence is refused.
  const rows = chunkSource(
    "searches.csv",
    "agency,reason\nHendersonville TN PD,MNPD BOLO\nHendersonville TN PD,MNPD SID TITANS\n",
  );
  const accented = attribute("Éloise Dupré ran a search whose reason was MNPD BOLO.", rows, rows)[0];
  const ascii = attribute("Bryan TX PD ran a search whose reason was MNPD BOLO.", rows, rows)[0];
  assert.equal(accented.ref, null, "an invented accented subject must not earn an address");
  assert.equal(accented.vetoed, true);
  assert.equal(ascii.ref, null);
  assert.equal(ascii.vetoed, true);

  // The same on prose material, where the invented subject shares no ASCII
  // run at all and so was extracted as nothing whatsoever.
  const invented = attribute("Iríska Voronóva entered the drawing room.", war, war)[0];
  assert.equal(invented.ref, null, "an invented accented name must not earn an address");
  assert.equal(invented.vetoed, true);
});

test("a real accented name in the material is seen whole and is not vetoed", () => {
  // The other half of the fold lesson: reading the wider alphabet must not
  // start refusing names the material actually holds. The fold runs on both
  // sides of the containment, so the material's accents and the answer's
  // agree either way round.
  for (const [sentence, expected] of [
    ["Pierre Bezúkhov entered the drawing room.", ["Pierre Bezúkhov"]],
    ["Hélène Kurágina turned toward the door.", ["Hélène Kurágina"]],
    ["Anna Pávlovna Schérer was maid of honor to the Empress Márya Fëdorovna.", ["Anna Pávlovna Schérer", "Empress Márya Fëdorovna"]],
  ]) {
    assert.deepEqual(namesIn(sentence), expected);
    const entry = attribute(sentence, war, war)[0];
    assert.ok(entry.ref, `expected an address for ${sentence} (vetoed: ${entry.vetoed})`);
    assert.notEqual(entry.vetoed, true);
  }
  // An answer that folds where the material accents is still supported —
  // the containment folds both sides.
  const folded = attribute("Pierre Bezukhov entered the drawing room.", war, war)[0];
  assert.ok(folded.ref, "a folded spelling of an accented name must still be supported");
});

test("a sentence the model already cited is not attributed again", () => {
  // Live bug: the model cited a passage, the app attributed the same sentence
  // to the same passage, and the answer rendered the address twice.
  const passage = chunks.find((c) => c.text.includes("12 percent"));
  const answer = `The report put the silting figure at 12 percent per decade [${passage.ref}].`;
  const [entry] = attribute(answer, chunks, pool);
  assert.equal(entry.ref, null);
  assert.equal(entry.cited, true);
  assert.deepEqual(attributedRefs(attribute(answer, chunks, pool)), []);
});

test("attribution is deterministic across runs", () => {
  const answer = "The report put the silting figure at 12 percent per decade. Ferries declined.";
  const a = attribute(answer, chunks, pool);
  const b = attribute(answer, chunks, pool);
  assert.deepEqual(a, b);
});

test("with nothing offered, nothing is attributed", () => {
  assert.deepEqual(attribute("Anything at all.", []), []);
  assert.deepEqual(attributedRefs([]), []);
});

test("attributedRefs is the distinct set of addresses attached", () => {
  const answer =
    "The report put the silting figure at 12 percent per decade. " +
    "The silting figure of 12 percent per decade was disputed by the harbour committee.";
  const entries = attribute(answer, chunks, pool);
  const refs = attributedRefs(entries);
  assert.equal(refs.length, 1, "both sentences come from the same passage");
  assert.match(refs[0], /^kess\.txt#\d+-\d+$/);
});

// ── coverage: every supported sentence wears its address ────────────────────
//
// Measured 2026-08-17, on a Wikipedia page fetched by the web organ and
// opened as an ordinary source: a three-sentence answer, every sentence
// standing on the material, shipped with a bare middle — the sentence's true
// support was the page's own lead, which the turn had not offered, so the
// null outscored the offered passages and attribute() refused the address it
// had just found. The reader asked "how did it know all this?". Coverage is
// the answer: containment places the argmax passage from the whole pool, no
// margin anywhere, and a sentence the material does not support still gets
// nothing.
//
// The corpus mirrors the live shape: an encyclopedia-style page whose source
// name is what a fetched page actually carries in this app — the basename of
// its content-addressed text face (explore-server names a source by
// path.basename, so "the-fold/web/pages/b02d7a4f9c4d1e63.txt" arrives in
// chat as "b02d7a4f9c4d1e63.txt", and refs are "b02d7a4f9c4d1e63.txt#a-b").

const PAGE = `Battle of Marrowfen — from the reference shelf.

The Battle of Marrowfen was fought near the village of Marrowfen on 7 September 1812, between the Grand Army under Bonaparte and the Imperial Army under Kutuzov.

The engagement opened with a barrage against the earthworks, and the hamlet of Semyonovka changed hands three times before noon while the reserve stood unused.

Casualty returns list 28,000 dead and wounded on the French side and 45,000 on the Russian side, the costliest single day of the whole campaign.

Most later accounts describe the outcome as indecisive: the French captured the principal positions on the field but failed to destroy the Russian army.`;

const WEB_NAME = "ab12cd34ef56aa99.txt";
const webChunks = chunkSource(WEB_NAME, PAGE);
const lead = webChunks.find((c) => c.text.includes("was fought near"));
const casualty = webChunks.find((c) => c.text.includes("Casualty returns"));
const outcome = webChunks.find((c) => c.text.includes("principal positions"));
const webOffered = [casualty, outcome]; // the turn retrieved these; the lead stayed behind

const MEASURED =
  "The Battle of Marrowfen was fought near the village of Marrowfen on 7 September 1812. " +
  "Casualty returns list 28,000 dead and wounded on the French side. " +
  "The French captured the principal positions on the field but failed to destroy the Russian army. " +
  "I would have to check the archive before saying anything more.";

test("the measured case: every sentence standing on the material gets an address", () => {
  const cov = coverage(MEASURED, webOffered, webChunks);
  assert.equal(cov.length, 4);

  // The opening sentence's support is the lead — a passage the turn never
  // offered. attribute() refuses it (the null outscores the offered side);
  // coverage attaches the passage the null found.
  const strict = attribute(MEASURED, webOffered, webChunks);
  assert.equal(strict[0].ref, null, "the gap this section exists to close");
  assert.equal(cov[0].ref, lead.ref);
  assert.equal(cov[0].via, "pool");
  assert.equal(cov[0].rescued, true);

  // The offered-side sentences attach exactly as attribute attaches them.
  assert.equal(cov[1].ref, casualty.ref);
  assert.equal(cov[1].via, "offered");
  assert.notEqual(cov[1].rescued, true);
  assert.equal(cov[1].ref, strict[1].ref, "coverage never disagrees with a strict attachment");
  assert.equal(cov[2].ref, outcome.ref);

  // The hedge stands on nothing and stays bare.
  assert.equal(cov[3].ref, null);
});

test("classified over coverage, no material-ground sentence is bare", () => {
  const classified = classifySentences(MEASURED, coverage(MEASURED, webOffered, webChunks), []);
  const material = classified.filter((e) => e.ground === "material");
  assert.equal(material.length, 3, "three sentences stand on the material");
  for (const e of material) assert.ok(e.ref, `a material-ground sentence must carry its address: "${e.text}"`);
  const voice = classified.filter((e) => e.ground === "model");
  assert.equal(voice.length, 1);
  assert.equal(voice[0].ref, null);
});

test("a model-voice sentence gets no address from coverage", () => {
  const [entry] = coverage("I would need to check that before saying anything definite.", webOffered, webChunks);
  assert.equal(entry.ref, null);
  // Same over the prose corpus: coverage widens where support exists, and
  // nowhere else.
  const [hedge] = coverage("I would need to check that before saying anything definite.", chunks, pool);
  assert.equal(hedge.ref, null);
});

test("coverage refuses an invented subject exactly as attribute does", () => {
  // The Hendersonville failure must not be resurrected by the widening: the
  // phrase is in the material, the subject is not, and a chip here would
  // vouch for a thing that never happened — the worse lie.
  const rows = chunkSource(
    "searches.csv",
    "agency,reason\nHendersonville TN PD,MNPD BOLO\nHendersonville TN PD,MNPD SID TITANS\n",
  );
  const invented = coverage("Bryan TX PD ran a search whose reason was MNPD BOLO.", rows, rows)[0];
  assert.equal(invented.ref, null);
  assert.equal(invented.vetoed, true);
  const accented = coverage("Éloise Dupré ran a search whose reason was MNPD BOLO.", rows, rows)[0];
  assert.equal(accented.ref, null);
  // And on prose: a phrase the material states, hung on a person it never
  // mentions, stays bare even though the winning passage holds the phrase.
  const prose = coverage("Iríska Voronóva entered the drawing room.", war, war)[0];
  assert.equal(prose.ref, null);
  assert.equal(prose.vetoed, true);
});

test("a pool-side rescue must be a unique argmax — a tied pool is refused as ambiguous", () => {
  // Measured live on the fetched page: a figures sentence found several
  // pool passages tied at a run of two — "troops against" in one, the bare
  // number in another — and retrieval rank, which orders by the question's
  // terms and not by support, would have picked between them arbitrarily.
  // An address names one place; an argmax with two winners names none.
  const ambig = chunkSource(
    "ambig.txt",
    "The muster rolls record 130,000 men under arms at the crossing, provisioned for a month.\n\n" +
      "Skirmishers pushed troops against the embankment before the light failed.\n\n" +
      "The commissary ledger lists forage for twelve thousand horses.",
  );
  const forage = ambig.find((c) => c.text.includes("forage"));
  const [entry] = coverage("Bonaparte led 130,000 troops against the river crossing.", [forage], ambig);
  assert.equal(entry.ref, null, `attached ${entry.ref} on score ${entry.score}`);
  assert.equal(entry.ambiguous, true);
});

test("a tie goes to the offered passage, marked as rescued", () => {
  // Two passages state the same phrase equally well; one was offered. The
  // strict gate refuses the tie (no margin); coverage attaches the passage
  // the turn actually handed the model — its bytes state the phrase, which
  // is all the chip claims.
  const twins = chunkSource(
    "twin.txt",
    "The dredging licence was suspended after the equinox inspection.\n\n" +
      "Harbour minutes note that the dredging licence was suspended after the equinox inspection, pending review.",
  );
  const sentence = "The dredging licence was suspended after the equinox inspection.";
  assert.equal(attribute(sentence, [twins[0]], twins)[0].ref, null, "the strict gate declines the tie");
  const [entry] = coverage(sentence, [twins[0]], twins);
  assert.equal(entry.ref, twins[0].ref);
  assert.equal(entry.via, "offered");
  assert.equal(entry.rescued, true);
});

test("web-style refs attach exactly like file refs, and read back", () => {
  // The shape a fetched page actually carries: its content-addressed
  // basename. Nothing in cite.js may assume a file-looking name.
  const cov = coverage(MEASURED, webOffered, webChunks);
  assert.match(cov[0].ref, /^ab12cd34ef56aa99\.txt#\d+-\d+$/);

  // A slashed name — the store's own path shape — attaches identically and
  // the ref reads back through readRange to the bytes it names.
  const slashed = chunkSource("web/pages/ab12cd34.txt", PAGE);
  const sOffered = [
    slashed.find((c) => c.text.includes("Casualty returns")),
    slashed.find((c) => c.text.includes("principal positions")),
  ];
  const sCov = coverage(MEASURED, sOffered, slashed);
  assert.match(sCov[0].ref, /^web\/pages\/ab12cd34\.txt#\d+-\d+$/);
  const bytes = readRange({ "web/pages/ab12cd34.txt": PAGE }, sCov[0].ref);
  assert.ok(bytes.includes("7 September 1812"), "the attached web ref re-opens to the supporting bytes");

  // A model-cited slashed address is left alone — one claim, one tag.
  const cited = coverage(
    `The battle was fought near the village of Marrowfen [${slashed[1].ref}].`,
    sOffered,
    slashed,
  )[0];
  assert.equal(cited.cited, true);
  assert.equal(cited.ref, null);
});

test("coverage stands without an offered set, and is deterministic", () => {
  // A turn that retrieved nothing can still have written sentences the
  // loaded material supports; provenance does not depend on what rode the
  // prompt. attribute() returns [] here by design — the record has nothing
  // to earn — but the rendering still owes the reader the address.
  const bare = coverage("The Battle of Marrowfen was fought near the village of Marrowfen on 7 September 1812.", [], webChunks);
  assert.equal(bare[0].ref, lead.ref);
  assert.equal(bare[0].via, "pool");

  assert.deepEqual(coverage(MEASURED, webOffered, webChunks), coverage(MEASURED, webOffered, webChunks));
  assert.deepEqual(coverage("Anything at all.", [], []), []);
});
