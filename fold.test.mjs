// node --test fold.test.mjs
//
// Everything here is pure, so it runs in node with no engine and no network.
// The one thing worth testing hardest is the claim in the README: the context
// does not grow with the conversation.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_FOLDS_IN_PROMPT,
  RECORDS_IN_PROMPT,
  RECENCY_WINDOW,
  FOLD_MAX_CHARS,
  addWarrantRecord,
  advanceSummaryFold,
  buildRecordSystemMessage,
  buildSummarySystemMessage,
  buildTurnMessages,
  buildWarrantRecord,
  charCount,
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
} from "./fold.js";

import {
  buildSourceBlock,
  checkCitations,
  chunkSource,
  openQuestions,
  readRange,
  retrieve,
} from "./source.js";

test("a fold line is bounded no matter how long the turn was", () => {
  const line = mechanicalFoldLine("x".repeat(5000), "y".repeat(5000));
  assert.ok(line.length <= FOLD_MAX_CHARS);
});

test("the fold list stays bounded across many turns", () => {
  let s = emptySummary();
  for (let i = 0; i < 200; i++) s = advanceSummaryFold(s, `fold ${i}`);
  assert.equal(s.folds.length, MAX_FOLDS_IN_PROMPT);
  assert.equal(s.turnCount, 200);
  assert.equal(s.folds.at(-1), "fold 199");
});

test("the context window does not grow with the conversation", () => {
  // 400 turns of steadily longer messages. What the model is sent on turn 400
  // must not be meaningfully larger than what it was sent on turn 20.
  let summary = emptySummary();
  const history = [];
  const sizeAt = [];
  for (let i = 1; i <= 400; i++) {
    const q = `question ${i} ` + "detail ".repeat(i);
    const a = `answer ${i} ` + "elaboration ".repeat(i);
    const msgs = buildTurnMessages({
      basePrompt: "You are a helpful assistant.",
      summary,
      history,
      question: q,
    });
    sizeAt.push(charCount(msgs));
    history.push({ role: "user", content: q }, { role: "assistant", content: a });
    summary = updateSummaryWithFold(
      summary,
      mechanicalFoldLine(q, a),
      JSON.stringify({
        topic: "a long conversation",
        flow: "it kept going",
        entities: ["nobody"],
        context: "turns keep arriving",
        language: "en",
        turnCount: i,
      }),
    );
  }
  const transcript = charCount(history);
  const last = sizeAt.at(-1);
  // Stated as a ratio rather than a size, because the claim is relational: the
  // transcript is what it is, and the prompt is a small fraction of it.
  assert.ok(transcript / last > 50, `prompt was ${last} of ${transcript}`);
  // And the growth that remains is the recency window alone — the last few raw
  // messages, which are themselves 20x longer at turn 400 than at turn 20.
  const promptGrowth = sizeAt.at(-1) / sizeAt[19];
  const transcriptGrowth = transcript / charCount(history.slice(0, 40));
  assert.ok(
    promptGrowth < transcriptGrowth / 10,
    `prompt grew ${promptGrowth}x while the transcript grew ${transcriptGrowth}x`,
  );
});

test("only the recency window is sent raw", () => {
  const history = [];
  for (let i = 0; i < 50; i++)
    history.push({ role: i % 2 ? "assistant" : "user", content: `msg ${i}` });
  const msgs = buildTurnMessages({
    basePrompt: "base",
    summary: emptySummary(),
    history,
    question: "now what",
  });
  const raw = msgs.filter((m) => m.role !== "system");
  assert.equal(raw.length, RECENCY_WINDOW + 1);
  assert.ok(!JSON.stringify(msgs).includes("msg 10"));
  assert.ok(JSON.stringify(msgs).includes("msg 49"));
});

test("exactly one system message, at index 0", () => {
  let s = updateSummaryWithFold(
    emptySummary(),
    "a fold",
    JSON.stringify({ topic: "t", flow: "f", entities: ["e"], context: "c", language: "en" }),
  );
  s = addWarrantRecord(
    s,
    buildWarrantRecord({ turn: 1, gist: "g", channels: ["source"], refs: ["a.txt#0-10"], unsupported: [], open: [] }),
  );
  const msgs = buildTurnMessages({
    basePrompt: "base",
    summary: s,
    history: [],
    question: "q",
    sourceBlock: "MATERIAL — ...",
  });
  const systems = msgs.filter((m) => m.role === "system");
  assert.equal(systems.length, 1);
  assert.equal(msgs[0].role, "system");
  // All four blocks survived the merge.
  assert.match(msgs[0].content, /PAST DISCOURSE/);
  assert.match(msgs[0].content, /ON RECORD/);
  assert.match(msgs[0].content, /MATERIAL/);
});

