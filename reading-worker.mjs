// reading-worker.mjs — the constitutional reader (READING-SPEC S1), off the
// main thread. Item 2 of the 2026-09-08 product review: "the page still
// runs the presence index at the turn" (THE-HOLOGRAPH §7's disclosed, owed
// step) — the eval driver reads with `createCausalTextPerceiver` +
// `reviseTextFold` (`conversation.mjs`'s named READING_ASSEMBLY,
// "causalTextPerceiver+reviseTextFold@refresh25"); the page read with a
// text presence index (cast.js, built for citation checks, no recurrence
// floor — P38). This worker runs the SAME assembly the eval driver names,
// so a source's identity is decided the way the assay's is, never a
// scan of capitalised runs.
//
// A causal read is real work — measured on 1.15 MB, ~209 s (P171) — so it
// runs here, off the main thread, one source at a time, yielding between
// chunks (postMessage per batch) so the page can show progress and stay
// responsive. term.js's workers are network-severed by design (a sandboxed
// runtime); this one is not severed — it fetches its own POS prior, the
// one thing an offline reading needs from the network, the same way the
// page's own PRIOR_LOADS already does (app.js), and is otherwise pure.
//
// Protocol (postMessage):
//   -> {type: "read", source, chunks, seed, priorEntries, sequence, budgetMs}
//        chunks: the SAME {ref, source, start, text} rows source.js::
//        chunkSource already produced for this source (app.js's own
//        `state.chunks`) — one chunking, shared by the relation reader and
//        this one, so both name the same passages at the same addresses.
//        seed: the fold reconstructed from a prior session's persisted log
//        (kernel/fold.js::reconstruct, run on the main thread — pure,
//        cheap, no reason to cross the worker boundary for it).
//   <- {type: "progress", read, total, entries}   -- entries: this batch's
//        fresh log rows, to append to reading-store.js as they land (never
//        held only in worker memory — a reload must not lose them)
//   <- {type: "done", cursor, sequence, ms}
//   <- {type: "error", message}
//
// Resume (item 9 of the review, closed 2026-09-08 in the-fold/eoreader7
// compliance pass): a reader seeded only from `reconstruct(log)` is a
// DIFFERENT instrument — its perceiver's causal accumulators (surface
// evidence, the closed class, the birth register) are not fold entries.
// `restore(entries)` (kernel/reading.js, eoreader7 compliance-fixes-eor)
// replays the persisted Encounter@1 rows through perceive() before this
// worker takes its first NEW step, so a reload's continued reading is the
// same instrument as an uninterrupted one, not a fresh reader wearing an
// old fold.
// The native/ path directly, not the eoreader7/kernel.js barrel it re-exports
// from: the same convention reading-client.js's own eoreader7 imports already
// use, and the one page-graph.mjs's constitution walk recognizes as the
// /engine-v7 mount by another spelling (a bare "../eoreader7/kernel.js" has
// no such rule and reads as a missing local file, even though it exists).
import { createRecursiveReader } from "../eoreader7/native/kernel/index.js";
import { createCausalTextPerceiver, textEncounters } from "../eoreader7/native/adapters/text/recursive.js";
import { reviseTextFold } from "../eoreader7/native/adapters/text/revision.js";
import { stepChunks } from "./reading-log.js";

export const READING_ASSEMBLY = "causalTextPerceiver+reviseTextFold@refresh25"; // named identically to conversation.mjs's own — one instrument, one name, wherever it runs

let posPrior = null;
let posPriorSource = null; // disclosed on every "done" message — which of the page's own tiered prior mounts actually answered (serve.mjs's own three-tier fallback; never re-decided here)
async function loadPosPrior() {
  if (posPrior) return posPrior;
  const res = await fetch("/priors-data/pos-prior-eng.json");
  if (!res.ok) throw new Error(`reading-worker: POS prior fetch failed (${res.status}) — the constitutional reader needs it; see serve.mjs's tiered mount`);
  posPrior = await res.json();
  posPriorSource = res.url; // the URL fetch() actually resolved (redirects, if any, included) — the closest thing to a giver a static mount can disclose
  if (posPrior?.schema !== "POSPrior@1") throw new Error(`reading-worker: fetched prior is not POSPrior@1 (got ${posPrior?.schema ?? "nothing"})`);
  return posPrior;
}

const RETRIEVE = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

function makeReader(seed) {
  return createRecursiveReader({
    seed: seed ?? {},
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })],
    adapters: { revise: reviseTextFold, retrieve: RETRIEVE },
  });
}

self.onmessage = async (ev) => {
  const msg = ev.data ?? {};
  if (msg.type !== "read") return;
  const { source, chunks = [], seed = null, priorEntries = [], cursor: startCursor = 0, sequence = null, budgetMs = 250 } = msg;
  if (!Array.isArray(chunks) || !chunks.length) { self.postMessage({ type: "error", source, message: "reading-worker: chunks is the source's own chunkSource() array — nothing to read" }); return; }
  try {
    await loadPosPrior();
    const reader = makeReader(seed);
    // restore() is a no-op (returns immediately) when priorEntries is empty —
    // the common case for a source's FIRST read. Only a resumed read pays it.
    if (priorEntries.length) await reader.restore(priorEntries);
    let cursor = startCursor, seq = sequence;
    const t0 = Date.now();
    while (cursor < chunks.length) {
      const r = await stepChunks(reader, chunks, { textEncounters, cursor, sequence: seq, budgetMs });
      cursor = r.cursor; seq = r.sequence;
      if (r.entries.length) self.postMessage({ type: "progress", source, read: cursor, total: chunks.length, entries: r.entries, sequence: seq, posPriorSource });
      if (cursor < chunks.length) await new Promise((res) => setTimeout(res)); // yield a macrotask between budget windows — the page stays responsive (P18's own reason, applied here)
    }
    self.postMessage({ type: "done", source, cursor, sequence: seq, ms: Date.now() - t0, assembly: READING_ASSEMBLY, posPriorSource });
  } catch (e) {
    self.postMessage({ type: "error", source, message: e?.message ?? String(e) });
  }
};
