// thea-creativity-probe.mjs — what "true creativity, more abundantly" means
// for an arranger who invents only in dependency order under logos: MORE
// earned wholes per reading, never more novelty per sentence. Midwife (Figure): each part born from its own
// passages, unsupported lines named as gaps. Weaver (Pattern): parts woven
// into a whole with no added thread, gaps kept. Run: node eval/thea-creativity-probe.mjs
import { readFileSync } from "node:fs";
import { composeFigure, composePattern } from "../thea.js";

const src = readFileSync(new URL("../pg2600.txt", import.meta.url), "utf8");
// Two real, adjacent passages — Tolstoy, unmodified bytes.
const p1 = src.slice(0, 400).replace(/\s+/g, " ").trim();
const p2 = src.slice(400, 800).replace(/\s+/g, " ").trim();
const passagesA = [{ ref: "pg2600#0-400", text: p1 }];
const passagesB = [{ ref: "pg2600#400-800", text: p2 }];

const words = (t) => t.split(/\s+/).filter(Boolean);
const firstWords = (t, n) => words(t).slice(0, n).join(" ");

// Candidate lines: two restating each passage's own words (earnable), two
// reaching beyond them (the creativity test — must become gaps, not prose).
const linesA = [
  { text: firstWords(p1, 12) + ".", backs: ["pg2600#0-400"] },
  { text: "Meanwhile the telegraph invented photography.", backs: ["pg2600#0-400"] },
];
const linesB = [
  { text: firstWords(p2, 12) + ".", backs: ["pg2600#400-800"] },
  { text: "Tolstoy therefore discovered electricity.", backs: ["pg2600#400-800"] },
];

const a = composeFigure({ part: "opening", passages: passagesA, lines: linesA });
const b = composeFigure({ part: "continuation", passages: passagesB, lines: linesB });
const whole = composePattern({
  parts: [
    { id: "opening", heading: "Opening", text: a.text, gaps: a.gaps },
    { id: "continuation", heading: "Continuation", text: b.text, gaps: b.gaps },
  ],
  order: ["opening", "continuation"],
});

console.log("MIDWIFE (figure): part A sentences", a.sentences.length, "gaps", a.gaps.map((g) => g.name).join(","));
console.log("MIDWIFE (figure): part B sentences", b.sentences.length, "gaps", b.gaps.map((g) => g.name).join(","));
console.log("WEAVER (pattern): sections", whole.sections.length, "gaps kept", whole.gaps.length);
console.log("WEAVER (pattern): order —", whole.orderNote);
console.log("--- whole ---");
console.log(whole.text);
const invented = [whole.text.includes("telegraph"), whole.text.includes("electricity")].filter(Boolean).length;
console.log("--- abundance: earned sentences", whole.sections.length, "| invented claims leaked", invented, "| gaps disclosed", whole.gaps.length, "---");
if (invented) process.exitCode = 1;
