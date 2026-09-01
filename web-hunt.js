// web-hunt.js — the production wiring eval/web-snip-eval.mjs's own header
// names as real, unbuilt: "this script is a demonstration harness, not a
// change to the shipped capacity-runner.js::landAct, which is fully
// SYNCHRONOUS today and would need a real contract change to accept an
// async web ground." This file is that change, scoped narrowly: `landAct`
// itself stays untouched (a concurrent session's holon.js work now calls
// it too — widening its own contract risks breaking that in-flight wiring)
// and the web hunt lands as a SEPARATE, explicit, opt-in async step a
// caller runs AFTER landAct returns an undetermined evaluate, never
// bundled invisibly inside one synchronous call. Matches this repo's own
// P13 consent posture exactly: a web crossing is a deliberate act, not a
// side effect of checking a claim against local material.
//
// THE ORGANS ARE LIFTED, NOT RE-DERIVED. search/fetchPage/gatherPages/
// queryAcrossPages/copulaOf below are the SAME real, live-tested functions
// eval/web-snip-eval.mjs already built and proved out end to end (Lincoln/
// Johnson/Washington specimens) — copied here verbatim from that file so
// this module can be imported without pulling in an eval driver's own
// process-level main()/CLI concerns. Reconciling the two copies into one
// shared module is real, disclosed follow-up work (the peer session's own
// note: "probably worth reconciling once we're both further along") — not
// attempted here, so as not to edit eval/web-snip-eval.mjs while it may
// still be read as a live reference by that session's own work.
//
// WHAT'S GENUINELY NEW HERE: huntUndetermined, which takes an ALREADY-
// LANDED, ALREADY-UNDETERMINED evaluate task (landAct's own real output)
// and escalates THAT SAME question to the web, landing its finding as a
// SEPARATE experiencer's belief (`who: "the-fold:web-search"`) rather than
// silently merging it into the original material's own verdict — the
// user's own direction, applied here: "everything isn't just given by a
// source it is believed BY an experiencer." REC fires against the ORIGINAL
// local evaluate only when the hunt's own finding disagrees with what the
// question's own grammar declared to expect (`declaredSlotShape`,
// web-claim.js) — mirroring runSlot's exact, already-proven trigger
// ("found MORE fillers than the DEF's own shape said"), never on a bare
// single corroborated answer, which agrees with the common "single" case
// and earns no concession.

import { chunkSource } from "./source.js";
import { rankResults } from "./proof.js";
import { declaredSlotShape } from "./web-claim.js";
import { withExperiencer } from "./experiencer.js";
import { wordSet, hasWord, CLAIM_STOPWORDS, splitSentences as splitGroundingSentences } from "./grounding.js";

async function withRetry(fn, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr;
}

async function search(explore, query) {
  const res = await withRetry(async () =>
    (
      await fetch(`${explore}/api/web/search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      })
    ).json(),
  );
  return res.gap ? { gap: res.gap, results: [] } : { gap: null, results: res.results ?? [] };
}

async function fetchPage(explore, url) {
  const f = await (
    await fetch(`${explore}/api/web/fetch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    })
  ).json();
  if (f.gap || !f.entry?.textPath) return { gap: f.gap ?? { silence: "not-present", detail: "no textPath" } };
  const basename = String(f.entry.textPath).split("/").pop();
  const res = await fetch(`${explore}/web/pages/${basename}`);
  if (!res.ok) return { gap: { silence: "not-present", detail: `page fetch ${res.status}` } };
  const text = await res.text();
  if (!text.trim()) return { gap: { silence: "not-present", detail: "empty text face" } };
  return { url: f.entry.finalUrl ?? url, host: new URL(f.entry.finalUrl ?? url).host, text, challenge: !!f.entry.challenge };
}

