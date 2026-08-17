#!/bin/sh
# Mirror the MLC weights for Llama-3.2-3B-Instruct-q4f16_1-MLC from
# HuggingFace into this directory, resumable, so the page can load the model
# from localhost alone (P1). Run from the-fold/: sh models/fetch-llama32-3b.sh
set -e
BASE="https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/main"
DEST="models/Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/main"
mkdir -p "$DEST" models/libs
cd "$DEST"
# tensor-cache.json is the manifest web-llm >= 0.2.84 actually loads by;
# ndarray-cache.json is the older name, kept because both name the shards.
for f in mlc-chat-config.json ndarray-cache.json tensor-cache.json tokenizer.json tokenizer_config.json; do
  [ -s "$f" ] || curl -sL --fail -C - -o "$f" "$BASE/$f"
done
SHARDS=$(node -e "console.log(require('./ndarray-cache.json').records.map(r=>r.dataPath).join('\n'))")
for f in $SHARDS; do
  # -C - resumes a partial shard; a complete one is skipped by size check
  want=$(node -e "console.log(require('./ndarray-cache.json').records.find(r=>r.dataPath==='$f').nbytes)" 2>/dev/null || echo 0)
  have=$(stat -f%z "$f" 2>/dev/null || echo 0)
  [ "$have" = "$want" ] && continue
  curl -sL --fail -C - -o "$f" "$BASE/$f"
done
# Integrity: every shard's md5 against the manifest's own record.
node -e "
const n=require('./ndarray-cache.json'),c=require('crypto'),fs=require('fs');
const bad=n.records.filter(r=>c.createHash('md5').update(fs.readFileSync(r.dataPath)).digest('hex')!==r.md5sum);
if(bad.length){console.error('md5 mismatch:',bad.map(r=>r.dataPath).join(' '));process.exit(1)}
console.log('all '+n.records.length+' shards md5-verified');
"
cd ../../../..
WASM="models/libs/Llama-3.2-3B-Instruct-q4f16_1_cs1k-webgpu.wasm"
[ -s "$WASM" ] || curl -sL --fail -C - -o "$WASM" \
  "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Llama-3.2-3B-Instruct-q4f16_1_cs1k-webgpu.wasm"
echo "done: $(du -sh models | cut -f1) in models/"
