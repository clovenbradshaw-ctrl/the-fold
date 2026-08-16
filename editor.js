const LANG = {
  python: "python",
  javascript: "javascript",
  js: "javascript",
  node: "javascript",
  html: "html",
  svg: "html",
  shell: "shell",
  bash: "shell",
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

export function editorDispose() {
  if (editor) {
    editor.dispose();
    editor = null;
    monaco = null;
  }
}
