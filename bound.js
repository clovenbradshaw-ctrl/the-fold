// bound.js — generation where the model can point at facts but cannot spell
// them. Pure.
//
// FOLD-CONSTITUTION II.9, taken at full strength: no number, name, date, or
// quantity is emitted as model tokens; every such value is a reference,
// resolved at render time. The mechanism is not a protocol the model is
// asked to follow — protocols are refused here — it is the decoding grammar:
// the answer schema's fact fields are ENUMS built from the material's own
// cast (engine referent discovery) and its own figures (every number the
// passages contain, each with its address). Measured 2026-08-16 on
// gemma2:2b: an enum-bound name field emitted exactly a cast handle,
// because nothing else was decodable.
//
// What the grammar cannot yet forbid is a name or figure leaking into the
// free `prose` field (digit-forbidding string patterns in the schema are
// unverified on this runtime). So the prose stays AUDITED by the same
// checks as every other sentence, and a leak renders striped — bound where
// the grammar reaches, measured where it does not, disclosed either way.

import { NUMBER_RE } from "./grounding.js";

/**
 * Every figure the passages contain, as cells with addresses: the offer the
 * grammar will enumerate. Deduplicated on the value as written; the first
 * passage to state a figure is its cell's address. Mechanical — the same
 * regex the grounding check reads figures with, imported so the two can
 * never disagree about what a figure is.
 */
export function extractCells(passages) {
  const cells = [];
  const seen = new Set();
  for (const p of passages ?? []) {
    NUMBER_RE.lastIndex = 0;
    let m;
    while ((m = NUMBER_RE.exec(String(p?.text ?? ""))) !== null) {
      if (seen.has(m[0])) continue;
      seen.add(m[0]);
      cells.push({ value: m[0], ref: p.ref });
    }
  }
  return cells;
}

/**
 * The bound answer's shape, as decoding grammar. Fact fields enumerate the
 * offer; the empty string is always a member, because a sentence that
 * carries no name or no figure must have a way to say so — an enum with no
 * escape would FORCE a fact into every sentence, which is invention by
 * grammar, the same failure from the other side.
 */
export function buildBoundSchema({ handles = [], cells = [] }) {
  return {
    type: "object",
    properties: {
      sentences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            prose: { type: "string" },
            name: { type: "string", enum: ["", ...handles] },
            figure: { type: "string", enum: ["", ...cells.map((c) => c.value)] },
          },
          required: ["prose", "name", "figure"],
        },
      },
    },
    required: ["sentences"],
  };
}

export const BOUND_SYSTEM_PROMPT =
  "You answer from supplied material, one sentence at a time. For each sentence, write the connecting prose, then choose the name it is about and the figure it states from the choices available — choose the empty choice when a sentence carries no name or no figure. Do not restate names or numbers inside the prose; the chosen values carry them.";

export function buildBoundPrompt(question, sourceBlock) {
  return sourceBlock
    ? `${question}\n\n${sourceBlock}`
    : `${question}\n\n(No material matched this question — say so in prose; choose the empty name and figure.)`;
}

/**
 * Parse defensively — the grammar makes the common case arrive well-formed,
 * but a parse is still never trusted. Unusable → typed degradation, and the
 * caller falls back to showing the raw text as `shown`.
 */
export function parseBound(raw) {
  try {
    const obj = JSON.parse(String(raw ?? ""));
    const sentences = (obj?.sentences ?? [])
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        prose: String(s.prose ?? "").trim(),
        name: String(s.name ?? "").trim(),
        figure: String(s.figure ?? "").trim(),
      }))
      .filter((s) => s.prose || s.name || s.figure);
    if (sentences.length) return { sentences, degraded: false };
  } catch {
    // fall through to degradation
  }
  return { sentences: [], degraded: true };
}

/**
 * The bound answer as plain text — for history, the fold line, and the
 * mechanical checks, which read text. The chosen values are appended to
 * their sentence so a check sees exactly what the reader sees.
 */
export function flattenBound(parsed) {
  return parsed.sentences
    .map((s) => [s.prose, s.name, s.figure].filter(Boolean).join(" — "))
    .join("\n");
}