async function gatherPages(explore, query, anchorSentence, maxPages = 6) {
  const { gap, results } = await search(explore, query);
  if (gap) return { pages: [], failed: [], gap };
  const ranked = rankResults({ sentence: anchorSentence, tokens: [] }, results);
  const pages = [];
  const failed = [];
  for (const r of ranked.slice(0, maxPages)) {
    const f = await fetchPage(explore, r.url);
    if (f.gap) failed.push({ url: r.url, gap: f.gap });
    else pages.push(f);
  }
  return { pages, failed };
}

const hostsOf = (refs) => [...new Set((refs ?? []).map((r) => String(r).split("#")[0]))];
const textForRef = (chunks, ref) => chunks.find((c) => c.ref === ref)?.text ?? null;

/**
 * FOUND LIVE (Colfax specimen, this session): leaving `object` fully open
 * on a bare copula ("Colfax —was→ ___") returns EVERY "subject was X" fact
 * a real biography states — his birth date, his Speaker election — not
 * specifically the one the claim is actually asking about. The fix is not
 * a hard-coded term ("vice president" typed in somewhere) — it is the
 * SAME "company it keeps" discipline P31's own number-grounding fix
 * already established (grounding.js: numberCompany/numberSupporters): a
 * candidate filler is kept only if its OWN backing passage shares at
 * least one real content word with the CLAIM's own words (never the
 * question's invented restatement, never the filler's own candidate name
 * — self-matching would be circular). "vice"/"president" survive this
 * filter because they are the claim's own stable words; "Abraham"/
 * "Lincoln" — the SPECIFIC, disputed candidate being checked — are
 * deliberately EXCLUDED from the relevance vocabulary (see
 * `relevanceWords` below), because filtering on the disputed answer's own
 * name would make it impossible to ever find a DIFFERENT, correct answer;
 * the OR-shaped match (any one shared word, not all) means this costs
 * nothing on the true case ("vice president" alone already anchors it)
 * while it correctly excludes passages sharing nothing at all.
 */
// P31's own real lesson (grounding.js, "Number grounding: company, not bare
// occurrence"), applied here rather than re-derived worse the first time
// this file tried it: relevance checked against a whole CHUNK (often a
// full paragraph) false-positives on any co-occurrence anywhere in that
// paragraph — found live, this session ("elected Speaker of the House"
// wrongly passed because the SAME Wikipedia lead paragraph also mentions
// "vice president" two sentences away, about a different fact entirely).
// Scoped to the SENTENCE actually containing the filler's own discovered
// text, falling back to the whole chunk only when no single sentence can
// be matched (P31's own disclosed fallback — "never a new false refusal").
function relevantFillers(fillers, chunksByPage, relevanceWords) {
  if (!relevanceWords.size) return fillers; // nothing left to filter on — never a silent full exclusion
  return fillers.filter((f) =>
    f.refs.some((ref) => {
      const host = ref.split("#")[0];
      const chunkText = textForRef(chunksByPage.get(host) ?? [], ref);
      if (!chunkText) return false;
      const fFold = foldFor(f.text);
      const sentences = splitGroundingSentences(chunkText).filter((s) => s?.text);
      const owner = sentences.find((s) => foldFor(s.text).includes(fFold));
      const scoped = owner ? owner.text : chunkText; // fallback: whole chunk, disclosed above
      const passageWords = wordSet(scoped);
      for (const w of relevanceWords) if (hasWord(passageWords, w)) return true;
      return false;
    }),
  );
}

const COPULA_FORMS = new Set(["was", "is", "were", "are"]);
function copulaOf(question) {
  const tokens = String(question ?? "").toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  return tokens.find((t) => COPULA_FORMS.has(t)) ?? null;
}

