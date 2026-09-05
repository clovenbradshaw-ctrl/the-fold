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
// SCOPE. Three thin actions over the same Contents-API plumbing: (1) one
// file, pulled into a textarea and pushed back — the eoWebLLM feature's own
// scope; (2) push/pull the local skill library; (3) push/pull the build
// history. All three are explicit buttons — this repo does not run silent
// background network activity (P13's standing-consent posture, mirrored
// here: nothing crosses to GitHub without a click).

import {
  parseDeviceCodeResponse,
  parseAccessTokenResponse,
  nextPollIntervalMs,
  deviceFlowExpired,
  DeviceFlowError,
  repoPathForSkill,
  repoPathForHistory,
  GITHUB_SKILLS_PREFIX,
  GITHUB_HISTORY_PREFIX,
  shouldRetryConflict,
  mergeSkillsPull,
  mergeHistoryPull,
} from "./github.js";

const $id = (x) => document.getElementById(x);
const STORE_KEY = "fold-github";
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

function note(text) {
  const el = $id("gh-note");
  if (el) el.textContent = text;
}

// ── connect / device flow ───────────────────────────────────────────────────
function render() {
  const connect = $id("github-connect");
  const body = $id("github-body");
  if (!connect || !body) return;
  if (store.token) {
    connect.hidden = true;
    body.hidden = false;
    $id("gh-owner").value = store.owner ?? "";
    $id("gh-repo").value = store.repo ?? "";
    $id("gh-path").value = store.path ?? "";
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
    p.textContent = "Device flow, via the eoWebLLM GitHub App — no client secret leaves this machine, github.com issues the token straight to your browser's request.";
    connect.appendChild(p);
  }
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
for (const [id, key] of [["gh-owner", "owner"], ["gh-repo", "repo"], ["gh-path", "path"]]) {
  $id(id)?.addEventListener("change", () => {
    store = { ...store, [key]: $id(id).value.trim() };
    saveStore(store);
  });
}

function repoTarget() {
  return { owner: $id("gh-owner").value.trim(), repo: $id("gh-repo").value.trim(), token: store.token };
}

// ── one file ─────────────────────────────────────────────────────────────────
let fileSha = null;

$id("gh-pull")?.addEventListener("click", async () => {
  const { owner, repo, token } = repoTarget();
  const path = $id("gh-path").value.trim();
  if (!owner || !repo || !path) return note("owner, repo, and path are all required");
  note("pulling…");
  const { ok, data } = await api("/api/github/contents/read", { owner, repo, token, path });
  if (!ok) return note(`pull failed: ${data.error ?? "unknown error"}`);
  if (!data.exists) {
    fileSha = null;
    $id("gh-content").value = "";
    return note(`${path} does not exist yet in ${owner}/${repo} — push will create it`);
  }
  if (data.isDirectory) return note(`${path} is a directory, not a file — pull needs a file path`);
  fileSha = data.sha;
  $id("gh-content").value = data.text ?? "";
  note(`pulled ${path} (sha ${data.sha.slice(0, 8)})`);
});

$id("gh-push")?.addEventListener("click", async () => {
  const { owner, repo, token } = repoTarget();
  const path = $id("gh-path").value.trim();
  const content = $id("gh-content").value;
  if (!owner || !repo || !path) return note("owner, repo, and path are all required");
  note("pushing…");
  for (let attempt = 0; ; attempt++) {
    const { ok, status, data } = await api("/api/github/contents/write", {
      owner, repo, token, path, content, sha: fileSha, message: "the-fold: update via GitHub pane",
    });
    if (ok && data.ok) {
      fileSha = data.sha;
      return note(`pushed ${path} (sha ${data.sha.slice(0, 8)})`);
    }
    if (status === 409 || data.conflict) {
      if (!shouldRetryConflict(attempt)) return note("push failed: conflicting writes, gave up after retrying");
      const read = await api("/api/github/contents/read", { owner, repo, token, path });
      fileSha = read.data?.exists ? read.data.sha : null;
      continue;
    }
    return note(`push failed: ${data.error ?? data.detail ?? `status ${status}`}`);
  }
});

// ── skills sync ──────────────────────────────────────────────────────────────
async function pushOneFile({ owner, repo, token, path, content, message }) {
  const read = await api("/api/github/contents/read", { owner, repo, token, path });
  let sha = read.data?.exists ? read.data.sha : null;
  for (let attempt = 0; ; attempt++) {
    const { status, data } = await api("/api/github/contents/write", { owner, repo, token, path, content, sha, message });
    if (data.ok) return { ok: true };
    if (status === 409 || data.conflict) {
      if (!shouldRetryConflict(attempt)) return { ok: false, error: "conflict, gave up retrying" };
      const reread = await api("/api/github/contents/read", { owner, repo, token, path });
      sha = reread.data?.exists ? reread.data.sha : null;
      continue;
    }
    return { ok: false, error: data.error ?? data.detail ?? `status ${status}` };
  }
}

$id("gh-skills-push")?.addEventListener("click", async () => {
  const { owner, repo, token } = repoTarget();
  if (!owner || !repo) return note("owner and repo are required");
  note("reading the local skill library…");
  const local = await apiGet("/api/skills");
  const skills = local.data?.skills ?? [];
  if (!skills.length) return note("no skills admitted locally yet — nothing to push");
  let pushed = 0;
  let failed = 0;
  for (const { digest, skill } of skills) {
    const r = await pushOneFile({
      owner, repo, token,
      path: repoPathForSkill(digest),
      content: JSON.stringify(skill, null, 2) + "\n",
      message: `the-fold: sync skill ${digest.slice(0, 8)}`,
    });
    if (r.ok) pushed++; else failed++;
  }
  note(`skills: pushed ${pushed} of ${skills.length}${failed ? `, ${failed} failed` : ""}`);
});

$id("gh-skills-pull")?.addEventListener("click", async () => {
  const { owner, repo, token } = repoTarget();
  if (!owner || !repo) return note("owner and repo are required");
  note("listing skills in the repo…");
  const listing = await api("/api/github/contents/read", { owner, repo, token, path: GITHUB_SKILLS_PREFIX.replace(/\/$/, "") });
  if (!listing.data?.exists) return note(`no ${GITHUB_SKILLS_PREFIX} in ${owner}/${repo} yet`);
  if (!listing.data.isDirectory) return note(`${GITHUB_SKILLS_PREFIX} is not a directory in that repo`);
  const local = await apiGet("/api/skills");
  const localDigests = new Set((local.data?.skills ?? []).map((s) => s.digest));
  const { toImport } = mergeSkillsPull(localDigests, listing.data.entries.filter((e) => e.type === "file"));
  if (!toImport.length) return note("skills: nothing new to pull — local library already has every remote digest");
  let imported = 0;
  for (const entry of toImport) {
    const read = await api("/api/github/contents/read", { owner, repo, token, path: entry.path });
    if (!read.data?.exists || read.data.isDirectory) continue;
    let skill;
    try {
      skill = JSON.parse(read.data.text);
    } catch {
      continue;
    }
    const imp = await api("/api/skills/import", { skill });
    if (imp.data?.imported) imported++;
  }
  note(`skills: imported ${imported} of ${toImport.length} new — the library reloads them on next use`);
});

// ── history sync ─────────────────────────────────────────────────────────────
// Build history persists client-side in localStorage (BUILDS_KEY, app.js's
// own store — {id, builds:[{n, turn, entries, draft}]}). Each build's log is
// content-addressed by nothing of its own (n is a per-conversation index, not
// a stable id across machines) — "build-<n>" is the slug this repo's own
// convention already names things by (CLAUDE.md: build-4.py), reused here as
// the sync file's stem. Pulling writes new builds into the SAME localStorage
// key; app.js's own restoreBuilds only runs at load, so a pulled build needs
// a page reload to appear in the Folds panel — a disclosed limitation, not a
// silent gap (the note says so).
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

$id("gh-history-push")?.addEventListener("click", async () => {
  const { owner, repo, token } = repoTarget();
  if (!owner || !repo) return note("owner and repo are required");
  const { builds } = readLocalBuilds();
  if (!builds.length) return note("no build history locally yet — nothing to push");
  let pushed = 0;
  let failed = 0;
  for (const b of builds) {
    const slug = `build-${b.n}`;
    const r = await pushOneFile({
      owner, repo, token,
      path: repoPathForHistory(slug),
      content: JSON.stringify(b, null, 2) + "\n",
      message: `the-fold: sync history ${slug}`,
    });
    if (r.ok) pushed++; else failed++;
  }
  note(`history: pushed ${pushed} of ${builds.length}${failed ? `, ${failed} failed` : ""}`);
});

$id("gh-history-pull")?.addEventListener("click", async () => {
  const { owner, repo, token } = repoTarget();
  if (!owner || !repo) return note("owner and repo are required");
  note("listing history in the repo…");
  const listing = await api("/api/github/contents/read", { owner, repo, token, path: GITHUB_HISTORY_PREFIX.replace(/\/$/, "") });
  if (!listing.data?.exists) return note(`no ${GITHUB_HISTORY_PREFIX} in ${owner}/${repo} yet`);
  if (!listing.data.isDirectory) return note(`${GITHUB_HISTORY_PREFIX} is not a directory in that repo`);
  const current = readLocalBuilds();
  const localSlugs = new Set(current.builds.map((b) => `build-${b.n}`));
  const { toImport } = mergeHistoryPull(localSlugs, listing.data.entries.filter((e) => e.type === "file"));
  if (!toImport.length) return note("history: nothing new to pull — local history already has every remote build");
  const imported = [];
  for (const entry of toImport) {
    const read = await api("/api/github/contents/read", { owner, repo, token, path: entry.path });
    if (!read.data?.exists || read.data.isDirectory) continue;
    try {
      imported.push(JSON.parse(read.data.text));
    } catch {
      /* a build file that doesn't parse is skipped, not a crash */
    }
  }
  if (!imported.length) return note("history: nothing importable in what was listed");
  writeLocalBuilds({ id: current.id, builds: [...current.builds, ...imported] });
  note(`history: imported ${imported.length} build(s) — reload the page to see them in Folds`);
});

render();
