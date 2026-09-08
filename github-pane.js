// github-pane.js — the GitHub tab. Standalone, log-pane.js's exact pattern:
// this file owns #pane-github alone; app.js's generic tab switching is all
// it needs from the rest of the page.
//
// Everything here talks ONLY to this app's own /api/github/* and
// /api/skills* routes (localhost, same-origin-or-explicit-fallback like
// log-pane.js's fetchRecordTail) — github.com is never
// touched from the browser (POLICIES P13's boundary; the crossings live in
// explore-server.mjs). The pure shapes (device-flow parsing, base64, the
// repo-path convention, the pull-merge set differences) come from github.js.
//
// SCOPE. A place to keep the fold's own work — folds and skills — and to
// open a space someone shared. One destination, one act, and the act the
// destination implies: your own repo is a LOG you append to, anyone else's
// is ground you PROPOSE to. A destination that is not private is SEALED
// (space-seal.js) so a leak is ciphertext. Every crossing is a click; this
// repo runs no silent background network activity (P13's standing-consent
// posture).

import {
  parseDeviceCodeResponse,
  parseAccessTokenResponse,
  nextPollIntervalMs,
  deviceFlowExpired,
  DeviceFlowError,
  repoPathForSkill,
  repoPathForHistory,
  nameFromRepoPath,
  GITHUB_SKILLS_PREFIX,
  GITHUB_HISTORY_PREFIX,
  mergeSkillsPull,
  mergeHistoryPull,
  prBranchName,
  prTitleFor,
  prBodyFor,
} from "./github.js";
// The seal a non-private space is kept under, and the rule that decides when.
// One cipher, shared with the room (matrix.js) — see space-seal.js's header.
import { newSpaceKey, sealFile, openFile, isSealedPath, plainPath, spaceLink, parseSpaceLink, mustSeal } from "./space-seal.js";

