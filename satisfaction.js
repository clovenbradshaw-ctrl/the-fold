// satisfaction.js — the COMPOSED satisfaction read. One verdict from four
// gates, each owned by its archon, each disclosed — never a silent blend:
//
//   slot    (Nāgārjuna)  — the question has a declared slot
//   context (Clippy)     — the figure is IN THE PRESENT (born + DMD +
//                          activation + discourse)
//   figure  (the figure-binding) — the figure is ON THE GROUND (truth)
//   honest  (Aletheia)   — the answer fills the slot, or says plainly that
//                          the void is empty
//
// An answer SATISFIES iff all four hold — with one rescue: an HONEST decline
// on a silent question satisfies (the void is honestly empty), and the
// figure/context gates are excused, exactly as Aletheia's HONEST layer does.
// A gate that cannot be computed is UNJUDGEABLE — disclosed, never a pass,
// never a fail.
//
// PURE. The four organs are injected (cast.js pattern): `slotOf`, `inContext`
// (Clippy), `onGround` (figure-binding), `honestOf` (Aletheia).

export const GATES = Object.freeze(["slot", "context", "figure", "honest"]);

export function makeSatisfaction({ slotOf = null, inContext = null, onGround = null, honestOf = null, groundFigures = [] } = {}) {
  function read(question, answer) {
    const gates = {};

    // SLOT — Nāgārjuna: the question's void has a declared shape.
    const slot = typeof slotOf === "function" ? slotOf(question) : null;
    gates.slot = slot?.slot ? { ok: true, at: "slot", note: `slot "${slot.slot}" (${slot.kind ?? "thing"})` } : { ok: false, at: "slot", note: "no slot declared — the question's void is unshaped" };

    // HONEST — Aletheia: the answer may satisfy by honestly declaring the
    // void empty; this rescues the figure/context gates.
    const honest = typeof honestOf === "function" && honestOf(answer);
    gates.honest = { ok: true, at: "honest", note: honest ? "the answer honestly states the void is empty" : "the answer offers a filling" };

    if (honest) {
      // the honest decline EXCUSES the figure/context gates (disclosed, not
      // hidden) — the void is honestly empty, so there is no figure to bind.
      gates.context = { ok: true, at: "context", note: "excused — the void is honestly empty" };
      gates.figure = { ok: true, at: "figure", note: "excused — the void is honestly empty" };
      return { satisfied: gates.slot.ok, verdicts: gates, disclosed: GATES.map((g) => gates[g]) };
    }

    // CONTEXT — Clippy: is the figure in the present?
    const ctx = typeof inContext === "function" ? inContext(answer, question) : null;
    gates.context = ctx?.verdict === "bound"
      ? { ok: true, at: "context", note: `in the present (born ${(ctx.born ?? []).join(", ") || "—"}, act "${ctx.act}", ${ctx.active ? "active" : "born-but-dormant"})` }
      : ctx?.verdict
        ? { ok: false, at: "context", note: `out of context: ${ctx.gate} — ${ctx.reason}` }
        : { ok: false, at: "context", note: "context unjudgeable — no Clippy organ" };

    // FIGURE — is the figure on the ground (truth)?
    const fig = typeof onGround === "function" ? onGround(answer, groundFigures) : null;
    gates.figure = fig?.verdict === "bound"
      ? { ok: true, at: "figure", note: fig.rescued ? `on the ground (with disclosed typo rescues: ${Object.entries(fig.rescued).map(([a, b]) => a + "→" + b).join(", ")})` : "on the ground" }
      : fig?.verdict
        ? { ok: false, at: "figure", note: `not on the ground: ${fig.verdict} — ${fig.reason}` }
        : { ok: false, at: "figure", note: "figure unjudgeable — no ground organ" };

    const satisfied = gates.slot.ok && gates.context.ok && gates.figure.ok;
    return { satisfied, verdicts: gates, disclosed: GATES.map((g) => gates[g]) };
  }

  return { read, GATES };
}