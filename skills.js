// skills.js — procedures the instrument keeps as code. Pure: no IO, no vm,
// no network; execution and persistence live in skill-runner.mjs.
//
// The law this module extends is L5: a compliance-critical fact is never left
// to the model's own instruction-following. A skill extends that from facts
// to WORK. The first time a kind of output is produced, the producing is
// model-work (the holonic loop); what the run learned is then deposited as a
// SKILL — executable code with declared slots — and from then on the model's
// job shrinks to filling the slots the task's own words do not already fill.
// The dispatch ladder, in order of how little the model does:
//
//   1. SKILL     — a saved procedure claims the task mechanically (anchors),
//                  its slots fill from the task's own words. Zero model calls.
//   2. SLOT-FILL — the skill claims, but some slot is undetermined by the
//                  task. ONE grammar-constrained call fills exactly the
//                  missing slots (P2: structure by grammar, never by
//                  instruction), and every filled value is validated
//                  mechanically before anything runs.
//   3. MODEL     — no skill claims. The task runs the way it always did
//                  (holon.js), and its result may be deposited as a new
//                  skill for next time — through the gate, never around it.
//
// Descent from one rung to the next is a typed `open` entry, never silent.
//
// What a skill is NOT: an instruction sheet for the model. The body is code;
// the model never sees it, never edits it in place, and never executes it.
// The model touches a skill at exactly two seams: filling declared slots
// (validated), and authoring a CANDIDATE (gated — see admitSkill in the
// runner: a candidate without its own passing check is refused, because a
// skill without its test is a wish — P10).
//
// The library is an append-only log in the plan-log discipline (P3): admit /
// supersede / retract / invoke / refuse, ordered by seq, no clock; the live
// library is a fold over the log; a refused candidate STAYS on the log,
// because "this was tried and refused" is itself evidence. Identity is the
// digest of the mechanism (name, slots, needs, anchors, body, check) —
// provenance rides the log entry, not the identity, so the same procedure
// deposited twice is the same skill.

import { foldDiacritics, tokenize } from "./source.js";

// ── the skill shape ──────────────────────────────────────────────────────────

export const SLOT_TYPES = Object.freeze(["string", "number", "boolean", "json"]);

/** Budgets, each with a name and a duty (P9). */
export const SLOT_MAX_TOKENS = 300;     // a slot fill is a short object; longer is the model talking
export const SKILL_STACK_BUDGET = 4;    // nested skills.call depth — runaway backstop, not a design size

/**
 * Tokens the sandbox does not grant, refused at admission by mechanical scan.
 * The scan plus the empty vm context is an authority wall by construction —
 * a skill has exactly the organs it declared and was granted, nothing
 * ambient. It is not claimed as a security boundary against a determined
 * adversary; P1 (local only, the user's own machine) is the outer wall, and
 * this list is the inner one, declared so a refusal can name its token.
 */
export const FORBIDDEN_BODY_TOKENS = Object.freeze([
  "require", "import", "process", "globalThis", "global",
  "fetch", "XMLHttpRequest", "WebSocket", "Worker",
  "eval", "Function", "constructor", "__proto__",
]);

