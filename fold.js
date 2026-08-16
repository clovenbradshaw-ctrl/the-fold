// fold.js — The Fold, standing on its own.
//
// Ported from eochatX's app/client/eo-discourse.ts (which is itself a port of
// eochat/server/conversation-summary.js). Same algorithm, no framework, no
// build step, no imports: a plain ES module a browser loads directly.
//
// The claim this module exists to make true: a conversation's context window
// does not grow with the conversation. Each turn is folded to what it
// contributed, a running summary tracks how the discourse evolved, and only
// the summary plus a bounded number of ~100-char folds is ever resent. The raw
// transcript beyond a small recency window is never sent again.
//
// This module is pure. No IO, no model calls. The one model call the fold
// spends (the summary refresh) is executed by the caller and handed back in as
// a raw string, which is what keeps this testable in node and safe in a
// browser.

// ── Two folds, not one fold at two resolutions ───────────────────────────────
//
// System 1 is a ~100-character paraphrase of what a turn contributed, rolled
// into a running summary. It is associative and lossy on purpose: it is what a
// person actually retains from a conversation, the gist and not the
// transcript.
//
// Its limit is not that it is short. It is that a paraphrase has no address.
// "the report put the figure at 12%" and "the report put the figure at 21%"
// fold to the same line, and nothing in the prompt can tell them apart or get
// back to the source. Harmless for following a conversation, disqualifying as
// evidence.
//
// System 2 is the answer to that, and it is a different KIND of record rather
// than a longer one: it keeps the address. What the turn established, which
// channels carried it, the byte ranges the check actually ran against, what
// failed that check, what was left open. A System 2 fold can be re-opened; a
// System 1 fold can only be recalled.

export const SUMMARY_MAX_CHARS = 200;
export const ENTITIES_MAX = 8;
export const CONTEXT_MAX_CHARS = 150;
export const FLOW_MAX_CHARS = 200;
export const FOLD_MAX_CHARS = 100;
export const MAX_FOLDS_IN_PROMPT = 12;

export const RECORDS_IN_PROMPT = 8;
export const RECORD_REFS_MAX = 6;
export const RECORD_OPEN_MAX = 4;

/** Raw turns still sent verbatim. Everything older is only ever the fold. */
export const RECENCY_WINDOW = 4;

