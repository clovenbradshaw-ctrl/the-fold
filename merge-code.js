// merge-code.js — CON, mechanically: two programs' functions become one,
// without a model call wherever the merge is unambiguous.
//
// A merge is a BIND, not a rewrite: every top-level function the SOURCE
// program defines that the TARGET does not already define by that name
// joins the target's own file, in the order it appeared in the source. A
// name both programs define is a COLLISION and refuses the WHOLE merge —
// atomic, the same posture build-log.js's own applyOps already holds for a
// patch: it lands complete or it does not land, never half. Nothing here
// guesses which of two same-named functions the reader meant.
//
// Pure. Only python and js are supported — the two languages
// code-piece.js already builds — because both have a mechanical top-level
// def/function boundary a regex can find without a parser. An unsupported
// language is a typed refusal, never a silent no-op.

const LANGS = Object.freeze({
  python: {
    defRe: /^def\s+([A-Za-z_]\w*)\s*\(/gm,
    // From a def's own line to the next line that starts back at column 0
    // with a non-blank character — a blank line inside the body does not
    // match, so it is skipped over, not read as the boundary. The same
    // lookahead shape code-piece.js::RUNTIMES.python.bodyRe already uses.
    bodyEnd: (code, start) => {
      const rest = code.slice(start + 1);
      const m = rest.search(/\n(?=\S)/);
      return m < 0 ? code.length : start + 1 + m + 1;
    },
    entryRe: /\ndef main\(\):/,
  },
  js: {
    defRe: /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
    // Brace-counted from the function's own opening `{` to its match —
    // js's top-level boundary is not indentation, so python's lookahead
    // does not transfer.
    bodyEnd: (code, start) => {
      const open = code.indexOf("{", start);
      if (open < 0) return code.length;
      let depth = 0;
      for (let i = open; i < code.length; i++) {
        if (code[i] === "{") depth++;
        else if (code[i] === "}") {
          depth--;
          if (depth === 0) return i + 1;
        }
      }
      return code.length;
    },
    entryRe: /\nfunction main\(\)/,
  },
});

export const MERGE_LANGS = Object.freeze(Object.keys(LANGS));

/**
 * Every top-level function this language's mechanical boundary finds, in
 * source order: {name, start, end, body}. An unsupported language, or code
 * that is not a string, returns an empty list — never a guess.
 */
export function functionsIn(lang, code) {
  const L = LANGS[lang];
  if (!L || typeof code !== "string") return [];
  const out = [];
  for (const m of code.matchAll(L.defRe)) {
    const start = m.index;
    const end = L.bodyEnd(code, start);
    out.push({ name: m[1], start, end, body: code.slice(start, end) });
  }
  return out;
}

/**
 * Merge SOURCE's functions into TARGET, mechanically. Returns
 * `{ok:true, code, brought}` (the names actually brought over, in source
 * order) or `{ok:false, gap}` typed by what refused it:
 *   unsupported_lang   — neither python nor js
 *   name_collision     — both programs define one or more of the same names
 *   nothing_to_bring   — every source function is already named in target
 *
 * Brought functions land right before target's own `main` entry point when
 * one is found (the convention code-piece.js's own skeletonFor already
 * establishes — the pipeline still runs target's own main last); otherwise
 * appended at the end of the file.
 */
export function mergeCode(lang, targetCode, sourceCode) {
  const L = LANGS[lang];
  if (!L) return { ok: false, gap: { kind: "unsupported_lang", lang, reason: `merge-code only reads ${MERGE_LANGS.join("/")}` } };
  const targetFns = functionsIn(lang, targetCode);
  const sourceFns = functionsIn(lang, sourceCode);
  const targetNames = new Set(targetFns.map((f) => f.name));
  const collisions = [...new Set(sourceFns.filter((f) => targetNames.has(f.name)).map((f) => f.name))];
  if (collisions.length) {
    return { ok: false, gap: { kind: "name_collision", names: collisions, reason: `both programs define ${collisions.join(", ")} — rename one before merging` } };
  }
  const bringing = sourceFns.filter((f) => !targetNames.has(f.name));
  if (!bringing.length) {
    return { ok: false, gap: { kind: "nothing_to_bring", reason: "every function in the source is already named in the target" } };
  }
  const entryAt = String(targetCode ?? "").search(L.entryRe);
  const block = bringing.map((f) => f.body.trimEnd() + "\n").join("\n");
  const code =
    entryAt < 0
      ? String(targetCode ?? "").trimEnd() + "\n\n" + block
      : targetCode.slice(0, entryAt) + "\n" + block + targetCode.slice(entryAt);
  return { ok: true, code, brought: bringing.map((f) => f.name) };
}
