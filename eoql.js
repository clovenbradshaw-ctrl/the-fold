// eoql.js — a QUERY over the holograph's rows, in the record's own notation
// (user, 2026-09-08: "we need to be able to search for terms, filter, enter
// EOT commands to essentially SQL what we want to see").
//
// Pure: no DOM, no engine. The grammar is EOQL as this project already
// writes it (memory: `reference_eoql_notation.md`; Eviction Overwatch chat):
// PREFIX — each act begins with an operator, by keyword or by its received
// glyph (loops.js::OP_GLYPHS), and runs until the next operator; acts are
// joined by `→`, `->`, `|>`, a newline, or nothing at all; a quoted argument
// is one opaque word; the older `op(a, b)` form still parses. Text before
// the first operator is a scan (NUL) — a bare search term is the smallest
// query.
//
// What each operator SELECTS is eopm's own received reading of the nine as
// query steps (`eopm/public/data-chat.js::eoTrace`, giver named there):
//   NUL <words>      scan — rows whose own words carry every word (folded)
//   SIG <words>      attend — every row kept, the matching ones marked `hit`
//   INS              refused: a query instantiates nothing on the record
//   SEG f=v [f=v …]  partition — keep rows whose field equals the value
//                    (`state=open`, `kind=loop`, `t=3` / `turn=3`, `depth=1`,
//                    `op=○`); `f!=v` excludes; `f>n` / `f<n` on numbers
//   CON <words>      follow links — the rows matching, their parts, and every
//                    row tied to them (one hop over `links` and drill)
//   SYN              compute — one row counting what stands: `×N ⇒a ⇐b …`
//   DEF n | f | -f   order — the first n rows, or ordered by a field
//                    (`-f` descending); `DEF` alone keeps the order
//   EVA ⇒|⇐|⇏|⇔|–|∅  judge — keep rows standing at that arrow (or its word:
//                    open, closed, refused, contested, waived, gap)
//   REC f            group — one row per value of the field, its members
//                    beneath it
// A row's fields are its `data` (holograph.js) plus `kind`, `state`, `depth`,
// `turn` (from `data.turn` or a `turn:N` key) and `text` (title · meta ·
// line, folded). Words are matched by containment after the same
// diacritic/case fold retrieval uses — never a stem, never a synonym.

import { OP_GLYPHS } from "./loops.js";

const OPS = Object.freeze(Object.keys(OP_GLYPHS));
const GLYPH_OP = Object.freeze(Object.fromEntries(Object.entries(OP_GLYPHS).map(([op, g]) => [g, op])));
const JOINERS = new Set(["→", "->", "|>"]);
/**
 * The state a judgement's arrow or word names. NOT `∅`: an operator's own
 * glyph is always an operator here, never an argument — `⊨ ∅` would read as
 * a judgement of nothing followed by a scan of nothing, and a token that
 * means two things by position is the ambiguity this notation exists to
 * avoid. A gap is asked for by its word (`⊨ gap`) or its kind (`｜ kind=gap`).
 */
const STATE_OF = Object.freeze({ "⇒": "open", "⇐": "closed", "⇏": "refused", "⇔": "contested", "–": "waived", "-": "waived", open: "open", closed: "closed", refused: "refused", contested: "contested", waived: "waived", gap: "gap", gaps: "gap" });

export const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** tokenize(text) → words; a quoted run is one word; `op(a, b)` reads as `op a b`. */
export function tokenize(text) {
  const out = [];
  const s = String(text ?? "").replace(/\(/g, " ").replace(/\)/g, " ").replace(/,/g, " ");
  const re = /"([^"]*)"|'([^']*)'|«([^»]*)»|(\S+)/g;
  let m;
  while ((m = re.exec(s))) out.push({ word: m[1] ?? m[2] ?? m[3] ?? m[4], quoted: m[4] == null });
  return out;
}

const opOf = (tok) => { if (tok.quoted) return null; const w = tok.word; if (GLYPH_OP[w]) return GLYPH_OP[w]; const up = w.toUpperCase(); return OPS.includes(up) ? up : null; };

/**
 * parse(text) → { acts: [{ op, args }], refused: null | { type, detail } }.
 * Never throws; an empty query is zero acts. INS is refused by name.
 */
export function parse(text) {
  const toks = tokenize(text);
  const acts = [];
  let cur = null;
  for (const tok of toks) {
    if (!tok.quoted && JOINERS.has(tok.word)) continue;
    const op = opOf(tok);
    if (op) { cur = { op, args: [] }; acts.push(cur); continue; }
    if (!cur) { cur = { op: "NUL", args: [] }; acts.push(cur); }
    cur.args.push(tok.word);
  }
  const ins = acts.find((a) => a.op === "INS");
  if (ins) return { acts, refused: { type: "instantiates_nothing", detail: "a query selects what stands on the record; it never instantiates — INS is not a query act" } };
  return { acts, refused: null };
}

/** fieldsOf(row) → the fields a query may read: data, kind, state, depth, turn, text. */
export function fieldsOf(row) {
  const key = String(row.key ?? "");
  const t = /^turn:(\d+)/.exec(key);
  const turn = row.data?.turn ?? (t ? Number(t[1]) : null);
  // A scan reads everything the row KNOWS, not only what it happens to show:
  // a turn row shows its question clipped and holds the whole of it in
  // `data.asked`, and a person searching for a word in that question is
  // searching the record, not the label.
  const said = Object.values(row.data ?? {}).filter((v) => typeof v === "string");
  return { ...(row.data ?? {}), kind: row.kind, state: row.state ?? row.data?.state ?? null, depth: row.depth ?? 0, turn, t: turn, text: fold([row.title, row.meta, row.line, ...said].filter(Boolean).join(" · ")), key };
}

