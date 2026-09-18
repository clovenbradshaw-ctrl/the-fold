// swarm.js — ants / eoSwarms as sub-agents inside one chat.
//
// An ANT is one background sub-agent: a small scoped task that runs WITHOUT
// blocking the composer's main turn. An EOSWARM is a named group of ants
// fanned out from one goal, whose findings fold back into one summary.
//
// This module is PURE and browser-safe (no fetch, no DOM, no model): it
// parses the typed doors, builds the records, and detects model-proposed
// ants in answer text. EXECUTION lives in app.js (reading ants through
// runHolonicTask, coding ants through term.js runSandboxed) — the same
// split web.js/github.js already hold between shape and crossing, so this
// file stays node-testable and constitution-test clean (II.13: no egress).
//
// Consent posture (P13/P24 shape): NOTHING here spawns work by itself. A
// typed /ant or /swarm door is the person's own explicit act; a model
// proposal ([[ant: ...]]) is rendered by app.js as a one-click approval
// button, never auto-run — the same "explicit trigger only" rule /act
// and /run already hold.
//
// Kinds: "ask" (a grounded reading subtask — the default) and "code" (a
// sandboxed runtime run: python | js | sql | ruby | php — r stays
// terminal-only per P26 and is refused here too). The kind is declared
// with a `code:` / `ask:` prefix, never guessed from prose.

export const ANT_KINDS = ["ask", "code"];
export const SWARM_MAX_ANTS = 8;
export const SWARM_MIN_ANTS = 2;
export const ANT_TASK_MAX_CHARS = 2000;

// Model-proposed ants: the ONLY syntax the model may emit that app.js will
// ever offer as a sendable ant. Deliberately loud ([[ant: ...]]) so it can
// never hide inside prose, and always requiring one click.
export const ANT_PROPOSAL_RE = /\[\[ant(?:\s+(code|ask))?\s*:\s*([\s\S]*?)\]\]/gi;

export function normalizeKind(raw) {
  const k = String(raw ?? "").trim().toLowerCase();
  if (!k) return "ask";
  if (k === "ask" || k === "read" || k === "reading" || k === "question") return "ask";
  if (k === "code" || k === "coding" || k === "run") return "code";
  return null;
}

/** Parse `/ant [kind:] <task>`. Returns {kind, task} | {usage:true} | null. */
export function parseAntCommand(text) {
  const m = /^\/ant\b\s*([\s\S]*)$/.exec(String(text ?? ""));
  if (!m) return null;
  const rest = (m[1] ?? "").trim();
  if (!rest) return { usage: true };
  const kindM = /^(ask|read|reading|question|code|coding|run)\s*:\s*([\s\S]+)$/i.exec(rest);
  if (kindM) {
    const kind = normalizeKind(kindM[1]);
    const task = kindM[2].trim();
    if (!kind || !task) return { usage: true };
    return { kind, task: task.slice(0, ANT_TASK_MAX_CHARS) };
  }
  return { kind: "ask", task: rest.slice(0, ANT_TASK_MAX_CHARS) };
}

/** Parse `/swarm <n> [kind:] <goal>`. Returns {n, kind, goal} | {usage:true} | null. */
export function parseSwarmCommand(text) {
  const m = /^\/swarm\b\s*([\s\S]*)$/.exec(String(text ?? ""));
  if (!m) return null;
  const rest = (m[1] ?? "").trim();
  if (!rest) return { usage: true };
  const nM = /^(\d+)\s+([\s\S]+)$/.exec(rest);
  if (!nM) return { usage: true };
  const n = Number(nM[1]);
  if (!Number.isFinite(n) || n < SWARM_MIN_ANTS || n > SWARM_MAX_ANTS) return { usage: true, badCount: true, n };
  const goalRest = nM[2].trim();
  if (!goalRest) return { usage: true };
  const kindM = /^(ask|read|reading|question|code|coding|run)\s*:\s*([\s\S]+)$/i.exec(goalRest);
  if (kindM) {
    const kind = normalizeKind(kindM[1]);
    const goal = kindM[2].trim();
    if (!kind || !goal) return { usage: true };
    return { n, kind, goal: goal.slice(0, ANT_TASK_MAX_CHARS) };
  }
  return { n, kind: "ask", goal: goalRest.slice(0, ANT_TASK_MAX_CHARS) };
}

