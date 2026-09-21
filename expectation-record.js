// expectation-record.js — the M-07/M-08 per-interaction expectation record (T3)
//
// The SLR's central gap: the project measures the outcome side (AnswerRecord) but
// nothing measures the expectation side. This module is the additive schema + builder.
// Pure: the caller supplies the capture-point values; this module only shapes and
// validates, so the fold session can wire it into answerRecord() and mirror it via
// mirrorTermRecord -> explore-record.jsonl with one allowlist line.
//
// Corpus anchors: SLR valence/tolerance (slr:798-819), PER-01..07 / SIT-01..04,
// PFC forced-vs-voluntary (attribution), ECM confirmation chain (jbr H1-H10), and
// the attribution study's failure taxonomy (process/outcome; high/low severity).

export const SCHEMA = "EOExpectationRecord@1";

export const PFC = { FORCED: "forced", VOLUNTARY: "voluntary", UNKNOWN: "unknown" };

export const FAILURE_TYPE = { PROCESS: "process", OUTCOME: "outcome", NONE: "none" };
export const SEVERITY = { HIGH: "high", LOW: "low", NONE: "none" };

const PER_KEYS = ["motivation", "experience", "trust", "attitude", "preferences", "characteristics", "risk"];
const SIT_KEYS = ["interface", "task", "brand", "social"];

// Build the record. Returns the normalized object; `validate` throws on a schema
// break. All fields optional at the boundary but once present they are typed.
export function expectationRecord(input = {}) {
  const rec = {
    schema: SCHEMA,
    question: input.question ?? null,
    expected: {
      desired: input.expected?.desired ?? null, // ideal/desired benchmark (slr tolerance levels)
      adequate: input.expected?.adequate ?? null, // adequate/minimum benchmark
      valence: input.expected?.valence ?? null, // anticipated failures: array of strings, or null
    },
    factors: {
      personal: pick(input.factors?.personal, PER_KEYS), // PER-01..07
      situational: pick(input.factors?.situational, SIT_KEYS), // SIT-01..04
    },
    pfc: input.pfc ?? PFC.UNKNOWN, // forced vs voluntary (was a human alternative visible?)
    outcome: {
      actual: input.outcome?.actual ?? null,
      confirmationGap: input.outcome?.confirmationGap ?? null, // expected - actual
      failureType: input.outcome?.failureType ?? FAILURE_TYPE.NONE,
      severity: input.outcome?.severity ?? SEVERITY.NONE,
    },
    satisfaction: input.satisfaction ?? null, // customer-plane (satisfaction.js four-gate / CF items)
    at: input.at ?? null,
  };
  validate(rec);
  return rec;
}

export function validate(rec) {
  assertTypes(rec, {
    schema: "string",
    question: ["string", "null"],
    expected: "object",
    factors: "object",
    pfc: "string",
    outcome: "object",
    satisfaction: ["string", "null"],
    at: ["string", "null"],
  });
  if (![PFC.FORCED, PFC.VOLUNTARY, PFC.UNKNOWN].includes(rec.pfc)) throw new Error("pfc must be forced|voluntary|unknown");
  if (!Object.values(FAILURE_TYPE).includes(rec.outcome.failureType)) throw new Error("failureType invalid");
  if (!Object.values(SEVERITY).includes(rec.outcome.severity)) throw new Error("severity invalid");
  return true;
}

// Compact JSONL line for the mirror (explore-record.jsonl allowlist event).
export function expectationRecordLine(rec) {
  validate(rec);
  return JSON.stringify({ event: "expectation-record", ...rec });
}

function pick(obj, keys) {
  if (!obj) return {};
  return keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
}

function assertTypes(obj, shape) {
  for (const [k, types] of Object.entries(shape)) {
    const arr = Array.isArray(types) ? types : [types];
    const v = obj[k];
    const ok = arr.some((t) => {
      if (t === "null") return v === null;
      if (t === "object") return typeof v === "object" && v !== null;
      return typeof v === t;
    });
    if (!ok) throw new Error(`field ${k} has wrong type (expected ${arr.join("|")}, got ${v === null ? "null" : typeof v})`);
  }
}