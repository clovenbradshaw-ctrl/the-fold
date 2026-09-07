// theory-guards.test.mjs — the mechanical half of THEORY-GUARDS.md.
//
// A guard is not advice. This asserts that every guard names either a test
// that fails when it is broken, or says UNENFORCED out loud — and that the
// tests it names actually exist and actually contain the assertions it cites.
// A guard pointing at a test that does not exist is worse than no guard: it
// reports protection that is not there.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.resolve(here, p), "utf8");
const DOC = "THEORY-GUARDS.md";

function guards(md) {
  const lines = md.split("\n");
  // A section ends at the NEXT `## ` heading of any kind, not at the next
  // guard — the last guard would otherwise run to end of file and swallow
  // the Owed section, inheriting an UNENFORCED that belongs to another
  // guard. Found by this suite's own assertion, which is the point of it.
  const isHead = (l) => /^## /.test(l);
  const heads = [];
  lines.forEach((l, i) => { const m = l.match(/^## (G\d+) — (.+)$/); if (m) heads.push({ id: m[1], title: m[2], line: i }); });
  return heads.map((h) => {
    let end = lines.length;
    for (let i = h.line + 1; i < lines.length; i++) if (isHead(lines[i])) { end = i; break; }
    return { ...h, text: lines.slice(h.line, end).join("\n") };
  });
}

test("every guard states a claim, why regression is tempting, and a gate", () => {
  const gs = guards(read(DOC));
  assert.ok(gs.length >= 10, `expected the guards to be present, found ${gs.length}`);
  for (const g of gs) {
    assert.match(g.text, /\*\*Claim\.\*\*/, `${g.id} must state its claim`);
    assert.match(g.text, /\*\*Why regression is tempting\.\*\*/, `${g.id} must say why it will be broken again`);
    assert.match(g.text, /\*\*Gate\.\*\*/, `${g.id} must name its gate`);
  }
});

test("a guard names a real test, or says UNENFORCED — never neither", () => {
  const gs = guards(read(DOC));
  for (const g of gs) {
    const gate = g.text.slice(g.text.indexOf("**Gate.**"));
    const files = [...gate.matchAll(/`([\w.-]+\.test\.mjs)`/g)].map((m) => m[1]);
    const unenforced = /UNENFORCED/.test(gate);
    assert.ok(files.length || unenforced,
      `${g.id} (${g.title}) names no test and does not admit to being UNENFORCED — a guard is not advice`);
    for (const f of files) {
      assert.ok(fs.existsSync(path.resolve(here, f)),
        `${g.id} points at ${f}, which does not exist — a guard reporting protection that is not there is worse than no guard`);
    }
  }
});

test("the assertions a guard cites are really in the test it names", () => {
  // A guard may not cite a test name that has drifted away from the
  // assertion it was protecting — this is the same failure the cube's own
  // header records: a comment saying "nothing is restated here" above a
  // restatement that had drifted.
  const gs = guards(read(DOC));
  let checked = 0;
  for (const g of gs) {
    const gate = g.text.slice(g.text.indexOf("**Gate.**"));
    const files = [...gate.matchAll(/`([\w.-]+\.test\.mjs)`/g)].map((m) => m[1]);
    // Quoted phrases in the gate paragraph are test titles.
    const quoted = [...gate.matchAll(/"([^"]{8,})"/g)].map((m) => m[1]);
    if (!files.length || !quoted.length) continue;
    const haystack = files.map((f) => read(f)).join("\n");
    for (const q of quoted) {
      // Compare on the distinctive head of the title: titles wrap across
      // lines in markdown, so the whole string need not match verbatim.
      const head = q.split(/[—\n]/)[0].trim().slice(0, 40);
      if (head.length < 8) continue;
      assert.ok(haystack.includes(head),
        `${g.id} cites the assertion "${head}…" but no test it names contains it`);
      checked += 1;
    }
  }
  assert.ok(checked >= 8, `too few guard citations were checkable (${checked}) — the doc has drifted into prose`);
});

test("an UNENFORCED guard is recorded as a debt, not left to look enforced", () => {
  const md = read(DOC);
  const gs = guards(md);
  const unenforced = gs.filter((g) => /UNENFORCED/.test(g.text));
  for (const g of unenforced) {
    assert.match(g.text, /pending|debt|until/i, `${g.id} is unenforced and must say what it is waiting on`);
    assert.ok(md.includes("## Owed"), "the document must carry an Owed section");
    assert.ok(md.slice(md.indexOf("## Owed")).includes(g.id),
      `${g.id} is UNENFORCED but is not listed under Owed — an unenforced guard that is not tracked will be read as a rule`);
  }
});

test("the guards are numbered without gaps, so one cannot be quietly dropped", () => {
  const ids = guards(read(DOC)).map((g) => Number(g.id.slice(1)));
  assert.deepEqual(ids, ids.map((_, i) => i + 1), `guard numbering has a gap or a reorder: ${ids.join(",")}`);
});

test("amendment discipline is stated: a guard goes only by a measurement", () => {
  assert.match(read(DOC), /removed only by a measurement showing it\s*\n?protects nothing/,
    "the document must say what it takes to remove a guard, or guards will be removed for reading awkwardly");
});
