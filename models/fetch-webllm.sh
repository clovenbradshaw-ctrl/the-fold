#!/bin/sh
# Mirror the MLC weights and the WebGPU lib for ONE in-tab model from the
# publisher into models/, resumable and md5-verified, so the page can load it
# from localhost alone (P1: every byte same-origin) — and so a static
# deployment can serve the same directory as the site's own bytes.
#
#   sh models/fetch-webllm.sh <model_id>          one model
#   sh models/fetch-webllm.sh                      every model in the rung's roster
#
# The model id is web-llm's own (webllm-rung.js's WEBLLM_MODELS). The
# publisher address and the wasm address are read off the VENDORED library's
# prebuilt catalog entry for that id — never typed here — so they cannot
# drift from what the installed engine expects (webllm-rung.test.mjs pins the
# mirror to the library the same way). fetch-llama32-3b.sh is this script's
# ancestor, kept for the one model it names.
set -e
cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
  for id in $(node --input-type=module -e 'import { WEBLLM_MODELS } from "./webllm-rung.js"; console.log(WEBLLM_MODELS.map((m) => m.id).join("\n"))'); do
    sh models/fetch-webllm.sh "$id"
  done
  exit 0
fi

ID="$1"
ENTRY=$(node --input-type=module -e '
  const m = await import("@mlc-ai/web-llm");
  const e = m.prebuiltAppConfig.model_list.find((x) => x.model_id === process.argv[1]);
  if (!e) { console.error("the installed web-llm ships no entry for " + process.argv[1]); process.exit(2); }
  console.log(e.model.replace(/\/$/, "") + " " + e.model_lib);
' "$ID")
BASE="$(echo "$ENTRY" | cut -d" " -f1)"
LIB_URL="$(echo "$ENTRY" | cut -d" " -f2)"
case "$BASE" in */resolve/main) ;; *) BASE="$BASE/resolve/main" ;; esac
DEST="models/$ID/resolve/main"
mkdir -p "$DEST" models/libs
echo "mirroring $ID from $BASE"
cd "$DEST"
# tensor-cache.json is the manifest web-llm >= 0.2.84 actually loads by;
# ndarray-cache.json is the older name, kept because both name the shards.
for f in mlc-chat-config.json ndarray-cache.json tensor-cache.json tokenizer.json tokenizer_config.json; do
  [ -s "$f" ] || curl -sL --fail -C - -o "$f" "$BASE/$f" || echo "  (no $f at the publisher — fine if the config does not name it)"
done
# Every tokenizer file the config itself names (OLMo 2 and RedPajama name
# vocab.json and merges.txt beside tokenizer.json) — the engine loads by
# this list, so the mirror is complete only when each of them is here.
for f in $(node -e "console.log((require('./mlc-chat-config.json').tokenizer_files||[]).join(' '))"); do
  [ -s "$f" ] || curl -sL --fail -C - -o "$f" "$BASE/$f"
done
# The manifest: tensor-cache.json (what web-llm >= 0.2.84 loads by; the only
# one some publishers ship, e.g. OLMo 2) or the older ndarray-cache.json —
# both carry the same shard list with nbytes and md5sum per shard.
MANIFEST=tensor-cache.json; [ -s "$MANIFEST" ] || MANIFEST=ndarray-cache.json
[ -s "$MANIFEST" ] || { echo "no manifest (tensor-cache.json / ndarray-cache.json) at the publisher for $ID" >&2; exit 1; }
SHARDS=$(node -e "console.log(require('./$MANIFEST').records.map(r=>r.dataPath).join('\n'))")
for f in $SHARDS; do
  # -C - resumes a partial shard; a complete one is skipped by size check
  want=$(node -e "console.log(require('./$MANIFEST').records.find(r=>r.dataPath==='$f').nbytes)" 2>/dev/null || echo 0)
  have=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null || echo 0)
  [ "$have" = "$want" ] && continue
  curl -sL --fail -C - -o "$f" "$BASE/$f"
done
# Integrity: every shard's md5 against the manifest's own record.
node -e "
const n=require('./$MANIFEST'),c=require('crypto'),fs=require('fs');
const bad=n.records.filter(r=>c.createHash('md5').update(fs.readFileSync(r.dataPath)).digest('hex')!==r.md5sum);
if(bad.length){console.error('md5 mismatch:',bad.map(r=>r.dataPath).join(' '));process.exit(1)}
console.log('  all '+n.records.length+' shards md5-verified');
"
cd ../../../..
WASM="models/libs/$(basename "$LIB_URL")"
[ -s "$WASM" ] || curl -sL --fail -C - -o "$WASM" "$LIB_URL"
echo "done: $ID ($(du -sh "models/$ID" | cut -f1)) + $(basename "$WASM")"
