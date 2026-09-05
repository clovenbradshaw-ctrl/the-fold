#!/usr/bin/env node
// matrix-worker.mjs — serve a room's sealed prompts from this machine's
// Ollama, headless (P119). The terminal home of "use other machines to run
// inference": leave this running on the machine that has the GPU, and every
// member of the room — including you, from a phone on the static site — can
// pick its models in the picker. Prompts arrive sealed under the chat key,
// are answered here by Ollama on localhost, and go back sealed; the
// homeserver sees an address, an id, a seal and a size.
//
//   node matrix-worker.mjs <share link> [--user NAME] [--homeserver URL] [--models a,b]
//
// The share link carries the room and its key in the fragment. The homeserver
// is the link's unless --homeserver says otherwise; the user name is asked
// for; the password is read from the terminal with echo off and sent only in
// Matrix's own login call. The session, the identity pair and the room key
// are kept in ~/.the-fold/matrix-worker.json (mode 600) so a restart needs
// no password; delete the file to forget. Nothing is written anywhere else.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";
import { FoldMatrix, MatrixError } from "./matrix-client.js";
import { parseShareLink } from "./matrix.js";

const OLLAMA = process.env.OLLAMA_HOST?.startsWith("http") ? process.env.OLLAMA_HOST : "http://localhost:11434";
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const link = args.find((a) => /#.*fold-share=/.test(a));
if (!link || !parseShareLink(link)) {
  console.error("usage: node matrix-worker.mjs <share link> [--user NAME] [--homeserver URL] [--models a,b]\nthe share link is what /share prints; its #fragment carries the room and its key");
  process.exit(2);
}
const shared = parseShareLink(link);

const dir = join(homedir(), ".the-fold");
const file = join(dir, "matrix-worker.json");
const storage = {
  get() { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } },
  set(obj) { mkdirSync(dir, { recursive: true, mode: 0o700 }); writeFileSync(file, JSON.stringify(obj), { mode: 0o600 }); },
};

async function askLine(prompt, { muted = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (muted) { const w = rl._writeToOutput; rl._writeToOutput = (s) => { if (/\n|\r/.test(s) || s.startsWith(prompt)) w.call(rl, s.startsWith(prompt) ? prompt : "\n"); }; }
  return new Promise((resolve) => rl.question(prompt, (answer) => { rl.close(); if (muted) process.stdout.write("\n"); resolve(answer.trim()); }));
}

async function ollamaModels() {
  const r = await fetch(`${OLLAMA}/api/tags`);
  if (!r.ok) throw new Error(`Ollama answered ${r.status} on ${OLLAMA}`);
  return ((await r.json()).models ?? []).map((m) => m.name);
}
/** The local mouth: one Ollama chat call, no stream, with what it measured. */
async function complete({ model, messages, options }) {
  const started = Date.now();
  const body = { model, messages, stream: false, options: {} };
  if (options?.maxTokens) body.options.num_predict = options.maxTokens;
  if (typeof options?.temperature === "number") body.options.temperature = options.temperature;
  if (options?.json) body.format = typeof options.json === "object" ? options.json : "json";
  const r = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Ollama answered ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return { text: j.message?.content ?? "", model, usage: { promptTokens: j.prompt_eval_count ?? 0, outTokens: j.eval_count ?? 0 }, device: { home: "terminal", label: `${process.platform} ${process.arch} · Ollama`, ms: Date.now() - started } };
}

const secretsLog = (kind, fields) => console.log(`  ${new Date().toISOString()} ${kind} ${JSON.stringify(fields)}`);
const fm = new FoldMatrix({ storage, record: secretsLog });
try {
  if (!fm.session) {
    const hs = opt("--homeserver") ?? shared.hs;
    const user = opt("--user") ?? (await askLine(`user name on ${hs}: `));
    const password = await askLine("password (not echoed): ", { muted: true });
    const st = await fm.login(hs, user, password);
    console.log(`signed in as ${st.user} on ${st.hs}; session kept in ${file}`);
  } else console.log(`session: ${fm.session.user_id} on ${fm.session.hs} (from ${file})`);
  const joined = await fm.joinFromLink(link);
  if (!joined.joined) { console.error(`cannot join ${shared.room}: ${joined.gap}`); process.exit(1); }
  console.log(`room ${shared.name ? `"${shared.name}" ` : ""}${shared.room}: ${joined.entries.length} preserved entr${joined.entries.length === 1 ? "y" : "ies"} readable here`);
  const models = opt("--models")?.split(",").map((s) => s.trim()).filter(Boolean) ?? (await ollamaModels());
  if (!models.length) { console.error("Ollama offers no models here — pull one first"); process.exit(1); }
  const controller = new AbortController();
  const stop = () => { console.log("\nwithdrawing the offer…"); controller.abort(); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  console.log(`serving ${models.join(", ")} from ${OLLAMA} — members pick "room:${fm.session.user_id} <model>"; ctrl-c withdraws`);
  const r = await fm.serve(shared.room, { complete, models, home: "terminal", signal: controller.signal, onJob: ({ from, model, messages }) => console.log(`  job from ${from}: ${model}, ${messages} message(s)`) });
  console.log(`served ${r.served} job(s)`);
} catch (e) {
  console.error(e instanceof MatrixError ? `matrix: ${e.message}` : e?.stack ?? e);
  process.exit(1);
}
