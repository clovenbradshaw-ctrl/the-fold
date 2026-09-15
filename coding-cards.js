// coding-cards.js — pure rendering: one function per event `codePieceTurn`/
// `foldTurn` disclose (app.js's onEvent, re-dispatched by coding-pane.js as
// "fold:coding-step"), each returning a DOM element. No fetch, no state,
// no import of app.js or coding-pane.js — a card is built from exactly the
// event it is handed, nothing looked up elsewhere.
//
// Two badges, and nothing in between: MECHANICAL (no model call — the
// instrument computed this) or MODEL (a call was made; "view what was
// sent" expands to the exact `messages` array, verbatim, the same
// "show the bytes, invent nothing" discipline renderFold already holds
// chat's own thinking panel to — never a narrated guess at what the model
// was "thinking"). A card never phrases what the pipeline did not itself
// report.
//
// Every user/model-supplied string reaches the DOM through textContent,
// never innerHTML (github-pane.js's own rule, restated here: the shape is
// this file's, the words inside it are not).

import { diffLinesBounded } from "./line-diff.js";

const CODE_PREVIEW_CHARS = 4000;
const DIFF_LINE_CAP = 400;

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function badge(kind) {
  // kind: "mechanical" | "model" | "run" | "refused" | "error"
  const labels = {
    mechanical: "⚙ mechanical — no model call",
    model: "◆ model call",
    run: "▶ sandbox run — no model call",
    refused: "✕ refused",
    error: "⚠ error",
  };
  return el("span", `coding-card-badge coding-card-badge-${kind}`, labels[kind] ?? kind);
}

function codeBlock(code, cap = CODE_PREVIEW_CHARS) {
  const wrap = el("div", "coding-card-code");
  const text = String(code ?? "");
  const pre = el("pre", null, text.length > cap ? text.slice(0, cap) : text);
  wrap.append(pre);
  if (text.length > cap) wrap.append(el("p", "coding-card-note", `truncated at ${cap} of ${text.length} chars`));
  return wrap;
}

/** "view what was sent to the model" — the exact messages array, verbatim,
 *  collapsed by default so a feed of many function cards stays scannable. */
function sentDetails(sentMessages) {
  if (!sentMessages) return null;
  const det = document.createElement("details");
  det.className = "coding-card-sent";
  const sum = el("summary", null, "view what was sent to the model");
  const pre = el("pre", null, JSON.stringify(sentMessages, null, 2));
  det.append(sum, pre);
  return det;
}

function diffView(before, after) {
  const rows = diffLinesBounded(before ?? "", after ?? "");
  const wrap = el("div", "coding-card-diff");
  if (rows === null) {
    wrap.append(el("p", "coding-card-note", "too large to diff here — showing the two versions whole below"));
    wrap.append(el("p", "coding-card-note", "before:"), codeBlock(before));
    wrap.append(el("p", "coding-card-note", "after:"), codeBlock(after));
    return wrap;
  }
  const shown = rows.slice(0, DIFF_LINE_CAP);
  for (const r of shown) {
    const line = el("div", `diff-line diff-${r.type}`);
    line.append(el("span", "diff-marker", r.type === "add" ? "+" : r.type === "remove" ? "−" : " "));
    line.append(el("span", "diff-text", r.line));
    wrap.append(line);
  }
  if (rows.length > shown.length) wrap.append(el("p", "coding-card-note", `+${rows.length - shown.length} more line(s) not shown`));
  return wrap;
}

function card(kind, title, badgeKind) {
  const c = el("div", `coding-card coding-card-${kind}`);
  const head = el("div", "coding-card-head");
  head.append(el("span", "coding-card-title", title));
  if (badgeKind) head.append(badge(badgeKind));
  c.append(head);
  return c;
}

