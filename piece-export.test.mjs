import test from "node:test";
import assert from "node:assert/strict";
import { textFragment, verbatimSpans, exportPiece } from "./piece-export.js";

const passages = new Map([["web:en.wikipedia.org-0#100-260", { text: "The X-Files is an American science fiction drama television series created by Chris Carter. It premiered in 1993." }]]);
const urls = { "web:en.wikipedia.org-0": "https://en.wikipedia.org/wiki/The_X-Files" };

test("a text fragment scrolls the page to the bytes: whole when short, start,end when long", () => {
  assert.equal(textFragment("created by Chris Carter"), "#:~:text=created%20by%20Chris%20Carter");
  assert.match(textFragment("The X-Files is an American science fiction drama television series created by Chris Carter"), /^#:~:text=The%20X%2DFiles%20is%20an%20American,series%20created%20by%20Chris%20Carter$/);
});

test("verbatim spans are sliced from the passage by address, never retyped; each carries its link into the page", () => {
  const bound = { tier: "bound", addresses: ["web:en.wikipedia.org-0#100-260"], claims: [{ spans: [{ ref: "web:en.wikipedia.org-0#100-260", start: 0, end: 93, text: "The X-Files is an American science fiction drama television series created by Chris Carter." }] }] };
  const s = verbatimSpans(bound, { passages, urls });
  assert.equal(s.length, 1); assert.equal(s[0].source, "web:en.wikipedia.org-0"); assert.match(s[0].link, /^https:\/\/en\.wikipedia\.org\/wiki\/The_X-Files#:~:text=/);
  const witnessed = { tier: "witnessed", addresses: ["web:en.wikipedia.org-0#100-260"], decider: "It premiered in 1993." };
  const w = verbatimSpans(witnessed, { passages, urls });
  assert.equal(w[0].start, 92); assert.equal(w[0].text, "It premiered in 1993.");
  const named = { tier: "named", addresses: ["web:en.wikipedia.org-0#100-260"], names: ["Chris Carter"] };
  assert.equal(verbatimSpans(named, { passages, urls })[0].text, "Chris Carter");
  assert.deepEqual(verbatimSpans({ tier: "self", addresses: [] }, { passages, urls }), []);
});

test("the markdown reads as prose with numbered footnotes of verbatim spans and links; the model's own sentences share one footnote naming it; the html anchors each sentence with its address and offsets; the json sidecar carries all of it", () => {
  const sections = [{ label: "Opening", sentences: [
    { text: "The series was created by Chris Carter.", ground: { tier: "bound", cell: "CON·Figure", phrase: "stated at", addresses: ["web:en.wikipedia.org-0#100-260"], claims: [{ spans: [{ ref: "web:en.wikipedia.org-0#100-260", start: 0, end: 93, text: "The X-Files is an American science fiction drama television series created by Chris Carter." }] }] } },
    { text: "It began in 1993.", ground: { tier: "witnessed", cell: "EVA·Figure", phrase: "a passage states this", addresses: ["web:en.wikipedia.org-0#100-260"], decider: "It premiered in 1993." } },
    { text: "Everyone loved it.", ground: { tier: "self", cell: "self:model", phrase: "gemma2:2b", refused: true, addresses: [] } },
    { text: "It was a hit.", ground: { tier: "self", cell: "self:model", phrase: "gemma2:2b", addresses: [] } },
  ] }];
  const r = exportPiece({ title: "T", ask: "write", model: "gemma2:2b", sections, passages, urls, prompts: { Opening: "[user]\nWrite this part" }, generatedAt: "2026-09-05" });
  assert.match(r.md, /^# T\n\n## Opening\n\nThe series was created by Chris Carter\.\[\^1\] It began in 1993\.\[\^2\] Everyone loved it\.\[\^r\] It was a hit\.\[\^m\]\n/);
  assert.match(r.md, /\[\^1\]: “The X-Files is an American science fiction drama television series created by Chris Carter\.” — web:en\.wikipedia\.org-0 bytes 0–93 \[open at the span\]\(https:\/\/en\.wikipedia\.org\/wiki\/The_X-Files#:~:text=/);
  assert.match(r.md, /\[\^2\]: “It premiered in 1993\.” — web:en\.wikipedia\.org-0 bytes 92–113/);
  assert.match(r.md, /\[\^m\]: gemma2:2b's own testimony — nothing read places it\./);
  assert.match(r.html, /<span class="s tier-bound" data-i="0" data-tier="bound" data-cell="CON·Figure" data-address="web:en\.wikipedia\.org-0#100-260" data-start="0" data-end="93"/);
  assert.match(r.html, /<a class="cite" href="https:\/\/en\.wikipedia\.org\/wiki\/The_X-Files#:~:text=[^"]+" target="_blank" rel="noopener">1<\/a>/);
  assert.match(r.html, /<sup class="self" title="gemma2:2b's own testimony — the witness was asked and no passage states it">r<\/sup>/);
  assert.doesNotMatch(r.html, /<script|https?:\/\/(?!en\.wikipedia\.org)/, "no script, no remote resource but the sources' own links");
  assert.equal(r.json.schema, "EOPieceExport@1");
  assert.deepEqual(r.json.tally, { bound: 1, witnessed: 1, self: 2 });
  assert.equal(r.json.sections[0].sentences[1].spans[0].start, 92);
  assert.equal(r.json.sections[0].prompt, "[user]\nWrite this part");
  assert.equal(r.notes, 2, "one note per distinct span, shared by identical spans");
});