/** True for the bare `/ants` list door (with optional `all`). */
export function parseAntsCommand(text) {
  const m = /^\/ants\b\s*(\S*)\s*$/.exec(String(text ?? ""));
  if (!m) return null;
  return { all: /^(all|\+)$/i.test(m[1] ?? "") };
}

/** Scan model answer text for [[ant ...]] proposals. Never executes. */
export function detectAntProposals(text) {
  const out = [];
  const src = String(text ?? "");
  ANT_PROPOSAL_RE.lastIndex = 0;
  let m;
  while ((m = ANT_PROPOSAL_RE.exec(src)) !== null) {
    const kind = normalizeKind(m[1] ?? "") ?? "ask";
    const task = (m[2] ?? "").trim().slice(0, ANT_TASK_MAX_CHARS);
    if (!task) continue;
    out.push({ kind, task, index: m.index });
    if (out.length >= SWARM_MAX_ANTS) break;
  }
  ANT_PROPOSAL_RE.lastIndex = 0;
  return out;
}

let _antSeq = 0;
let _swarmSeq = 0;

/** One ant record. Status: queued | running | done | failed. */
export function makeAnt({ kind = "ask", task, parent = null, swarmId = null, context = null }) {
  _antSeq += 1;
  return {
    schema: "EOAnt@1",
    id: `ant-${Date.now().toString(36)}-${_antSeq}`,
    kind,
    task: String(task ?? "").slice(0, ANT_TASK_MAX_CHARS),
    parent, // conversation key that spawned it — findings read back here
    swarmId,
    // Extra prompt context the spawner vouches for (e.g. other
    // conversations' recent turns for a cross-conversation ant) — carried
    // verbatim into the ant's material, never silently merged into the task.
    context: context ? String(context).slice(0, 3000) : null,
    status: "queued",
    findings: "",
    detail: null, // {rounds, files} for code ants; {passages} count for ask ants
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** One swarm record: the goal plus the fan-out tasks (filled at spawn). */
export function makeSwarm({ goal, kind = "ask", n, parent = null }) {
  _swarmSeq += 1;
  return {
    schema: "EOSwarm@1",
    id: `swarm-${Date.now().toString(36)}-${_swarmSeq}`,
    goal: String(goal ?? "").slice(0, ANT_TASK_MAX_CHARS),
    kind,
    n,
    parent,
    antIds: [],
    status: "running",
    summary: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Fan a swarm goal out into n ant tasks. Mechanical (numbered lenses),
 * never a model call — the model-decomposed variant is app.js's own
 * follow-up, not this pure layer. */
export function fanOutSwarm(swarm) {
  const tasks = [];
  for (let i = 0; i < swarm.n; i++) {
    tasks.push(
      swarm.kind === "code"
        ? `Part ${i + 1} of ${swarm.n} — ${swarm.goal} (work ONLY this part; report what you built and what remains)`
        : `Lens ${i + 1} of ${swarm.n} on: ${swarm.goal} (read ONLY through this lens; report findings with addresses, never the whole answer)`
    );
  }
  return tasks;
}

export function markAntRunning(ant) {
  return { ...ant, status: "running", updatedAt: Date.now() };
}

export function markAntDone(ant, findings, detail = null) {
  return { ...ant, status: "done", findings: String(findings ?? ""), detail, updatedAt: Date.now() };
}

export function markAntFailed(ant, error) {
  return { ...ant, status: "failed", findings: String(error ?? "failed"), updatedAt: Date.now() };
}

/** Fold a swarm's ants into one status + summary. Pure read, never writes. */
export function foldSwarm(swarm, ants) {
  const mine = ants.filter((a) => a.swarmId === swarm.id);
  const done = mine.filter((a) => a.status === "done").length;
  const failed = mine.filter((a) => a.status === "failed").length;
  const running = mine.length - done - failed;
  const status = mine.length > 0 && done + failed === mine.length
    ? (failed === mine.length ? "failed" : "done")
    : "running";
  const summary = mine.map((a) => `— ${a.kind} ${a.id}: ${a.status}${a.status === "done" && a.findings ? ` — ${a.findings.slice(0, 280)}` : ""}`).join("\n");
  return { ...swarm, status, summary, updatedAt: Date.now(), counts: { total: mine.length, done, failed, running } };
}

export function antUsage() {
  return "/ant [ask:|code:] <task> — sends one background ant: a reading subtask (default) or a sandboxed code run. The chat stays free while it works; click its card to check in. /swarm <n> <goal> fans out a whole eoSwarm. /ants lists them.";
}

// ── Auto-suggest ──────────────────────────────────────────────────────────
// suggestNext is PURE and mechanical: it reads a finished turn's own
// already-computed outputs (open claims, open voids, unbacked findings)
// and proposes at most SUGGEST_MAX next steps — ants, a swarm, or an
// existing door. It spends nothing, runs no model, and proposes NOTHING
// on a clean turn (a turn with nothing open suggests nothing — a
// suggestion with no reason is nagging, not help).
//
// Consent: a suggestion is never executed by this module. app.js renders
// each one as a one-click chip — an ant/swarm chip's click IS the
// explicit send (the same standing as a [[ant:]] approval button), a
// door chip only fills the composer for review, never auto-sends.

export const SUGGEST_MAX = 3;
export const SWARM_SUGGEST_FLOOR = 3; // this many open claims earns a swarm, fewer earn single ants

const OPEN_VERDICTS = new Set(["unbound", "beyond-reach", "unheard", "contradicted", "unsupported", "open"]);
const FOUGHT_VERDICTS = new Set(["contradicted", "contested", "disputed"]);

// Declared, never tuned: what counts as a quantitative question for the
// measure chip, and what counts as a long answer over rich material for
// the piece chip. Pinned in tests; move only with a reason, not a specimen.
export const QUANT_RE = /\d|how many|how much|average|total|count|per year|per month|rate of/i;
export const ESSAY_SUGGEST_CHARS = 1200;
export const ESSAY_SUGGEST_PASSAGES = 5;
export const HOW_IT_WORKS_RE = /how (do|does|can) you\b|how does (this|the fold|it) work|what can you do/i;
export const TABULAR_RE = /\.(csv|tsv|tab)$/i;
// A witness address is `<source>~<recipe>` (P68 identity). Index-class
// sources — never primaries — match this; a `primary:` witness never does.
export const INDEX_WITNESS_RE = /wikipedia|\.look\.txt|search-results|duckduckgo/i;

export function claimText(c) {
  if (!c || typeof c !== "object") return String(c ?? "").slice(0, 160);
  const t = c.text ?? c.sentence ?? c.claim ??
    [c.subject ?? c.end1, c.verb ?? c.label, c.object ?? c.end2].filter(Boolean).join(" ");
  return String(t ?? "").trim().slice(0, 160);
}

export function isOpenClaim(c) {
  if (!c || typeof c !== "object") return false;
  const v = String(c.verdict ?? c.standing ?? c.status ?? "").toLowerCase();
  return OPEN_VERDICTS.has(v);
}

/** A claim the material fought back on — contradicted or contested. The
 *  strongest suggestion signal: something is genuinely disputed. */
export function isFoughtClaim(c) {
  if (!c || typeof c !== "object") return false;
  const v = String(c.verdict ?? c.standing ?? c.status ?? "").toLowerCase();
  return FOUGHT_VERDICTS.has(v);
}

/** Notes standing on index-class witnesses alone (Wikipedia, a look
 *  capture, a search digest) with no primary witness anywhere. Each
 *  returned note carries its witness count for the reason line. */
export function wikiOnlyNotes(notes) {
  const out = [];
  for (const n of Array.isArray(notes) ? notes : []) {
    const w = Array.isArray(n?.witnesses) ? n.witnesses.map(String) : [];
    if (!w.length) continue;
    if (w.some((s) => s.startsWith("primary:"))) continue;
    if (!w.every((s) => INDEX_WITNESS_RE.test(s))) continue;
    out.push(n);
  }
  return out;
}

/** An open void phrased as the plain question it is, for composer review.
 *  Singular asks "what is", plural asks "what are", unknown asks bare —
 *  the person edits before sending, so the grammar only has to be close. */
export function questionForVoid({ anchor, slot, grammaticalNumber } = {}) {
  const s = String(slot ?? "").trim();
  const a = String(anchor ?? "").trim();
  if (!s) return null;
  const of = a ? ` of ${a}` : "";
  if (grammaticalNumber === "plural") return `What are the ${s}${of}?`;
  if (grammaticalNumber === "singular") return `What is the ${s}${of}?`;
  return `${s}${of}?`;
}

/**
 * suggestNext({ task, claims, voidsOpen, unbacked, planParts, ... }) →
 * [{ shape: "ant"|"swarm"|"door"|"attach", ... }].
 *
 * Shapes: "ant" {kind, task, context?} sends on click; "swarm"
 * {kind, n, task} fans out on click; "door" {door} fills the composer
 * for review, never auto-sends; "attach" {name, texts} attaches fetched
 * page texts as a source on click (the click is the explicit act).
 *
 * Inputs are all turn-level facts the caller already computed:
 * claims (relation claims, verdict-read), disputesCount (contested
 * merges), notes (ledger notes with witnesses), declarationsGiven
 * (the declarations register's GIVEN tier), boundCount, outputChars,
 * livePassages, buildThisTurnN (a fold published this turn), tabularFile
 * (attached table file, or null), voidAsk {anchor, slot,
 * grammaticalNumber}, handbookAsk (bool), workspaceOtherConvos (count),
 * fetchedPages [{name, texts}].
 *
 * Priority is signal strength — fought claims first, housekeeping last —
 * capped at SUGGEST_MAX. A clean turn suggests nothing.
 */
export function suggestNext({ task = "", claims = [], voidsOpen = 0, unbacked = 0, planParts = 0, disputesCount = 0, notes = [], declarationsGiven = 0, boundCount = 0, outputChars = 0, livePassages = 0, buildThisTurnN = null, tabularFile = null, voidAsk = null, handbookAsk = false, workspaceOtherConvos = 0, fetchedPages = [] } = {}) {
  const out = [];
  const list = Array.isArray(claims) ? claims : [];
  const open = list.filter(isOpenClaim);
  const fought = list.filter(isFoughtClaim);
  const q = String(task ?? "").trim().slice(0, 200);

  // Something the material fought back on: a hostile re-read, not a retry.
  for (const c of fought.slice(0, 1)) {
    const t = claimText(c);
    if (!t) break;
    out.push({
      shape: "ant", kind: "ask",
      task: `Try to break this sentence — read only the material, report contradiction or confirm, never smooth it over: "${t}" (from: ${q})`,
      reason: `the material disputes: ${t.slice(0, 80)}`,
    });
  }

  // Many open claims: one swarm with a lens per claim, not N loose ants.
  if (open.length >= SWARM_SUGGEST_FLOOR) {
    const n = Math.max(SWARM_MIN_ANTS, Math.min(SWARM_MAX_ANTS, open.length));
    out.push({
      shape: "swarm", kind: "ask", n,
      task: `${q} — one lens per open claim (${open.length} open)`,
      reason: `${open.length} claims left open this turn`,
    });
  } else {
    // A few open claims: one ant each, named after the claim itself.
    for (const c of open.slice(0, 2)) {
      const t = claimText(c);
      if (!t) continue;
      out.push({
        shape: "ant", kind: "ask",
        task: `Settle this open claim from "${q}": ${t}`,
        reason: `open claim: ${t.slice(0, 80)}`,
      });
    }
  }

  // Unbacked findings the turn counted but never placed: corroboration's door.
  if (unbacked > 0 && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: "/corroborate 6",
      reason: `${unbacked} unbacked finding${unbacked === 1 ? "" : "s"} this turn (budget reviewable before sending)`,
    });
  }

  // Voids still open: the void door, to name or concede them.
  if (voidsOpen > 0 && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: "/void",
      reason: `${voidsOpen} void${voidsOpen === 1 ? "" : "s"} still open on the record`,
    });
  }

  // A decomposed turn that still left things open earns the swarm even
  // below the floor — parts already exist, so fanning out is cheap.
  if (planParts >= 3 && open.length > 0 && open.length < SWARM_SUGGEST_FLOOR && out.length < SUGGEST_MAX) {
    out.push({
      shape: "swarm", kind: "ask", n: Math.max(SWARM_MIN_ANTS, Math.min(SWARM_MAX_ANTS, open.length)),
      task: `${q} — settle the ${open.length} open claim${open.length === 1 ? "" : "s"} left by its ${planParts} parts`,
      reason: `a ${planParts}-part turn with open claims remaining`,
    });
  }

  // Contested merges: see the free answer beside the grammar-held one.
  if (disputesCount > 0 && out.length < SUGGEST_MAX && q) {
    out.push({
      shape: "door", door: `/bound ${q}`,
      reason: `${disputesCount} disputed claim${disputesCount === 1 ? "" : "s"} — compare free vs bound`,
    });
  }

  // Notes standing on indexes alone: chase them to primaries.
  const wikiOnly = wikiOnlyNotes(notes);
  if (wikiOnly.length > 0 && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: "/ranke 6 0",
      reason: `${wikiOnly.length} note${wikiOnly.length === 1 ? "" : "s"} standing on an index alone — chase to a primary`,
    });
  }

  // Declared chemistry plus settled facts: derive what follows.
  if (declarationsGiven > 0 && boundCount > 0 && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: "/derive",
      reason: `${declarationsGiven} declared relation${declarationsGiven === 1 ? "" : "s"} over ${boundCount} settled claim${boundCount === 1 ? "" : "s"}`,
    });
  }

  // Pages fetched this turn but never attached: keep the best one.
  const pages = (Array.isArray(fetchedPages) ? fetchedPages : []).filter((p) => p && p.name && Array.isArray(p.texts) && p.texts.some((t) => String(t ?? "").trim()));
  if (pages.length > 0 && out.length < SUGGEST_MAX) {
    out.push({
      shape: "attach", name: pages[0].name, texts: pages[0].texts,
      reason: `read this turn from ${pages[0].name} — keep it as a source`,
    });
  }

  // Other conversations exist and claims are open: an ant that reads across.
  if (workspaceOtherConvos > 0 && open.length > 0 && out.length < SUGGEST_MAX) {
    out.push({
      shape: "ant", kind: "ask", crossConvo: true,
      task: `Check the workspace's other conversation${workspaceOtherConvos === 1 ? "" : "s"} for what settles this (context attached): ${open.slice(0, 2).map(claimText).filter(Boolean).join(" / ") || q}`,
      reason: `${workspaceOtherConvos} other conversation${workspaceOtherConvos === 1 ? "" : "s"} may hold the missing piece`,
    });
  }

  // A long answer over rich material: offer the piece door, prefilled.
  if (outputChars >= ESSAY_SUGGEST_CHARS && livePassages >= ESSAY_SUGGEST_PASSAGES && out.length < SUGGEST_MAX && q) {
    out.push({
      shape: "door", door: `/essay 3 ${q}`.slice(0, 300),
      reason: "a long answer over rich material — worth a composed piece",
    });
  }

  // A fold published this turn: offer tuning it, prefilled with its number.
  if (Number.isFinite(buildThisTurnN) && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: `/fold ${buildThisTurnN} `,
      reason: `fold ${buildThisTurnN} landed this turn — tune it in place`,
    });
  }

  // A table file attached and a quantitative question: measure it.
  if (tabularFile && QUANT_RE.test(q) && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: `/measure ${tabularFile}`,
      reason: `${tabularFile} is attached and the question asks for a number`,
    });
  }

  // A how-it-works question: the handbook chapter list, one keystroke away.
  if (handbookAsk && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: "/learn ",
      reason: "a question about the instrument — the handbook answers from theory",
    });
  }

  // An open void phrased as the plain question it is.
  const voidQ = questionForVoid(voidAsk ?? {});
  if (voidQ && out.length < SUGGEST_MAX) {
    out.push({
      shape: "door", door: voidQ,
      reason: "the void this turn left open, as a question",
    });
  }

  return out.slice(0, SUGGEST_MAX);
}
