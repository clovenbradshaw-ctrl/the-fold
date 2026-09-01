// shape.js — the form of an answer, known before its content.
//
// USER FRAMING, verbatim (2026-08-27), and it is the design rather than a
// gloss on it: "this is the instant response that comes to mind before
// 'system 2' comes online and someone says something out loud — it's what
// allows an answer to 'sound right' even if the person is not fully
// confident."
//
// That names something this instrument had backwards. Its S1 pass drafts a
// full prose answer ("think out loud, give your first take"), but the
// instant thing is not a draft — it is the FORM arriving before any
// content. Asked for the capital of France you know, before retrieving
// anything, that the answer is one short name. Asked to explain a war you
// know it is several things that bear on each other. The shape is what
// makes an answer sound right under low confidence, and its absence is
// measurable: on 2026-08-27 a one-word slot came back as five sentences of
// hedged meta-commentary after two correction rounds and 214 seconds,
// because nothing anywhere had said how much answer was wanted. AN
// UNMEASURED SLOT GETS FILLED WITH HEDGING.
//
// ── WHY A MODEL AT ALL, HERE, WHEN THE RULE IS "NOT THE SLOTS" ──────────
//
// The standing rule is the user's own: "any model call should be about
// creating surf query content, not structure the slots." This looks like an
// exception and is not, because of a distinction the same user drew and
// this file is built on: A TINY MODEL IS RELIABLE ABOUT SHAPE AND
// UNTRUSTWORTHY ABOUT CONTENT.
//
// That was measured before this file was written, against the real
// gemma2:2b, eight questions, shape-only schema (no content field anywhere):
//
//   · content leaks: 0/8. An earlier attempt that DID carry a content field
//     (`anchor`) was contaminated on every single case — the model filled it
//     with the answer it happened to know (Andrew Johnson, Brasília, David
//     Lee Roth). The contamination was caused by ASKING FOR CONTENT, not by
//     the model being unreliable. Remove the field and there is nowhere for
//     a known fact to land.
//   · Where `declaredSlotShape` has a mechanical judgment, the model AGREED
//     with it — including agreeing to refuse: asked about Lincoln's vice
//     president and Van Halen's lead singer, it answered "unknown without
//     checking" rather than reading cardinality off singular grammar, which
//     is exactly the discipline this repo already enforces mechanically.
//   · Where mechanism must refuse, it added a real distinction mechanism
//     STRUCTURALLY CANNOT REACH. "What is the capital of France?" and "Who
//     was Lincoln's vice president?" are both singular-grammar definite
//     phrases, so `declaredSlotShape` correctly returns "unknown" for both.
//     The model separates them: a country's capital is a single-valued
//     slot, a vice-presidency may not be. That is the time-varying-office
//     question this repo otherwise had no organ for, answered with no word
//     list and in whatever language the question was asked.
//
// So the model is asked ONLY about form, and the schema is the wall: there
// is no field here a fact could occupy. It is never asked what the answer
// is, never asked to name anything, and its reply is never read as content.
//
// ── AND IT IS A PROPOSAL, NOT A FINDING ────────────────────────────────
//
// Nothing here is trusted. A shape arrives before any material is read, so
// it cannot be evidence about the world — it is a HYPOTHESIS the material
// then gets to concede. The same model that correctly says "exactly one"
// for the capital of France will say it for the capital of Brazil, which
// has had several; the material's own reading is what settles that, through
// the REC path `void-brief.js` already runs. Every value this file produces
// carries `proposed` standing and a named giver, and `mergeShape` below
// will not let a proposal overwrite a mechanical determination — it fills
// only where mechanism honestly refused.
//
// PURE. The model call is injected (the cast.js discipline), so this module
// is testable offline and carries no transport of its own.

/** No content field exists here, and that is the wall — see the header.
 * Ollama constrains decoding to this schema, so the shape is a SHAPE by
 * physics rather than by asking the model nicely (the same posture
 * `completeOnce`'s own `format` parameter already takes elsewhere). */
export const SHAPE_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    how_many: { type: "string", enum: ["exactly one", "more than one", "unknown without checking"] },
    kind_of_thing: { type: "string" },
    composition: { type: "string", enum: ["a single item", "a list of independent items", "parts that relate to each other"] },
  },
  required: ["how_many", "kind_of_thing", "composition"],
});

/**
 * The instruction is short, positive, and says nothing about the subject —
 * a longer one would be more rails to comply with, and this file's whole
 * bet is that the shape is already known instantly and only needs to be
 * asked for. "Do not answer" is the one negative, and it earns its place:
 * it is what keeps the reply about form. Measured leak-free 8/8 with it.
 */
export function buildShapeMessages(question) {
  return [
    {
      role: "system",
      content:
        "Describe the SHAPE a complete answer to the question would have. Do not answer the question. Do not name anything specific. Only describe the form the answer takes.",
    },
    { role: "user", content: String(question ?? "") },
  ];
}

const HOW_MANY = new Set(["exactly one", "more than one", "unknown without checking"]);
const COMPOSITION = new Set(["a single item", "a list of independent items", "parts that relate to each other"]);

