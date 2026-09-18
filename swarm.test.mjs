// swarm.test.mjs — conformance for swarm.js (pure, no engine, no DOM).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseAntCommand, parseSwarmCommand, parseAntsCommand, detectAntProposals,
  makeAnt, makeSwarm, fanOutSwarm, markAntRunning, markAntDone, markAntFailed,
  foldSwarm, normalizeKind, SWARM_MAX_ANTS, SUGGEST_MAX, suggestNext, isOpenClaim, isFoughtClaim, claimText,
  wikiOnlyNotes, questionForVoid, QUANT_RE, ESSAY_SUGGEST_CHARS, HOW_IT_WORKS_RE, TABULAR_RE,
} from "./swarm.js";

describe("parseAntCommand", () => {
  it("parses a bare task as ask", () => {
    assert.deepEqual(parseAntCommand("/ant who held this office in 1862?"), { kind: "ask", task: "who held this office in 1862?" });
  });
  it("parses an explicit code kind", () => {
    assert.deepEqual(parseAntCommand("/ant code: count rows in pasted.txt"), { kind: "code", task: "count rows in pasted.txt" });
  });
  it("bare /ant is usage, non-door is null", () => {
    assert.deepEqual(parseAntCommand("/ant"), { usage: true });
    assert.equal(parseAntCommand("hello"), null);
  });
  it("unknown kind prefix is a task, never a silent kind", () => {
    const r = parseAntCommand("/ant frobnicate: the thing");
    assert.equal(r.kind, "ask");
  });
});

describe("parseSwarmCommand", () => {
  it("parses count + goal", () => {
    const r = parseSwarmCommand("/swarm 3 who held these offices?");
    assert.equal(r.n, 3);
    assert.equal(r.kind, "ask");
  });
  it("refuses out-of-range counts as usage", () => {
    assert.equal(parseSwarmCommand("/swarm 1 x").usage, true);
    assert.equal(parseSwarmCommand("/swarm 99 x").usage, true);
    assert.equal(parseSwarmCommand("/swarm x").usage, true);
  });
  it("non-door is null", () => assert.equal(parseSwarmCommand("hi"), null));
});

describe("parseAntsCommand", () => {
  it("matches /ants and /ants all", () => {
    assert.deepEqual(parseAntsCommand("/ants"), { all: false });
    assert.deepEqual(parseAntsCommand("/ants all"), { all: true });
    assert.equal(parseAntsCommand("/ant x"), null);
  });
});

describe("detectAntProposals", () => {
  it("finds model proposals with kinds", () => {
    const found = detectAntProposals("I will check [[ant: the 1861 office]] and [[ant code: count the rows]] now.");
    assert.equal(found.length, 2);
    assert.equal(found[0].kind, "ask");
    assert.equal(found[1].kind, "code");
  });
  it("ignores prose with no marker", () => {
    assert.deepEqual(detectAntProposals("just send an ant please"), []);
  });
  it("caps at SWARM_MAX_ANTS", () => {
    const text = Array.from({ length: SWARM_MAX_ANTS + 4 }, (_, i) => `[[ant: task ${i}]]`).join(" ");
    assert.equal(detectAntProposals(text).length, SWARM_MAX_ANTS);
  });
});