/** Every way a candidate's shape can be wrong, as typed defects — not a boolean. */
export function checkSkillShape(skill) {
  const defects = [];
  if (!skill || typeof skill !== "object") return ["candidate is not an object"];
  if (typeof skill.name !== "string" || !skill.name.trim()) defects.push("skill has no name");
  if (typeof skill.description !== "string" || !skill.description.trim())
    defects.push("skill has no description");
  if (!Array.isArray(skill.anchors) || !skill.anchors.length || skill.anchors.some((a) => typeof a !== "string" || !a.trim()))
    defects.push("skill declares no anchors — a skill with no anchors would claim every task");
  if (!Array.isArray(skill.needs) || skill.needs.some((n) => typeof n !== "string" || !n.trim()))
    defects.push("needs must be a list of organ names (empty is allowed; ambient is not)");
  if (!Array.isArray(skill.slots)) defects.push("slots must be a list");
  else {
    const seen = new Set();
    for (const slot of skill.slots) {
      if (!slot || typeof slot.name !== "string" || !slot.name.trim()) { defects.push("a slot has no name"); continue; }
      if (seen.has(slot.name)) defects.push(`slot named twice: ${slot.name}`);
      seen.add(slot.name);
      if (!SLOT_TYPES.includes(slot.type)) defects.push(`slot ${slot.name} has unknown type ${JSON.stringify(slot.type)}`);
      if (slot.pattern != null) {
        try { new RegExp(slot.pattern); } catch { defects.push(`slot ${slot.name} declares an unparseable pattern`); }
      }
      if (slot.oneOf != null && (!Array.isArray(slot.oneOf) || !slot.oneOf.length))
        defects.push(`slot ${slot.name} declares an empty oneOf`);
    }
  }
  if (typeof skill.body !== "string" || !skill.body.trim()) defects.push("skill has no body");
  // P10, made mechanical: the check is the admission test. No check, no skill.
  if (typeof skill.check !== "string" || !skill.check.trim())
    defects.push("skill carries no check — a skill without its test is a wish, and a wish is not admitted");
  return defects;
}

/** Forbidden tokens actually present in a source string, so a refusal can name them. */
export function scanBody(source) {
  const s = String(source ?? "");
  return FORBIDDEN_BODY_TOKENS.filter((t) => new RegExp(`\\b${t}\\b`).test(s));
}

// ── identity ─────────────────────────────────────────────────────────────────

/** Canonical rendering, key order included — same duty as holon.js's canon. */
function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** The mechanism, canonically — provenance deliberately excluded: identity is what a skill DOES. */
export function canonSkill(skill) {
  const { name, description, anchors, slots, needs, body, check } = skill;
  return canon({ anchors, body, check, description, name, needs, slots });
}