const foldFor = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
const foldMatches = (a, b) => {
  const x = foldFor(a), y = foldFor(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

/** ONE reader per page (never pooled — the real cross-page coreference-leak
 * bug eval/web-snip-eval.mjs's own header discloses finding and fixing),
 * clustered by fold-substring match across pages, kept only when
 * corroborated on `minHosts` or more DISTINCT hosts. */
function queryAcrossPages(relationsFor, pages, { subject = null, verb = null, object = null }, minHosts = 2) {
  const clusters = [];
  const chunksByPage = new Map();
  let pagesWithEdges = 0;

  for (const p of pages) {
    const chunks = chunkSource(p.host, p.text);
    chunksByPage.set(p.host, chunks);
    let reader;
    try {
      reader = relationsFor(chunks);
    } catch {
      continue;
    }
    if (!reader?.examined) continue;
    const found = reader.queryReferents({ subject, verb, object }) ?? [];
    if (found.length) pagesWithEdges++;
    for (const f of found) {
      const value = f.subject ?? f.object;
      if (!foldFor(value)) continue;
      let c = clusters.find((x) => foldMatches(x.text, value));
      if (!c) {
        c = { text: value, refs: [], hosts: new Set() };
        clusters.push(c);
      } else if (value.length > c.text.length) {
        c.text = value;
      }
      c.refs.push(...f.refs);
      for (const h of hostsOf(f.refs)) c.hosts.add(h);
    }
  }

  const fillers = clusters
    .map((c) => ({ text: c.text, refs: [...new Set(c.refs)], hosts: [...c.hosts] }))
    .filter((c) => c.hosts.length >= minHosts)
    .sort((a, b) => b.hosts.length - a.hosts.length);

  return { fillers, pagesWithEdges, chunksByPage };
}

/**
 * Escalate an already-landed, already-undetermined evaluate task to a real
 * web hunt. Refuses (never silently no-ops) if `priorEvaId` is not on the
 * log or is not actually undetermined — a hunt for something already
 * settled is a wasted, unconsented crossing, not a harmless retry.
 *
 * `question` is the ORIGINAL natural-language question this claim came
 * from (needed for `declaredSlotShape` and `copulaOf` — both read the
 * question's own grammar, never the claim's restated object text, per
 * READING-POLICY's "retrieval is a function of the question's own words").
 * `subject`/`object` follow `queryReferents`'s own contract — exactly one
 * open.
 *
 * Returns `{ ok: true, log, verdict, fillers, recFired }` or
 * `{ ok: false, refusal }`. Never attached to the ORIGINAL evaluate's own
 * belief — lands as its own RESULT on a freshly-landed evaluate task,
 * carrying `experiencer: { who: "the-fold:web-search", read: <urls> }`,
 * so a reader always sees which experiencer found what, never a silent
 * merge into the material's own (still-undetermined) belief.
 */
export async function huntUndetermined(
  grid,
  relationsFor,
  log,
  priorEvaId,
  {
    question,
    subject = null,
    object = null,
    minHosts = 2,
    explore = "http://localhost:8812",
    definiteDeterminers,
    inflectionalSuffixes,
    interrogativePronouns,
    mannerReasonPronouns,
  } = {},
) {
  const priorAct = grid.foldGrid(log).acts.find((a) => a.task_id === priorEvaId);
  if (!priorAct) {
    return { ok: false, refusal: { type: "target_not_found", detail: `"${priorEvaId}" is not on this log — nothing to escalate` } };
  }
  if (priorAct.verdict === "holds" || priorAct.verdict === "refused") {
    return { ok: false, refusal: { type: "already_determined", detail: `"${priorEvaId}" already computed "${priorAct.verdict}" locally — a hunt for a settled claim is a wasted, unconsented crossing` } };
  }
  const slotObject = priorAct.object;
  if (!slotObject) {
    return { ok: false, refusal: { type: "no_object", detail: `"${priorEvaId}" carries no object to hunt for` } };
  }

  // declaredSlotShape (web-claim.js) requires its closed classes declared
  // by the caller — never a default (the same discipline
  // dominantClass/grammar-lens.js already hold) — injected here from the
  // engine's own prior register, exactly as eval/web-snip-eval.mjs already
  // does at its own call site. `interrogativePronouns`/`mannerReasonPronouns`
  // are the two classes web-claim.js's own generalization pass added
  // (2026-08-27) — this call site widened the same day, the same injection
  // discipline, no anchor-recovery predicate passed (`isAdposition` stays
  // optional and this caller has no POS prior in scope), so this path is
  // byte-identical to before for every question it was already correct on.
  const shape = declaredSlotShape(question, { definiteDeterminers, inflectionalSuffixes, interrogativePronouns, mannerReasonPronouns });

  const evaParsed = grid.parseAct(`evaluate "${slotObject}" at Link from differentiate ground web broken:rotation`, { log });
  if (!evaParsed.ok) return { ok: false, refusal: evaParsed.refusal };
  const landedEva = grid.land(log, evaParsed.event);
  let finalLog = landedEva.log;
  const webEvaId = landedEva.ids[0];

  // A network-level failure (explore-server unreachable, DNS, connection
  // refused) is a real, disclosed gap — the identical posture every other
  // typed gap in this file family already holds — never an uncaught
  // exception that crashes whatever called huntUndetermined.
  let pages = [], failed = [], gap = null;
  try {
    ({ pages, failed, gap } = await gatherPages(explore, question, slotObject));
  } catch (err) {
    gap = { silence: "not-present", detail: `explore-server unreachable at ${explore}: ${err.message}` };
  }
  const verb = copulaOf(question);
  const { fillers: rawFillers, pagesWithEdges, chunksByPage } = pages.length
    ? queryAcrossPages(relationsFor, pages, { subject, verb, object }, minHosts)
    : { fillers: [], pagesWithEdges: 0, chunksByPage: new Map() };

  // Relevance words: the claim's own content words, MINUS stopwords, MINUS
  // the subject's own name (already fixed, tells a filler nothing), MINUS
  // any capitalized word — a structural, never-hard-coded way to separate
  // "vice president" (a common-noun relation phrase, kept) from "Abraham
  // Lincoln" (a capitalized proper noun naming the SPECIFIC, disputed
  // candidate this hunt exists to check — including it would make it
  // impossible to ever find a genuinely different, correct answer).
  const subjectWords = wordSet(subject ?? "");
  const relevanceWords = new Set(
    [...String(slotObject).matchAll(/\b\p{Ll}[\p{L}'’]*\b/gu)]
      .map((m) => m[0].toLowerCase())
      .filter((w) => w.length >= 2 && !CLAIM_STOPWORDS.has(w) && !hasWord(subjectWords, w)),
  );
  const fillers = relevantFillers(rawFillers, chunksByPage, relevanceWords);

  let verdict;
  if (!pages.length) verdict = "not-consulted";
  else if (!fillers.length) verdict = "uncorroborated";
  else if (fillers.length > 1) verdict = "multiple-corroborated";
  else verdict = "single-corroborated";

  const urls = pages.map((p) => p.url);
  const attached = grid.attachResult(
    finalLog,
    webEvaId,
    withExperiencer(
      { claim: slotObject, fillers, verdict, pagesConsulted: pages.length, pagesWithEdges, failed, searchGap: gap ?? null },
      { who: "the-fold:web-search", read: urls.join(", ") || "(no pages fetched)" },
    ),
    verdict === "single-corroborated" ? { verdict: "holds" } : {},
  );
  if (attached.ok) finalLog = attached.log;

  // REC only when the hunt found MORE than the declared shape expected —
  // mirroring runSlot's own exact, already-proven trigger. A single
  // corroborated finding agreeing with a "single" (or unknown) declared
  // shape earns no concession; it is simply the answer the local material
  // could not confirm.
  let recFired = false;
  if (fillers.length > 1 && shape.declared !== "enumerated") {
    const trigger = `web hunt found ${fillers.length} independently corroborated answers for "${slotObject}" (${fillers
      .map((f) => `${f.text}, ${f.hosts.length} host(s)`)
      .join("; ")}) — the question's own grammar declared "${shape.declared}"`;
    const rec = grid.concedeEvaluation(finalLog, priorEvaId, { trigger });
    if (rec.ok) {
      finalLog = rec.log;
      recFired = true;
    }
  }

  return { ok: true, log: finalLog, verdict, fillers, recFired, webEvaId };
}
