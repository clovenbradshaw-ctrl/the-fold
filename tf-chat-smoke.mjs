// tf-chat-smoke.mjs — prove the on-device CPU rung's pipeline works, end to
// end, before trusting it in the page. Uses the SAME transformers.js library
// and the SAME model id + dtype the worker loads (the node build in process,
// the web build in the browser — identical ONNX runtime underneath). Downloads
// the weights on first run (~400 MB, cached). Run:
//   node tf-chat-smoke.mjs
import { pipeline } from "@huggingface/transformers";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const DTYPE = "q4";

const t0 = Date.now();
console.log(`loading ${MODEL} (${DTYPE}) on CPU — first run downloads ~400 MB…`);
// Node names the CPU executor "cpu"; the browser worker names the same WASM
// executor "wasm" (transcribe.js's own device). Same ONNX runtime either way.
const gen = await pipeline("text-generation", MODEL, { device: "cpu", dtype: DTYPE });
console.log(`loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const messages = [
  { role: "system", content: "You are a concise assistant. Answer in one or two sentences." },
  { role: "user", content: "What river is Nashville, Tennessee on?" },
];

const t1 = Date.now();
const out = await gen(messages, { max_new_tokens: 64, do_sample: false, return_full_text: false });
const g = out[0]?.generated_text;
const text = typeof g === "string" ? g : Array.isArray(g) ? (g.at(-1)?.content ?? "") : "";
console.log(`generated in ${((Date.now() - t1) / 1000).toFixed(1)}s`);
console.log("assistant:", text.trim());
if (!text.includes("Cumberland")) console.error("WARNING: answer did not name the Cumberland (wrong model or broken decode)");
else console.log("OK: the CPU pipeline produced a real, correct answer");