const hasWords = (fields, words) => { const hay = fields.text; return words.every((w) => hay.includes(fold(w))); };
const cmp = (a, b) => { const na = Number(a), nb = Number(b); if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb; return String(a ?? "").localeCompare(String(b ?? "")); };
const eq = (v, want) => { if (v == null) return false; if (Array.isArray(v)) return v.some((x) => eq(x, want)); return fold(v) === fold(want) || (Number.isFinite(Number(want)) && Number(v) === Number(want)); };

/** One partition clause: `f=v`, `f!=v`, `f>n`, `f<n`, `f>=n`, `f<=n`. A bare word is `text` containment. */
function clause(arg) {
  const m = /^([^=!<>]+)(!=|>=|<=|=|>|<)(.*)$/.exec(arg);
  if (!m) return (f) => f.text.includes(fold(arg));
  const [, field, rel, val] = m;
  const k = field.trim();
  return (f) => {
    const v = f[k] ?? (k === "op" ? f.op : undefined);
    switch (rel) {
      case "=": return eq(v, val);
      case "!=": return !eq(v, val);
      case ">": return v != null && cmp(v, val) > 0;
      case "<": return v != null && cmp(v, val) < 0;
      case ">=": return v != null && cmp(v, val) >= 0;
      case "<=": return v != null && cmp(v, val) <= 0;
      default: return false;
    }
  };
}

const mark = (row, hit) => Object.freeze({ ...row, hit: !!hit });
const stateGlyph = { open: "⇒", closed: "⇐", refused: "⇏", contested: "⇔", waived: "–" };

/**
 * run(query, rows) → { rows, refused, acts } — the rows a query selects,
 * in order, from the FLAT rows handed in (holograph.js::flattenRows: every
 * row of the rung with its parts, each knowing its depth and parent). A
 * refused query selects nothing and says why; an empty query selects all.
 */
export function run(query, rows) {
  const parsed = typeof query === "string" ? parse(query) : query;
  if (parsed.refused) return { rows: [], refused: parsed.refused, acts: parsed.acts };
  const all = (rows ?? []).map((r) => Object.freeze({ ...r, hit: false }));
  let cur = all;
  for (const act of parsed.acts) {
    const F = (r) => fieldsOf(r);
    switch (act.op) {
      case "NUL": cur = act.args.length ? cur.filter((r) => hasWords(F(r), act.args)) : cur; break;
      case "SIG": cur = cur.map((r) => mark(r, act.args.length && hasWords(F(r), act.args))); break;
      case "SEG": { const tests = act.args.map(clause); cur = cur.filter((r) => { const f = F(r); return tests.every((t) => t(f)); }); break; }
      case "EVA": { const wants = new Set(act.args.map((a) => STATE_OF[a] ?? STATE_OF[fold(a)]).filter(Boolean)); cur = wants.size ? cur.filter((r) => { const f = F(r); return wants.has(f.state) || (wants.has("gap") && f.kind === "gap"); }) : cur; break; }
      case "CON": {
        const seeds = act.args.length ? cur.filter((r) => hasWords(F(r), act.args)) : cur;
        const keys = new Set(seeds.map((r) => r.key));
        const linked = new Set();
        for (const s of seeds) for (const k of s.links ?? []) linked.add(k);
        cur = all.filter((r) => keys.has(r.key) || linked.has(r.key) || (r.parent != null && keys.has(r.parent)) || (r.links ?? []).some((k) => keys.has(k))).map((r) => mark(r, keys.has(r.key)));
        break;
      }
      case "REC": {
        const field = act.args[0] ?? "kind";
        const groups = new Map();
        for (const r of cur) { const v = F(r)[field]; const k = v == null ? "∅" : Array.isArray(v) ? v.join(" ") : String(v); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
        cur = [...groups.entries()].map(([k, members]) => Object.freeze({ kind: "group", key: `group:${field}:${k}`, title: `${field}=${k}`, meta: `×${members.length}`, line: null, at: null, state: null, data: { [field]: k, count: members.length }, links: members.map((m) => m.key), depth: 0, parent: null, hit: false, drill: () => members }));
        break;
      }
      case "SYN": {
        const tally = {};
        for (const r of cur) { const st = F(r).state; if (st) tally[st] = (tally[st] ?? 0) + 1; }
        const parts = Object.entries(stateGlyph).filter(([st]) => tally[st]).map(([st, g]) => `${g}${tally[st]}`);
        cur = [Object.freeze({ kind: "count", key: "count", title: `×${cur.length}${parts.length ? ` ${parts.join(" ")}` : ""}`, meta: null, line: null, at: null, state: null, data: { count: cur.length, ...tally }, links: cur.map((r) => r.key), depth: 0, parent: null, hit: false, drill: null })];
        break;
      }
      case "DEF": {
        const a = act.args[0];
        if (a == null) break;
        if (/^\d+$/.test(a)) { cur = cur.slice(0, Number(a)); break; }
        const desc = a.startsWith("-"); const field = desc ? a.slice(1) : a;
        cur = [...cur].sort((p, q) => { const c = cmp(F(p)[field], F(q)[field]); return desc ? -c : c; });
        if (/^\d+$/.test(act.args[1] ?? "")) cur = cur.slice(0, Number(act.args[1]));
        break;
      }
      default: break;
    }
  }
  return { rows: cur, refused: null, acts: parsed.acts };
}

/** The query said back in the notation — glyphs for the operators, the arguments as given. */
export function say(parsed) {
  const p = typeof parsed === "string" ? parse(parsed) : parsed;
  return p.acts.map((a) => [OP_GLYPHS[a.op], ...a.args].join(" ")).join(" → ");
}