describe("records", () => {
  it("ants move queued -> running -> done with findings", () => {
    let a = makeAnt({ kind: "ask", task: "t", parent: "c1" });
    assert.equal(a.status, "queued");
    a = markAntRunning(a);
    assert.equal(a.status, "running");
    a = markAntDone(a, "found it", { passages: 3 });
    assert.equal(a.status, "done");
    assert.equal(a.findings, "found it");
    const f = markAntFailed(makeAnt({ task: "t" }), "boom");
    assert.equal(f.status, "failed");
  });
  it("fanOutSwarm makes n distinct tasks; foldSwarm counts", () => {
    const s = makeSwarm({ goal: "g", kind: "ask", n: 3, parent: "c1" });
    const tasks = fanOutSwarm(s);
    assert.equal(tasks.length, 3);
    assert.equal(new Set(tasks).size, 3);
    let ants = tasks.map((t) => markAntDone(markAntRunning(makeAnt({ task: t, swarmId: s.id })), "f"));
    let folded = foldSwarm({ ...s, antIds: ants.map((a) => a.id) }, ants);
    assert.equal(folded.status, "done");
    assert.deepEqual(folded.counts, { total: 3, done: 3, failed: 0, running: 0 });
    ants[0] = markAntFailed(ants[0], "x");
    folded = foldSwarm({ ...s, antIds: ants.map((a) => a.id) }, ants);
    assert.equal(folded.counts.failed, 1);
    assert.equal(folded.status, "done");
  });
  it("normalizeKind maps synonyms, refuses unknowns", () => {
    assert.equal(normalizeKind("reading"), "ask");
    assert.equal(normalizeKind("run"), "code");
    assert.equal(normalizeKind("dance"), null);
  });
});