export function truncate(text, max) {
  const s = String(text ?? "").trim();
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

export function emptySummary() {
  return {
    topic: null,
    entities: [],
    context: null,
    language: null,
    turnCount: 0,
    flow: null,
    folds: [],
    records: [],
  };
}

// ── System 1: the running summary ────────────────────────────────────────────

/**
 * The fold line for a finished turn, built mechanically from the turn's own
 * text. Deliberately NOT a model call: a second background call per turn is
 * exactly the fragility this design is trying to avoid, and the summary
 * refresh downstream is what actually turns these lines into discourse.
 */
export function mechanicalFoldLine(question, answer) {
  return truncate(`Q: ${question} A: ${answer}`, FOLD_MAX_CHARS);
}

export function buildSummaryUpdatePrompt(prev, folds) {
  const prevBlock = prev.topic
    ? `PREV: ${prev.topic} | ${prev.flow || ""} | ${(prev.entities || []).join(",")} | ${prev.context || ""}`
    : "First turn.";

  const foldLines = folds.map((f, i) => `Turn ${i + 1}: ${f}`).join("\n");

  return `${prevBlock}

TURNS:
${foldLines}

Update the summary to include the latest turn. Track DISCOURSE FLOW — how the conversation evolved turn by turn, not message details. Every field stays short. Reply with a JSON object only (no markdown, no extra text), where:
- topic: one short phrase naming what the conversation is about now
- flow: one short sentence on how the thread evolved across all turns
- entities: only the people, organizations, or works actually named so far (max 8) — never turn labels, never prose
- context: what the reader must still know from earlier turns to follow along
- language: ISO 639-1 code of the dominant language
- turnCount: integer, now ${prev.turnCount + 1}

{"topic":"<what this conversation is about now>","flow":"<how the thread evolved>","entities":["<entity>","<entity>"],"context":"<what carries forward>","language":"<ISO code>","turnCount":${prev.turnCount + 1}}`;
}

export const FOLD_SYSTEM_PROMPT =
  "You track a running discourse summary for an ongoing conversation. Follow the user message's instructions exactly and reply with a JSON object only -- no prose, no code fences.";

/**
 * The refresh reply's shape, as grammar for a runtime that can enforce one
 * (Ollama structured outputs). The prompt above stays a request;
 * normalizeSummary still treats whatever arrives as untrusted — the schema
 * only makes the common case arrive well-formed instead of nearly-so.
 * turnCount is deliberately absent: it is counted mechanically and nothing
 * the model returns for it is read.
 */
export const FOLD_SCHEMA = {
  type: "object",
  properties: {
    topic: { type: "string" },
    flow: { type: "string" },
    entities: { type: "array", items: { type: "string" } },
    context: { type: "string" },
    language: { type: "string" },
  },
  required: ["topic", "flow", "entities", "context", "language"],
};

function parseSummaryResponse(response) {
  try {
    const jsonMatch = String(response).match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function normalizeSummary(parsed, prev, folds) {
  if (!parsed) return { ...prev, folds, turnCount: prev.turnCount + 1 };
  return {
    // The System 2 records are never rewritten by the summary-refresh model
    // call. A model that could edit the record could edit the evidence.
    records: prev.records ?? [],
    topic: truncate(
      typeof parsed.topic === "string" ? parsed.topic : prev.topic,
      SUMMARY_MAX_CHARS,
    ),
    flow: truncate(
      typeof parsed.flow === "string" ? parsed.flow : prev.flow,
      FLOW_MAX_CHARS,
    ),
    entities: Array.isArray(parsed.entities)
      ? parsed.entities.slice(0, ENTITIES_MAX).map((e) => String(e).slice(0, 40))
      : prev.entities,
    context: truncate(
      typeof parsed.context === "string" ? parsed.context : prev.context,
      CONTEXT_MAX_CHARS,
    ),
    language:
      typeof parsed.language === "string" ? parsed.language : prev.language,
    // Counted here, never read back from the response. The prompt states the
    // number and a model will still return a different one — observed on the
    // very first fold of a conversation, which came back as turn two. A count
    // is mechanical; nothing is gained by letting the summary call revise it,
    // and what is lost is that turnCount and the fold list stop agreeing.
    turnCount: prev.turnCount + 1,
    folds,
  };
}

/** Roll a new turn fold into the running summary. */
export function updateSummaryWithFold(prev, turnFold, rawResponse) {
  const prevSummary = prev || emptySummary();
  const folds = [...(prevSummary.folds || []), turnFold];
  const recentFolds = folds.slice(-MAX_FOLDS_IN_PROMPT);
  const parsed = rawResponse ? parseSummaryResponse(rawResponse) : null;
  return normalizeSummary(parsed, prevSummary, recentFolds);
}

/** Carry the summary forward unchanged, appending only the fold. */
export function advanceSummaryFold(prev, turnFold) {
  const prevSummary = prev || emptySummary();
  const folds = [...(prevSummary.folds || []), turnFold];
  return {
    ...prevSummary,
    folds: folds.slice(-MAX_FOLDS_IN_PROMPT),
    turnCount: prevSummary.turnCount + 1,
  };
}

// ── System 2: the addressed record ───────────────────────────────────────────

/**
 * Build the System 2 fold for a finished turn. Purely mechanical — every field
 * is read off work the turn already did, so a turn's record cannot disagree
 * with its own grounding check.
 */
export function buildWarrantRecord(input) {
  const clean = (list, max, chars) =>
    [...new Set((list || []).filter(Boolean).map((s) => truncate(s, chars)))]
      .slice(0, max);
  return {
    turn: input.turn,
    gist: truncate(input.gist, FOLD_MAX_CHARS),
    channels: [...new Set(input.channels || [])],
    refs: clean(input.refs, RECORD_REFS_MAX, 120),
    unsupported: clean(input.unsupported, RECORD_REFS_MAX, 80),
    open: clean(input.open, RECORD_OPEN_MAX, 140),
  };
}

export function addWarrantRecord(summary, record) {
  const prev = summary || emptySummary();
  return {
    ...prev,
    records: [...(prev.records ?? []), record].slice(-RECORDS_IN_PROMPT),
  };
}

// ── What actually goes in the prompt ─────────────────────────────────────────

export function buildSummarySystemMessage(summary) {
  if (!summary || !summary.topic) return null;
  const parts = [];
  parts.push(
    "PAST DISCOURSE — context from earlier turns ONLY. It is background for threads that started earlier, not the subject of the current turn. Answer the user's current question as a fresh request; use this only to follow along when it clearly refers to something already discussed.",
  );
  // Said here as well as in the record block, because this is the block a
  // model is most tempted to mine for a fact: it is the only thing in the
  // prompt that looks like a memory of what was established.
  parts.push(
    "This is a paraphrase, not a record. It cannot support a factual claim: if an answer would rest on something in here, say it would need to be checked rather than restating it as settled.",
  );
  parts.push(`Topic: ${summary.topic}`);
  if (summary.flow) parts.push(`Flow: ${summary.flow}`);
  if (summary.entities?.length)
    parts.push(`Entities: ${summary.entities.join(", ")}`);
  if (summary.context) parts.push(`Carried context: ${summary.context}`);
  return parts.join("\n");
}

/**
 * The System 2 folds, rendered for the prompt. Separate block, separate
 * framing, on purpose: merged into PAST DISCOURSE, an addressed record would
 * inherit the paraphrase's disclaimer, and a paraphrase would inherit the
 * record's authority. Two facts that differ must not read alike.
 */
export function buildRecordSystemMessage(summary) {
  const records = (summary?.records ?? []).slice(-RECORDS_IN_PROMPT);
  if (!records.length) return null;
  const parts = [
    "ON RECORD — earlier turns that were checked, with the addresses they were checked against. Unlike PAST DISCOURSE, these can be re-opened: the sources named here still exist and can be read again. You may rely on a line here, and you must not contradict one without saying you are doing so.",
  ];
  for (const r of records) {
    const bits = [`Turn ${r.turn}: ${r.gist}`];
    if (r.channels.length) bits.push(`  carried by: ${r.channels.join(", ")}`);
    if (r.refs.length) bits.push(`  checked against: ${r.refs.join("; ")}`);
    if (r.unsupported.length)
      bits.push(`  NOT supported by that material: ${r.unsupported.join("; ")}`);
    if (r.open.length) bits.push(`  left open: ${r.open.join("; ")}`);
    parts.push(bits.join("\n"));
  }
  return parts.join("\n\n");
}

/**
 * Assemble the exact message array for the next turn.
 *
 * The whole point of the module in one function: `history` may be a thousand
 * turns long, and what comes back is one system message plus at most
 * RECENCY_WINDOW raw messages plus the new question. Everything older is
 * present only as the folded summary inside the system message.
 *
 * One system message, at index 0: WebLLM's own request validation rejects a
 * second system message anywhere else, so the blocks are merged rather than
 * appended as separate messages.
 */
export function buildTurnMessages({ basePrompt, summary, history, question, sourceBlock }) {
  const systemParts = [];
  if (basePrompt) systemParts.push(basePrompt);
  const past = buildSummarySystemMessage(summary);
  if (past) systemParts.push(past);
  const onRecord = buildRecordSystemMessage(summary);
  if (onRecord) systemParts.push(onRecord);
  if (sourceBlock) systemParts.push(sourceBlock);

  const messages = [];
  if (systemParts.length)
    messages.push({ role: "system", content: systemParts.join("\n\n") });
  for (const m of (history || []).slice(-RECENCY_WINDOW))
    messages.push({ role: m.role, content: m.content });
  messages.push({ role: "user", content: question });
  return messages;
}

export function charCount(messages) {
  return (messages || []).reduce((n, m) => n + (m.content || "").length, 0);
}
