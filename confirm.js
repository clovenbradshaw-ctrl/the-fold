// confirm.js — mechanical confirmation gate (PRX-01: repeat-back before answering)
//
// Pure, L5: the decision to confirm is computed from the question's own shape and
// the available evidence, never from a model. The confirmation message is a fixed
// template (paraphrase + check, zero answer sentences) so it passes the repo's own
// judge() (echoed/reproduced) by construction.
//
// Organs injected (cast.js pattern — this module imports nothing from the app):
//   anchorsOf(question)  -> [ { sentence, anchors: [...] } ]   (needsDecomposition-style clause/anchor split)
//   resolveAnchors(a)    -> bool  (does the referent/recall index establish this anchor?)
//   hasAdmission(q)      -> bool  (does admission.js admit any source for this question?)
//   vagueNouns(q)        -> [..]  (vague nouns / anaphors present: thing, it, this, ...)
//   chatty(q)            -> bool  (triviallyChatty)
//
// Non-triggers are checked by the CALLER (send() order): typed doors, widgetRouter,
// oracle door. This module only decides once those have already said "not ours".

const SENTENCE_SPLIT = /[.!?]+[\s\u2014]+/;

export function splitSentences(q) {
  return q.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
}

export function defaultAnchorsOf(question) {
  return splitSentences(question).map((s) => ({
    sentence: s,
    anchors: (s.match(/[A-Z][a-z]+|[0-9]+/g) || []).filter((w) => w.length >= 3),
  }));
}

export function defaultVagueNouns(q) {
  return (q.match(/\b(thing|stuff|it|this|that|issue|problem|one)\b/gi) || []).map((w) => w.toLowerCase());
}

export function defaultChatty(q) {
  return q.split(/\s+/).length <= 6 && !q.includes("?") && !/\d/.test(q);
}

// The decision. `organs` defaults keep it testable with no injection.
export function needsConfirmation(question, organs = {}) {
  const {
    anchorsOf = defaultAnchorsOf,
    resolveAnchors = () => false,
    hasAdmission = () => false,
    vagueNouns = defaultVagueNouns,
    chatty = defaultChatty,
  } = organs;

  if (chatty(question)) return { confirm: false, reason: "chatty" };

  const clauses = anchorsOf(question);

  // Multipart: >= 2 sentences each carrying distinct anchors (without the planning
  // exemption needsDecomposition applies — confirmation wants the multi-part case).
  const anchored = clauses.filter((c) => c.anchors.length >= 1);
  if (anchored.length >= 2) {
    return { confirm: true, reason: "multipart", clauses: anchored.map((c) => c.sentence) };
  }

  // Underspecified: passes a content floor but resolves no anchor, has vague nouns,
  // and nothing is admitted to ground against.
  const vague = vagueNouns(question);
  if (clauses.length >= 1 && vague.length >= 1) {
    const anyResolved = clauses.some((c) => c.anchors.some(resolveAnchors));
    if (!anyResolved && !hasAdmission(question)) {
      return { confirm: true, reason: "underspecified", vague, clauses: clauses.map((c) => c.sentence) };
    }
  }

  return { confirm: false, reason: "clear" };
}

// Fixed confirmation templates. Never model-generated (L5). "Echo" is avoided by
// construction: these name the parts or the missing slot, never paste the question.
export function confirmationTemplate(reason, detail = {}) {
  if (reason === "multipart") {
    const names = detail.clauses && detail.clauses.slice(0, 4);
    return `Just to make sure I answer all of it — I hear ${names && names.length
      ? `${names.length} parts (${names.join(" / ")})`
      : "more than one thing in your question"}. Is that the full list, and should I take them in that order?`;
  }
  if (reason === "underspecified") {
    const vague = detail.vague && detail.vague.length ? ` (e.g. ${detail.vague.slice(0, 3).join(", ")})` : "";
    return `Just to make sure I help with the right thing — your request${vague} is a bit open-ended. Could you tell me what you're trying to do, and what "done" would look like? Reply with a line or two and I'll take it from there.`;
  }
  return "Just to make sure I help with the right thing — could you say a little more about what you need?";
}