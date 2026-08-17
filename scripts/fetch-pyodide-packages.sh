#!/bin/sh
# Mirror numpy/matplotlib/pandas and their transitive deps (as declared in
# node_modules/pyodide/pyodide-lock.json) from the pyodide CDN into
# node_modules/pyodide/, resumable, sha256-verified against the lock file's
# own records — so term-py-worker.mjs's loadPackage() resolves them from
# indexURL: "/node_modules/pyodide/" alone, same-origin, no network at
# request time (P1). The npm pyodide package ships the runtime and stdlib
# only; individual package wheels are not vendored by npm and must be
# fetched once, the same way models/fetch-llama32-3b.sh mirrors the WebLLM
# weights. Run from the-fold/: sh scripts/fetch-pyodide-packages.sh
set -e
DEST="node_modules/pyodide"
VERSION=$(node -e "console.log(require('./$DEST/package.json').version)")
BASE="https://cdn.jsdelivr.net/pyodide/v${VERSION}/full"

node -e "
const lock = require('./$DEST/pyodide-lock.json').packages;
const names = ['numpy','matplotlib','pandas'];
const seen = new Set();
const stack = [...names];
while (stack.length) {
  const n = stack.pop();
  const key = lock[n] ? n : n.toLowerCase();
  if (!lock[key] || seen.has(key)) continue;
  seen.add(key);
  stack.push(...(lock[key].depends || []));
}
for (const k of seen) console.log(lock[k].file_name + ' ' + lock[k].sha256);
" > /tmp/fold-pyodide-wheels.txt

echo "fetching $(wc -l < /tmp/fold-pyodide-wheels.txt | tr -d ' ') wheels for numpy, matplotlib, pandas (transitive closure)"

while read -r f sha; do
  [ -s "$DEST/$f" ] || curl -sL --fail -C - -o "$DEST/$f" "$BASE/$f"
done < /tmp/fold-pyodide-wheels.txt

node -e "
const fs = require('fs'), crypto = require('crypto');
const lines = fs.readFileSync('/tmp/fold-pyodide-wheels.txt', 'utf8').trim().split('\n');
const bad = [];
for (const line of lines) {
  const [f, want] = line.split(' ');
  const have = crypto.createHash('sha256').update(fs.readFileSync('$DEST/' + f)).digest('hex');
  if (have !== want) bad.push(f);
}
if (bad.length) { console.error('sha256 mismatch:', bad.join(' ')); process.exit(1); }
console.log('all ' + lines.length + ' wheels sha256-verified');
"
rm -f /tmp/fold-pyodide-wheels.txt
