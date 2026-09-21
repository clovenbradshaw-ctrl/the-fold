// capability-card.js — registry-projected capability/limits statement (PRX-02)
//
// The Fold already enumerates its own capabilities in code (help.js HELP registry,
// term.js ROSTER, capacities.js). This module PRODUCES the capability card from
// such a registry, so it can never drift from what the bot can actually do — the
// same discipline helpTurn uses to render HELP_CATEGORIES. Pure; the registry is
// injected (cast.js pattern) so this stays testable and app-free.
//
// Draft card shape (Ant 1 wording, keeps the paper's human-path line verbatim):
//
//   I am an AI assistant — The Fold, a local reading-and-research instrument.
//   I can help with: <from registry can: categories>.
//   I cannot help with: <from registry limits: items>.
//   You can reach a human agent at any point, and I will hand over with a recap.

export function capabilityCard(registry, opts = {}) {
  const {
    name = "The Fold",
    kind = "a local reading-and-research instrument",
    can = [],
    limits = [],
    humanPath = "You can reach a human agent at any point.",
  } = registry;

  const canLine = can.length
    ? `I can help with: ${joinList(can)}.`
    : "";
  const limitsLine = limits.length
    ? `I cannot help with: ${joinList(limits)}.`
    : "";
  const recap = "I will hand over with a recap of your question, what was tried, and your transcript on request.";

  return [
    `I am an AI assistant — ${name}, ${kind}.`,
    canLine,
    limitsLine,
    `${humanPath} ${recap}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function joinList(items) {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// The compressed prompt line the SYSTEM prompt may carry (Kondo: never the full
// card; identity line only, no apparatus vocabulary, firewall-safe).
export function promptIdentityLine(name = "The Fold") {
  return `You are ${name}, an AI assistant having a conversation.`;
}

// Split a registry row's can/limits from its machine names.
export function registryFromRows(rows, opts = {}) {
  const { canNames = [], limitNames = [] } = opts;
  const can = rows.filter((r) => canNames.includes(r.name) || !limitNames.includes(r.name)).map((r) => r.label || r.name);
  const limits = rows.filter((r) => limitNames.includes(r.name)).map((r) => r.label || r.name);
  return { can, limits };
}