test("the paraphrase and the record do not read alike", () => {
  const s = addWarrantRecord(
    updateSummaryWithFold(emptySummary(), "f", JSON.stringify({ topic: "t" })),
    buildWarrantRecord({ turn: 1, gist: "g", channels: [], refs: ["a.txt#0-10"], unsupported: [], open: [] }),
  );
  const past = buildSummarySystemMessage(s);
  const record = buildRecordSystemMessage(s);
  assert.match(past, /cannot support a factual claim/);
  assert.match(record, /can be re-opened/);
  assert.ok(!record.includes("cannot support a factual claim"));
});

test("the summary refresh cannot rewrite the records", () => {
  let s = addWarrantRecord(
    emptySummary(),
    buildWarrantRecord({ turn: 1, gist: "the real one", channels: [], refs: ["a.txt#0-9"], unsupported: [], open: [] }),
  );
  s = updateSummaryWithFold(
    s,
    "f",
    JSON.stringify({
      topic: "t",
      records: [{ turn: 1, gist: "a forged one", channels: [], refs: [], unsupported: [], open: [] }],
    }),
  );
  assert.equal(s.records.length, 1);
  assert.equal(s.records[0].gist, "the real one");
});

test("records stay bounded", () => {
  let s = emptySummary();
  for (let i = 0; i < 40; i++)
    s = addWarrantRecord(s, buildWarrantRecord({ turn: i, gist: `g${i}`, channels: [], refs: [], unsupported: [], open: [] }));
  assert.equal(s.records.length, RECORDS_IN_PROMPT);
  assert.equal(s.records.at(-1).turn, 39);
});

test("the summary call cannot revise the turn count", () => {
  // Observed live: the first fold of a conversation came back claiming turn 2.
  let s = updateSummaryWithFold(
    emptySummary(),
    "f1",
    JSON.stringify({ topic: "t", turnCount: 2 }),
  );
  assert.equal(s.turnCount, 1);
  s = updateSummaryWithFold(s, "f2", JSON.stringify({ topic: "t", turnCount: 99 }));
  assert.equal(s.turnCount, 2);
  assert.equal(s.turnCount, s.folds.length);
});

test("a malformed summary response leaves the summary intact", () => {
  const before = updateSummaryWithFold(
    emptySummary(),
    "f1",
    JSON.stringify({ topic: "kept", flow: "kept flow", entities: ["e"], context: "c", language: "en" }),
  );
  const after = updateSummaryWithFold(before, "f2", "I'm sorry, I can't do that.");
  assert.equal(after.topic, "kept");
  assert.equal(after.turnCount, before.turnCount + 1);
  assert.deepEqual(after.folds, ["f1", "f2"]);
});

// ── the address half ─────────────────────────────────────────────────────────

const DOC = `The Kessington Report was commissioned in 1974.

It put the figure at 12 percent, a number the committee disputed at length.

An unrelated paragraph about shipping lanes and tariffs.`;

test("a ref reads back the exact bytes it names", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const hit = chunks.find((c) => c.text.includes("12 percent"));
  assert.ok(hit);
  assert.equal(readRange({ "kess.txt": DOC }, hit.ref).trim(), hit.text);
});

test("an accented corpus answers an unaccented question", () => {
  // The failure this pins: a Gutenberg text writes "Natásha" throughout, a
  // reader types "Natasha", and the app reports no mention of her while
  // holding the whole novel.
  const doc = "Natásha Rostóva glanced at Prince Andréw across the ballroom.";
  const chunks = chunkSource("wp.txt", doc);
  assert.equal(retrieve(chunks, "Who is Natasha Rostova?").length, 1);
  assert.equal(retrieve(chunks, "what did Andrew do").length, 1);
  // And in the other direction: an unaccented corpus, an accented question.
  const plain = chunkSource("q.txt", "Natasha danced with Andrew until the small hours.");
  assert.equal(retrieve(plain, "Natásha").length, 1);
});

const CSV = `org_id,organization_name,reason,case_number
3982,Murfreesboro PD,stolen vehicle,24-0011
3499,Metro Nashville PD,missing person,24-0042
5334,Franklin PD,hit and run,24-0107
3982,Murfreesboro PD,MNPD assist burglary,24-0155
3499,Metro Nashville PD,homicide investigation,24-0198
5334,Franklin PD,stolen tag,24-0231
3982,Murfreesboro PD,welfare check,24-0244
3499,Metro Nashville PD,armed robbery,24-0287
5334,Franklin PD,MNPD narcotics,24-0301
`;