/** Content address of the mechanism. Async because the digest is Web Crypto (browser and Node alike). */
export async function skillDigest(skill) {
  const bytes = new TextEncoder().encode(canonSkill(skill));
  const buf = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── the library log ──────────────────────────────────────────────────────────
//
// The plan-log discipline (P3), applied to the library: entries are appended,
// never mutated; supersession keeps the past; the live library is a fold.

export const SKILL_ENTRY_KINDS = Object.freeze({
  ADMIT: "admit",         // a skill enters the library (through the gate)
  SUPERSEDE: "supersede", // a skill replaces another; the prior entry remains
  RETRACT: "retract",     // a skill is withdrawn (it stays in the log)
  INVOKE: "invoke",       // a skill ran, with its declared slots and what it touched
  REFUSE: "refuse",       // a candidate or a run was refused, with its typed reason
});

export function createSkillLog() {
  return Object.freeze({ entries: Object.freeze([]), nextSeq: 0 });
}

export function appendSkill(log, entry) {
  if (!entry || typeof entry !== "object") throw new TypeError("appendSkill requires an entry object");
  if (!Object.values(SKILL_ENTRY_KINDS).includes(entry.kind))
    throw new TypeError(`appendSkill: unknown entry kind ${JSON.stringify(entry.kind)}`);
  if (typeof entry.name !== "string" || !entry.name)
    throw new TypeError("appendSkill: every entry names its skill");
  const sealed = Object.freeze({ ...entry, seq: log.nextSeq });
  return Object.freeze({ entries: Object.freeze([...log.entries, sealed]), nextSeq: log.nextSeq + 1 });
}

/**
 * Fold the log into the live library: admitted skills, minus superseded and
 * retracted, each carrying its digest and how often it has run. Nothing is
 * deleted from `log.entries`; a library rebuilt from entries alone is the
 * same library (the resumption property the plan log already proved).
 */
export function projectLibrary(log) {
  const byDigest = new Map();
  const dropped = new Set();
  for (const e of log.entries) {
    if (e.kind === SKILL_ENTRY_KINDS.ADMIT && e.skill && e.digest) {
      if (e.supersedes) dropped.add(e.supersedes);
      byDigest.set(e.digest, {
        skill: e.skill,
        digest: e.digest,
        provenance: e.provenance ?? null,
        first_seq: e.seq,
        invocations: byDigest.get(e.digest)?.invocations ?? 0,
      });
    } else if (e.kind === SKILL_ENTRY_KINDS.SUPERSEDE && e.digest) {
      dropped.add(e.digest);
    } else if (e.kind === SKILL_ENTRY_KINDS.RETRACT && e.digest) {
      dropped.add(e.digest);
    } else if (e.kind === SKILL_ENTRY_KINDS.INVOKE && e.digest && byDigest.has(e.digest)) {
      byDigest.get(e.digest).invocations += 1;
    }
  }
  return [...byDigest.values()].filter((s) => !dropped.has(s.digest)).sort((a, b) => a.first_seq - b.first_seq);
}

// ── claiming: which skill answers this task, decided mechanically ────────────
//
// P4's spirit, applied to dispatch: never a model call deciding, never a
// similarity score tuned until it feels right. A skill declares ANCHORS —
// terms that must ALL appear in the task's own words (through the shared
// fold, P11) for the skill to claim it. More anchors satisfied-in-full means
// more specific, and the more specific skill wins; an exact tie is refused
// as ambiguous, typed, never guessed.

export function claimSkill(library, task) {
  const toks = new Set(tokenize(String(task ?? "")));
  const claims = library.filter((s) =>
    s.skill.anchors.length &&
    s.skill.anchors.every((a) => tokenize(a).every((t) => toks.has(t))),
  );
  if (!claims.length) return { skill: null, digest: null };
  const most = Math.max(...claims.map((c) => c.skill.anchors.length));
  const top = claims.filter((c) => c.skill.anchors.length === most);
  if (top.length > 1)
    return {
      skill: null,
      digest: null,
      ambiguous: top.map((c) => c.skill.name),
      reason: `skills claimed this task in equal measure: ${top.map((c) => c.skill.name).join(", ")} — refused as ambiguous`,
    };
  return { skill: top[0].skill, digest: top[0].digest };
}

// ── slot filling: the task's own words first, the model only for the rest ────

function coerceSlot(value, type) {
  if (type === "number") { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }
  if (type === "json") {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
  }
  return typeof value === "string" ? value : String(value ?? "");
}

/**
 * Fill what the task's own words determine UNAMBIGUOUSLY, and nothing more.
 * A slot with a declared pattern fills from its first match; a slot with a
 * declared oneOf fills when exactly one member appears; a number slot fills
 * when the task contains exactly one number. Ambiguity is left for the
 * constrained call — mechanical filling never guesses between candidates.
 */
export function mechanicalSlotFill(skill, task) {
  const folded = foldDiacritics(String(task ?? ""));
  const toks = new Set(tokenize(String(task ?? "")));
  const values = {};
  const basis = {};
  for (const slot of skill.slots) {
    if (slot.pattern != null) {
      const m = new RegExp(slot.pattern, "i").exec(folded);
      if (m) {
        const v = coerceSlot(m[1] ?? m[0], slot.type);
        if (v !== undefined) { values[slot.name] = v; basis[slot.name] = "task"; }
      }
      continue;
    }
    if (slot.oneOf?.length) {
      const hits = slot.oneOf.filter((v) => tokenize(String(v)).every((t) => toks.has(t)));
      if (hits.length === 1) { values[slot.name] = hits[0]; basis[slot.name] = "task"; }
      continue;
    }
    if (slot.type === "number") {
      const nums = [...folded.matchAll(/-?\d+(?:\.\d+)?/g)].map((m2) => Number(m2[0]));
      if (nums.length === 1) { values[slot.name] = nums[0]; basis[slot.name] = "task"; }
    }
    // A free string slot is never filled mechanically: there is no unambiguous
    // mechanical reading of "which words are the value."
  }
  return { values, basis };
}

/** Typed defects in a filled slot table — run before ANY execution, whatever filled it. */
export function validateSlots(skill, values) {
  const defects = [];
  for (const slot of skill.slots) {
    const present = slot.name in values && values[slot.name] !== undefined;
    if (!present) {
      if (slot.required !== false) defects.push(`required slot unfilled: ${slot.name}`);
      continue;
    }
    const v = values[slot.name];
    if (slot.type === "number" && !(typeof v === "number" && Number.isFinite(v)))
      defects.push(`slot ${slot.name} is not a number`);
    if (slot.type === "boolean" && typeof v !== "boolean") defects.push(`slot ${slot.name} is not a boolean`);
    if (slot.type === "string" && (typeof v !== "string" || !v.trim())) defects.push(`slot ${slot.name} is not a usable string`);
    if (slot.oneOf?.length && !slot.oneOf.includes(v))
      defects.push(`slot ${slot.name} is outside its declared values`);
    if (slot.pattern != null && slot.type === "string" && !new RegExp(slot.pattern, "i").test(foldDiacritics(v)))
      defects.push(`slot ${slot.name} does not match its declared pattern`);
  }
  return defects;
}

/** JSON schema over the given slots — grammar for the constrained fill call (P2). */
export function slotSchema(skill, slots = skill.slots) {
  const properties = {};
  for (const s of slots) {
    properties[s.name] = {
      ...(s.type === "json" ? {} : { type: s.type === "number" ? "number" : s.type }),
      ...(s.description ? { description: s.description } : {}),
      ...(s.oneOf?.length ? { enum: s.oneOf } : {}),
    };
  }
  return {
    type: "object",
    properties,
    required: slots.filter((s) => s.required !== false).map((s) => s.name),
  };
}

export const SLOT_SYSTEM_PROMPT =
  "You fill named slots for a procedure from the task's own words. A slot the task does not determine is omitted, never guessed.";

export function buildSlotPrompt(skill, missing, task) {
  return (
    `A procedure named "${skill.name}" (${skill.description}) needs these slots filled from the task below.\n` +
    missing.map((s) => `- ${s.name} (${s.type})${s.description ? `: ${s.description}` : ""}`).join("\n") +
    `\n\nTask: ${task}\n\nThe keys are exactly the slot names. Omit any slot the task does not determine.`
  );
}

/** First balanced JSON object in a reply — the object twin of holon.js's extractArray. */
export function extractObject(text) {
  const s = String(text ?? "");
  for (let start = s.indexOf("{"); start !== -1; start = s.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        if (ch === "\\") i++;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        try {
          const parsed = JSON.parse(s.slice(start, i + 1));
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        } catch {
          // this brace was not the object — keep scanning
        }
        break;
      }
    }
  }
  return null;
}

