// skill-runner.mjs — where skills actually run. Node-side (vm, fs); the pure
// half — shapes, log, claiming, slot filling, dispatch — is skills.js.
//
// Authority model: a skill body is compiled in an EMPTY vm context (no
// require, no process, no fetch, no timers — the JS language intrinsics and
// nothing else) and receives exactly three arguments: its validated slots,
// the organs it DECLARED in `needs` and was granted, and `skills` — the one
// door to composition, which resolves through the live library and is
// recorded per nested call. Nothing ambient. This plus the admission scan is
// an authority wall by construction, not a hardened security boundary; P1
// (local only) is the outer wall, and both facts are stated rather than
// implied.
//
// The admission gate is P10 made mechanical: a candidate is admitted only if
// (1) its shape is whole, (2) its body and check pass the forbidden-token
// scan, (3) both compile, and (4) ITS OWN CHECK passes against its own body
// in the sandbox. A refusal is appended to the log with its typed reason —
// refused candidates stay on the record, because "this was tried and
// refused" is evidence the next authoring pass needs.
//
// Persistence is the record discipline (FOLD-CONSTITUTION I.5): skill bodies
// land content-addressed in skills/<digest>.json, and every admission,
// refusal, and invocation appends to record/skill-record.jsonl — never
// truncated, never rewritten. The library rebuilds from the record alone;
// a file whose bytes no longer match their digest is dropped from the live
// fold with a typed defect, never silently trusted.

import vm from "node:vm";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  SKILL_ENTRY_KINDS,
  SKILL_STACK_BUDGET,
  appendSkill,
  checkSkillShape,
  claimSkill,
  createSkillLog,
  projectLibrary,
  scanBody,
  skillDigest,
  validateSlots,
} from "./skills.js";

/** Budgets, named with their duty (P9). */
export const SKILL_RUN_BUDGET_MS = 10_000;   // a skill run is bounded work, not a session
export const SKILL_COMPILE_BUDGET_MS = 1_000; // compiling a function should be instant; longer is a spin
export const SKILL_CHECK_BUDGET_MS = 10_000;  // the admission check gets one run's budget

const REFUSED = Symbol("refused");
const refusal = (reason) => ({ [REFUSED]: true, reason });
const isRefusal = (x) => !!x?.[REFUSED];

/**
 * Compile a function-expression source in an empty context. The vm timeout
 * bounds the compile-and-evaluate step; the run budget below guards await
 * points. A synchronous spin INSIDE a later call is the one hole the budget
 * does not cover, disclosed here rather than papered over.
 */
function compileFn(source, filename) {
  const context = vm.createContext(Object.create(null));
  const script = new vm.Script(`(${source})`, { filename });
  const fn = script.runInContext(context, { timeout: SKILL_COMPILE_BUDGET_MS });
  if (typeof fn !== "function") throw new TypeError(`${filename} does not evaluate to a function`);
  return fn;
}

// The budget races the run. The timer is NOT unref'd: an unref'd timer lets
// the event loop drain while a stuck body is still pending, and the race —
// the very thing meant to catch that — never settles. The winner clears it.
async function raceBudget(promise, ms, what) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`refused-as-overran: ${what} exceeded its ${ms}ms budget`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Anything with a `.ref` string, at any depth of an organ's return, is an address it touched. */
function harvestRefs(value, into) {
  if (!value) return;
  if (typeof value.ref === "string") into.add(value.ref);
  if (Array.isArray(value)) for (const v of value) harvestRefs(v, into);
}

/**
 * Run one skill: grant exactly its declared organs, compile, race the budget.
 * Every failure is a typed `refused` string on the result — a skill run never
 * throws raw at its caller (the same posture as kinds' refused-as-underpowered).
 */
