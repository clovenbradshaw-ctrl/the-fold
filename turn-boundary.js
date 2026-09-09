// turn-boundary.js — a model's own turn ends where its role begins.
//
// THE INCIDENT, from a battery run of the plain-chat path (2026-09-08):
// sending "not much" produced two full, differently-worded replies stacked
// for one message (a separate bug, fixed in twoPassTurn — see app.js). The
// very next turn, sending "ok", came back with the visible text literally
// containing '<|user|>', then an invented line the tester never typed
// ("not really"), then '<|assistant|>', then the model answering its own
// made-up line.
//
// THE MECHANISM, confirmed live against this repo's own running Ollama:
// `completeOnce` (app.js) sends the ordinary `/api/chat` messages array and
// trusts Ollama's own chat-template rendering to stop the model at the end
// of ITS turn. Ollama does that by matching the generated text against the
// model's own `stop` PARAMETERs, declared once in its Modelfile — this app
// never sends its own `stop` list and never has, on any model. Every model
// pulled from Ollama's own curated library carries that declaration
// (`ollama show phi3:mini` lists `stop "<|end|>"`, `stop "<|user|>"`,
// `stop "<|assistant|>"` — its own chat template's exact tokens). A model
// pulled straight from Hugging Face by digest (`hf.co/...` — this is
// S1_MODEL, model-routing.js's own small, fast rung that answers every
// trivially-chatty turn) carries no such Modelfile and `ollama show` on it
// returns an EMPTY parameter list, even though its chat template is the
// same `<|user|>`/`<|assistant|>` shape phi3 uses. Nothing tells Ollama
// where this model's turn ends, so a small model that fails to predict the
// literal end token — plausible odds for a ~1B model — just keeps
// predicting the training data's own shape: the next speaker's line, then
// its own next answer, in plain text, using the same literal role markers
// its chat template renders.
//
// THE RULE (L5, this repo's oldest): a compliance-critical fact is never
// left to the model's own instruction-following, or, one layer further out
// than L5 usually reaches, to a pulled model's own possibly-absent
// Modelfile metadata this app cannot audit before every call. The
// mechanical fix is a wall at the boundary itself, applied to every model
// this app might ever route to — including ones with no stop list of their
// own — rather than trusting each one's own Modelfile to have one.
//
// `CHAT_ROLE_MARKERS` is a closed class exactly like `firewall.js`'s own
// `APPARATUS_TERMS` — declared, not derived, each entry named by the real
// chat template it belongs to (the giver, priors.js's own standing) — plus
// one generic pattern for the huggingface `<|...|>` special-token shape
// nearly every open instruct model's tokenizer reserves for this purpose,
// since a future rung this app routes to is not yet on this list by name.
// None of this is an English word or phrase list of the kind this repo
// refuses to hand-roll (priors.js/wordclass.js's own domain) — these are
// literal model-architecture control tokens, a technical closed class with
// no linguistic content, the same standing as CONTINUE_NUDGE's own literal
// stop-cap vocabulary a few lines above it in app.js.

/** Gemma 2 (gemma2:2b). */
const GEMMA_MARKERS = ["<start_of_turn>", "<end_of_turn>"];

/** Phi-3 (phi3:mini) — the exact tokens measured leaking live, above. Also
 * OLMo-2's own `<|user|>`/`<|assistant|>`/`<|system|>` template (the model
 * that actually leaked them, S1_MODEL) — same literal shape, no Modelfile
 * of its own to carry them, which is exactly why they must be declared
 * here rather than trusted to arrive with the model. */
const PHI_STYLE_MARKERS = ["<|end|>", "<|user|>", "<|assistant|>", "<|system|>"];

/** Llama 3 (llama3.2, llama3.1). */
const LLAMA3_MARKERS = ["<|start_header_id|>", "<|end_header_id|>", "<|eot_id|>"];

/** ChatML — Qwen 2.5 / Qwen 3 and most of the rest of this app's picker. */
const CHATML_MARKERS = ["<|im_start|>", "<|im_end|>"];

export const CHAT_ROLE_MARKERS = [...GEMMA_MARKERS, ...PHI_STYLE_MARKERS, ...LLAMA3_MARKERS, ...CHATML_MARKERS];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Named markers first, then the generic huggingface special-token shape
// (`<|word|>`) for a rung not yet named above by digest — a real chat
// answer never legitimately contains one of these; ordinary prose has no
// reason to pair two pipes around a bare identifier inside angle brackets.
const BOUNDARY_RE = new RegExp(`${CHAT_ROLE_MARKERS.map(escapeRe).join("|")}|<\\|[a-zA-Z][a-zA-Z0-9_]*\\|>`, "g");

/**
 * The index a streamed answer's own turn ends at — the start of the first
 * leaked role marker — or -1 when the text never leaked one.
 */
export function turnBoundaryIndex(text) {
  BOUNDARY_RE.lastIndex = 0;
  const m = BOUNDARY_RE.exec(String(text ?? ""));
  return m ? m.index : -1;
}

/**
 * The text truncated at its first leaked turn boundary, trimmed of the
 * trailing whitespace the cut usually leaves. Byte-identical to the input
 * for a clean answer (the overwhelmingly common case) — this never rewrites
 * text that never leaked anything.
 */
export function stripPastTurnBoundary(text) {
  const s = String(text ?? "");
  const i = turnBoundaryIndex(s);
  return i === -1 ? s : s.slice(0, i).trimEnd();
}