const $id = (x) => document.getElementById(x);
const STORE_KEY = "fold-github";
// Where "save my data" goes when nothing else is chosen. Declared up here
// with the other module constants because fillRepoPicker reads it during
// the render that runs at load.
const DEFAULT_DATA_REPO = "the-fold";
const BUILDS_KEY = "fold-builds";

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveStore(next) {
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

let store = loadStore();
let repoVisibility = new Map(); // fullName -> "public" | "private", filled by the picker

/**
 * The key a sealed space is kept under, per repo. It lives in this browser
 * and in whatever share link you hand out — never in the repo, and never in
 * anything sent to GitHub. Losing it means the space cannot be reopened,
 * which is the honest cost of it being sealed at all.
 */
function spaceKeyFor(fullName, { make = false } = {}) {
  const keys = store.spaceKeys ?? {};
  if (!keys[fullName] && make) {
    store = { ...store, spaceKeys: { ...keys, [fullName]: newSpaceKey() } };
    saveStore(store);
  }
  return (store.spaceKeys ?? {})[fullName] ?? null;
}
let deviceAbort = null; // AbortController for an in-flight device-flow poll

// same-origin first, the explore port as fallback — log-pane.js's own reason:
// the chat page may be served by plain serve.mjs, which has no /api/github.
async function apiBase() {
  for (const base of ["", "http://localhost:8812"]) {
    try {
      const res = await fetch(`${base}/api/skills`);
      if (res.ok) return base;
    } catch {
      /* try the next base */
    }
  }
  return null;
}
let cachedBase = null;
async function api(path, body) {
  if (cachedBase === null) cachedBase = (await apiBase()) ?? "";
  const res = await fetch(`${cachedBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
async function apiGet(path) {
  if (cachedBase === null) cachedBase = (await apiBase()) ?? "";
  const res = await fetch(`${cachedBase}${path}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function note(text, link) {
  const el = $id("gh-note");
  if (!el) return;
  el.textContent = text;
  // A PR's own address is the point of opening one — rendered as a real
  // anchor (createElement, never innerHTML: the URL is GitHub's, the text
  // around it is not necessarily) so the review is one click away.
  if (link?.href) {
    el.append(" ");
    const a = document.createElement("a");
    a.href = link.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.text ?? link.href;
    el.append(a);
  }
}

/**
 * Why a write was refused, in words a person can act on. A 403 from GitHub
 * is not self-explaining: a GitHub App token can read a public repo happily
 * while being installed nowhere and holding no write permission, and 403 on
 * every write — which reads, at the pane, exactly like a bug in this code.
 * This asks the capability route what the credential actually is and says
 * which of the two it is, so the remedy is the one that will work.
 */
async function explainWriteRefusal({ owner, repo, ...cred }) {
  const { data } = await api("/api/github/capability", { owner, repo, ...cred });
  if (data?.tokenKind === "github-app") {
    const installs = data.installations ?? [];
    if (!installs.length) {
      return {
        text: "GitHub refused the write: this token belongs to a GitHub App that is installed on no repository, so it can read public repos but never write. Use a token instead — the section at the bottom of this pane takes one.",
      };
    }
    const canWrite = installs.some((i) => i.permissions?.contents === "write");
    if (!canWrite) {
      return {
        text: "GitHub refused the write: that app is installed but has no Contents: write permission (nor Pull requests: write, which proposing needs). Use a token instead — the section at the bottom of this pane takes one.",
      };
    }
  }
  if (data?.tokenKind === "pat" && data?.repoPermissions && !data.repoPermissions.push) {
    return { text: `GitHub refused the write: this token has no push access to ${owner}/${repo}.` };
  }
  return { text: "GitHub refused the write (403). The credential can read this repo but not write to it." };
}

// ── the PR flow ──────────────────────────────────────────────────────────────
/**
 * Every write this pane makes goes through here (user direction 2026-09-08:
 * "it should be proposing PRs and ask for approval"). One batch of files
 * becomes ONE branch and ONE pull request — a skills sync of twelve files is
 * one PR to review, never twelve — and nothing lands on the default branch
 * until a person merges it on GitHub's own page. The steps are separate
 * routes on purpose, so a failure names the step that failed rather than
 * reporting "push failed" for four different causes.
 */
async function openPullRequest({ owner, repo, cred, files, label }) {
  const paths = files.map((f) => f.path);
  note(`${label}: reading ${owner}/${repo}…`);
  const info = await api("/api/github/repo", { owner, repo, ...cred });
  if (!info.data?.ok) {
    if (info.data?.status === 403) {
      const why = await explainWriteRefusal({ owner, repo, ...cred });
      return { ok: false, ...why };
    }
    return { ok: false, text: `could not read ${owner}/${repo}: ${info.data?.detail ?? `status ${info.data?.status}`}` };
  }
  const base = info.data.defaultBranch;

  const baseRef = await api("/api/github/ref", { owner, repo, ...cred, branch: base });
  if (!baseRef.data?.exists) return { ok: false, text: `could not read the head of ${base}` };

  const branch = prBranchName(paths[0]);
  note(`${label}: opening branch ${branch}…`);
  const made = await api("/api/github/ref/create", { owner, repo, ...cred, branch, sha: baseRef.data.sha });
  if (!made.data?.ok) {
    if (made.data?.status === 403) {
      const why = await explainWriteRefusal({ owner, repo, ...cred });
      return { ok: false, ...why };
    }
    return { ok: false, text: `could not create the branch: ${made.data?.detail ?? `status ${made.data?.status}`}` };
  }

  let written = 0;
  for (const f of files) {
    // the file's sha on the base branch — the new branch is an exact copy of
    // it until this write, so that sha is the one an update needs.
    const read = await api("/api/github/contents/read", { owner, repo, ...cred, path: f.path });
    const sha = read.data?.exists && !read.data.isDirectory ? read.data.sha : null;
    const w = await api("/api/github/contents/write", {
      owner, repo, ...cred, path: f.path, content: f.content, sha, branch, message: f.message,
    });
    if (w.data?.ok) written++;
    else if (w.data?.status === 403) {
      const why = await explainWriteRefusal({ owner, repo, ...cred });
      return { ok: false, ...why };
    }
  }
  if (!written) return { ok: false, text: "the branch was created but no file could be written to it" };

  note(`${label}: opening the pull request…`);
  const pr = await api("/api/github/pulls/create", {
    owner, repo, ...cred,
    title: prTitleFor(paths),
    head: branch,
    base,
    body: prBodyFor(paths),
  });
  if (!pr.data?.ok) {
    return { ok: false, text: `the branch ${branch} holds the change, but the PR could not be opened: ${pr.data?.detail ?? `status ${pr.data?.status}`}` };
  }
  return {
    ok: true,
    text: `${label}: opened PR #${pr.data.number} with ${written} file(s) on ${branch} — nothing is merged until you approve it.`,
    link: { href: pr.data.htmlUrl, text: `review PR #${pr.data.number} →` },
  };
}

// ── connect / device flow ───────────────────────────────────────────────────
function render() {
  const connect = $id("github-connect");
  const body = $id("github-body");
  if (!connect || !body) return;
  if (store.token) {
    connect.hidden = true;
    body.hidden = false;
    showWhoAmI();
    // Swapping the credential must not require disconnecting first: the one
    // that is stored may be able to read and not write (see explainWriteRefusal),
    // and the remedy is pasting a different one.
    const slot = $id("gh-token-slot");
    if (slot) { slot.textContent = ""; slot.append(tokenPasteRow()); }
    // The picker fills itself the moment there is a credential to fill it
    // with — one less thing to press, and it is also the check that says
    // whether the app has anywhere to write yet.
    fillRepoPicker({ quiet: true });
  } else {
    connect.hidden = false;
    body.hidden = true;
    connect.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Connect GitHub";
    btn.onclick = startDeviceFlow;
    connect.appendChild(btn);
    const p = document.createElement("p");
    p.className = "log-note";
    p.textContent = "Sign in with GitHub, or paste a token below. A token needs Contents and Pull requests set to read and write on the repo you want to keep your work in.";
    connect.appendChild(p);
    connect.appendChild(tokenPasteRow());
  }
}

/**
 * The second way in, because the first one cannot write today: a token
 * pasted straight in. A device-flow token is only as capable as the app it
 * came from — an app installed nowhere reads public repos and 403s every
 * write — so a fine-grained token scoped to the one repo (Contents and Pull
 * requests, read and write) is the credential that reliably works. It is
 * stored where the device-flow token already is: localStorage, this machine,
 * never sent anywhere but this app's own localhost server on its way to
 * github.com.
 */
function tokenPasteRow() {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "10px";
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  const input = document.createElement("input");
  input.type = "password";
  input.id = "gh-token-paste";
  input.placeholder = "or paste a GitHub token";
  input.autocomplete = "off";
  input.style.flex = "1";
  input.style.minWidth = "0";
  const use = document.createElement("button");
  use.type = "button";
  use.textContent = "use token";
  use.onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    store = { ...store, token: t };
    saveStore(store);
    input.value = "";
    render();
    note("token saved — it is held in this browser only.");
  };
  row.append(input, use);
  const hint = document.createElement("p");
  hint.className = "log-note";
  hint.append("A fine-grained token needs Contents and Pull requests set to read and write on the repo you are targeting. ");
  const a = document.createElement("a");
  a.href = "https://github.com/settings/personal-access-tokens/new";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "make one →";
  hint.append(a);
  wrap.append(row, hint);
  return wrap;
}

async function startDeviceFlow() {
  deviceAbort?.abort();
  deviceAbort = new AbortController();
  const { signal } = deviceAbort;
  const connect = $id("github-connect");
  connect.innerHTML = "";
  const status = document.createElement("p");
  status.textContent = "starting…";
  connect.appendChild(status);

  const started = await api("/api/github/device-code");
  if (signal.aborted) return;
  let flow;
  try {
    flow = parseDeviceCodeResponse(started.data);
  } catch (e) {
    status.textContent = `could not start the device flow: ${e instanceof DeviceFlowError ? e.code : e.message}`;
    return;
  }

  status.innerHTML = "";
  const code = document.createElement("div");
  code.style.fontSize = "22px";
  code.style.fontFamily = "var(--mono)";
  code.style.letterSpacing = "2px";
  code.textContent = flow.user_code;
  const link = document.createElement("a");
  link.href = flow.verification_uri;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = flow.verification_uri;
  const hint = document.createElement("p");
  hint.className = "log-note";
  hint.textContent = "Open that address, enter the code, approve — this pane keeps polling until you do.";
  connect.append(code, link, hint);

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "cancel";
  cancel.onclick = () => deviceAbort?.abort();
  connect.appendChild(cancel);

  let interval = Math.max(flow.interval, 5) * 1000;
  const clock = { startedAt: Date.now(), expiresInSec: flow.expires_in };
  while (!signal.aborted) {
    await new Promise((r) => setTimeout(r, interval));
    if (signal.aborted) return;
    if (deviceFlowExpired(clock)) {
      hint.textContent = "the code expired — connect again.";
      return;
    }
    const polled = await api("/api/github/access-token", { device_code: flow.device_code });
    if (signal.aborted) return;
    const parsed = parseAccessTokenResponse(polled.data);
    if (parsed.status === "ok") {
      store = { ...store, token: parsed.token };
      saveStore(store);
      render();
      return;
    }
    if (parsed.status === "slow_down") {
      interval = nextPollIntervalMs(interval, "slow_down");
      continue;
    }
    if (parsed.status === "error") {
      hint.textContent = `GitHub declined: ${parsed.code}`;
      return;
    }
    // pending — keep polling
  }
}

$id("gh-disconnect")?.addEventListener("click", () => {
  store = {};
  saveStore(store);
  render();
});

// persist owner/repo/path as they are edited — the same "type it once" habit
// the rest of this pane's fields get


/** Who this credential is, said once at the top of the pane — the one piece
 * of GitHub identity a person actually wants confirmed. Cached on the store
 * so the pane can name them without a round trip on every render. */
async function showWhoAmI() {
  const el = $id("gh-who");
  if (!el) return;
  if (store.login) el.textContent = `Signed in as ${store.login}.`;
  const { data } = await api("/api/github/capability", credential());
  if (data?.login && data.login !== store.login) {
    store = { ...store, login: data.login };
    saveStore(store);
  }
  if (data?.login) el.textContent = `Signed in as ${data.login}.`;
}

/**
 * The credential every request below runs under. Two shapes, one of which
 * carries no secret at all: `useGhCli` tells the server to use the `gh` CLI
 * login already on this machine (the token stays server-side and is never
 * held here), and otherwise the token this pane stored. Spread into an api()
 * body rather than passed as a bare `token`, so a call site never has to
 * know which kind is in play.
 */
function credential() {
  return store.ghCli ? { useGhCli: true } : { token: store.token };
}

function repoTarget() {
  return { owner: store.owner ?? "", repo: store.repo ?? "", ...credential() };
}

// ── the repo picker ──────────────────────────────────────────────────────────
// Typing an owner and a repo name is asking a person to retype something
// GitHub already knows (user direction 2026-09-08). The picker lists what
// this credential can actually push to, remembers the choice, and writes
// through to the same two fields the rest of this pane reads — so nothing
// downstream had to learn about it.
async function fillRepoPicker({ quiet = false } = {}) {
  const sel = $id("gh-repo-pick");
  if (!sel) return;
  if (!quiet) note("listing the repos you can push to…");
  const { data } = await api("/api/github/repos", credential());
  if (!data?.ok) {
    if (!quiet) note(`could not list repos: ${data?.detail ?? `status ${data?.status ?? "?"}`} — type an owner and repo below instead`);
    return;
  }
  // A GitHub App can only write where it is installed, so an empty list here
  // is not "you have no repos" — it is "the app is not installed anywhere
  // yet", which is a step in setup, not an error. Every user of this app
  // meets it once, so it is said plainly with the door right there rather
  // than left to surface later as a 403 on their first push.
  if (data.kind === "github-app" && !data.repos.length) {
    renderInstallPrompt(data.installations === 0
      ? "This app is not installed on any repository yet — install it on the repos you want it to open pull requests on."
      : "The app is installed, but that installation covers no repositories — add some to it.");
    if (!quiet) note("no repositories yet — install the app on the ones you want to use.");
    return;
  }
  $id("gh-install-prompt")?.remove();
  sel.textContent = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = `pick one of ${data.repos.length} repos…`;
  sel.append(blank);
  // Visibility is named on every row, not just private ones. A repo that is
  // PUBLIC is the consequential case here — what this app saves includes the
  // reading record, which carries verbatim bytes of whatever has been read —
  // so "public" is stated in the option itself rather than left to be
  // remembered about a repo chosen months ago.
  repoVisibility = new Map(data.repos.map((r) => [r.fullName, r.private ? "private" : "public"]));
  for (const r of data.repos) {
    const o = document.createElement("option");
    o.value = r.fullName;
    o.textContent = `${r.fullName} — ${r.private ? "private" : "PUBLIC"}`;
    sel.append(o);
  }
  // Choose it rather than asking: the remembered repo if it is still
  // reachable, otherwise the most recently pushed one (the list arrives
  // sorted that way). A person who wants a different one changes the
  // dropdown — but nobody has to make a choice before seeing anything.
  // Preference order, and it matters: what was chosen before, then the repo
  // this app keeps its data in, and only then whatever was pushed to most
  // recently. Ordering "most recent" above the named repo was measured to
  // send a save into whichever repo happened to be touched last — the
  // picker's auto-selection became the remembered destination, and the save
  // button then honoured it as a deliberate choice it never was.
  const held = store.owner && store.repo ? `${store.owner}/${store.repo}` : "";
  const chosen = (held && data.repos.some((r) => r.fullName === held) && held)
    || data.repos.find((r) => r.name === DEFAULT_DATA_REPO)?.fullName
    || data.repos[0]?.fullName;
  if (chosen) {
    sel.value = chosen;
    const [owner, repo] = chosen.split("/");
    if (chosen !== held) {
      store = { ...store, owner, repo };
      saveStore(store);
    }
    // and work out what would change, unasked — a read, never a write.
    showMode();
    showSharedWith();
    proposeChanges({ quiet: true });
  }
  if (!quiet) note(`${data.repos.length} repos available${chosen ? ` — using ${chosen}` : ""}.`);
}

/** The install door, as a step rather than an error. Shown above the picker
 * whenever the app has nowhere to write; removed as soon as it has. */
function renderInstallPrompt(why) {
  $id("gh-install-prompt")?.remove();
  const host = $id("gh-repo-pick")?.parentElement ?? $id("github-body");
  if (!host) return;
  const box = document.createElement("div");
  box.id = "gh-install-prompt";
  box.style.margin = "6px 0 10px";
  const p = document.createElement("p");
  p.className = "log-note";
  p.textContent = why;
  const a = document.createElement("a");
  a.href = "https://github.com/settings/personal-access-tokens/new";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "make a token instead →";
  const after = document.createElement("button");
  after.type = "button";
  after.textContent = "done — check again";
  after.style.marginLeft = "8px";
  after.onclick = () => fillRepoPicker();
  box.append(p, a, after);
  host.prepend(box);
}

$id("gh-repo-pick")?.addEventListener("change", () => {
  const [owner, repo] = ($id("gh-repo-pick").value || "").split("/");
  if (!owner || !repo) return;
  store = { ...store, owner, repo };
  saveStore(store);
  note(`targeting ${owner}/${repo}.`);
  showMode();
  showSharedWith();
  proposeChanges({ quiet: true });
});

$id("gh-repo-refresh")?.addEventListener("click", () => fillRepoPicker());

// ── the proposal ─────────────────────────────────────────────────────────────
// What this instrument would push, worked out by itself: the local skill
// library and build history, each compared against what the repo already
// holds, so what is offered is only what is genuinely new or changed. The
// person's job is to approve it — not to work out what "it" is, and not to
// name a path (the sync paths are this repo's own convention, github.js's
// repoPathForSkill / repoPathForHistory).
let proposal = null; // {files:[{path,content,message,why}], owner, repo}

async function proposeChanges({ quiet = false } = {}) {
  const { owner, repo, ...cred } = repoTarget();
  const box = $id("gh-proposal");
  if (!owner || !repo) {
    if (box) box.textContent = "";
    if (!quiet) note("pick a repo first");
    return;
  }
  if (!quiet) note("working out what would change…");
  const files = [];

  // skills: every locally admitted skill the repo does not already hold at
  // the same digest — the digest IS the identity, so a match is a no-op.
  const local = await apiGet("/api/skills");
  const skills = local.data?.skills ?? [];
  const remoteSkills = await api("/api/github/contents/read", { owner, repo, ...cred, path: GITHUB_SKILLS_PREFIX.replace(/\/$/, "") });
  const heldDigests = new Set(
    remoteSkills.data?.exists && remoteSkills.data.isDirectory
      ? remoteSkills.data.entries.map((e) => nameFromRepoPath(e.path, GITHUB_SKILLS_PREFIX)).filter(Boolean)
      : [],
  );
  for (const { digest, skill } of skills) {
    if (heldDigests.has(digest)) continue;
    files.push({
      path: repoPathForSkill(digest),
      content: JSON.stringify(skill, null, 2) + "\n",
      message: `the-fold: sync skill ${digest.slice(0, 8)}`,
      why: `skill ${digest.slice(0, 8)} — not in the repo yet`,
    });
  }

  // history: same question, slug-identified.
  const { builds } = readLocalBuilds();
  const remoteHistory = await api("/api/github/contents/read", { owner, repo, ...cred, path: GITHUB_HISTORY_PREFIX.replace(/\/$/, "") });
  const heldSlugs = new Set(
    remoteHistory.data?.exists && remoteHistory.data.isDirectory
      ? remoteHistory.data.entries.map((e) => nameFromRepoPath(e.path, GITHUB_HISTORY_PREFIX)).filter(Boolean)
      : [],
  );
  for (const b of builds) {
    const slug = `build-${b.n}`;
    if (heldSlugs.has(slug)) continue;
    files.push({
      path: repoPathForHistory(slug),
      content: JSON.stringify(b, null, 2) + "\n",
      message: `the-fold: sync history ${slug}`,
      why: `${slug} — not in the repo yet`,
    });
  }

  proposal = { owner, repo, files };
  renderProposal();
  if (!quiet) {
    note(files.length ? `${files.length} file(s) would change — review below, then approve.` : "nothing to propose: the repo already holds every local skill and build.");
  }
}

/**
 * What saving here actually exposes, said at the moment of saving.
 *
 * This exists because the app has two attachments with OPPOSITE regimes and
 * one casual button each. The room (Matrix) seals what it preserves and
 * tells the person so in as many words — "never a turn, a prompt or an
 * answer". A repo is the reverse by design: legible, diffable, permanent,
 * and readable by anyone who can read the repo. A person who learned the
 * first posture will carry it to the second unless the second says
 * otherwise, so it says otherwise.
 *
 * Three facts, none of which the pane used to state: what is in the payload
 * (folds carry the reading record, and a reading record carries verbatim
 * bytes of whatever was read), who can see it (the destination's own
 * visibility, named), and that removing a file later does not unpublish it.
 */
/**
 * What the chosen destination MEANS, named. Three modes, and public is one
 * of them rather than a mistake — user direction 2026-09-08: "using a public
 * repo on GH is a way that anyone can have access to the space, similar to
 * how you can share google notebook LM instances". So a public repo is a
 * published space with a name, not a red warning; what it costs is still
 * said plainly, once, where it is true.
 */
function showMode() {
  const el = $id("gh-mode");
  const reach = $id("gh-reach");
  const save = $id("gh-save");
  const full = store.owner && store.repo ? `${store.owner}/${store.repo}` : "";
  if (!full) {
    if (el) { el.textContent = "Pick somewhere for your folds and skills to live."; el.removeAttribute("data-mode"); }
    if (reach) reach.textContent = "";
    $id("gh-sharelink")?.remove();
    return;
  }
  const vis = repoVisibility.get(full);
  const mode = writeMode(store.owner);
  const sealed = mustSeal(vis);

  if (el) {
    el.textContent = "";
    const b = document.createElement("b");
    if (mode === "propose") {
      b.textContent = "someone else's";
      el.dataset.mode = "propose";
      el.append(b, document.createTextNode(" — saving opens a pull request for them to review."));
    } else if (vis === "private") {
      b.textContent = "your own log, in the clear";
      el.dataset.mode = "private";
      el.append(b, document.createTextNode(" — saving appends straight to it."));
    } else {
      b.textContent = "a shared space, sealed";
      el.dataset.mode = "public";
      el.append(b, document.createTextNode(" — saving appends encrypted files. The key stays here and in the link you hand out."));
    }
  }

  // Hyper-specific, because "public" and "private" are not the same question
  // as "readable" and "unreadable" once sealing is in play. Four facts: who
  // can fetch the bytes, whether the bytes mean anything, who holds the key,
  // and what GitHub itself sees.
  if (reach) {
    reach.textContent = "";
    const lines = sealed
      ? [
          vis === "public"
            ? "Anyone on the internet can fetch these files."
            : "Whoever can read this repo can fetch these files.",
          "They are encrypted (AES-256-GCM), so fetching them without the key gets unreadable bytes.",
          "The key is in this browser and in any share link you hand out — never in the repo, never sent to GitHub.",
          "GitHub sees ciphertext, file names and sizes.",
        ]
      : [
          "You, anyone you invite below, and GitHub.",
          "Saved in the clear — readable, diffable, greppable, which is the reason to keep a log in a repo.",
          "Nothing is encrypted here, so anyone who gains access to the repo can read all of it.",
        ];
    for (const t of lines) {
      const li = document.createElement("p");
      li.className = "gh-fact";
      li.textContent = t;
      reach.append(li);
    }
  }

  if (save) save.textContent = mode === "propose" ? "Propose my work" : "Save my work";
  renderShareLink(full, sealed);
}

/**
 * For a sealed space, the link IS the access: it carries the key in its
 * fragment. Offered only once a key exists (i.e. after a first save), and
 * offered with the one sentence that matters — anyone holding it can open
 * the space, so it is handed to people, not posted.
 */
function renderShareLink(full, sealed) {
  $id("gh-sharelink")?.remove();
  const host = $id("gh-reach")?.parentElement;
  const key = sealed ? spaceKeyFor(full) : null;
  if (!host || !key) return;
  const box = document.createElement("div");
  box.id = "gh-sharelink";
  box.className = "gh-sharelink";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Copy the link that opens this space";
  btn.onclick = async () => {
    const link = spaceLink(location.origin + location.pathname, full, key);
    try {
      await navigator.clipboard.writeText(link);
      note("link copied — anyone you give it to can open and read this space.");
    } catch {
      note(link);
    }
  };
  const why = document.createElement("p");
  why.className = "gh-fact";
  why.textContent = "The link contains the key. Anyone who has it can open this space; anyone who only finds the repo cannot.";
  box.append(btn, why);
  host.append(box);
}

function exposureNote(owner, repo, files) {
  const vis = repoVisibility.get(`${owner}/${repo}`);
  const folds = files.filter((f) => f.path.startsWith(GITHUB_HISTORY_PREFIX)).length;
  const skills = files.filter((f) => f.path.startsWith(GITHUB_SKILLS_PREFIX)).length;
  const box = document.createElement("div");
  box.className = "gh-exposure";
  const what = document.createElement("p");
  what.textContent = `${folds} fold${folds === 1 ? "" : "s"} and ${skills} skill${skills === 1 ? "" : "s"}. A fold carries its reading with it — including the exact words it quoted out of whatever it read.`;
  box.append(what);
  const who = document.createElement("p");
  // Public is a mode, not a mistake — but a person publishing a reading
  // should know that the reading contains other people's words, because
  // that is the one part of this they did not write.
  who.textContent = vis === "public"
    ? `${owner}/${repo} is public, so this becomes openable by anyone — quoted source material included.`
    : vis === "private"
      ? `${owner}/${repo} is private: you, anyone you invite, and GitHub.`
      : `${owner}/${repo}.`;
  box.append(who);
  const keeps = document.createElement("p");
  keeps.textContent = "A repo keeps its history: removing a file later does not unpublish what was already saved.";
  box.append(keeps);
  return box;
}

function renderProposal() {
  const box = $id("gh-proposal");
  if (!box) return;
  box.textContent = "";
  if (!proposal) return;
  if (!proposal.files.length) {
    const sum0 = $id("gh-details-summary");
    if (sum0) sum0.textContent = "nothing new to save";
    const p = document.createElement("p");
    p.className = "log-note";
    p.textContent = `${proposal.owner}/${proposal.repo} already holds every fold and skill this browser has.`;
    box.append(p);
    return;
  }
  const sum = $id("gh-details-summary");
  if (sum) sum.textContent = `what would be saved — ${proposal.files.length} file(s)`;
  box.append(exposureNote(proposal.owner, proposal.repo, proposal.files));
  const list = document.createElement("ul");
  list.style.margin = "4px 0 8px";
  list.style.paddingLeft = "18px";
  for (const f of proposal.files.slice(0, 25)) {
    const li = document.createElement("li");
    li.style.fontSize = "12px";
    li.textContent = `${f.path} — ${f.why}`;
    list.append(li);
  }
  if (proposal.files.length > 25) {
    const li = document.createElement("li");
    li.style.fontSize = "12px";
    li.textContent = `…and ${proposal.files.length - 25} more`;
    list.append(li);
  }
  box.append(list);
  const approve = document.createElement("button");
  approve.type = "button";
  approve.className = "linkish";
  approve.textContent = writeMode(proposal.owner) === "append"
    ? `save these ${proposal.files.length} now`
    : `propose these ${proposal.files.length} now`;
  approve.onclick = async () => {
    approve.disabled = true;
    const r = await writeFiles({
      owner: proposal.owner, repo: proposal.repo, cred: credential(),
      label: "proposal", files: proposal.files,
    });
    approve.disabled = false;
    note(r.text, r.link);
    if (r.ok) { proposal = null; renderProposal(); }
  };
  box.append(approve);
}

$id("gh-propose")?.addEventListener("click", () => proposeChanges());

// ── two ways to write, and they are not the same act ─────────────────────────
/**
 * User direction 2026-09-08: "the language of PRs needs to be one path of
 * doing things, another is just saving things to the same append only log."
 *
 * That distinction is real and this app is built on it everywhere else. A
 * pull request is how a change reaches ground that is not yours — someone
 * reads it and decides. An append is what a log does: the record, the
 * hyperlexicon, the build logs here all grow by appending, and nobody
 * approves an entry in their own journal. Opening a PR against your own
 * data repo on every save is ceremony that means nothing, and it teaches a
 * person to click "approve" without reading, which is worse than not asking.
 *
 * So the destination decides the act, and the button says which it is:
 *   your own repo      -> APPEND, straight onto the branch. It is your log.
 *   anyone else's repo -> PROPOSE, as a pull request they review.
 */
function writeMode(owner) {
  return store.login && owner && owner.toLowerCase() === store.login.toLowerCase() ? "append" : "propose";
}

/**
 * The append path. One commit per file onto the default branch — no branch,
 * no PR, no approval, because there is no second party to approve it. Kept
 * deliberately separate from openPullRequest rather than parameterised: the
 * two are different acts, and a flag would let one quietly become the other.
 */
async function appendToLog({ owner, repo, cred, files, label }) {
  note(`${label}: reading ${owner}/${repo}…`);
  const info = await api("/api/github/repo", { owner, repo, ...cred });
  if (!info.data?.ok) {
    if (info.data?.status === 403) return { ok: false, ...(await explainWriteRefusal({ owner, repo, ...cred })) };
    return { ok: false, text: `could not read ${owner}/${repo}: ${info.data?.detail ?? `status ${info.data?.status}`}` };
  }
  let written = 0;
  for (const f of files) {
    const read = await api("/api/github/contents/read", { owner, repo, ...cred, path: f.path });
    const sha = read.data?.exists && !read.data.isDirectory ? read.data.sha : null;
    const w = await api("/api/github/contents/write", { owner, repo, ...cred, path: f.path, content: f.content, sha, message: f.message });
    if (w.data?.ok) written++;
    else if (w.data?.status === 403) return { ok: false, ...(await explainWriteRefusal({ owner, repo, ...cred })) };
  }
  if (!written) return { ok: false, text: "nothing could be written" };
  return {
    ok: true,
    text: `saved ${written} file(s) to ${owner}/${repo}.`,
    link: { href: `https://github.com/${owner}/${repo}/commits`, text: "see the log →" },
  };
}

/** The act the current destination implies, run. */
async function writeFiles(args) {
  const full = `${args.owner}/${args.repo}`;
  const files = mustSeal(repoVisibility.get(full))
    ? await Promise.all(args.files.map(async (f) => {
        const sealed = await sealFile(spaceKeyFor(full, { make: true }), f);
        return { ...sealed, message: f.message };
      }))
    : args.files;
  const out = { ...args, files };
  return writeMode(args.owner) === "append" ? appendToLog(out) : openPullRequest(out);
}

// ── the one button ───────────────────────────────────────────────────────────
/**
 * "Save my data to GitHub" (user direction 2026-09-08: it should feel like
 * signing in and then pressing one thing). Everything the older pane asked a
 * person to supply is worked out here instead:
 *
 *   destination — the remembered repo, else one already named `the-fold`
 *                 that this login can push to, else a private repo created
 *                 on the spot. Never a field to fill in.
 *   contents    — the local skills and fold history the repo does not
 *                 already hold, by digest and slug (the identities this app
 *                 already keys them by).
 *   approval    — a pull request, which is where the person actually says
 *                 yes. Nothing reaches the default branch without a merge.
 */

async function resolveDestination() {
  if (store.owner && store.repo) return { owner: store.owner, repo: store.repo, how: "remembered" };
  const { data } = await api("/api/github/repos", credential());
  const repos = data?.ok ? data.repos : [];
  const named = repos.find((r) => r.name === DEFAULT_DATA_REPO) ?? repos[0];
  if (named) {
    const [owner, repo] = named.fullName.split("/");
    return { owner, repo, how: named.name === DEFAULT_DATA_REPO ? "found" : "first available" };
  }
  note("no repo to save into yet — making a private one…");
  const made = await api("/api/github/repo/create", { ...credential(), name: DEFAULT_DATA_REPO, private: true });
  if (!made.data?.ok) return { error: made.data?.detail ?? `status ${made.data?.status ?? "?"}` };
  return { owner: made.data.owner, repo: made.data.name, how: "created" };
}

$id("gh-save")?.addEventListener("click", async () => {
  const btn = $id("gh-save");
  btn.disabled = true;
  try {
    note("finding somewhere to save…");
    const dest = await resolveDestination();
    if (dest.error) return note(`could not find or make a repo to save into: ${dest.error}`);
    store = { ...store, owner: dest.owner, repo: dest.repo };
    saveStore(store);
    const pick = $id("gh-repo-pick");
    if (pick && [...pick.options].some((o) => o.value === `${dest.owner}/${dest.repo}`)) pick.value = `${dest.owner}/${dest.repo}`;

    note(`saving into ${dest.owner}/${dest.repo} (${dest.how}) — working out what changed…`);
    await proposeChanges({ quiet: true });
    if (!proposal?.files.length) return note(`${dest.owner}/${dest.repo} already holds every local skill and fold — nothing to save.`);

    const r = await writeFiles({
      owner: dest.owner, repo: dest.repo, cred: credential(),
      label: "save", files: proposal.files,
    });
    note(r.text, r.link);
    if (r.ok) {
      proposal = null;
      renderProposal();
      // What the header's access chip reads. "Attached" means data has
      // actually gone there — a repo merely chosen in a dropdown discloses
      // nothing, because nothing has left.
      store = {
        ...store,
        savedTo: {
          fullName: `${dest.owner}/${dest.repo}`,
          visibility: repoVisibility.get(`${dest.owner}/${dest.repo}`) ?? "unknown",
          at: new Date().toISOString(),
        },
      };
      saveStore(store);
      window.dispatchEvent(new CustomEvent("fold:attachments-changed"));
    }
  } finally {
    btn.disabled = false;
  }
});


// ── the fold history, as this browser holds it ───────────────────────────────
// app.js's own store (BUILDS_KEY) — {id, builds:[{n, turn, entries, draft}]}.
// Read for saving, written when loading someone's shared repo. Restored
// after a truncation during this session's refactor removed them while two
// callers still needed them; a load-time ReferenceError is what found it.
function readLocalBuilds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BUILDS_KEY) ?? "{}");
    return { id: parsed.id ?? null, builds: Array.isArray(parsed.builds) ? parsed.builds : [] };
  } catch {
    return { id: null, builds: [] };
  }
}
function writeLocalBuilds(next) {
  localStorage.setItem(BUILDS_KEY, JSON.stringify(next));
}

