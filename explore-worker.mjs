// explore-worker.mjs — the engine side of a job, off the server's thread.
//
// Two modes, both built on eoreader6's host face and nothing else — this
// file segments tabular material and moves messages; it measures nothing.
//
//   read   admit the file, then sessionTerrains: every terrain surface the
//          organs can serve, gaps typed. Milliseconds-to-seconds.
//   kinds  induceKinds via sessionKinds with the null arm DEFERRED: the
//          kinds post first (rendering provisional), then kindsNullArm runs
//          over the same records and posts as a second result. The arm is
//          always run — never declined — so the responsive path and the
//          honest path are the same path (FOLD-CONSTITUTION II.12, II.13).
//
// For tabular sources (csv/tsv/json arrays) the records come from
// terrain-explorer's segment adapter — file-format parsing is app-tier
// work; the induction and the arm stay in eoreader6 either way.

import { parentPort, workerData } from "node:worker_threads";
import { readFileSync } from "node:fs";
import {
  createSession,
  admitChunked,
  sessionTerrains,
  sessionKinds,
  kindsNullArm,
} from "../eoreader6.1/packages/host/index.js";
import { buildRecords } from "../terrain-explorer/lib/segment.mjs";

// Admission cap — a bound on what one interactive read admits, not on what
// the engine could hold. Giver: this file, engineering starting point
// (eoWebLLM ingests 3.3MB in 8.4s; 16MB keeps a read under a minute on the
// same hardware class). An oversize file still gets raw/hex display — the
// gap is typed, the file is not hidden.
const ADMIT_MAX_BYTES = 16_000_000;

const { mode, filePath, rel, opts } = workerData;
const post = (phase, extra = {}) => parentPort.postMessage({ phase, at: Date.now(), ...extra });

function decode(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return null;
  }
}

function main() {
  const buf = readFileSync(filePath);
  if (buf.length > ADMIT_MAX_BYTES) {
    return post("done", {
      result: {
        gap: {
          silence: "censored-above",
          detail: `${buf.length} bytes exceeds the declared admission cap of ${ADMIT_MAX_BYTES} — raw and hex surfaces remain available`,
          giver: "explore-worker.mjs ADMIT_MAX_BYTES, engineering starting point",
        },
      },
      summary: { gap: "censored-above", bytes: buf.length },
    });
  }

  const text = decode(buf);
  if (text === null) {
    return post("done", {
      result: {
        gap: {
          silence: "not-present",
          detail: "not valid UTF-8 — the text organs have nothing to admit; raw and hex surfaces carry this source",
        },
      },
      summary: { gap: "binary" },
    });
  }

  const sourceId = `source:${rel}`;

  if (mode === "read") {
    post("admitting");
    const session = createSession();
    const admitted = admitChunked(session, { text, sourceId });
    post("assembling", { note: `${admitted.chunks} chunks admitted` });
    // Each surface streams up the moment its organ finishes (cheapest
    // first — sessionTerrains' own emit order), so the page reveals views
    // progressively instead of waiting ~90s on the cast for a large novel.
    const terrains = sessionTerrains(session, {
      sourceId,
      emit: (surface, data) => post(`reading:${surface}`, { surface, data }),
    });
    post("done", {
      result: terrains,
      summary: {
        chunks: admitted.chunks,
        referents: terrains.terrains?.Entity?.referents?.length ?? 0,
        relations: terrains.terrains?.Link?.total ?? 0,
        graphNodes: terrains.terrains?.Network?.nodeCount ?? 0,
        atmosphereFrames: terrains.terrains?.Atmosphere?.frames?.length ?? 0,
        gaps: terrains.terrains?.Void?.ledger?.length ?? 0,
      },
    });
  } else if (mode === "kinds") {
    // Tabular material segments to its own rows; prose segments to chunks.
    // Which happened is reported, never guessed at render time.
    post("segmenting");
    let records = null;
    let segmentation = "chunks";
    const built = buildRecords({ content: text, filename: rel });
    if (built?.records?.length && built.shape !== "text") {
      records = built.records;
      segmentation = built.shape; // "csv" | "tsv" | "json"
    }

    const session = createSession();
    if (!records) admitChunked(session, { text, sourceId });

    post("inducing", { note: records ? `${records.length} ${segmentation} records` : "chunk records" });
    const kinds = sessionKinds(session, {
      sourceId,
      ...(records ? { records } : {}),
      opts: { ...opts, nullArm: "defer" },
    });
    if (kinds.gap) {
      return post("done", { result: { ...kinds, segmentation }, summary: { gap: kinds.gap.reason ?? kinds.gap.silence } });
    }

    // The kinds ship now — provisional, arm pending — then the arm runs.
    const { records: armRecords, ...visible } = kinds;
    post("kinds", { result: { ...visible, segmentation } });

    post("null-arm", { note: `${opts.nullArmDraws} redeal${opts.nullArmDraws === 1 ? "" : "s"}` });
    const arm = kindsNullArm({ records: armRecords, opts, population: sourceId });
    post("done", {
      nullArm: arm,
      summary: {
        segmentation,
        records: kinds.recordCount,
        kinds: kinds.kinds.length,
        nullArmDraws: arm.draws ?? null,
        nullArmDrawsWithKinds: arm.drawsWithKinds ?? null,
      },
    });
  } else {
    post("error", { error: { message: `unknown mode "${mode}"` } });
  }
}

try {
  main();
} catch (err) {
  post("error", { error: { message: err.message, stack: err.stack } });
}
