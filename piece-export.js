// piece-export.js — a finished piece in two faces, both carrying the same
// ground (P121). Pure.
//
// User direction (2026-09-05): "two types of output — one that uses those
// Google hyperlinks that cite specific spans and then footnotes with
// mechanically produced verbatim spans, so the MD reads fine; and an HTML
// that uses real anchoring and a JSON sidecar."
//
//   MARKDOWN  prose that reads: a footnote marker after each placed
//             sentence; the footnote is the source's VERBATIM span (sliced
//             from the passage bytes by address, never retyped) and a link
//             into the page at that span — a text-fragment URL
//             (`#:~:text=`), the browser's own way to scroll to bytes. A
//             sentence nothing read places wears one shared footnote that
//             names the model; a sentence the witness refused, another.
//   HTML      every sentence a span with its tier, its address and its byte
//             offsets as data; the same text-fragment links; the notes list
//             beside it. No script, no remote resource (P1).
//   JSON      the sidecar: the same structure as data — sections, sentences,
//             tiers, cells, addresses, spans with their bytes and links, the
//             prompts — so a reader that wants the record, not the prose,
//             has it whole.
const enc = (t) => encodeURIComponent(String(t)).replace(/-/g, "%2D").replace(/,/g, "%2C");
const words = (t) => String(t ?? "").trim().split(/\s+/).filter(Boolean);
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A text-fragment URL suffix for a quote: whole when short, `start,end` when long — the browser scrolls to the bytes. */
export function textFragment(quote) {
  const w = words(quote);
  if (!w.length) return "";
  if (w.length <= 10) return `#:~:text=${enc(w.join(" "))}`;
  return `#:~:text=${enc(w.slice(0, 5).join(" "))},${enc(w.slice(-5).join(" "))}`;
}

/** The source name of an address (`web:host-0#12-40` → `web:host-0`). */
export // A citation names where to LOOK: bytes in a file, or a moment in a recording
// (P138). Both are addresses; neither may be read as the other.
const sourceOf = (ref) => String(ref ?? "").split("#")[0].split("@")[0].split("~")[0];

/**
 * The verbatim spans a ground stands on, sliced from passage bytes by
 * address — never the model's words. `passages`: ref → { text }.
 */
export function verbatimSpans(ground, { passages = new Map(), urls = {}, sentence = "" } = {}) {
  const out = [];
  const push = (ref, start, end, text) => { const src = sourceOf(ref); const url = urls[src] ?? null; if (!text) return; out.push({ ref, source: src, start, end, text, url, link: url ? url + textFragment(text) : null }); };
  const locate = (ref, needle) => { const p = passages.get(ref) ?? passages.get(sourceOf(ref)); if (!p?.text || !needle) return null; const i = p.text.indexOf(needle); return i < 0 ? null : { start: i, end: i + needle.length }; };
  if (!ground) return out;
  if (ground.tier === "bound") {
    for (const c of ground.claims ?? []) for (const sp of c.spans ?? []) { const p = passages.get(sp.ref); const text = sp.text ?? (p?.text ? p.text.slice(sp.start, sp.end) : null); if (text) push(sp.ref, sp.start ?? null, sp.end ?? null, text); }
    if (!out.length) for (const a of ground.addresses ?? []) { const p = passages.get(a); if (p?.text) push(a, 0, Math.min(p.text.length, 200), p.text.slice(0, 200)); }
  } else if (ground.tier === "witnessed") {
    const decider = ground.decider ?? null;
    for (const a of ground.addresses ?? []) { const loc = locate(a, decider); if (loc) push(a, loc.start, loc.end, decider); else { const p = passages.get(a); if (p?.text && decider) push(a, null, null, decider); } }
  } else if (ground.tier === "recorded" || ground.tier === "contested" || ground.tier === "derived") {
    // AN ADDRESS IS NOT A LICENCE TO QUOTE SOMETHING ELSE (P137). This used
    // to fall back from the exact chunk to the WHOLE SOURCE and then quote its
    // first 200 characters under the chunk's address — the ordinary case,
    // since read-on-arrival admits a whole book while retrieval keeps a few
    // passages, so the exact chunk is usually absent. The reader was shown a
    // verbatim-looking quotation, at a real byte range, of text that is not
    // there. No quotation is honest; a wrong one is not.
    for (const a of ground.addresses ?? []) {
      const p = passages.get(a);
      if (p?.text) push(a, 0, Math.min(p.text.length, 200), p.text.slice(0, 200));
      // The chunk is not in hand. The address is still true and is published
      // as an address — never dressed as a quotation of words nobody read.
      else out.push({ ref: a, source: sourceOf(a), start: null, end: null, text: null, addressOnly: true, url: urls[sourceOf(a)] ?? null, link: urls[sourceOf(a)] ?? null });
    }
  } else if (ground.tier === "named") {
    for (const nm of ground.names ?? []) for (const a of ground.addresses ?? []) { const loc = locate(a, nm); if (loc) { push(a, loc.start, loc.end, nm); break; } }
  }
  return out;
}

