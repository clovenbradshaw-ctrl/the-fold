// scope-priors.mjs — node-side loader: the engine's received priors, shaped for scope.js.
import fs from "node:fs";
import * as P from "../eoreader7/native/adapters/text/priors.js";
import { createLemmatizer, morphologyFromPrior } from "../eoreader7/native/adapters/text/morphology.js";
const dir = new URL("../eoreader7/native/priors/", import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8"));
export function loadScopePriors() {
  const posForms = read("pos-eng.json").forms;
  const m = morphologyFromPrior(read("morphology-eng.json"));
  const L = createLemmatizer(m.forms, { language: m.language });
  return {
    definite: P.DEFINITE_DETERMINERS, indefinite: P.INDEFINITE_DETERMINERS,
    interrogative: P.INTERROGATIVE_PRONOUNS, mannerReason: P.MANNER_REASON_PRONOUNS, aux: P.AUXILIARY_VERBS,
    pos: (w) => posForms[w] ?? null,
    lemmasOf: L.lemmasOf,
    irregular: (w) => { const l = m.forms[w]; return !!(l && l.some((x) => x !== w)) && posForms[w]?.VERB > 0; },
  };
}
