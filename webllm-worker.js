// webllm-worker.js — the worker the in-tab engine actually runs in. All of
// the model lives here: the weight fetches, the wasm, the WebGPU device, the
// decode loop. The page talks to it through web-llm's own RPC handler; if
// the browser reclaims the GPU this worker dies and webllm-client.js builds
// a fresh one — the page itself never holds the device.
import { WebWorkerMLCEngineHandler } from "/node_modules/@mlc-ai/web-llm/lib/index.js";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