/**
 * exportPiece({ title, ask, model, sections, passages, urls, prompts, stats, generatedAt })
 * sections: [{ label, sentences: [{ text, ground }] }]  — ground from ground-ladder.js, with `claims`/`decider` kept on it by the caller.
 */
export function exportPiece({ title = "Untitled", ask = "", model = null, sections = [], passages = new Map(), urls = {}, prompts = {}, stats = null, generatedAt = null } = {}) {
  const notes = [];           // [{ n, spans, text }]
  const noteIndex = new Map(); // key → n
  const noteFor = (spans, kind) => { const key = `${kind}‖` + spans.map((s) => `${s.ref}|${s.start}|${s.end}|${s.text}`).join("‖"); if (noteIndex.has(key)) return noteIndex.get(key); const n = notes.length + 1; notes.push({ n, spans, kind }); noteIndex.set(key, n); return n; };
  const modelName = model ?? "the model";
  const out = { sections: [] };
  const mdParts = [`# ${title}`, ""];
  const htmlSections = [];
  const tally = {};
  let sentenceIndex = 0;
  // The passages the piece cites ride INSIDE the html (P121, user direction:
  // "the html should let me click and see the source content snipped") —
  // one <template> per cited passage, so a click opens the source's own
  // bytes with the span marked, no page load, no remote resource.
  const cited = new Map(); // ref → template id
  const passageId = (ref) => { if (!cited.has(ref)) cited.set(ref, `p${cited.size + 1}`); return cited.get(ref); };
  for (const sec of sections) {
    const mdSent = []; const htmlSent = []; const jsonSent = [];
    for (const s of sec.sentences ?? []) {
      const g = s.ground ?? { tier: "self", cell: "self:model", addresses: [] };
      tally[g.tier] = (tally[g.tier] ?? 0) + 1;
      const spans = verbatimSpans(g, { passages, urls, sentence: s.text });
      for (const sp of spans) if (passages.get(sp.ref)?.text) passageId(sp.ref);
      let marker = "", note = null;
      if (spans.length) { note = noteFor(spans, g.tier); marker = `[^${note}]`; }
      else if (g.tier === "self" && g.refused) marker = "[^r]";
      else if (g.tier === "self") marker = "[^m]";
      else if (g.tier === "named") marker = "[^n]";
      mdSent.push(`${s.text}${marker}`);
      const link = spans.find((x) => x.link)?.link ?? null;
      const dataAddr = (g.addresses ?? []).join(" ");
      const firstSpan = spans[0] ?? null;
      const spanData = spans.filter((sp) => passages.get(sp.ref)?.text).map((sp) => ({ p: passageId(sp.ref), ref: sp.ref, start: sp.start, end: sp.end, text: sp.text, link: sp.link }));
      htmlSent.push(`<span class="s tier-${esc(g.tier)}" data-i="${sentenceIndex}" data-tier="${esc(g.tier)}" data-cell="${esc(g.cell ?? "")}"${dataAddr ? ` data-address="${esc(dataAddr)}"` : ""}${firstSpan && firstSpan.start != null ? ` data-start="${firstSpan.start}" data-end="${firstSpan.end}"` : ""}${spanData.length ? ` data-spans="${esc(JSON.stringify(spanData))}"` : ""} data-phrase="${esc(g.phrase ?? "")}" data-detail="${esc(g.detail ?? "")}" title="${esc(g.detail ?? g.phrase ?? "")}" tabindex="0">${esc(s.text)}${note ? ` <a class="cite" href="${link ? esc(link) : `#note-${note}`}"${link ? ` target="_blank" rel="noopener"` : ""}>${note}</a>` : g.tier === "self" ? ` <sup class="self" title="${esc(modelName)}'s own testimony${g.refused ? " — the witness was asked and no passage states it" : ""}">${g.refused ? "r" : "m"}</sup>` : ""}</span>`);
      jsonSent.push({ i: sentenceIndex, text: s.text, tier: g.tier, cell: g.cell ?? null, addresses: g.addresses ?? [], spans, note, phrase: g.phrase ?? null, detail: g.detail ?? null, ...(g.names ? { names: g.names } : {}), ...(g.refused ? { refused: true } : {}) });
      sentenceIndex += 1;
    }
    // The section's own check (P122): what was checked against the snips, what stayed flagged.
    const sc = sec.snipCheck ?? null;
    const scLine = sc ? `Checked against ${sc.snips} snip${sc.snips === 1 ? "" : "s"}: ${sc.atoms} atom${sc.atoms === 1 ? "" : "s"} (numbers, dates, names), ${sc.supported} placed in a snip beside the sentence's own words, ${sc.flagged} flagged${sc.asked ? `, ${(sc.asked === true ? 1 : Number(sc.asked) || 0) === 1 ? "one rewrite asked" : `${sc.asked} rewrite asks`} (${Object.entries((sc.outcomes ?? []).reduce((m, o) => ({ ...m, [o.outcome]: (m[o.outcome] ?? 0) + 1 }), {})).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing came back"})` : ""}; ${sc.after?.flagged ?? sc.flagged} still flagged${sc.flags?.length ? `: ${sc.flags.map((f) => [...f.flags.map((x) => `${x.kind} "${x.value}" ${x.reason === "absent" ? "in no snip" : "in a snip beside none of its words"}`), ...(f.contradiction ? [`the source says ${f.contradiction.snipYears.join("/")} at ${f.contradiction.ref}#${f.contradiction.start}-${f.contradiction.end}`] : [])].join("; ")).join(" · ")}` : ""}.` : null;
    mdParts.push(`## ${sec.label}`, "", mdSent.join(" "), "", ...(scLine ? [`> ${scLine}`, ""] : []));
    htmlSections.push(`<section><h2>${esc(sec.label)}</h2><p>${htmlSent.join(" ")}</p>${scLine ? `<p class="key check">${esc(scLine)}</p>` : ""}</section>`);
    out.sections.push({ label: sec.label, sentences: jsonSent, prompt: prompts[sec.label] ?? null, ...(sc ? { snipCheck: sc } : {}) });
  }
  // footnotes
  const fn = [];
  for (const n of notes) {
    const parts = n.spans.map((sp) => (sp.addressOnly || !sp.text
      ? `${sp.ref} — on the record at this address; the passage itself was not in hand to quote${sp.link ? ` [open the source](${sp.link})` : ""}`
      : `“${sp.text.replace(/\s+/g, " ").trim()}” — ${sp.source}${sp.start != null ? ` bytes ${sp.start}–${sp.end} of that passage` : ""}${sp.link ? ` [open at the span](${sp.link})` : ""}`));
    fn.push(`[^${n.n}]: ${n.kind === "named" ? "names established here, the claim not: " : ""}${parts.join(" · ")}`);
  }
  if (tally.self) fn.push(`[^m]: ${modelName}'s own testimony — nothing read places it.`, `[^r]: ${modelName}'s own testimony — the witness was asked whether any passage states it and none was pointed at.`);
  if (tally.named) fn.push(`[^n]: the names in this sentence resolve to referents the material establishes; the claim itself was not placed.`);
  const keyLine = `Ground marks: a numbered note is the source's own bytes at the span (offsets count within the addressed passage), linked so the page opens there; a note beginning "names established" places only the names; m is the model's own testimony (${modelName}); r the same, refused by the witness; n names established, claim not.`;
  const md = [...mdParts, "---", "", keyLine, "", ...fn, ""].join("\n");
  const notesHtml = notes.map((n) => `<li id="note-${n.n}">${n.kind === "named" ? "names established here, the claim not: " : ""}${n.spans.map((sp) => `<q>${esc(sp.text)}</q> — <code>${esc(sp.ref)}</code>${sp.link ? ` <a href="${esc(sp.link)}" target="_blank" rel="noopener">open at the span</a>` : ""}`).join(" · ")}</li>`).join("");
  const templates = [...cited.entries()].map(([ref, id]) => `<template id="${id}" data-ref="${esc(ref)}" data-source="${esc(sourceOf(ref))}"${urls[sourceOf(ref)] ? ` data-url="${esc(urls[sourceOf(ref)])}"` : ""}>${esc(passages.get(ref).text)}</template>`).join("");
  // The snip panel: a click (or Enter) on a sentence opens the cited
  // passage(s) with the span marked; a sentence nothing read places says
  // so, by the model's name. Plain inline script — no library, no host.
  const script = `(function(){var panel=document.getElementById('snip');var body=document.getElementById('snip-body');var title=document.getElementById('snip-title');function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}function show(el){var spans=[];try{spans=JSON.parse(el.getAttribute('data-spans')||'[]')}catch(e){spans=[]}var tier=el.getAttribute('data-tier')||'';title.textContent=(el.getAttribute('data-phrase')||tier)+(el.getAttribute('data-detail')?' — '+el.getAttribute('data-detail'):'');if(!spans.length){body.innerHTML='<p class="none">'+esc(tier==='self'?'Nothing read places this sentence; it is the model\u2019s own testimony.':'No cited span for this sentence.')+'</p><p class="sent-copy">'+esc(el.firstChild&&el.firstChild.nodeType===3?el.firstChild.textContent:el.textContent)+'</p>';panel.hidden=false;return}var html='';spans.forEach(function(sp){var t=document.getElementById(sp.p);var text=t?(t.content?t.content.textContent:t.textContent):'';var a=sp.start,b=sp.end;if(a==null||b==null){var i=text.indexOf(sp.text);if(i>=0){a=i;b=i+sp.text.length}}var marked=(a!=null&&b!=null&&a>=0&&b<=text.length)?esc(text.slice(0,a))+'<mark>'+esc(text.slice(a,b))+'</mark>'+esc(text.slice(b)):esc(text);html+='<div class="src"><div class="src-head"><code>'+esc(sp.ref)+'</code>'+(sp.link?' <a href="'+esc(sp.link)+'" target="_blank" rel="noopener">open the page at the span</a>':'')+'</div><pre class="src-text">'+marked+'</pre></div>'});body.innerHTML=html;panel.hidden=false;var m=body.querySelector('mark');if(m)m.scrollIntoView({block:'center'})}document.querySelectorAll('.s').forEach(function(el){el.addEventListener('click',function(e){if(e.target.tagName==='A')return;show(el)});el.addEventListener('keydown',function(e){if(e.key==='Enter')show(el)})});document.getElementById('snip-close').addEventListener('click',function(){panel.hidden=true})})();`;
  const css = `body{font:16px/1.55 Georgia,serif;max-width:74ch;margin:2rem auto;padding:0 1rem;color:#222;background:#fff}.s{cursor:pointer}#snip{position:fixed;right:0;top:0;bottom:0;width:min(46vw,560px);background:#fafaf7;border-left:1px solid #ccc;box-shadow:-4px 0 16px rgba(0,0,0,.08);padding:1rem;overflow:auto;font:14px/1.45 -apple-system,Segoe UI,Helvetica,Arial,sans-serif}#snip[hidden]{display:none}#snip-close{float:right;border:0;background:#eee;border-radius:.4em;padding:.2em .6em;cursor:pointer}#snip-title{font-weight:600;margin:0 0 .6rem}.src{margin:.8rem 0}.src-head{font-size:.85em;color:#555;margin-bottom:.3rem}.src-text{white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e4e4e0;padding:.6rem;border-radius:.4em;max-height:60vh;overflow:auto;font-size:.9em}.src-text mark{background:#ffe98a;padding:0 .1em}.none{color:#a66}.sent-copy{color:#444;font-style:italic}h1{font-size:1.6rem}h2{font-size:1.15rem;margin-top:2rem}.s{border-bottom:2px solid transparent}.s.tier-bound,.s.tier-witnessed,.s.tier-recorded{border-color:#4a9}.s.tier-named{border-color:#c9c}.s.tier-contested{border-color:#c73}.s.tier-derived{border-color:#59c;border-style:dashed}.s.tier-self{border-color:#eee}.cite{font-size:.7em;vertical-align:super;text-decoration:none;color:#287;margin-left:.1em}sup.self{font-size:.6em;color:#a88;margin-left:.1em}ol.notes{font-size:.85rem;color:#444}ol.notes q{quotes:"“" "”"}.key{font-size:.85rem;color:#555;border-top:1px solid #ddd;padding-top:1rem}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body><h1>${esc(title)}</h1><p class="key">${esc(keyLine)}${stats ? ` ${esc(stats)}` : ""}</p>${htmlSections.join("")}<h2>Notes</h2><ol class="notes">${notesHtml}</ol>${tally.self ? `<p class="key">m — ${esc(modelName)}'s own testimony, nothing read places it; r — the same, refused by the witness.</p>` : ""}<p class="key">Click any sentence to see the source content it stands on, snipped, with the span marked.</p><aside id="snip" hidden><button id="snip-close" type="button">close</button><p id="snip-title"></p><div id="snip-body"></div></aside>${templates}<script>${script}</script></body></html>`;
  const json = { schema: "EOPieceExport@1", title, ask, model, generatedAt, tally, sections: out.sections, notes: notes.map((n) => ({ n: n.n, kind: n.kind, spans: n.spans })), passages: [...passages.entries()].map(([ref, p]) => ({ ref, chars: p.text?.length ?? 0, url: urls[sourceOf(ref)] ?? null, ...(cited.has(ref) ? { text: p.text } : {}) })) };
  return { md, html, json, tally, notes: notes.length };
}