/**
 * A file read out of a space: plaintext as-is, sealed only if we hold the
 * key. Opening someone else's public space therefore works exactly when
 * they gave you the link, and fails closed when they did not.
 */
async function unsealIfNeeded(owner, repo, path, text) {
  if (!isSealedPath(path)) return text;
  const key = spaceKeyFor(`${owner}/${repo}`);
  if (!key) throw new Error("sealed, and this browser has no key for that space");
  const { content } = await openFile(key, { path, content: text });
  return content;
}

// A link someone handed over: the space it names, and the key to open it.
// Taken from the fragment once at load and kept, so the link only has to be
// followed one time.
(function adoptSpaceLink() {
  const from = parseSpaceLink(location.hash);
  if (!from) return;
  const [owner, repo] = from.fullName.split("/");
  store = {
    ...store,
    owner, repo,
    spaceKeys: { ...(store.spaceKeys ?? {}), [from.fullName]: from.key },
  };
  saveStore(store);
  // the key must not sit in the address bar afterwards
  history.replaceState(null, "", location.pathname + location.search);
})();

// ── loading what is there ────────────────────────────────────────────────────
/**
 * The other half of sharing: read a repo's folds and skills into this
 * machine. The same action whether the repo is your own (a second computer,
 * a fresh browser) or someone else's that they shared with you — a repo
 * shared with you appears in the picker like any other, because the listing
 * asks for collaborator repos too.
 */