/**
 * The whole fill: mechanical first, then ONE constrained call for exactly the
 * slots still missing, then validation over everything regardless of what
 * filled it (P2: nothing downstream reads model output without a mechanical
 * check). The result says which basis filled each slot — "task" or "model" —
 * because a model-filled slot is a disclosed authority, like P7's steering.
 */
export async function fillSlots(skill, task, { call = null } = {}) {
  const { values, basis } = mechanicalSlotFill(skill, task);
  const open = [];
  const missing = () => skill.slots.filter((s) => s.required !== false && !(s.name in values));

  if (missing().length && call) {
    const wanted = missing();
    let raw = "";
    try {
      raw = await call(
        [
          { role: "system", content: SLOT_SYSTEM_PROMPT },
          { role: "user", content: buildSlotPrompt(skill, wanted, task) },
        ],
        { effort: "low", maxTokens: SLOT_MAX_TOKENS, json: slotSchema(skill, wanted) },
      );
    } catch {
      raw = "";
    }
    const obj = extractObject(raw) ?? {};
    for (const slot of wanted) {
      if (!(slot.name in obj)) continue;
      const v = coerceSlot(obj[slot.name], slot.type);
      if (v !== undefined) { values[slot.name] = v; basis[slot.name] = "model"; }
    }
  }

  const defects = validateSlots(skill, values);
  for (const d of defects) open.push(`skill ${skill.name}: ${d}`);
  return { ok: !defects.length, values, basis, open };
}

// ── dispatch: the ladder, descending visibly ─────────────────────────────────

