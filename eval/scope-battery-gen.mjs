// One request at a time to the local Ollama; writes the model's own answers.
import fs from "node:fs";
import { BATTERY } from "./scope-battery-questions.mjs";
const MODEL = process.argv[2] ?? "gemma2:2b";
const out = process.argv[3];
const qs = [...BATTERY.open.map((x) => x[1]), ...BATTERY.timeless, ...BATTERY.past, ...BATTERY.chat, ...BATTERY.probe];
const done = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
for (const q of qs) {
  if (done[q]) continue;
  const r = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", body: JSON.stringify({ model: MODEL, stream: false, options: { temperature: 0.2, num_predict: 160 }, messages: [{ role: "user", content: q }] }) });
  const j = await r.json();
  done[q] = j.message?.content ?? "";
  fs.writeFileSync(out, JSON.stringify(done, null, 1));
  console.log(q, "->", done[q].slice(0, 80).replace(/\n/g, " "));
}
