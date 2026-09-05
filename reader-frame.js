// reader-frame.js — the reader's configuration, DERIVED from the options the
// reader was actually built with, never restated beside them.
//
// P90: until the reader's configuration is on the record, a reading measures
// the instrument. The app declared a frame by hand (a second object naming
// what it believed the reader stood on) and the two drifted: attestedVerbs,
// phrasalPredicates (DR5), the vocabulary POS gate's on/off and the cast organ
// that resolves ends were all live and none was in the frame (Pass 15,
// 2026-09-05). A restatement drifts (P22/P24/P39's class); a derivation
// cannot. So the frame is computed FROM the options object handed to
// `makeRelationReader`: every function-valued option is an organ (named by
// the function's own name), every other value is a lever carried as its
// value, and a null option is an omission — a key added to the reader
// appears in the frame without anyone remembering to declare it, and the
// recipe id (kernel/notes.js recipeId over this frame) moves with it.
//
// `priors` is the LOADED state of received priors at this moment (the POS
// prior, UniMorph forms, the morphology prior, the connector lens arrive
// after boot); `identity` names which organ resolves ends and which identity
// is deliberately absent. Both are facts the options object cannot carry —
// one is time, the other is a different organ — so they are passed in, and
// their keys are part of the frame like everything else.

const describe = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "function") return v.name || "provided";
  if (v instanceof Set) return `Set(${v.size})`;
  if (v instanceof Map) return `Map(${v.size})`;
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === "object") return "object";
  return v;
};

/**
 * @param {{reader?:string, options:object, priors?:object, identity?:object, model?:string|null}} spec
 * @returns {{reader:string, organs:object, levers:object, priors:object, identity:object, omitted:string[], model:string|null}}
 */
export function readerFrame({ reader = "makeRelationReader", options, priors = {}, identity = {}, model = null }) {
  if (!options || typeof options !== "object") throw new TypeError("readerFrame: `options` is the object the reader was built with; nothing else is");
  const organs = {};
  const levers = {};
  const omitted = [];
  for (const key of Object.keys(options).sort()) {
    const v = options[key];
    if (v === null || v === undefined) { omitted.push(key); continue; }
    if (typeof v === "function") organs[key] = describe(v);
    else levers[key] = describe(v);
  }
  for (const [k, v] of Object.entries(identity)) if (v === null || v === undefined) omitted.push(`identity.${k}`);
  return { reader, organs, levers, priors: { ...priors }, identity: { ...identity }, omitted, model: model ?? null };
}