$id("gh-load")?.addEventListener("click", async () => {
  const { owner, repo, ...cred } = repoTarget();
  if (!owner || !repo) return note("pick a repo first");
  note(`reading ${owner}/${repo}…`);
  let skillsIn = 0;
  let foldsIn = 0;

  const skillsDir = await api("/api/github/contents/read", { owner, repo, ...cred, path: GITHUB_SKILLS_PREFIX.replace(/\/$/, "") });
  if (skillsDir.data?.exists && skillsDir.data.isDirectory) {
    const local = await apiGet("/api/skills");
    const localDigests = new Set((local.data?.skills ?? []).map((s) => s.digest));
    const { toImport } = mergeSkillsPull(localDigests, skillsDir.data.entries.filter((e) => e.type === "file").map((e) => ({ ...e, path: plainPath(e.path), storedPath: e.path })));
    for (const entry of toImport) {
      const read = await api("/api/github/contents/read", { owner, repo, ...cred, path: entry.storedPath ?? entry.path });
      if (!read.data?.exists || read.data.isDirectory) continue;
      let skill;
      try { skill = JSON.parse(await unsealIfNeeded(owner, repo, entry.storedPath ?? entry.path, read.data.text)); } catch { continue; }
      const imp = await api("/api/skills/import", { skill });
      if (imp.data?.imported) skillsIn++;
    }
  }

  const histDir = await api("/api/github/contents/read", { owner, repo, ...cred, path: GITHUB_HISTORY_PREFIX.replace(/\/$/, "") });
  if (histDir.data?.exists && histDir.data.isDirectory) {
    const current = readLocalBuilds();
    const localSlugs = new Set(current.builds.map((b) => `build-${b.n}`));
    const { toImport } = mergeHistoryPull(localSlugs, histDir.data.entries.filter((e) => e.type === "file").map((e) => ({ ...e, path: plainPath(e.path), storedPath: e.path })));
    const imported = [];
    for (const entry of toImport) {
      const read = await api("/api/github/contents/read", { owner, repo, ...cred, path: entry.storedPath ?? entry.path });
      if (!read.data?.exists || read.data.isDirectory) continue;
      try { imported.push(JSON.parse(await unsealIfNeeded(owner, repo, entry.storedPath ?? entry.path, read.data.text))); } catch { /* unreadable or not ours to open — skipped, counted by the caller */ }
    }
    if (imported.length) {
      writeLocalBuilds({ id: current.id, builds: [...current.builds, ...imported] });
      foldsIn = imported.length;
    }
  }

  if (!skillsIn && !foldsIn) return note(`nothing new in ${owner}/${repo} — you already have everything it holds.`);
  note(`loaded ${foldsIn} fold(s) and ${skillsIn} skill(s) from ${owner}/${repo}${foldsIn ? " — reload the page to see the folds" : ""}.`);
});