/**
 * Run a task with as little model as possible. `execute(skill, values)` is
 * the runner's capability-injected executor; `runModel(task)` is whatever
 * the caller already does without skills (holon.js's path); `call` is the
 * model function used ONLY for slot filling. Every descent down the ladder
 * lands in `open`, typed — a task that fell through to the model says which
 * skill claimed it and why it could not run.
 */
export async function runSkilledTask({ task, library, execute, call = null, runModel = null }) {
  const open = [];
  const claim = claimSkill(library, task);

  if (claim.skill) {
    const filled = await fillSlots(claim.skill, task, { call });
    if (filled.ok) {
      const ran = await execute(claim.skill, filled.values);
      if (!ran.refused) {
        return {
          basis: "skill",
          skill: { name: claim.skill.name, digest: claim.digest },
          slots: { values: filled.values, basis: filled.basis },
          value: ran.value,
          refs: ran.refs ?? [],
          stacked: ran.stacked ?? [],
          open: [...open, ...filled.open],
        };
      }
      open.push(`skill ${claim.skill.name} refused to run: ${ran.refused}`);
    } else {
      open.push(...filled.open);
    }
  } else if (claim.ambiguous) {
    open.push(claim.reason);
  }

  if (!runModel) return { basis: "none", value: null, refs: [], open: [...open, "no skill ran and no model path was offered"] };
  const modelled = await runModel(task);
  return { ...modelled, basis: modelled?.basis ?? "model", open: [...open, ...(modelled?.open ?? [])] };
}

// ── acquisition: the model authors a CANDIDATE; the gate decides ─────────────
//
// This is where "make me a website that looks like X" becomes reusable: the
// first run does the work the long way, and the model is then asked — once,
// grammar-constrained — to deposit the procedure as code with declared slots
// and its own check. parseSkillCandidate extracts mechanically; admitSkill
// (runner) refuses anything whose check does not pass in the sandbox. The
// model proposes; the gate disposes.

export const SKILL_AUTHOR_SYSTEM_PROMPT =
  "You turn a completed procedure into a reusable program. The body and check are JavaScript async function expressions; they may use only the organs they declare in needs, received as their second argument.";

export function buildSkillAuthorPrompt(task, organCatalog = []) {
  return (
    `A task was just completed: ${task}\n\n` +
    `Write it as a reusable skill. The JSON object has:\n` +
    `- "name": a short kebab-case name\n` +
    `- "description": one sentence\n` +
    `- "anchors": the few words a task must contain for this skill to apply\n` +
    `- "slots": the parameters that vary between uses, each {"name","type","description","required"} with type one of ${SLOT_TYPES.join("/")}\n` +
    `- "needs": which of these organs the body uses: ${organCatalog.join(", ") || "(none offered)"}\n` +
    `- "body": source of an async function (slots, organs, skills) => result\n` +
    `- "check": source of an async function (run, organs, assert) => that calls run({...example slots}) and asserts on the result\n` +
    `The body must not reference anything except its arguments. The check must fail if the body stops doing its job.`
  );
}

export const SKILL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    slots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: [...SLOT_TYPES] },
          description: { type: "string" },
          required: { type: "boolean" },
        },
        required: ["name", "type"],
      },
    },
    needs: { type: "array", items: { type: "string" } },
    body: { type: "string" },
    check: { type: "string" },
  },
  required: ["name", "description", "anchors", "slots", "needs", "body", "check"],
};

/** Mechanical extraction of a candidate from whatever text arrived. Null, never a throw. */
export function parseSkillCandidate(raw) {
  const obj = extractObject(raw);
  if (!obj) return null;
  return {
    name: String(obj.name ?? "").trim(),
    description: String(obj.description ?? "").trim(),
    anchors: Array.isArray(obj.anchors) ? obj.anchors.map((a) => String(a).trim()).filter(Boolean) : [],
    slots: Array.isArray(obj.slots) ? obj.slots : [],
    needs: Array.isArray(obj.needs) ? obj.needs.map((n) => String(n).trim()).filter(Boolean) : [],
    body: String(obj.body ?? ""),
    check: String(obj.check ?? ""),
  };
}
