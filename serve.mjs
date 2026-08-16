// serve.mjs — a static server that does not cache.
//
// The page is plain ES modules loaded straight from disk, and a browser will
// happily keep a module it already has. Editing cite.js, reloading, and then
// debugging behaviour that came from the previous copy costs more time than
// this file will ever save: an edit that appears not to work is worse than an
// edit that fails, because you go looking for the bug somewhere else.
//
// So: no-store on everything, and no dependencies.
//
//   node serve.mjs [port]

import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createReadStream, statSync } from "node:fs";

const ROOT = resolve(import.meta.dirname);
const PORT = Number(process.argv[2] ?? 8811);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, rel === "/" ? "index.html" : rel);

  // Never serve outside the directory, whatever the path claims to be.
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("no");
    return;
  }

  let stat;
  try {
    stat = statSync(file);
    if (stat.isDirectory()) {
      file = join(file, "index.html");
      stat = statSync(file);
    }
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "content-length": stat.size,
    // The whole point of this file.
    "cache-control": "no-store, must-revalidate",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`the-fold on http://localhost:${PORT} (no-store)`));
