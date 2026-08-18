// node --test proof.test.mjs
//
// The pure half of proof-seeking, tested offline — the web.js discipline:
// no fixture here ever came from a live call inside a test, and no test
// ever touches the network. The one seam test at the bottom pins that the
// chat page's own files still name no non-local host (P13's wall).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PROOF_PAGES_CONSULTED,
  PROOF_TARGETS_PER_TURN,
  PREFLIGHT_PAGES_CONSULTED,
  PREFLIGHT_QUERY_MAX_TERMS,
  assessPage,
  foldProof,
  preflightQuery,
  proofQuery,
  proofTargets,
  shouldPreflight,
} from "./proof.js";
import { checkGrounding, extractCheckableAtoms } from "./grounding.js";

test("the query is the claim's own words — atom quoted, context words following, nothing invented", () => {
  const q = proofQuery({
    kind: "name",
    text: "Kessington Report",
    tokens: ["Kessington", "Report"],
    sentence: "The Kessington Report was commissioned by the Marrowfen Harbour Board in 1974.",
  });
  assert.ok(q.startsWith('"Kessington Report"'), q);
  assert.ok(/Marrowfen|Harbour|commissioned/.test(q), q);
  // Stopwords and the atom's own words do not repeat in the tail.
  assert.ok(!/\bthe\b/.test(q.replace(/"[^"]*"/, "")), q);
  // A single-token atom is not quoted — there is no phrase to hold together.
  assert.ok(!proofQuery({ kind: "number", text: "1974", tokens: ["1974"], sentence: "" }).includes('"'));
});

test("a page states a claim by the same containment rule the local check uses", () => {
  const claim = {
    kind: "name",
    text: "Marrowfen Harbour Board",
    tokens: ["Marrowfen", "Harbour", "Board"],
    sentence: "The Marrowfen Harbour Board commissioned the report in 1974.",
  };
  const page = "The harbour works at Marrowfen were overseen by the Harbour Board from 1974 onward.";
  const a = assessPage(claim, page);
  assert.equal(a.stated, true, JSON.stringify(a));
  assert.ok(a.context.shared > 0);
  assert.ok(a.context.of >= a.context.shared);

  // Absent stays absent, and the fold applies on both sides — an accented
  // page supports a plain-typed claim (P11's first consequence).
  const miss = assessPage(claim, "Nothing about harbours here at all.");
  assert.equal(miss.stated, false);
  assert.ok(miss.absent.includes("Marrowfen"));
  const folded = assessPage(
    { kind: "name", text: "Helene", tokens: ["Helene"], sentence: "" },
    "Pierre married Hélène in Petersburg.",
  );
  assert.equal(folded.stated, true);

  // A figure is a figure: matched as a number, not a word.
  const fig = assessPage({ kind: "number", text: "12", tokens: ["12"], sentence: "" }, "The rate was 12 percent.");
  assert.equal(fig.stated, true);
  assert.equal(assessPage({ kind: "number", text: "21", tokens: ["21"], sentence: "" }, "The rate was 12 percent.").stated, false);
});

test("the fold counts perspectives and never says true", () => {
  const claim = { kind: "name", text: "Marrowfen", tokens: ["Marrowfen"], sentence: "" };
  const page = (url, stated, gap = null) =>
    gap
      ? { url, gap }
      : { url, assessment: { stated, absent: stated ? [] : ["Marrowfen"], context: { shared: 1, of: 2 } } };
  const out = foldProof(claim, {
    query: "Marrowfen",
    pages: [
      page("https://en.wikipedia.org/wiki/Marrowfen", true),
      page("https://www.example.org/marrowfen-history", true),
      page("https://other.net/unrelated", false),
      page("https://blocked.site/x", false, { silence: "not-present", detail: "timeout" }),
    ],
  });
  assert.equal(out.verdict, "web-corroborated");
  assert.equal(out.consulted, 3);
  assert.equal(out.failed, 1);
  assert.equal(out.stating.length, 2);
  // Independence is distinct hosts, and the residue is NAMED on the result.
  assert.equal(out.independence.hosts, 2);
  assert.match(out.independence.basis, /syndication/);
  // Natural-frequency phrasing: counted perspectives, no verdict of truth.
  assert.match(out.sentence, /2 of the 3 page/);
  assert.ok(!/\btrue\b/i.test(out.sentence));

  // Zero statings is uncorroborated — a counted fact, not falsity.
  const none = foldProof(claim, { query: "q", pages: [page("https://a.com/1", false), page("https://b.com/2", false)] });
  assert.equal(none.verdict, "web-uncorroborated");
  assert.match(none.sentence, /0 of the 2/);
});

test("a failed crossing is a gap, not a zero", () => {
  const claim = { kind: "name", text: "Marrowfen", tokens: ["Marrowfen"], sentence: "" };
  const refused = foldProof(claim, { query: "q", gap: { silence: "refused-upstream", detail: "bot challenge" } });
  assert.equal(refused.verdict, "refused-upstream");
  assert.equal(refused.consulted, 0);
  assert.ok(refused.gap);
  const allFailed = foldProof(claim, {
    query: "q",
    pages: [{ url: "https://a.com", gap: { silence: "not-present", detail: "timeout" } }],
  });
  assert.equal(allFailed.verdict, "not-consulted");
  assert.equal(allFailed.failed, 1);
});

test("proof targets come from the turn's own checks, ordered by need, deduplicated", () => {
  const passages = [{ ref: "k.txt#0-90", text: "The report put the silting figure at 12 percent per decade." }];
  const grounding = checkGrounding(
    "The Kessington Report said 21 percent. Bryan TX PD cited the Kessington Report too.",
    passages,
    {},
  );
  const relationReport = {
    claims: [
      { sentence: "Pierre married Dolokhov.", subject: "Pierre", verb: "married", object: "Dolokhov", verdict: "unbound" },
      { sentence: "Pierre loved Helene.", subject: "Pierre", verb: "loved", object: "Helene", verdict: "contradicted" },
      { sentence: "He spoke.", subject: "He", verb: "spoke", object: "x", verdict: "beyond-reach" },
    ],
  };
  const targets = proofTargets({ findings: grounding.findings, relationReport });
  // Contradicted first — the material actively disagrees, so a second
  // perspective matters most there.
  assert.equal(targets[0].why, "contradicted");
  assert.ok(targets.some((t) => t.why === "unsupported"));
  assert.ok(targets.some((t) => t.why === "unbound"));
  // beyond-reach is a limit of the instrument, never a crossing.
  assert.ok(!targets.some((t) => /spoke/.test(t.text)));
  // The Kessington Report appears in two sentences and is ONE thing to look up.
  const kess = targets.filter((t) => /Kessington/.test(t.text));
  assert.equal(kess.length, 1);
  // Every target carries the sentence it stood in, for the query's context.
  assert.ok(targets.every((t) => t.why !== "unsupported" || typeof t.sentence === "string"));
});

test("the declared budgets are declarations", () => {
  assert.equal(PROOF_PAGES_CONSULTED, 3);
  assert.equal(PROOF_TARGETS_PER_TURN, 4);
  assert.equal(PREFLIGHT_PAGES_CONSULTED, 3);
  assert.equal(PREFLIGHT_QUERY_MAX_TERMS, 12);
});

// ── the preflight gate: search BEFORE a draft exists, not after ─────────────
// Measured live 2026-08-18: "research the weather in NYC right now" with
// nothing attached drafted "70 degrees, sunny" from nowhere; checkGrounding
// correctly declined to examine it (no material exists), and the no-material
// fallback then manufactured search candidates FROM the invented sentence.
// shouldPreflight asks the identical question one step earlier, so the
// answer can be "go get material" instead of "invent something to check."

test("shouldPreflight fires only on the exact structural conjunction: flat, nothing attached, both standing toggles on", () => {
  const base = { live: [], grounded: true, webProof: true, planMode: "flat" };
  assert.equal(shouldPreflight(base), true);
  assert.equal(shouldPreflight({ ...base, live: [{ ref: "x#0-1" }] }), false, "material already attached — nothing to preflight");
  assert.equal(shouldPreflight({ ...base, grounded: false }), false, "checking mode off — the whole ladder stands down, not just this door");
  assert.equal(shouldPreflight({ ...base, webProof: false }), false, "no standing web consent — no automatic egress, preflight included");
  assert.equal(shouldPreflight({ ...base, planMode: "model" }), false, "a decomposed task's parts retrieve per-part already — out of scope for this door");
  assert.equal(shouldPreflight({}), false, "every toggle defaults to off/absent — the gate defaults closed, never open");
});

test("preflightQuery anchors on the turn's own words plus the fold's discourse line, never on drafted text", () => {
  // The exact second-turn shape of the measured bug: "prove it" alone carries
  // no content words, so without the discourse anchor there is nothing to
  // search on at all.
  const bare = preflightQuery("prove it", "");
  assert.equal(bare, "prove");
  const anchored = preflightQuery("prove it", "NYC weather right now · asked and answered · NYC");
  assert.ok(/weather/i.test(anchored) && /nyc/i.test(anchored), anchored);
  // The turn's own words survive the cap ahead of the discourse line's —
  // built first, so a long combined anchor keeps what the reader just typed.
  const long = preflightQuery(
    "what is the current population of Springfield Illinois exactly today",
    "an entirely unrelated prior topic about lighthouses and shipping lanes and maritime law",
  );
  assert.ok(/springfield/i.test(long), long);
  assert.ok(long.split(/\s+/).length <= PREFLIGHT_QUERY_MAX_TERMS);
  // No question, no discourse, no query — never a bare empty-string search.
  assert.equal(preflightQuery("", ""), "");
});

// ── the question travels with the finding, so a topic-less follow-up can
// still be searched for the real thing, not for the model's own words ─────
// Same measured case, read from the other end: even once material exists,
// the CHECK's own findings must carry the conversation's anchor forward
// into proofQuery — this is what actually fixes turn two, since proofQuery
// only ever reads `claim.text`/`claim.sentence`, never the question directly.

test("extractCheckableAtoms folds the question into the finding's sentence, so proofQuery inherits real topic words from an anaphoric draft", () => {
  const findings = extractCheckableAtoms("I did just check a weather app and it's showing sunny skies and 70 degrees.", {
    question: "prove it NYC weather right now",
  });
  const figure = findings.find((f) => f.text === "70");
  assert.ok(figure, "the figure must still be flagged");
  assert.ok(/NYC/.test(figure.sentence), figure.sentence);
  const q = proofQuery({ kind: "number", text: figure.text, tokens: ["70"], sentence: figure.sentence });
  assert.ok(/weather/i.test(q), q);
  assert.ok(!/\bapp\b/i.test(q) || /weather/i.test(q), "the query must not be dominated by the model's own unanchored words alone");
});

test("checkGrounding folds the question into its findings' sentences the same way", () => {
  const passages = [{ ref: "kessington#0-40", text: "The Kessington report covers 1974 harbor traffic.", terms: new Set(["kessington", "report", "cover", "1974", "harbor", "traffic"]) }];
  const report = checkGrounding("The 1974 figure was actually 12,000 vessels, per Marlborough.", passages, {
    question: "what did the report actually say about Marlborough?",
  });
  const finding = report.findings.find((f) => f.text === "Marlborough");
  assert.ok(finding);
  assert.ok(/Marlborough/.test(finding.sentence));
});

test("seam: the chat page's own files still fetch nothing remote", () => {
  // The same wall web.test.mjs pins for the Explore files, held here for
  // the files proof-seeking touches: every host named is localhost. The
  // egress stays in explore-server.mjs, where P13 put it.
  for (const file of ["proof.js", "app.js", "index.html"]) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    const hosts = [...text.matchAll(/https?:\/\/([^\s"'`/<)]+)/g)].map((m) => m[1]);
    for (const h of hosts) {
      assert.ok(
        // www.w3.org appears only inside SVG xmlns attributes — a namespace
        // identifier, never fetched (the same exception II.13's own scan
        // makes in constitution.test.mjs).
        /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) || h === "www.w3.org",
        `${file} names a non-local host: ${h}`,
      );
    }
  }
});

// ── result ranking: the claim's context picks the pages, not the engine ─────
// Measured live 2026-08-17: "70,000" from a Borodino casualties sentence
// consulted a Gaza casualty page the engine ranked first, while three
// Borodino pages sat lower. Overlap with the claim's own words orders the
// reads; ties keep the engine's order.
test("rankResults puts claim-context pages ahead of same-figure strangers", async (t) => {
  const { rankResults } = await import("./proof.js");
  const claim = {
    kind: "number",
    text: "70,000",
    tokens: ["70000"],
    sentence: "combined casualties are usually estimated at around 70,000 at Borodino during the Napoleonic Wars",
  };
  const results = [
    { title: "IDF believes 70,000 Gazans killed in war", url: "https://timesofisrael.com/x", snippet: "civilian-combatant ratio unclear" },
    { title: "Battle of Borodino - Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Borodino", snippet: "combined casualties estimated around 70,000, the bloodiest day of the Napoleonic Wars" },
    { title: "Borodino: Key Facts", url: "https://arcanepast.com/borodino", snippet: "casualties at Borodino" },
  ];
  const ranked = rankResults(claim, results);
  assert.equal(ranked[0].url, "https://en.wikipedia.org/wiki/Battle_of_Borodino");
  assert.equal(ranked[1].url, "https://arcanepast.com/borodino");
  assert.equal(ranked[2].url, "https://timesofisrael.com/x", "the same-figure stranger reads last");
  // No context at all → the engine's order is kept, not scrambled.
  const flat = rankResults({ kind: "number", text: "7", tokens: [], sentence: "" }, results);
  assert.deepEqual(flat.map((r) => r.url), results.map((r) => r.url));
});