// ── sharing ──────────────────────────────────────────────────────────────────
async function showSharedWith() {
  const box = $id("gh-shared-with");
  if (!box) return;
  const { owner, repo, ...cred } = repoTarget();
  if (!owner || !repo) { box.textContent = ""; return; }
  const { data } = await api("/api/github/shared-with", { owner, repo, ...cred });
  if (!data?.ok) { box.textContent = ""; return; }
  const me = store.login;
  const others = (data.people ?? []).filter((p) => p.login !== me);
  const pending = (data.pending ?? []).filter((p) => p.login);
  const parts = [];
  if (others.length) parts.push(others.map((p) => `${p.login} (${p.permission})`).join(", "));
  if (pending.length) parts.push(`invited, not yet accepted: ${pending.map((p) => p.login).join(", ")}`);
  box.textContent = parts.length ? `Shared with ${parts.join(" · ")}` : "Not shared with anyone yet.";
}

$id("gh-share")?.addEventListener("click", async () => {
  const who = $id("gh-share-who")?.value.trim();
  const { owner, repo, ...cred } = repoTarget();
  if (!owner || !repo) return note("pick a repo first");
  if (!who) return note("type the GitHub username to share with");
  note(`inviting ${who} to ${owner}/${repo}…`);
  const { data } = await api("/api/github/share", { owner, repo, ...cred, username: who, permission: "pull" });
  if (!data?.ok) return note(`could not share: ${data?.detail ?? `status ${data?.status ?? "?"}`}`);
  $id("gh-share-who").value = "";
  note(data.invited
    ? `invited ${who} — they will get a GitHub invitation to accept, and can then load this data in their own copy of the fold.`
    : `${who} already had access.`);
  showSharedWith();
});


render();