const RENDERERS = {
  unsupported_language(p) {
    const c = card("unsupported_language", `no skeleton for "${p.lang}" — only ${p.supported.join(", ")} are built here`, "refused");
    return c;
  },
  no_features(p) {
    const c = card("no_features", "nothing checkable in that description — say what it should do, in a sentence or two", "refused");
    return c;
  },
  busy() {
    return card("busy", "a turn is already in flight — try again once it finishes", "refused");
  },
  error(p) {
    const c = card("error", "this turn threw before finishing", "error");
    c.append(el("p", "coding-card-note", String(p.message ?? "")));
    return c;
  },
  skeleton_born(p) {
    const c = card("skeleton_born", `fold ${p.fold} born as a skeleton — ${p.names.length} function(s): ${p.names.join(" → ")}`, "mechanical");
    c.append(codeBlock(p.code));
    return c;
  },
  skeleton_run(p) {
    const c = card("skeleton_run", `first run (expected to fail — nothing is filled in yet): ${p.summary}`, "run");
    return c;
  },
  mechanical_repair_rename(p) {
    return card("mechanical_repair", `${p.name}: renamed ${p.wrong} → ${p.right} (the traceback's own correction, ${p.count} call site(s))`, "mechanical");
  },
  mechanical_repair_qualify(p) {
    return card("mechanical_repair", `${p.name}: qualified ${p.missingName} → ${p.foundModule}.${p.missingName} (found on an imported module, ${p.count} call site(s))`, "mechanical");
  },
  helper_stub_added(p) {
    return card("helper_stub_added", `${p.name} reached for an undefined helper, ${p.helperName} — stubbed it in, asking for its body next`, "mechanical");
  },
  function_refused(p) {
    const c = card("function_refused", `${p.name}: the reply wasn't that function (${p.reason}) — stub kept`, "refused");
    const d = sentDetails(p.sentMessages);
    if (d) c.append(d);
    return c;
  },
  none_return_repair(p) {
    const c = card("none_return_repair", `${p.name} returned nothing; told so, asked once — now ${p.now ?? "still unwitnessed"}`, "model");
    const d = sentDetails(p.sentMessages);
    if (d) c.append(d);
    return c;
  },
  function_step(p) {
    const parts = [`${p.name} — ${p.chars} chars from the model`, p.summary];
    if (p.fixed) parts.push("(after repair)");
    if (p.stubNext) parts.push("— the next stub refusing, as expected");
    const c = card("function_step", parts.join(" — "), "model");
    if (p.witnessed) c.append(el("p", "coding-card-note", `witnessed: ${p.witnessed}`));
    const d = sentDetails(p.sentMessages);
    if (d) c.append(d);
    return c;
  },
  done_summary(p) {
    const pct = Math.round((p.modelShare ?? 0) * 100);
    const c = card(
      "done_summary",
      `done — fold ${p.fold}: ${p.parts} function(s) + ${p.helpers} helper(s), ${p.refusals} refused, ${p.fixes} fix(es) · final run: ${p.finalSummary} · the model wrote ${p.modelChars} of ${p.totalChars} chars (${pct}%)`,
      null,
    );
    if (p.code) {
      const det = document.createElement("details");
      const sum = el("summary", null, "view the finished code");
      det.append(sum, codeBlock(p.code));
      c.append(det);
    }
    if (p.sentCalls?.length) {
      const det = document.createElement("details");
      const sum = el("summary", null, `view every model call this task made (${p.sentCalls.length})`);
      const pre = el("pre", null, JSON.stringify(p.sentCalls, null, 2));
      det.append(sum, pre);
      c.append(det);
    }
    return c;
  },
  iterate_asked(p) {
    return card("iterate_asked", `asking for a change to fold ${p.fold}: ${p.instruction}`, "model");
  },
  iterate_outcome(p) {
    const c = card("iterate_outcome", p.note, p.mechanical ? "mechanical" : "model");
    c.append(diffView(p.before, p.after));
    const d = sentDetails(p.sentCalls?.length ? p.sentCalls : null);
    if (d) { d.querySelector("summary").textContent = "view what was sent to the model"; c.append(d); }
    return c;
  },
};

/** The one export a caller needs: an event type and its payload in, a
 *  fully-built card element out. An unrecognized type still renders —
 *  honestly, as itself — rather than being silently dropped, since a new
 *  event this file has not caught up to is a gap in THIS file, not a
 *  reason to hide what the pipeline reported. */
export function cardFor(type, payload) {
  const fn = RENDERERS[type];
  if (fn) return fn(payload ?? {});
  const c = card(type, `${type}: ${JSON.stringify(payload ?? {}).slice(0, 200)}`, null);
  return c;
}
