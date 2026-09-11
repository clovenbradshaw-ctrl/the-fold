// tf-chat-worker.js — the on-device CPU rung's worker. All of the model
// lives here: the transformers.js text-generation pipeline on WASM (no GPU,
// no WebGPU — the phone whose WebGPU cannot run web-llm's rungs still gets a
// real local model), the weight fetch, the decode loop. The page talks to it
// through postMessage; if the worker dies the client rebuilds a fresh one,
// the page itself never holds the runtime.
//
// One job at a time: a generation is CPU-bound and uninterruptible from the
// page, so a request in flight is answered when it finishes. The `json`
// option is best-effort — transformers.js has no constrained decoding — so
// the worker asks for a single JSON object and returns the raw text; the
// caller's parser is the wall (the same posture the fold holds everywhere a
// small model's JSON is only as good as the grammar around it).
import { pipeline } from "/node_modules/@huggingface/transformers/dist/transformers.web.js";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const DTYPE = "q4";

let generator = null;
let loading = null;

async function ensure() {
  if (!generator) {
    loading = loading ?? (async () => {
      const gen = await pipeline("text-generation", MODEL, {
        device: "wasm",
        dtype: DTYPE,
        progress_callback: (p) => {
          if (p && p.status === "progress" && p.progress != null) {
            self.postMessage({ kind: "progress", id: 0, text: p.file ?? "weights", pct: p.progress });
          }
        },
      });
      return gen;
    })().catch((e) => { loading = null; throw e; });
    generator = await loading;
  }
  return generator;
}

/** The assistant's words out of transformers.js's chat output shape:
 *  `[{ generated_text: [{role, content}, …] }]` for chat input, or a plain
 *  string for text input. The fold always sends `messages` (chat), so the
 *  assistant message is the last entry. */
function textOf(out) {
  if (!Array.isArray(out) || !out.length) return "";
  const g = out[0]?.generated_text;
  if (typeof g === "string") return g;
  if (Array.isArray(g)) {
    const last = g.at(-1);
    return typeof last?.content === "string" ? last.content : "";
  }
  return "";
}

self.onmessage = async (msg) => {
  const m = msg.data ?? {};
  if (m.kind !== "complete") return;
  try {
    const gen = await ensure();
    const wantJson = !!m.json;
    // A JSON request on a CPU rung has no grammar wall (transformers.js has
    // no constrained decoding); the instruction is the ask, the parser is the
    // check, and the text is returned raw so a caller's JSON.parse is what
    // decides — never a silent "it was close enough".
    const messages = wantJson && m.messages?.length
      ? [...m.messages, { role: "user", content: "Reply with a single valid JSON object only, no prose." }]
      : m.messages;
    const out = await gen(messages, {
      max_new_tokens: Number.isFinite(m.maxTokens) ? m.maxTokens : 256,
      do_sample: typeof m.temperature === "number" && m.temperature > 0,
      temperature: typeof m.temperature === "number" ? m.temperature : 1,
      return_full_text: false,
    });
    self.postMessage({ kind: "result", id: m.id, text: textOf(out) });
  } catch (e) {
    self.postMessage({ kind: "error", id: m.id, message: e?.message ?? String(e) });
  }
};