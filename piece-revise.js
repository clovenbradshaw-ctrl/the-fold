// piece-revise.js — a piece revises what it already wrote when later
// reading finds something, and a revision lands only if it grounds (P116).
// Pure: the model call, the relation reader and the ground ladder are
// injected.
//
// User direction (2026-09-05): "make sure … recursively that it is able to
// revise what it writes based on new discoveries from what it's writing but
// always grounded." The discoveries are the record's own: passages a later
// section hunted, notes later sections admitted, a cut a later section
// heard against a claim an earlier section made, a void a later section
// filled. Two kinds of revision, both mechanical in their trigger:
//   RE-CITE  — a sentence's ground RISES against the whole piece's material
//              (self → recorded/witnessed/bound): the text stands, the
//              address is attached. No model.
//   REWRITE  — a sentence is now CONTESTED (a later section's reading
//              denies its claim) or stood on a void a later section filled:
//              the mouth is asked once, handed the later finding as a fact
//              with its address, and the candidate is accepted ONLY if the
//              ladder places it at a grounded rung; otherwise the original
//              stays, wearing its contested mark. Bounded by a declared ask
//              budget and a declared number of rounds; every accepted and
//              refused revision is an act on the result.
export const REVISION_ASKS = 12;   // model asks per piece for rewrites (P9: declared)
export const REVISION_ROUNDS = 2;  // a rewrite can itself be contested by what it says; two rounds, then stop
const GROUNDED = new Set(["bound", "witnessed", "recorded", "derived"]);

/**
 * revisePiece(sections, { groundOf, readAgainst, call, splitSentences, ctx, model }) → { sections, revisions }
 * sections: [{ label, text, claims, witnessRows }]; ctx: the piece-wide ladder context
 * (notes, disputes, derived, passages, resolveName); readAgainst(sentence) → claims
 * against the whole piece's material.
 */
export async function revisePiece(sections, { groundOf, readAgainst, call, splitSentences, ctx, model = null, asks = REVISION_ASKS, rounds = REVISION_ROUNDS, systemPrompt = "" } = {}) {
  const revisions = [];
  let spent = 0;
  let out = sections.map((s) => ({ ...s }));
  for (let round = 1; round <= rounds; round += 1) {
    let changed = 0;
    for (const s of out) {
      const sentences = splitSentences(String(s.text ?? "")).map((x) => x.trim()).filter(Boolean);
      const before = new Map((s.claims ?? []).map((c) => [c.sentence, c]));
      for (const sent of sentences) {
        const own = (s.claims ?? []).filter((c) => c.sentence === sent);
        const wrow = (s.witnessRows ?? []).find((r) => r.sentence === sent) ?? null;
        const g0 = groundOf(sent, { ...ctx, claims: own, witness: wrow, model });
        // against the whole piece's material, now
        const later = (readAgainst(sent) ?? []).map((c) => ({ ...c, sentence: sent }));
        const g1 = groundOf(sent, { ...ctx, claims: [...own, ...later], witness: wrow, model });
        const rank = (t) => ["self", "named", "contested", "derived", "recorded", "witnessed", "bound"].indexOf(t);
        if (g1.tier === "contested" && g0.tier !== "contested") {
          // REWRITE: a later reading denies what this sentence says
          if (spent >= asks) { revisions.push({ round, section: s.label, kind: "rewrite-refused", sentence: sent, because: "revision ask budget spent", ground: g1 }); continue; }
          spent += 1;
          const finding = g1.detail;
          let candidate = "";
          try {
            candidate = String(await call([
              { role: "system", content: systemPrompt },
              { role: "user", content: `In the section "${s.label}" this sentence was written before later reading found otherwise: "${sent}"\nWhat was found: ${finding}${g1.addresses?.length ? ` (${g1.addresses.slice(0, 3).join(", ")})` : ""}.\nRewrite only that sentence so it says what the sources establish, in the same voice; one sentence.` },
            ], { maxTokens: 160 }) ?? "").trim().split("\n")[0].trim();
          } catch (e) { candidate = ""; }
          const cand = candidate.replace(/^["“]|["”]$/g, "");
          const gc = cand ? groundOf(cand, { ...ctx, claims: (readAgainst(cand) ?? []).map((c) => ({ ...c, sentence: cand })), witness: null, model }) : null;
          if (gc && GROUNDED.has(gc.tier) && gc.tier !== "contested") {
            s.text = String(s.text).replace(sent, cand);
            revisions.push({ round, section: s.label, kind: "rewrite", from: sent, to: cand, because: finding, ground: gc });
            changed += 1;
          } else {
            revisions.push({ round, section: s.label, kind: "rewrite-refused", sentence: sent, candidate: cand || null, because: gc ? `the rewrite stood at "${gc.tier}", not a grounded rung` : "no rewrite came back", ground: g1 });
          }
        } else if (rank(g1.tier) > rank(g0.tier) && GROUNDED.has(g1.tier)) {
          // RE-CITE: the ground rose; the text stands, the address rides
          revisions.push({ round, section: s.label, kind: "re-cite", sentence: sent, fromTier: g0.tier, toTier: g1.tier, addresses: g1.addresses ?? [] });
          s.recited = [...(s.recited ?? []), { sentence: sent, ground: g1 }];
        }
      }
    }
    if (!changed) break;
  }
  return { sections: out, revisions, asksSpent: spent };
}

export const revisionLine = (r) => r.kind === "rewrite" ? `revised in "${r.section}" after later reading (${r.because}): “${String(r.to).slice(0, 90)}”` : r.kind === "re-cite" ? `re-cited in "${r.section}": ${r.fromTier} → ${r.toTier}${r.addresses?.length ? ` ${r.addresses.slice(0, 2).join(", ")}` : ""}` : `revision refused in "${r.section}": ${r.because}`;