describe("suggestNext", () => {
  it("a clean turn suggests nothing", () => {
    assert.deepEqual(suggestNext({ task: "q", claims: [{ verdict: "bound", text: "a" }], voidsOpen: 0, unbacked: 0 }), []);
    assert.deepEqual(suggestNext({}), []);
  });
  it("one open claim earns one ask ant named after the claim", () => {
    const out = suggestNext({ task: "who was VP?", claims: [{ verdict: "unbound", text: "Hamlin was VP" }] });
    assert.equal(out.length, 1);
    assert.equal(out[0].shape, "ant");
    assert.ok(out[0].task.includes("Hamlin was VP"));
  });
  it("three open claims earn a swarm, not loose ants", () => {
    const claims = ["a", "b", "c"].map((t) => ({ verdict: "unheard", text: t }));
    const out = suggestNext({ task: "q", claims });
    assert.equal(out[0].shape, "swarm");
    assert.ok(out[0].n >= 3);
  });
  it("unbacked findings earn the corroborate door, voids earn the void door", () => {
    const out = suggestNext({ task: "q", unbacked: 2, voidsOpen: 1 });
    assert.ok(out.some((s) => s.shape === "door" && s.door.startsWith("/corroborate")));
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/void"));
  });
  it("never more than three, bound claims never counted", () => {
    const claims = Array.from({ length: 10 }, (_, i) => ({ verdict: i % 2 ? "bound" : "unbound", text: `c${i}` }));
    const out = suggestNext({ task: "q", claims, unbacked: 5, voidsOpen: 4 });
    assert.ok(out.length <= 3);
  });
  it("isOpenClaim reads verdict synonyms, claimText reads triple shapes", () => {
    assert.equal(isOpenClaim({ verdict: "beyond-reach" }), true);
    assert.equal(isOpenClaim({ verdict: "bound" }), false);
    assert.equal(claimText({ subject: "Hamlin", verb: "held", object: "office" }), "Hamlin held office");
  });

  it("a fought claim earns the hostile re-read ant first", () => {
    const out = suggestNext({ task: "q", claims: [{ verdict: "contradicted", text: "X did Y" }] });
    assert.equal(out[0].shape, "ant");
    assert.match(out[0].task, /break this sentence/);
  });

  it("disputes earn the bound door", () => {
    const out = suggestNext({ task: "who?", disputesCount: 2 });
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/bound who?"));
  });

  it("wiki-only notes earn the ranke door; primary-witnessed notes do not", () => {
    const notes = [
      { witnesses: ["en.wikipedia.org#0-10~web-v1", "en.wikipedia.org#40-60~web-v1"] },
      { witnesses: ["en.wikipedia.org#0-10~web-v1", "primary:loc.gov#0-10~ranke-v1"] },
      { witnesses: ["pasted.txt#0-10~read-v1"] },
    ];
    assert.equal(wikiOnlyNotes(notes).length, 1);
    const out = suggestNext({ task: "q", notes });
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/ranke 6 0"));
    assert.deepEqual(suggestNext({ task: "q", notes: [notes[1]] }).filter((s) => s.door === "/ranke 6 0"), []);
  });

  it("declarations plus settled facts earn derive", () => {
    const out = suggestNext({ task: "q", claims: [{ verdict: "bound", text: "a" }], declarationsGiven: 1, boundCount: 1 });
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/derive"));
    assert.deepEqual(suggestNext({ task: "q", declarationsGiven: 1, boundCount: 0 }).filter((s) => s.door === "/derive"), []);
  });

  it("fetched pages earn an attach suggestion carrying the texts", () => {
    const out = suggestNext({ task: "q", fetchedPages: [{ name: "page.look.txt", texts: ["real bytes"] }] });
    const a = out.find((s) => s.shape === "attach");
    assert.ok(a && a.texts[0] === "real bytes");
    assert.deepEqual(suggestNext({ task: "q", fetchedPages: [{ name: "x", texts: ["  "] }] }).filter((s) => s.shape === "attach"), []);
  });

  it("other conversations plus open claims earn a cross-conversation ant", () => {
    const out = suggestNext({ task: "q", claims: [{ verdict: "unbound", text: "c" }], workspaceOtherConvos: 2 });
    assert.ok(out.some((s) => s.shape === "ant" && s.crossConvo === true));
    assert.deepEqual(suggestNext({ task: "q", workspaceOtherConvos: 2 }).filter((s) => s.crossConvo), []);
  });

  it("long answers over rich material earn the essay door, prefilled", () => {
    const out = suggestNext({ task: "tell me everything", outputChars: ESSAY_SUGGEST_CHARS + 1, livePassages: 9 });
    assert.ok(out.some((s) => s.shape === "door" && s.door.startsWith("/essay 3 tell me everything")));
    assert.deepEqual(suggestNext({ task: "q", outputChars: 10, livePassages: 9 }).filter((s) => (s.door ?? "").startsWith("/essay")), []);
  });

  it("a fold published this turn earns its /fold door", () => {
    const out = suggestNext({ task: "q", buildThisTurnN: 4 });
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/fold 4 "));
  });

  it("a table file plus a quantitative question earns measure", () => {
    assert.ok(QUANT_RE.test("how many riders in 2020?"));
    assert.ok(TABULAR_RE.test("orders.csv"));
    const out = suggestNext({ task: "how many riders?", tabularFile: "orders.csv" });
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/measure orders.csv"));
    assert.deepEqual(suggestNext({ task: "tell me about riders", tabularFile: "orders.csv" }).filter((s) => (s.door ?? "").startsWith("/measure")), []);
  });

  it("how-it-works questions earn the learn door", () => {
    assert.ok(HOW_IT_WORKS_RE.test("how do you check claims?"));
    const out = suggestNext({ task: "how do you check claims?", handbookAsk: true });
    assert.ok(out.some((s) => s.shape === "door" && s.door === "/learn "));
  });

  it("questionForVoid phrases the void as a question", () => {
    assert.equal(questionForVoid({ anchor: "Abraham Lincoln", slot: "vice president", grammaticalNumber: "singular" }), "What is the vice president of Abraham Lincoln?");
    assert.equal(questionForVoid({ anchor: "X", slot: "offices", grammaticalNumber: "plural" }), "What are the offices of X?");
    assert.equal(questionForVoid({}), null);
    const out = suggestNext({ task: "q", voidAsk: { anchor: "Abraham Lincoln", slot: "vice president", grammaticalNumber: "singular" } });
    assert.ok(out.some((s) => s.shape === "door" && s.door.includes("vice president")));
  });

  it("makeAnt carries context, capped", () => {
    const a = makeAnt({ task: "t", context: "x".repeat(9000) });
    assert.equal(a.context.length, 3000);
    assert.equal(makeAnt({ task: "t" }).context, null);
  });
});