test("a spreadsheet is admitted by row, not as one lump", () => {
  // Paragraph chunking would make this whole file a single passage: nothing
  // retrievable, nothing citable.
  const chunks = chunkSource("mnpd.csv", CSV);
  assert.ok(chunks.length > 1, `got ${chunks.length} chunks`);
  assert.ok(chunks.every((c) => c.header.startsWith("org_id,")));
});

test("a row group's ref reads back exactly the rows, header excluded", () => {
  const chunks = chunkSource("mnpd.csv", CSV);
  for (const c of chunks) {
    assert.equal(readRange({ "mnpd.csv": CSV }, c.ref), c.text + "\n");
    assert.ok(!readRange({ "mnpd.csv": CSV }, c.ref).includes("org_id,"));
  }
});

test("a row is retrievable by what is in it, and by its column names", () => {
  const chunks = chunkSource("mnpd.csv", CSV);
  const hit = retrieve(chunks, "which searches mention narcotics?");
  assert.ok(hit.length && hit[0].text.includes("narcotics"));
  // Column names ride along as terms, so a question phrased in the schema's
  // own words finds rows too.
  assert.ok(retrieve(chunks, "list the case_number values").length > 0);
});

test("a header-only file yields nothing rather than a phantom row", () => {
  assert.deepEqual(chunkSource("empty.csv", "a,b,c\n"), []);
});

test("retrieval is mechanical and returns nothing when nothing matches", () => {
  const chunks = chunkSource("kess.txt", DOC);
  assert.equal(retrieve(chunks, "what figure did the report give").length > 0, true);
  assert.deepEqual(retrieve(chunks, "quantum chromodynamics telescope"), []);
});

test("a folded passage is deprioritized, not excluded", () => {
  const chunks = chunkSource("kess.txt", DOC);
  // A deliberate tie: "report" and "1974" land in the first chunk, "figure"
  // and "percent" in the second, two hits each. A penalty that does nothing
  // would leave the order alone, so a flip here is real evidence it fired.
  const q = "report 1974 figure percent";
  const before = retrieve(chunks, q, 3);
  const after = retrieve(chunks, q, 3, [before[0].ref]);
  assert.ok(after.length > 0, "the folded passage vanished entirely");
  assert.notEqual(after[0].ref, before[0].ref, "the ranking did not flip");
});

test("a citation to material never retrieved is unsupported", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const offered = retrieve(chunks, "what figure did the report give");
  const answer = `It was 12 percent [${offered[0].ref}], and also 40 percent [kess.txt#9000-9100].`;
  const { used, unsupported } = checkCitations(answer, offered);
  assert.deepEqual(used, [offered[0].ref]);
  assert.deepEqual(unsupported, ["kess.txt#9000-9100"]);
});

test("an uncited turn leaves the question open", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const offered = retrieve(chunks, "what figure did the report give");
  assert.equal(openQuestions("what figure did the report give", offered, []).length, 1);
  assert.equal(openQuestions("what figure did the report give", offered, [offered[0].ref]).length, 0);
  assert.equal(openQuestions("tell me about penguins", [], []).length, 1);
});

test("the material block carries every address it offers", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const offered = retrieve(chunks, "the report figure percent");
  const block = buildSourceBlock(offered);
  for (const c of offered) assert.ok(block.includes(`[${c.ref}]`));
});

test("container boilerplate is not material", () => {
  // READING-POLICY P5.3. Measured on War and Peace: 47 of 11,190 passages
  // were the Gutenberg licence, the donation appeal and the header —
  // retrievable, quotable, citable, and not the book.
  const doc =
    "The Project Gutenberg eBook of Something\n\nLicence prose about donations and trademark.\n\n" +
    "*** START OF THE PROJECT GUTENBERG EBOOK SOMETHING ***\n\n" +
    "The real first paragraph of the book, long enough to be admitted.\n\n" +
    "*** END OF THE PROJECT GUTENBERG EBOOK SOMETHING ***\n\n" +
    "More licence prose about donations, trademark and the Foundation.";
  const chunks = chunkSource("book.txt", doc);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0].text, /^The real first paragraph/);
  // P5.2: the address still names bytes in the file as it sits on disk.
  assert.equal(readRange({ "book.txt": doc }, chunks[0].ref).trim(), chunks[0].text);
});
