const LANG = {
  python: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  typescript: "typescript",
  ts: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  html: "html",
  htm: "html",
  svg: "html",
  css: "css",
  scss: "css",
  less: "css",
  json: "json",
  xml: "html",
  sql: "sql",
  shell: "shell",
  bash: "shell",
  sh: "shell",
  ruby: "ruby",
  rb: "ruby",
  go: "go",
  rust: "rust",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  php: "php",
  r: "r",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  lua: "lua",
  swift: "swift",
  kotlin: "kotlin",
  kt: "kotlin",
  scala: "scala",
  plaintext: "plaintext",
};

let monaco = null;
let editor = null;
let onChange = null;
let onRun = null;

const ready = new Promise((resolve) => {
  const r = globalThis.require;
  if (!r || typeof r.config !== "function") {
    resolve(null);
    return;
  }
  r.config({ paths: { vs: "/node_modules/monaco-editor/min/vs" } });
  r(["vs/editor/editor.main"], () => {
    monaco = globalThis.monaco;
    // Registers the theme's token-colour CSS rules immediately, before any
    // editor instance exists — colorize() (below) is a static call that can
    // fire on the very first code segment a chat turn ever renders, and
    // without this the rules those spans reference are not on the page yet
    // (they are otherwise only generated the first time editor.create runs).
    if (monaco) monaco.editor.setTheme("vs-dark");
    resolve(monaco);
  });
});

export async function ensureEditor(host) {
  if (editor) return editor;
  const m = await ready;
  if (!m) return null;
  editor = m.editor.create(host, {
    value: "",
    language: "plaintext",
    theme: "vs-dark",
    minimap: { enabled: true },
    fontSize: 13,
    tabSize: 2,
    folding: true,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: "all",
  });
  editor.onDidChangeModelContent(() => {
    if (onChange) onChange(editor.getValue());
  });
  editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => {
    if (onRun) onRun();
  });
  return editor;
}

export function editorGet() {
  return editor ? editor.getValue() : "";
}

export function editorSet(value) {
  if (editor) editor.setValue(value ?? "");
}

export function editorLanguage(lang) {
  if (!editor) return;
  const id = LANG[lang] ?? "plaintext";
  const model = editor.getModel();
  if (model) monaco.editor.setModelLanguage(model, id);
}

export function editorLayout() {
  if (editor) editor.layout();
}

export function editorFocus() {
  if (editor) editor.focus();
}

export function editorOnChange(cb) {
  onChange = cb;
}

export function editorRunShortcut(cb) {
  onRun = cb;
}

/**
 * Syntax-highlight a code segment with monaco's own tokenizer — the SAME
 * highlighting the build editor already uses, never a second library. Code
 * a turn returns is rendered plainly first (the honest floor if monaco is
 * slow to boot or this repo is ever opened off the disk) and this enhances
 * it in place once the AMD load resolves; colorize() is a static call and
 * needs no editor instance. Returns null (never throws) on anything short
 * of a real highlighted string, so a caller can just check truthiness.
 */
export async function colorizeCode(code, lang) {
  const m = await ready;
  if (!m || typeof code !== "string" || !code) return null;
  try {
    const html = await m.editor.colorize(code, LANG[lang] ?? "plaintext", { tabSize: 2 });
    return html || null;
  } catch {
    return null;
  }
}

export function editorDispose() {
  if (editor) {
    editor.dispose();
    editor = null;
    monaco = null;
  }
}
