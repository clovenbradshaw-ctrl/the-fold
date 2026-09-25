// goldens/conduct/fetch.mjs — pull the corpus and freeze it.
//
// The same discipline as eoreader6 `goldens/cast/fetch.mjs`: the text is a
// received gift, it is pinned by sha256, and `texts/` is gitignored while the
// lock file is committed. A score against an unpinned corpus is
// uninterpretable a year later — the number moves and nobody can say whether
// the instrument changed or the material did.
//
//   node goldens/conduct/fetch.mjs
//   node goldens/conduct/fetch.mjs --check     (verify the pin, fetch nothing)

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEXTS = join(HERE, "texts");
const LOCK = join(HERE, "fetched.lock.json");

export const CORPUS = {
  name: "pg1661.txt",
  title: "The Adventures of Sherlock Holmes",
  author: "Arthur Conan Doyle",
  giver: "Project Gutenberg",
  ebook: 1661,
  url: "https://www.gutenberg.org/files/1661/1661-0.txt",
  // Why this book and not a novel: the conduct items need facts that are
  // stated ONCE, at a byte offset, with rival values that occur ZERO times —
  // so that "the instrument said Ohio" can never be the corpus talking. A
  // 600KB collection gives that and still exercises retrieval at a real
  // scale; a 3MB novel gives the scale and drowns the single-occurrence
  // pinning in repetition.
};

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

export function corpusPath() {
  return join(TEXTS, CORPUS.name);
}

/** Read the pinned corpus, refusing to hand back bytes that do not match the
 *  lock. Every consumer in this golden goes through here. */
export function readCorpus() {
  const path = corpusPath();
  if (!existsSync(path)) {
    throw new Error(`conduct: corpus missing — run \`node goldens/conduct/fetch.mjs\` (${path})`);
  }
  const text = readFileSync(path, "utf8");
  if (!existsSync(LOCK)) throw new Error("conduct: fetched.lock.json missing — the pin is the golden");
  const lock = JSON.parse(readFileSync(LOCK, "utf8"));
  const got = sha256(Buffer.from(text, "utf8"));
  if (got !== lock.sha256) {
    throw new Error(`conduct: corpus sha256 ${got} does not match the pin ${lock.sha256}`);
  }
  return text;
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  if (checkOnly) {
    readCorpus();
    const lock = JSON.parse(readFileSync(LOCK, "utf8"));
    console.log(`pin holds: ${CORPUS.name} ${lock.bytes} bytes sha256 ${lock.sha256}`);
    return;
  }

  mkdirSync(TEXTS, { recursive: true });
  console.log(`fetching ${CORPUS.url}`);
  const res = await fetch(CORPUS.url);
  if (!res.ok) throw new Error(`gutenberg ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const digest = sha256(buf);

  if (existsSync(LOCK)) {
    const lock = JSON.parse(readFileSync(LOCK, "utf8"));
    if (lock.sha256 !== digest) {
      // Not an error to fix by overwriting the lock. A moved corpus invalidates
      // every pinned occurrence count in items.json, and those counts are the
      // answer key.
      console.error(
        `REFUSED: fetched sha256 ${digest} != pinned ${lock.sha256}.\n` +
          `The corpus moved. Re-pin deliberately (delete fetched.lock.json) and\n` +
          `re-run \`node goldens/conduct/score.mjs --verify\` — every occurrence\n` +
          `count in items.json is an answer key against these exact bytes.`,
      );
      process.exit(1);
    }
  }

  writeFileSync(corpusPath(), buf);
  writeFileSync(
    LOCK,
    JSON.stringify(
      { ...CORPUS, bytes: buf.length, sha256: digest, fetchedAt: new Date().toISOString().slice(0, 10) },
      null,
      2,
    ) + "\n",
  );
  console.log(`wrote ${corpusPath()} — ${buf.length} bytes, sha256 ${digest}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
