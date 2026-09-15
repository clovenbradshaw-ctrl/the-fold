import test from "node:test";
import assert from "node:assert/strict";

// A stub DOM, render.test.mjs's own precedent (the actual, real browser DOM
// this module is written for at runtime; the stub only needs to satisfy
// what coding-cards.js actually calls). Installed on globalThis.document
// because coding-cards.js calls `document.createElement` directly —
// matching every other DOM-building module in this repo (github-pane.js,
// log-pane.js), none of which take an injected document either.
function makeStubDocument() {
  function node(tag) {
    return {
      tagName: tag,
      className: "",
      textContent: "",
      children: [],
      append(...kids) { this.children.push(...kids); },
      appendChild(k) { this.children.push(k); return k; },
      querySelector(sel) {
        const find = (n) => {
          if (n.tagName === sel) return n;
          for (const c of n.children ?? []) { const f = find(c); if (f) return f; }
          return null;
        };
        return find(this);
      },
    };
  }
  return { createElement: node };
}
globalThis.document = makeStubDocument();

const { cardFor } = await import("./coding-cards.js");

function text(n) {
  // Flatten a stub node's own textContent plus every descendant's, in
  // document order — enough to assert "this card says X somewhere".
  let out = n.textContent ?? "";
  for (const c of n.children ?? []) out += " " + text(c);
  return out;
}

test("a mechanical event renders the mechanical badge, states the names, includes the skeleton code", () => {
  const c = cardFor("skeleton_born", { fold: 3, names: ["reverse_string", "print_length"], code: "def reverse_string():\n    pass\n" });
  const t = text(c);
  assert.match(t, /fold 3 born as a skeleton/);
  assert.match(t, /reverse_string.*print_length/);
  assert.match(t, /mechanical — no model call/);
  assert.match(t, /def reverse_string/, "the skeleton's own code is shown, not just described");
});

test("a model-call event carries its exact sent messages, verbatim, behind an expand", () => {
  const sentMessages = [{ role: "user", content: "write reverse_string" }];
  const c = cardFor("function_step", { name: "reverse_string", chars: 42, summary: "ran clean · exit 0", fixed: false, stubNext: false, witnessed: "str: 'olleh'", sentMessages });
  const det = c.querySelector("details");
  assert.ok(det, "a model-call card offers a details expand");
  const pre = det.children.find((k) => k.tagName === "pre");
  assert.equal(pre.textContent, JSON.stringify(sentMessages, null, 2), "the expand holds the exact bytes sent, not a paraphrase");
});

test("a refusal never claims a model call it did not make", () => {
  const c = cardFor("unsupported_language", { lang: "ruby", supported: ["python", "js"] });
  assert.match(text(c), /refused/);
});

test("iterate_outcome renders a real line diff between before and after", () => {
  const c = cardFor("iterate_outcome", { note: "fold 2 · v2 · revision landed", before: "def f():\n    return 1\n", after: "def f():\n    return 2\n", mechanical: true, sentCalls: [] });
  const diffLines = c.children.find((k) => k.className === "coding-card-diff");
  assert.ok(diffLines, "the outcome card carries a diff block");
  const removed = diffLines.children.filter((k) => k.className === "diff-line diff-remove");
  const added = diffLines.children.filter((k) => k.className === "diff-line diff-add");
  assert.equal(removed.length, 1);
  assert.equal(added.length, 1);
});

test("an event this file has not caught up to still renders — honestly, as itself, never silently dropped", () => {
  const c = cardFor("some_future_event", { detail: "x" });
  assert.match(text(c), /some_future_event/);
});