/**
 * Read a shape reply. Grammar-constrained decoding makes the happy path the
 * common one, but a reply is still VALIDATED rather than trusted: an
 * unparseable or off-enum answer is a typed refusal, never a silently
 * half-filled shape. `kind_of_thing` is free text by necessity (the whole
 * point is that it is not drawn from a fixed list) and is length-capped
 * rather than pattern-matched — a cap bounds damage without pretending to
 * know what a legitimate kind looks like in every language.
 */
export const KIND_MAX_CHARS = 60;

export function readShape(raw, { giver = "model" } = {}) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { refused: { type: "unparseable", detail: "the shape reply was not JSON" } };
    }
  }
  if (!obj || typeof obj !== "object") return { refused: { type: "unparseable", detail: "the shape reply was not an object" } };
  const howMany = obj.how_many;
  const composition = obj.composition;
  const kind = typeof obj.kind_of_thing === "string" ? obj.kind_of_thing.trim() : "";
  if (!HOW_MANY.has(howMany)) return { refused: { type: "off_vocabulary", detail: `how_many: ${JSON.stringify(obj.how_many)}` } };
  if (!COMPOSITION.has(composition)) return { refused: { type: "off_vocabulary", detail: `composition: ${JSON.stringify(obj.composition)}` } };
  return {
    schema: "EOAnswerShape@1",
    howMany,
    composition,
    // An empty kind is a real absence, not an empty string to render.
    kind: kind && kind.length <= KIND_MAX_CHARS ? kind : null,
    standing: "proposed",
    giver: `${giver}, before any material was read`,
    refused: null,
  };
}

/**
 * The shape's cardinality in the void's own vocabulary.
 *
 * "single" comes back here after this repo deliberately removed it — and
 * the distinction is the whole point. It was removed as a GRAMMATICAL
 * inference ("a one-noun question is not a one-filler world", and every
 * wrong answer the Lincoln specimen produced named exactly one man). What
 * returns is a different claim from a different source: not "the phrase is
 * singular" but "this kind of slot holds one", proposed by a reader of the
 * world, marked as a proposal, and revisable. Grammar still never earns it.
 */
export function cardinalityOf(shape) {
  if (shape?.schema !== "EOAnswerShape@1") return null;
  if (shape.howMany === "exactly one") return "single";
  if (shape.howMany === "more than one") return "enumerated";
  return null; // "unknown without checking" declares nothing — the honest zero
}

/**
 * Fold a proposed shape into what mechanism already determined.
 *
 * THE RULE: a proposal fills a refusal, and never overwrites a
 * determination. `declaredSlotShape` returning "unknown" is not a finding —
 * it is that function saying it has no evidence, which is exactly the state
 * a proposal is better than. But "enumerated" (a real plural marker in the
 * question's own words) IS positive evidence, and a proposal must not
 * override it.
 *
 * Returns the fields `declareVoid` takes, plus the provenance of anything
 * proposed, so a reader is never shown a proposal wearing a
 * measurement's clothes.
 */
export function mergeShape(mechanical, shape) {
  const out = { cardinality: mechanical?.cardinality ?? null, admits: null, composition: null, proposed: [] };
  const measured = mechanical?.cardinality;
  const hasDetermination = measured && measured !== "unknown";
  if (hasDetermination) out.cardinality = measured;

  if (shape?.schema !== "EOAnswerShape@1") return out;

  if (!hasDetermination) {
    const proposed = cardinalityOf(shape);
    if (proposed) {
      out.cardinality = proposed;
      out.proposed.push("cardinality");
    }
  }
  // INS — "what kind of thing may stand here" — has been UNDECLARED on
  // every turn this instrument has ever run, and its absence is what let
  // "Congress", "Though he" and "After" through as candidate vice
  // presidents. Nothing mechanical produces it, so a proposal is strictly
  // more than what was there.
  if (shape.kind) {
    out.admits = shape.kind;
    out.proposed.push("admits");
  }
  // SYN. Carried, and carried with its own disclosed weakness: measured
  // 2026-08-27, composition was the least reliable of the three — it called
  // the causes of a world war "a list of independent items" when they
  // plainly bear on each other. Cardinality and kind looked solid; this one
  // has not earned the same standing and is marked proposed like the rest,
  // but a reader should weigh it less until it has its own measurement.
  if (shape.composition) {
    out.composition = shape.composition;
    out.proposed.push("composition");
  }
  return out;
}

/**
 * The whole organ: ask, read, refuse cleanly. `call` is injected — app.js's
 * own `complete()` or anything with its shape — so this module makes no
 * network of its own and is testable against a stub.
 *
 * Deliberately CHEAP: a tiny schema, a two-message prompt, no material, no
 * history. This runs before retrieval, so it costs one small call on the
 * turn's critical path and buys the void two cells it otherwise never has.
 */
export async function askShape(question, call, { model = null, giver = "model" } = {}) {
  if (typeof call !== "function") throw new TypeError("askShape: call is injected — this module owns no transport");
  let raw;
  try {
    raw = await call(buildShapeMessages(question), {
      json: SHAPE_SCHEMA,
      // Argmax, not the dice: the same reason testimony.js's witness reads
      // pass 0 — a shape that flips between runs is not a shape.
      temperature: 0,
      ...(model ? { model } : {}),
    });
  } catch (e) {
    return { refused: { type: "call_failed", detail: String(e?.message ?? e) } };
  }
  return readShape(raw, { giver: model ? `${model}` : giver });
}
