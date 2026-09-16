// stability-rig.mjs — the real turn, headless, under named configurations,
// with faults injectable into any layer. Node only; never loaded by the page.
//
// WHAT IT IS FOR. stability.js states the invariants that make the stack
// "only improve, never break" falsifiable; this file produces the
// observations those invariants are checked against. Everything below the
// mouth is deterministic, so the rig runs holon.js's REAL runHolonicTask with
// a deterministic stub for a mouth by default — the prompt it records is
// then an exact, repeatable fact. A real mouth is injected only by the
// driver that measures answers (the one statistical invariant).
//
// THE CONFIGURATION IS THE APP'S, NAMED (P88). The top rung is app.js's own
// turn: RESOLUTIONS_LEVEL 3, material "auto", activation retrieval over the
// constitutional reading (reading-worker.mjs's reader: the causal text
// perceiver, refreshEvery 1, the page's own POS prior file), the relation
// reader and notes door from product-assay.mjs::organs() (app.js's
// RELATION_READER_OPTIONS key for key), the arrival read through
// read-on-arrival.js::admitPassages, and the admission gate app.js applies
// before the turn. Lower rungs remove one layer at a time, so the first rung
// where an invariant breaks names the layer that broke it.

import { readFileSync } from "node:fs";
import { runHolonicTask, CHAT_SYSTEM_PROMPT, FLAT_EXECUTE_SYSTEM_PROMPT, EXECUTE_SYSTEM_PROMPT } from "./holon.js";
import { organs as productOrgans } from "../eoreader7/native/eval/the-fold/lib/product-assay.mjs";
import { makeCastResolver, makeReferentIndex } from "./cast.js";
import { makeActivationRetrieval, mentionBook as presenceBook } from "./activation-retrieval.js";
import { admitPassages } from "./read-on-arrival.js";
import { readingIndexFromLog, mentionBookFromLog, stepChunks } from "./reading-log.js";
import { makeAdmission } from "./admission.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { dmdWindow } from "../eoreader7/native/kernel/activation.js";
import { createRecursiveReader } from "../eoreader7/native/kernel/index.js";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../eoreader7/native/adapters/text/recursive.js";
import { reviseTextFold } from "../eoreader7/native/adapters/text/revision.js";
import { reconstruct } from "../eoreader7/native/kernel/fold.js";
import * as P from "../eoreader7/native/adapters/text/priors.js";

const HERE = new URL(".", import.meta.url).pathname;

// The fixed system prompts a draft call opens with. A line of the prompt that
// is part of one of these is the constitution's own wording, not a layer's.
export const FIXED_PROMPTS = Object.freeze([CHAT_SYSTEM_PROMPT, FLAT_EXECUTE_SYSTEM_PROMPT, EXECUTE_SYSTEM_PROMPT]);

/** The configurations, lowest first. Each rung adds exactly one layer. */
export const RUNGS = Object.freeze([
  { name: "L0-raw", layers: [] },
  { name: "L1a-notes", layers: ["notes"] },
  { name: "L1b-activation", layers: ["notes", "activation"] },
  { name: "L1c-app", layers: ["notes", "activation", "resolutions"] },
]);

let ORGANS = null;
async function organs() {
  if (ORGANS) return ORGANS;
  const O = await productOrgans();
  const castFor = makeCastResolver({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const admission = makeAdmission({ tokenize: O.tokenize, splitSentences, negationWords: new Set([...P.NEGATION_WORDS, "no"]) });
  // The page's own POS prior file (reading-worker.mjs fetches /priors-data/pos-prior-eng.json).
  const posPrior = JSON.parse(readFileSync(`${HERE}priors-data/pos-prior-eng.json`, "utf8"));
  ORGANS = { O, castFor, indexFor, admission, posPrior };
  return ORGANS;
}

/** The constitutional reading of the material, exactly as reading-worker.mjs reads it. */
async function readConstitutionally(chunks, posPrior) {
  const RETRIEVE = (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) });
  const log = [];
  for (const source of [...new Set(chunks.map((c) => c.source))]) {
    const reader = createRecursiveReader({ seed: {}, perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 1, posPrior, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })], adapters: { revise: reviseTextFold, retrieve: RETRIEVE } });
    await stepChunks(reader, chunks.filter((c) => c.source === source), { textEncounters, cursor: 0, sequence: 0 });
    log.push(...reader.getLog());
  }
  const readingOrgans = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };
  return { index: readingIndexFromLog(log, readingOrgans), book: mentionBookFromLog(log, readingOrgans) };
}

/** A deterministic mouth: the same reply for the same kind of call, every run.
 *  Asked to restate the question for retrieval, it hands the question back
 *  unchanged — the neutral restatement, so retrieval runs on the person's own
 *  words rather than on whatever a stub happens to say. */
export function stubMouth() {
  return async (messages, opts = {}) => {
    if (opts?.json || opts?.format) return "{}";
    const sys = String(messages?.[0]?.content ?? "");
    if (/^Restate the question/.test(sys)) return String(messages.at(-1)?.content ?? "").split("\n").filter(Boolean).at(-1) ?? "";
    return "I do not know.";
  };
}

const isDraftCall = (c) => {
  const sys = c.messages?.[0];
  if (sys?.role !== "system" || c.opts?.json || c.opts?.format) return false;
  const head = String(sys.content ?? "").slice(0, 60);
  return FIXED_PROMPTS.some((p) => String(p).slice(0, 60) === head);
};