export async function executeSkill(skill, slots, {
  organs = {},
  library = [],
  budgetMs = SKILL_RUN_BUDGET_MS,
  depth = 0,
  record = null,
} = {}) {
  const refs = new Set();
  const stacked = [];

  for (const need of skill.needs) {
    if (typeof organs[need] !== "function")
      return { value: null, refs: [], stacked, refused: `organ not offered: ${need}` };
  }

  // Granted organs are wrapped so every address they hand back is harvested —
  // a skill's provenance is what its organs actually returned, measured, not
  // what its body claims.
  const granted = {};
  for (const need of skill.needs) {
    granted[need] = async (...args) => {
      const out = await organs[need](...args);
      harvestRefs(out, refs);
      return out;
    };
  }

  // Composition: the one door. A nested call resolves by NAME through the
  // live library, validates its slots mechanically, runs under the same
  // organs table (the child still only gets what IT declared), and is
  // recorded. Depth is a named budget, a runaway backstop.
  const skillsApi = {
    call: async (name, childSlots = {}) => {
      if (depth + 1 >= SKILL_STACK_BUDGET)
        throw new Error(`refused-as-overran: skill stack exceeded its budget of ${SKILL_STACK_BUDGET}`);
      const child = library.find((s) => s.skill.name === name);
      if (!child) throw new Error(`no skill named ${name} in the library`);
      const defects = validateSlots(child.skill, childSlots);
      if (defects.length) throw new Error(`nested call to ${name}: ${defects.join("; ")}`);
      const ran = await executeSkill(child.skill, childSlots, {
        organs, library, budgetMs, depth: depth + 1, record,
      });
      if (ran.refused) throw new Error(`nested skill ${name} refused: ${ran.refused}`);
      stacked.push(name, ...ran.stacked);
      for (const r of ran.refs) refs.add(r);
      return ran.value;
    },
  };

  let outcome;
  try {
    const fn = compileFn(skill.body, `skill:${skill.name}`);
    outcome = await raceBudget(fn(slots, granted, skillsApi), budgetMs, `skill ${skill.name}`);
  } catch (err) {
    outcome = refusal(`skill body threw: ${err?.message ?? err}`);
  }

  const result = isRefusal(outcome)
    ? { value: null, refs: [...refs], stacked, refused: outcome.reason }
    : { value: outcome, refs: [...refs], stacked };

  // The invocation carries the digest so a replayed record can count it back
  // onto the same mechanism it actually ran.
  record?.({
    kind: SKILL_ENTRY_KINDS.INVOKE,
    name: skill.name,
    digest: await skillDigest(skill),
    slots,
    refs: result.refs,
    stacked,
    ...(result.refused ? { refused: result.refused } : {}),
  });
  return result;
}

/** An executor bound to a live library and organ table, in runSkilledTask's shape. */
export function makeExecutor({ organs = {}, library = [], budgetMs = SKILL_RUN_BUDGET_MS, record = null } = {}) {
  return (skill, slots) => executeSkill(skill, slots, { organs, library, budgetMs, record });
}

/**
 * The gate. Returns { log, admitted, digest?, reason? } — the returned log
 * ALWAYS carries a new entry, ADMIT or REFUSE, because both outcomes are
 * record. `supersedes` (a digest) lets a re-earned skill replace its prior
 * without deleting it.
 */
export async function admitSkill(log, skill, {
  organs = {},
  // A stacking candidate's check needs the skills it calls: the gate runs
  // against the CURRENT live library, so a composite is only admissible once
  // its children are — admission order is dependency order, mechanically.
  library = [],
  provenance = null,
  supersedes = null,
  record = null,
} = {}) {
  const refuse = (reason) => {
    const entry = { kind: SKILL_ENTRY_KINDS.REFUSE, name: skill?.name || "(unnamed)", reason };
    record?.(entry);
    return { log: appendSkill(log, entry), admitted: false, reason };
  };

  const defects = checkSkillShape(skill);
  if (defects.length) return refuse(defects.join("; "));

  const forbidden = [...new Set([...scanBody(skill.body), ...scanBody(skill.check)])];
  if (forbidden.length) return refuse(`body or check reaches for what the sandbox does not grant: ${forbidden.join(", ")}`);

  let checkFn;
  try {
    compileFn(skill.body, `skill:${skill.name}`);
    checkFn = compileFn(skill.check, `check:${skill.name}`);
  } catch (err) {
    return refuse(`does not compile: ${err?.message ?? err}`);
  }

  // The check runs against the skill's OWN body through the same executor a
  // real invocation uses — same grants, same budget shape — so what passed
  // admission is what will run, not a friendlier stand-in.
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || "check failed"); };
  const run = async (slots = {}) => {
    const slotDefects = validateSlots(skill, slots);
    if (slotDefects.length) throw new Error(`check ran with unusable slots: ${slotDefects.join("; ")}`);
    const ran = await executeSkill(skill, slots, { organs, library });
    if (ran.refused) throw new Error(ran.refused);
    return ran.value;
  };
  try {
    await raceBudget(checkFn(run, organs, assert), SKILL_CHECK_BUDGET_MS, `check of ${skill.name}`);
  } catch (err) {
    return refuse(`its own check failed: ${err?.message ?? err}`);
  }

  const digest = await skillDigest(skill);
  const entry = {
    kind: SKILL_ENTRY_KINDS.ADMIT,
    name: skill.name,
    digest,
    skill,
    ...(provenance ? { provenance } : {}),
    ...(supersedes ? { supersedes } : {}),
  };
  record?.(entry);
  return { log: appendSkill(log, entry), admitted: true, digest };
}

// ── persistence: content-addressed bodies, append-only record ────────────────

export const SKILLS_DIR = "skills";
export const SKILL_RECORD_PATH = join("record", "skill-record.jsonl");

/** A record function for admitSkill/executeSkill that appends jsonl, never rewrites. */
export function makeSkillRecorder(recordPath = SKILL_RECORD_PATH) {
  return (entry) => {
    mkdirSync(dirname(recordPath), { recursive: true });
    // The skill body is not repeated into the record — the record carries the
    // digest, the digest names the file, and the file is the body's one home.
    const { skill, ...rest } = entry;
    appendFileSync(recordPath, JSON.stringify({ ...rest, at: new Date().toISOString() }) + "\n");
  };
}

/** Write the mechanism to its content address. Idempotent by construction. */
export async function saveSkill(skill, dir = SKILLS_DIR) {
  const digest = await skillDigest(skill);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${digest}.json`);
  if (!existsSync(path)) writeFileSync(path, JSON.stringify(skill, null, 2) + "\n");
  return { digest, path };
}

/**
 * Rebuild the library from the record alone. Admissions load their body from
 * the content address and the digest is RECOMPUTED — a mismatch (edited file,
 * truncated write) drops the skill from the live fold as a typed defect. The
 * check is not re-run on load: the record of its admission is the evidence,
 * and the digest match is what proves the mechanism is the one that passed.
 */
export async function loadSkillLibrary(dir = SKILLS_DIR, recordPath = SKILL_RECORD_PATH) {
  let log = createSkillLog();
  const defects = [];
  if (!existsSync(recordPath)) return { log, library: [], defects };

  const lines = readFileSync(recordPath, "utf8").split("\n").filter((l) => l.trim());
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { defects.push("unreadable record line (kept in the file, skipped in the fold)"); continue; }
    if (entry.kind === SKILL_ENTRY_KINDS.ADMIT && entry.digest) {
      const path = join(dir, `${entry.digest}.json`);
      if (!existsSync(path)) { defects.push(`admitted skill ${entry.name} has no body at ${path}`); continue; }
      let skill;
      try { skill = JSON.parse(readFileSync(path, "utf8")); } catch { defects.push(`skill file unreadable: ${path}`); continue; }
      const recomputed = await skillDigest(skill);
      if (recomputed !== entry.digest) {
        defects.push(`skill ${entry.name}: bytes at ${path} no longer match their digest — dropped from the live library`);
        continue;
      }
      const { at, ...rest } = entry;
      log = appendSkill(log, { ...rest, skill });
    } else if (Object.values(SKILL_ENTRY_KINDS).includes(entry.kind)) {
      const { at, ...rest } = entry;
      try { log = appendSkill(log, rest); } catch { defects.push(`malformed ${entry.kind} entry skipped in the fold`); }
    }
  }
  return { log, library: projectLibrary(log), defects };
}

export { claimSkill, projectLibrary };