/**
 * runTurn({ material, question, rung, faults, mouth, admit }) → an observation.
 *   material  { name: text }        the attachments, as the page holds them
 *   rung      one of RUNGS
 *   faults    { organName: "throw" | "null" | "malformed" } — a layer's organ replaced
 *   admit     apply app.js's admission gate before the turn (default true)
 */
export async function runTurn({ material, question, rung = RUNGS.at(-1), faults = {}, mouth = stubMouth(), admit = true, wrapRetrieve = null } = {}) {
  const { O, castFor, indexFor, admission, posPrior } = await organs();
  const has = (layer) => rung.layers.includes(layer);

  let sources = Object.entries(material).map(([name, text]) => ({ name, text }));
  let refused = [];
  if (admit) {
    const r = admission.admitSources(question, sources);
    refused = (r.refused ?? []).map((x) => x.name ?? x);
    sources = sources.filter((s) => !refused.includes(s.name));
  }
  const chunks = sources.flatMap((s) => O.chunkSource(s.name, s.text).map((c) => ({ ...c, source: s.name })));

  // The arrival read (P99), when the notes layer is present.
  let ledger = null;
  if (has("notes") && chunks.length) {
    const rel = O.relationsFor(chunks, { pool: chunks });
    ledger = admitPassages(O.hl, null, chunks, { read: rel.read, witnessFor: (p) => `${p.ref}~${O.recipe}`, frame: O.frame }).log ?? null;
  }
  const ledgerBefore = ledger?.entries?.length ?? 0;

  // app.js::currentIndexAndBook: the constitutional reading when it completed,
  // otherwise the presence index and its sentence book over the chunks. A read
  // that throws falls back exactly as the page's .catch does, and the basis
  // actually used is recorded rather than assumed.
  let retrieveWith = null, mentionBook = null, conversationIndex = null, basis = null;
  if (has("activation") && chunks.length) {
    let reading = null;
    try {
      reading = await readConstitutionally(chunks, posPrior);
      basis = { kind: "constitutional" };
    } catch (e) {
      const index = indexFor(chunks);
      reading = { index, book: presenceBook(chunks, index, { splitSentences }) };
      basis = { kind: "presence", because: String(e?.message ?? e) };
    }
    conversationIndex = reading.index;
    mentionBook = reading.book;
    retrieveWith = makeActivationRetrieval({ index: reading.index, book: reading.book, dmdWindow, fallback: O.retrieve, notes: () => (ledger && O.hl.foldWithStanding ? O.hl.foldWithStanding(ledger) : []), transcript: () => [], resolutions: has("resolutions") ? 3 : 0 });
  }
  if (wrapRetrieve) retrieveWith = wrapRetrieve(retrieveWith ?? ((cs, q, limit, folded) => O.retrieve(cs, q, limit, folded)));

  const faulty = (name, organ) => {
    const kind = faults[name];
    if (!kind) return organ;
    if (kind === "null") return null;
    if (kind === "throw") return () => { throw new Error(`planted fault: ${name}`); };
    if (kind === "malformed") return () => ({ planted: "malformed" });
    return organ;
  };

  const calls = [];
  const call = async (messages, opts) => { calls.push({ messages, opts }); return mouth(messages, opts); };
  let result = null, error = null;
  try {
    result = await runHolonicTask({
      task: question, chunks, call, foldedRefs: [], planMode: "flat",
      makeNameResolver: has("notes") ? faulty("makeNameResolver", castFor) : null,
      makeReferentIndexFor: has("notes") ? faulty("makeReferentIndexFor", indexFor) : null,
      makeRelationReader: has("notes") ? faulty("makeRelationReader", O.relationsFor) : null,
      hyperlexicon: has("notes") ? faulty("hyperlexicon", O.hl) : null,
      hyperlexiconLog: has("notes") ? ledger : null,
      hyperlexiconFrame: has("notes") ? O.frame : null,
      hyperlexiconRecipe: has("notes") ? O.recipe : null,
      retrieveWith: faulty("retrieveWith", retrieveWith),
      mentionBook: faulty("mentionBook", mentionBook),
      conversationIndex: faulty("conversationIndex", conversationIndex),
      dmdWindow: has("activation") ? faulty("dmdWindow", dmdWindow) : null,
      resolutions: has("resolutions") ? 3 : 0,
      material: has("resolutions") ? "auto" : "passages",
      depth: 1, chatHistory: [], discourse: "", transcript: [], learnedStore: [], records: [],
    });
  } catch (e) { error = String(e?.message ?? e); }

  const draft = calls.find(isDraftCall) ?? null;
  const handedPassages = (result?.sections ?? []).flatMap((s) => (s.passages ?? []).map((p) => ({ ref: p.ref, text: String(p.text ?? "") })));
  const ledgerAfter = result?.hyperlexiconLog ?? ledger;
  return {
    rung: rung.name, question, faults, error, refused, basis,
    retrieved: result?.retrieved ?? handedPassages.map((p) => p.ref),
    handedPassages,
    draft: draft ? draft.messages : null,
    calls: calls.length,
    added: (ledgerAfter?.entries ?? []).slice(ledgerBefore),
    sources: Object.fromEntries(sources.map((s) => [s.name, s.text])),
    output: result?.output ?? null,
  };
}
