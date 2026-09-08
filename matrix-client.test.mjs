// matrix-client.test.mjs — the adversarial proof (P119): a whole chat's life
// against a homeserver that keeps everything, then three independent checks
// that nothing readable ever reached it —
//
//   1. by the bytes: every request line, header and body, every state event,
//      every media blob, searched for every secret and every turn in every
//      encoding, one base64 layer down as well; the password may appear in
//      exactly the login bodies, the token in exactly the Authorization
//      headers, and the chat key, the private keys and the turns nowhere;
//   2. by the structure: every state event carries only the fields the design
//      declares — a pointer, a hash, a size, a public key, a wrapped key;
//   3. by the function: with everything the operator holds, every blob refuses
//      to open — and opens with the chat key (the positive control), so the
//      key is the only thing that separates the operator from a reader.
//
// Plus the record discipline, the auth rule the design leans on, a third
// party, a wipe-and-grant recovery, and the measured entropy null.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startFakeHomeserver } from "./matrix-fake-homeserver.mjs";
import { FoldMatrix, MatrixHttp, MatrixError } from "./matrix-client.js";
import { SecretSet, decryptBytes, decodeBlock, byteEntropy, generateChatKey, unb64, b64, TYPES, EVENTS, forRecord, parseShareLink, fingerprint, INVITE_TTL_MS } from "./matrix.js";

const enc = new TextEncoder(); const dec = new TextDecoder();
/** Random bytes of any length (getRandomValues caps one call at 64 KiB). */
const randomBytes = (n) => { const out = new Uint8Array(n); for (let i = 0; i < n; i += 65536) crypto.getRandomValues(out.subarray(i, Math.min(n, i + 65536))); return out; };
const mapStorage = () => { let v = null; return { get: () => (v ? JSON.parse(v) : null), set: (o) => { v = JSON.stringify(o); }, raw: () => v }; };
const PW = { alice: "alice-throwaway-pw-9f1c2b", bob: "bob-throwaway-pw-4e7d8a", mallory: "mallory-throwaway-pw-1122", carol: "carol-throwaway-pw-5566" };
const TURNS = [
  { kind: "turn", role: "user", content: "who was Lincoln's second vice-president? CANARY-a1b2c3", seq: 0 },
  { kind: "turn", role: "assistant", content: "Andrew Johnson, from March 1865; Hannibal Hamlin before him. CANARY-d4e5f6", seq: 1 },
  { kind: "turn", role: "user", content: "and the cabinet's Secretary of War? CANARY-071829", seq: 2 },
];
const MORE = [
  { kind: "turn", role: "assistant", content: "Edwin Stanton, from January 1862. CANARY-3a3b3c", seq: 3 },
  { kind: "turn", role: "user", content: "thanks — preserve this. CANARY-9z9y9x", seq: 4 },
];
let hs, alice, bob, room, link, poolCarol, records = [];
const recordInto = (who) => (kind, fields) => records.push({ who, kind, fields });

before(async () => {
  hs = await startFakeHomeserver({ users: { alice: PW.alice, bob: PW.bob, mallory: PW.mallory, carol: PW.carol } });
  alice = new FoldMatrix({ storage: mapStorage(), record: recordInto("alice") });
  bob = new FoldMatrix({ storage: mapStorage(), record: recordInto("bob") });
});
after(async () => { await hs.close(); });

test("the flow: sign in, a room, two hash-linked blocks, a re-push that skips, a share with an invite, a join from the link that reads every turn in order", async () => {
  const s = await alice.login(hs.base, "alice", PW.alice);
  assert.equal(s.user, "@alice:fake.test");
  room = await alice.ensureRoom({ name: "Lincoln's cabinet" });
  assert.match(room, /^!r\d+:fake\.test$/);
  const p0 = await alice.preserve(room, TURNS);
  assert.deepEqual([p0.pushed, p0.skipped, p0.idx], [3, 0, 0]);
  const again = await alice.preserve(room, TURNS);
  assert.deepEqual([again.pushed, again.skipped], [0, 3], "the same turns are not pushed twice");
  const p1 = await alice.preserve(room, [...TURNS, ...MORE]);
  assert.deepEqual([p1.pushed, p1.skipped, p1.idx], [2, 3, 1]);
  assert.equal(alice.status().rooms[0].blocks, 2);
  await bob.login(hs.base, "bob", PW.bob);
  const sh = await alice.share(room, { invite: "@bob:fake.test", mode: "open", pageHref: "https://example.github.io/the-fold/index.html" });
  link = sh.link;
  assert.equal(sh.kind, "open"); assert.equal(sh.invited, "@bob:fake.test");
  assert.deepEqual(sh.granted, [], "bob has published no member key yet — nothing to grant; the open link carries the key");
  const j = await bob.joinFromLink(link);
  assert.equal(j.joined, true); assert.equal(j.kind, "open");
  assert.equal(j.partial, false, `gaps: ${j.gaps}`);
  assert.deepEqual(j.entries.map((e) => e.content), [...TURNS, ...MORE].map((t) => t.content), "every turn, in order, across two blocks");
  assert.equal(j.blocks, 2);
});

test("check 1 — by the bytes: the password only in the login bodies, the token only in Authorization headers, and the chat key, the private keys and every turn nowhere the homeserver can see, one base64 layer down included", async () => {
  const secrets = new SecretSet();
  secrets.add("chat key", alice.keyOf(room));
  secrets.add("alice private key", alice.data.identity.priv).add("bob private key", bob.data.identity.priv);
  secrets.add("alice token", alice.data.session.access_token).add("bob token", bob.data.session.access_token);
  secrets.add("alice password", PW.alice).add("bob password", PW.bob);
  for (const t of [...TURNS, ...MORE]) secrets.add("a turn", t.content).add("a turn (canary)", /CANARY-\w+/.exec(t.content)[0]);
  const allowed = (l, hit) => (hit.kind.endsWith("password") && l.method === "POST" && l.path === "/_matrix/client/v3/login") || (hit.kind.endsWith("token") && hit.where === "authorization");
  let checked = 0; const offences = [];
  for (const l of hs.log) {
    checked++;
    for (const hit of secrets.leaks(l.path)) offences.push({ where: "path", ...l, hit });
    for (const [name, value] of Object.entries(l.headers)) for (const hit of secrets.leaks(String(value))) if (!allowed(l, { ...hit, where: name })) offences.push({ where: `header ${name}`, method: l.method, path: l.path, hit });
    for (const hit of secrets.leaks(l.body)) if (!allowed(l, hit)) offences.push({ where: "body", method: l.method, path: l.path, hit });
    // one layer down: every base64-looking run in a JSON body, decoded and searched
    const text = dec.decode(l.body);
    if (/^[\s{[]/.test(text)) for (const run of text.match(/[A-Za-z0-9+/_-]{24,}={0,2}/g) ?? []) {
      let bytes; try { bytes = unb64(run.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (run.length % 4)) % 4)); } catch { continue; }
      for (const hit of secrets.leaks(bytes)) offences.push({ where: "body, one base64 layer down", method: l.method, path: l.path, hit });
    }
  }
  // the log holds the whole flow: every route the flow implies is present (no count chosen by hand)
  const seen = new Set(hs.log.map((l) => `${l.method} ${l.path.replace(/\?.*$/, "").replace(/\/rooms\/[^/]+/, "/rooms/R").replace(/\/(state|download)\/.*$/, "/$1/…")}`));
  for (const want of ["POST /_matrix/client/v3/login", "POST /_matrix/client/v3/createRoom", "POST /_matrix/media/v3/upload", "PUT /_matrix/client/v3/rooms/R/state/…", "POST /_matrix/client/v3/rooms/R/invite", "POST /_matrix/client/v3/join/" + encodeURIComponent(room), "GET /_matrix/client/v3/rooms/R/state", "GET /_matrix/client/v1/media/download/…"]) assert.ok(seen.has(want), `${want} in the log (${checked} requests: ${[...seen].join(", ")})`);
  assert.deepEqual(offences, [], "nothing readable reached the homeserver");
  // the positive controls: the instrument DOES see the password in the login body, and the token in the header
  const login = hs.log.find((l) => l.path === "/_matrix/client/v3/login" && l.method === "POST");
  assert.equal(secrets.leaks(login.body)[0]?.kind, "alice password", "the login body is where the password goes (protocol), and the instrument sees it");
  const authed = hs.log.find((l) => l.headers.authorization);
  assert.ok(secrets.leaks(authed.headers.authorization).some((h) => h.kind.endsWith("token")));
  // and over the operator's whole disk at once, the turns and the key are absent
  const disk = hs.everything();
  for (const hit of secrets.leaks(disk)) assert.ok(hit.kind.endsWith("password") || hit.kind.endsWith("token"), `on disk: ${hit.kind}`);
  assert.equal(hs.dump().media.length, 2, "two blocks in the media store");
  for (const m of hs.dump().media) assert.equal(m.type, "application/octet-stream", "ciphertext is uploaded as opaque bytes");
});

test("check 2 — by the structure: every state event carries only declared, pointer-shaped fields", () => {
  const SHAPES = {
    [TYPES.meta]: (c) => assert.deepEqual(Object.keys(c).sort(), ["app", "created_at", "v"]),
    [TYPES.memberKey]: (c) => { assert.deepEqual(Object.keys(c).filter((k) => k !== "proof").sort(), ["alg", "pub", "v"]); assert.match(c.pub, /^[A-Za-z0-9+/=]{80,}$/); if (c.proof) assert.equal(unb64(c.proof).length, 32); },
    [TYPES.chatKey]: (c) => {
      assert.deepEqual(Object.keys(c).filter((k) => !["grants", "older"].includes(k)).sort(), ["blob", "eph_pub", "epoch", "pub", "v"]);
      assert.equal(unb64(c.blob).length, 12 + 32 + 16, "a wrapped key is iv + 32 bytes + tag");
      for (const o of c.older ?? []) { assert.deepEqual(Object.keys(o).sort(), ["blob", "eph_pub", "epoch"]); assert.equal(unb64(o.blob).length, 60); }
      for (const g of Object.values(c.grants ?? {})) { assert.deepEqual(Object.keys(g).filter((k) => k !== "older").sort(), ["blob", "eph_pub", "epoch", "pub", "v"]); assert.equal(unb64(g.blob).length, 60); }
    },
    [TYPES.chain]: (c) => {
      assert.deepEqual(Object.keys(c).sort(), ["count", "head", "idx", "manifest", "manifestBase", "updated_at", "v"]);
      assert.deepEqual(Object.keys(c.head).sort(), ["epoch", "mxc", "sha256"]);
      for (const m of c.manifest) { assert.deepEqual(Object.keys(m).sort(), ["e", "h", "m"]); assert.match(m.m, /^mxc:\/\//); assert.equal(unb64(m.h).length, 32); assert.equal(typeof m.e, "number"); }
      assert.equal(typeof c.count, "number");
    },
  };
  const r = hs.dump().rooms.find((x) => x.id === room);
  let ours = 0;
  for (const ev of r.state) {
    if (ev.type.startsWith("fold.")) { assert.ok(SHAPES[ev.type], `an undeclared state type ${ev.type}`); SHAPES[ev.type](ev.content); ours++; }
    else assert.match(ev.type, /^m\.room\.(create|power_levels|name|join_rules|history_visibility)$/, `a Matrix state type the design did not ask for: ${ev.type}`);
  }
  assert.ok(ours >= 6, `meta, two member keys, two chat keys, one chain (${ours})`);
  assert.equal(r.state.find((e) => e.type === "m.room.join_rules").content.join_rule, "invite");
  assert.equal(r.state.find((e) => e.type === "m.room.name").content.name, "Lincoln's cabinet", "the room NAME is the one thing a person typed that the server holds — said in the door and the policy");
});

test("check 3 — by the function: with everything the operator holds, every blob refuses to open under any key derivable from what was seen; the chat key opens them (positive control)", async () => {
  const key = alice.keyOf(room);
  const blobs = [...hs.store.media.values()].map((m) => m.bytes);
  assert.equal(blobs.length, 2);
  const candidates = [generateChatKey(), new Uint8Array(32)];
  for (const seen of [PW.alice, PW.bob, alice.data.session.access_token, bob.data.session.access_token, room]) candidates.push(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(seen))));
  for (const b of blobs) {
    for (const k of candidates) await assert.rejects(() => decryptBytes(k, b), /wrong key or tampered/);
    const block = await decodeBlock(key, b);
    assert.ok(block.entries.length > 0);
  }
  // the wrapped keys in state open only with a member's private key — not with anything the server holds
  const wrapped = hs.dump().rooms.find((x) => x.id === room).state.filter((e) => e.type === TYPES.chatKey);
  assert.ok(wrapped.length >= 2);
  for (const w of wrapped) for (const k of candidates) await assert.rejects(() => decryptBytes(k, unb64(w.content.blob)));
});

test("the entropy null, measured per blob: each block sits in the band random bytes of its own length occupy", () => {
  for (const m of hs.store.media.values()) {
    let lo = 8, hi = 0;
    for (let d = 0; d < 100; d++) { const h = byteEntropy(randomBytes(m.bytes.length)); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    const e = byteEntropy(m.bytes);
    assert.ok(e >= lo && e <= hi, `${m.bytes.length} bytes: ${e.toFixed(3)} in [${lo.toFixed(3)}, ${hi.toFixed(3)}]`);
  }
});

test("the record discipline: every line the flow recorded is pointer-shaped and carries no secret and no turn; a leaking line refuses (positive control)", () => {
  const secrets = new SecretSet().add("chat key", alice.keyOf(room)).add("alice token", alice.data.session.access_token).add("alice password", PW.alice).add("bob password", PW.bob).add("bob token", bob.data.session.access_token);
  for (const t of [...TURNS, ...MORE]) secrets.add("a turn", t.content);
  assert.ok(records.length >= 8, `login ×2, room, preserve ×2, share, join, load (${records.length})`);
  for (const r of records) {
    assert.deepEqual(secrets.leaks(JSON.stringify(r)), [], `${r.who} ${r.kind}`);
    for (const k of Object.keys(r.fields)) assert.doesNotMatch(k, /key|token|password|secret|blob/i);
  }
  const preserve = records.find((r) => r.kind === "matrix-preserve");
  assert.deepEqual(Object.keys(preserve.fields).sort(), ["bytes", "entries", "epoch", "idx", "mxc", "room", "sha256", "skipped"]);
  assert.throws(() => forRecord({ note: b64(alice.keyOf(room)) }, secrets), /refusing to record/);
  assert.throws(() => forRecord({ note: TURNS[0].content }, secrets), /refusing to record/);
});

test("the auth rule the design leans on, exercised: bob cannot write alice's chain slot; bob CAN write his own, and alice's load merges his turns", async () => {
  const http = bob.http();
  await assert.rejects(() => http.putState(room, TYPES.chain, "@alice:fake.test", { v: 1 }), (e) => e instanceof MatrixError && e.status === 403);
  const p = await bob.preserve(room, [{ kind: "turn", role: "user", content: "bob adds: and Seward at State. CANARY-b0b", seq: 0 }]);
  assert.equal(p.pushed, 1);
  const l = await alice.load(room);
  assert.equal(l.chains, 2);
  assert.ok(l.entries.some((e) => e.content.includes("Seward")), "alice reads bob's chain under the one key");
  assert.equal(l.partial, false, `gaps: ${l.gaps}`);
});

test("a third party: not invited cannot join; the share link's key is in the fragment, which no request ever carried; a bad token is refused before any media is served", async () => {
  const mallory = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await mallory.login(hs.base, "mallory", PW.mallory);
  const j = await mallory.joinFromLink(link);
  assert.equal(j.joined, false); assert.match(j.gap, /not invited/);
  assert.ok(!hs.log.some((l) => l.path.includes("fold-share")), "the fragment never reached the server");
  const p = parseShareLink(link); assert.deepEqual(p.key, alice.keyOf(room));
  const anon = new MatrixHttp({ base: hs.base, token: "syt_not_a_token" });
  await assert.rejects(() => anon.download(hs.dump().media[0].mxc), (e) => e.status === 401);
});

test("wipe and recover by grant: a fresh browser for bob holds no key and says so; it publishes its member key; alice's next /share grants it; the chat reads again", async () => {
  const bob2 = new FoldMatrix({ storage: mapStorage(), record: recordInto("bob2") });
  await bob2.login(hs.base, "bob", PW.bob);
  const empty = await bob2.load(room);
  assert.deepEqual([empty.entries.length, empty.partial], [0, true]);
  assert.match(empty.gaps[0], /no key/);
  const req = await bob2.requestKey(room);
  const sh = await alice.share(room, { pageHref: "https://example.github.io/the-fold/" });
  assert.deepEqual(sh.granted, [], "a key with no proof is never granted on its own");
  assert.deepEqual(sh.unverified.map((u) => u.user), ["@bob:fake.test"], "it is listed as unverified, with a fingerprint to compare out of band");
  assert.equal(sh.unverified[0].fingerprint, req.fingerprint, "the fingerprint bob reads aloud is the one alice sees");
  const g = await alice.share(room, { grant: "@bob:fake.test" });
  assert.deepEqual(g.granted.map((x) => x.user), ["@bob:fake.test"], "granted by name after the comparison — wrapped to bob's NEW identity");
  const again = await bob2.load(room);
  assert.equal(again.partial, false, `gaps: ${again.gaps}`);
  assert.equal(again.entries.length, 6);
  // the grant on alice's slot does not carry the key readable: it opens only with bob2's private key
  const grant = hs.dump().rooms.find((x) => x.id === room).state.find((e) => e.type === TYPES.chatKey && e.state_key === "@alice:fake.test").content.grants["@bob:fake.test"];
  await assert.rejects(() => decryptBytes(alice.keyOf(room), unb64(grant.blob)));
  const s = new SecretSet().add("chat key", alice.keyOf(room));
  assert.deepEqual(s.leaks(JSON.stringify(grant)), []);
});

test("a homeserver that is down or wrong is a typed error, never a hang or a silent nothing", async () => {
  const dead = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await assert.rejects(() => dead.login("http://localhost:9", "x", "y"), (e) => e instanceof MatrixError && /no answer/.test(e.message));
  await assert.rejects(() => alice.login(hs.base, "alice", "wrong-pw"), (e) => e.status === 403 && /Invalid/.test(e.message));
  await assert.rejects(() => alice.preserve("!nope:fake.test", TURNS), /no key for this room/);
  assert.equal(dead.status().signedIn, false);
});

// ── the room as a mouth ──────────────────────────────────────────────────────
const PROMPT = "PROMPT-CANARY-77aa: who was Secretary of State?";
const REPLY = "REPLY-CANARY-88bb: William Seward, from March 1861.";
const echoMouth = (label) => async ({ model, messages }) => ({ text: `${REPLY} [${label} answered ${messages.at(-1).content.length} chars with ${model}]`, usage: { outTokens: 12, promptTokens: 30 }, model, device: { home: "terminal", label } });

test("the room as a mouth: alice serves her machine's models; bob's prompt goes to her sealed, her answer comes back sealed; the homeserver saw an address, an id, a seal and a size", async () => {
  const ac = new AbortController();
  const serving = alice.serve(room, { complete: echoMouth("alice-mac"), models: ["gemma2:2b", "qwen2.5-coder:1.5b"], home: "terminal", signal: ac.signal });
  try {
  await new Promise((r) => setTimeout(r, 50));
  const offers = await bob.mouths(room);
  assert.deepEqual(offers.map((o) => o.user), ["@alice:fake.test"]);
  assert.deepEqual(offers[0].models, ["gemma2:2b", "qwen2.5-coder:1.5b"]);
  const a = await bob.ask(room, { messages: [{ role: "user", content: PROMPT }], model: "gemma2:2b" }, { timeoutMs: 10_000 });
  assert.equal(a.by, "@alice:fake.test");
  assert.match(a.text, /^REPLY-CANARY-88bb: William Seward.*alice-mac answered \d+ chars with gemma2:2b/);
  assert.equal(a.device.label, "alice-mac");
  assert.ok(a.ms >= 0);
  const pool = bob.pool(room);
  assert.equal(pool.workers[0].answered, 1); assert.equal(pool.workers[0].inflight, 0); assert.equal(pool.workers[0].answeredBy.label, "alice-mac");
  // what the server holds of it
  const jobs = hs.dump().timeline.filter((e) => e.type === EVENTS.job); const answers = hs.dump().timeline.filter((e) => e.type === EVENTS.answer);
  assert.equal(jobs.length, 1); assert.equal(answers.length, 1);
  assert.deepEqual(Object.keys(jobs[0].content).sort(), ["bytes", "env", "id", "to", "v"]);
  assert.deepEqual(Object.keys(answers[0].content).sort(), ["env", "job", "v"]);
  assert.equal(jobs[0].content.to, "@alice:fake.test");
  const mouth = hs.dump().rooms.find((x) => x.id === room).state.find((e) => e.type === TYPES.mouth && e.state_key === "@alice:fake.test");
  assert.deepEqual(Object.keys(mouth.content).filter((k) => !["available", "device", "refused"].includes(k)).sort(), ["home", "models", "since", "v"]);
  const secrets = new SecretSet().add("the prompt", PROMPT).add("the reply", REPLY).add("chat key", alice.keyOf(room));
  for (const l of hs.log) { assert.deepEqual(secrets.leaks(l.body), [], `${l.method} ${l.path}`); assert.deepEqual(secrets.leaks(l.path), []); }
  assert.deepEqual(secrets.leaks(hs.everything()), [], "nor on the operator's disk");
  assert.ok(hs.log.some((l) => l.path.startsWith("/_matrix/client/v3/sync?filter=") && l.path.includes(encodeURIComponent(room))), "sync is filtered to this room's jobs channel");
  } finally { ac.abort(); }
  const { served } = await serving;
  assert.equal(served, 1);
  assert.deepEqual((await bob.mouths(room)), [], "the offer is withdrawn when serving stops");
});

test("a job that names no model is answered with the worker's first offered model — 'whatever this machine has' is a real ask, and the worker is what knows", async () => {
  const ac = new AbortController();
  const seen = [];
  const s = alice.serve(room, { complete: async ({ model, messages }) => { seen.push(model); return { text: `answered with ${model}`, usage: { outTokens: 3 }, model }; }, models: ["gemma2:2b", "phi3:mini"], home: "terminal", signal: ac.signal });
  try {
    await new Promise((r) => setTimeout(r, 50));
    await bob.mouths(room);
    const a = await bob.ask(room, { messages: [{ role: "user", content: "no model named" }] }, { timeoutMs: 10_000 });
    assert.deepEqual(seen, ["gemma2:2b"], "the first model this worker offers");
    assert.equal(a.model, "gemma2:2b");
    assert.match(a.text, /answered with gemma2:2b/);
  } finally { ac.abort(); await s; }
});

test("coordinating which model runs where: a machine says what it serves, what it has spare and what it is (CPU or GPU); a member asks it to take up a spare model and it does; an ask for a model it does not have is refused with a reason, in the pool", async () => {
  const ac = new AbortController();
  const device = { runtime: "Ollama", os: "linux", arch: "x64", cores: 16, memGB: 64, gpu: false };
  const took = [];
  const s = alice.serve(room, { complete: async ({ model }) => ({ text: `answered with ${model}`, usage: { outTokens: 3 }, model, device }), models: ["gemma2:2b"], available: ["qwen3:4b", "phi3:mini"], device, home: "terminal", signal: ac.signal, onTakeUp: (t) => took.push(t.model) });
  try {
    await new Promise((r) => setTimeout(r, 60));
    await bob.mouths(room);
    const seen = bob.pool(room).workers.find((w) => w.user === "@alice:fake.test");
    assert.deepEqual(seen.models, ["gemma2:2b"]);
    assert.deepEqual(seen.available, ["qwen3:4b", "phi3:mini"], "what it could serve but is not");
    assert.equal(seen.device.gpu, false, "a CPU-only machine says so");
    assert.equal(seen.device.cores, 16);
    // ask for a spare model: it is taken up and offered
    const w = await bob.want(room, "@alice:fake.test", "qwen3:4b");
    assert.deepEqual([w.available, w.serving], [true, false]);
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline && !(await bob.mouths(room)).some((o) => o.models.includes("qwen3:4b"))) await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual(took, ["qwen3:4b"]);
    const now = bob.pool(room).workers.find((x) => x.user === "@alice:fake.test");
    assert.deepEqual(now.models, ["gemma2:2b", "qwen3:4b"]);
    assert.deepEqual(now.available, ["phi3:mini"], "no longer spare once it is served");
    const a = await bob.ask(room, { messages: [{ role: "user", content: "x" }], model: "qwen3:4b" }, { timeoutMs: 10_000 });
    assert.match(a.text, /answered with qwen3:4b/);
    // ask for a model it does not have: refused, with the reason, in the pool
    await bob.want(room, "@alice:fake.test", "llama3:70b");
    const d2 = Date.now() + 8000;
    while (Date.now() < d2 && !(bob.pool(room).workers.find((x) => x.user === "@alice:fake.test")?.refused ?? []).length) { await bob.mouths(room); await new Promise((r) => setTimeout(r, 200)); }
    const refused = bob.pool(room).workers.find((x) => x.user === "@alice:fake.test").refused;
    assert.deepEqual(refused.map((r) => [r.model, r.why]), [["llama3:70b", "this machine does not have that model"]]);
    await assert.rejects(() => bob.ask(room, { messages: [{ role: "user", content: "x" }], model: "llama3:70b" }, { timeoutMs: 2000 }), /no offered mouth has llama3:70b/);
    await bob.unwant(room, "@alice:fake.test");
  } finally { ac.abort(); await s; }
});

test("a machine may decline a model it has — its own hardware, its own call — and the reason travels", async () => {
  const ac = new AbortController();
  const s = alice.serve(room, { complete: async ({ model }) => ({ text: "ok", model }), models: ["gemma2:2b"], available: ["llama3:70b"], device: { runtime: "Ollama", cores: 4, memGB: 8, gpu: false }, home: "terminal", signal: ac.signal, canTakeUp: async (model) => (model === "llama3:70b" ? "70B on 8 GB and no GPU would swap for hours" : null) });
  try {
    await new Promise((r) => setTimeout(r, 60));
    await bob.mouths(room);
    await bob.want(room, "@alice:fake.test", "llama3:70b");
    const d = Date.now() + 8000;
    while (Date.now() < d && !(bob.pool(room).workers.find((x) => x.user === "@alice:fake.test")?.refused ?? []).length) { await bob.mouths(room); await new Promise((r) => setTimeout(r, 200)); }
    const w = bob.pool(room).workers.find((x) => x.user === "@alice:fake.test");
    assert.deepEqual(w.refused.map((r) => r.why), ["70B on 8 GB and no GPU would swap for hours"]);
    assert.ok(!w.models.includes("llama3:70b"));
    await bob.unwant(room, "@alice:fake.test");
  } finally { ac.abort(); await s; }
});

test("a machine that is offering but slow is reported as busy, not gone, and the deadline stretches to the queue it measured", async () => {
  const ac = new AbortController();
  let hold = true;
  const s = alice.serve(room, { complete: async ({ model }) => { while (hold) await new Promise((r) => setTimeout(r, 20)); return { text: "at last", model }; }, models: ["slowpoke"], home: "terminal", signal: ac.signal });
  try {
    await new Promise((r) => setTimeout(r, 60));
    await bob.mouths(room);
    await assert.rejects(() => bob.ask(room, { messages: [{ role: "user", content: "x" }], model: "slowpoke" }, { timeoutMs: 1200 }), /still offering a mouth, so it is most likely still working through its queue/);
  } finally { hold = false; ac.abort(); await s; }
});

test("a pool: two machines serve; four concurrent asks spread across them by in-flight count; a prompt too big for an event rides the media store sealed; the pool surface counts it all", async () => {
  const carol = poolCarol = new FoldMatrix({ storage: mapStorage(), record: recordInto("carol") });
  await carol.login(hs.base, "carol", PW.carol);
  const carolLink = (await alice.share(room, { invite: "@carol:fake.test", mode: "open", pageHref: "https://example.github.io/the-fold/" })).link;
  assert.equal((await carol.joinFromLink(carolLink)).joined, true);
  const ac = new AbortController();
  const s1 = alice.serve(room, { complete: echoMouth("alice-mac"), models: ["gemma2:2b"], home: "terminal", signal: ac.signal });
  const s2 = carol.serve(room, { complete: echoMouth("carol-pc"), models: ["gemma2:2b"], home: "extension", signal: ac.signal });
  try {
  await new Promise((r) => setTimeout(r, 50));
  await bob.mouths(room);
  const big = "B".repeat(70 * 1024) + " PROMPT-CANARY-big";
  const asks = await Promise.all([0, 1, 2, 3].map((i) => bob.ask(room, { messages: [{ role: "user", content: i === 3 ? big : `${PROMPT} #${i}` }], model: "gemma2:2b" }, { timeoutMs: 10_000 })));
  const by = asks.map((a) => a.by).sort();
  assert.deepEqual(by, ["@alice:fake.test", "@alice:fake.test", "@carol:fake.test", "@carol:fake.test"], "two each: the least-loaded mouth takes each next job");
  assert.ok(asks[3].text.includes(`answered ${big.length} chars`), "the big prompt arrived whole");
  const jobs = hs.dump().timeline.filter((e) => e.type === EVENTS.job);
  const viaMedia = jobs.filter((j) => j.content.mxc);
  assert.equal(viaMedia.length, 1, "one job rode the media store");
  assert.deepEqual(Object.keys(viaMedia[0].content).sort(), ["bytes", "id", "mxc", "sha256", "to", "v"]);
  const blob = hs.store.media.get(viaMedia[0].content.mxc).bytes;
  let lo = 8; for (let d = 0; d < 50; d++) lo = Math.min(lo, byteEntropy(randomBytes(blob.length)));
  assert.ok(byteEntropy(blob) >= lo, "the sealed prompt blob sits in the random band");
  assert.deepEqual(new SecretSet().add("big", big).leaks(hs.everything()), []);
  const pool = bob.pool(room);
  assert.equal(pool.offers, 2);
  // The counters accumulate across this file's tests (one job was deliberately
  // left hanging in the busy-not-gone test), so the claim is the shape: every
  // job is accounted for, nothing is still in flight, and both machines worked.
  for (const w of pool.workers) {
    assert.equal(w.answered + w.failed, w.sent, `${w.user} accounts for every job it was sent`);
    assert.equal(w.inflight, 0);
    assert.ok(w.answered >= 2, `${w.user} answered ${w.answered}`);
    assert.ok(w.meanMs >= 0);
  }
  assert.deepEqual(pool.workers.map((w) => w.answeredBy.label).sort(), ["alice-mac", "carol-pc"]);
  } finally { ac.abort(); await s1; await s2; }
});

test("a mouth that is gone is a typed gap that counts against it, and the gap says gone rather than busy; a model nobody offers is a typed gap; a room with no mouths says so", async () => {
  await assert.rejects(() => bob.ask(room, { messages: [{ role: "user", content: "x" }], to: "@nobody:fake.test" }, { timeoutMs: 400 }), /no answer from @nobody:fake.test in \d+s — it is no longer offering a mouth/);
  assert.equal(bob.pool(room).workers.find((w) => w.user === "@nobody:fake.test").failed, 1);
  await assert.rejects(() => bob.ask(room, { messages: [{ role: "user", content: "x" }], model: "gemma2:2b" }), /nobody in this room offers a mouth/);
  const ac = new AbortController();
  const s = alice.serve(room, { complete: echoMouth("alice-mac"), models: ["gemma2:2b"], home: "terminal", signal: ac.signal });
  await new Promise((r) => setTimeout(r, 50));
  try { await assert.rejects(() => bob.ask(room, { messages: [{ role: "user", content: "x" }], model: "llama3" }), /no offered mouth has llama3/); }
  finally { ac.abort(); await s; }
});

test("full powers: an invited member can invite, rename the room and write state — a room of equals, not a creator with viewers", async () => {
  const http = bob.http();
  await http.invite(room, "@mallory:fake.test");
  await http.putState(room, "m.room.name", "", { name: "renamed by bob" });
  assert.equal(hs.dump().rooms.find((x) => x.id === room).state.find((e) => e.type === "m.room.name").content.name, "renamed by bob");
  const pl = hs.dump().rooms.find((x) => x.id === room).state.find((e) => e.type === "m.room.power_levels").content;
  assert.equal(pl.users_default, 100);
});

// ── bound links, passphrase links, rotation, the vault ──────────────────────
test("a bound link carries no key and works for the named account alone: bob signs in as bob, publishes his key with the proof, alice's watcher grants, bob reads; the same link opened by mallory is refused; a second use is refused", async () => {
  const dave = new FoldMatrix({ storage: mapStorage(), record: recordInto("dave") });
  // dave is a fresh account on the fixture: register him
  await fetch(hs.base + "/_matrix/client/v3/register", { method: "POST", body: JSON.stringify({ username: "dave", password: "dave-throwaway-pw-9090", auth: { type: "m.login.dummy" } }) });
  await dave.login(hs.base, "dave", "dave-throwaway-pw-9090");
  const sh = await alice.share(room, { invite: "@dave:fake.test", pageHref: "https://example.github.io/the-fold/" });
  assert.equal(sh.kind, "bound"); assert.ok(sh.expiresAt > Date.now());
  const p = parseShareLink(sh.link);
  assert.equal(p.kind, "bound"); assert.equal(p.to, "@dave:fake.test"); assert.equal(p.key, undefined, "no key in the link");
  assert.deepEqual(new SecretSet().add("chat key", alice.keyOf(room)).leaks(sh.link), []);
  // mallory holds the link but is not dave
  const mallory = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await mallory.login(hs.base, "mallory", PW.mallory);
  const mj = await mallory.joinFromLink(sh.link);
  assert.equal(mj.joined, false); assert.match(mj.gap, /this link is for @dave:fake.test; you are signed in as @mallory:fake.test/);
  // dave redeems it while alice's page watches
  const ac = new AbortController();
  const watching = alice.watchInvites(room, { signal: ac.signal, everyMs: 200 });
  const j = await dave.joinFromLink(sh.link, { waitMs: 10_000 });
  ac.abort(); await watching;
  assert.equal(j.joined, true); assert.equal(j.kind, "bound"); assert.equal(j.awaiting, undefined);
  assert.equal(j.entries.length, 6, "dave reads the whole record");
  assert.ok(dave.keyOf(room), "dave now holds the key, wrapped to the key he published");
  // the secret is spent: a fresh browser for dave with the same link is refused
  const dave2 = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await dave2.login(hs.base, "dave", "dave-throwaway-pw-9090");
  const j2 = await dave2.joinFromLink(sh.link, { waitMs: 1200 });
  assert.equal(j2.awaiting, true, "no grant lands for a second use");
  const g = await alice.grantPending(room);
  assert.deepEqual(g.granted, []);
  assert.ok(g.refused.some((r) => r.user === "@dave:fake.test" && /already used once/.test(r.why)), JSON.stringify(g.refused));
  // the homeserver saw: an address, a secret it never received, a proof, public keys
  const secrets = new SecretSet().add("invite secret", p.secret).add("chat key", alice.keyOf(room));
  assert.deepEqual(secrets.leaks(hs.everything()), [], "neither the secret nor the key reached the server");
});

test("a homeserver that swaps a member's published key gets nothing: the proof no longer verifies and the grant is refused", async () => {
  const eve = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await fetch(hs.base + "/_matrix/client/v3/register", { method: "POST", body: JSON.stringify({ username: "eve", password: "eve-throwaway-pw-1212", auth: { type: "m.login.dummy" } }) });
  await eve.login(hs.base, "eve", "eve-throwaway-pw-1212");
  const sh = await alice.share(room, { invite: "@eve:fake.test", pageHref: "https://example.github.io/the-fold/" });
  const j = await eve.joinFromLink(sh.link, { waitMs: 600 });
  assert.equal(j.awaiting, true);
  // the operator substitutes its own key under eve's state_key, keeping her proof
  const r = hs.store.rooms.get(room); const slot = r.state.get(`${TYPES.memberKey} @eve:fake.test`);
  const mine = new FoldMatrix({ storage: mapStorage(), record: () => {} }); const operatorPub = (await (async () => { await mine.identity(); return mine.data.identity; })()).pub;
  r.state.set(`${TYPES.memberKey} @eve:fake.test`, { ...slot, pub: operatorPub });
  const g = await alice.grantPending(room);
  assert.deepEqual(g.granted, []);
  assert.ok(g.refused.some((x) => x.user === "@eve:fake.test" && /does not verify/.test(x.why)), JSON.stringify(g.refused));
  // put eve's real key back: the grant lands
  r.state.set(`${TYPES.memberKey} @eve:fake.test`, slot);
  const g2 = await alice.grantPending(room);
  assert.deepEqual(g2.granted.map((x) => x.user), ["@eve:fake.test"]);
  assert.ok(await eve.keyFor(room));
});

test("an expired bound link is refused by both sides", async () => {
  const sh = await alice.share(room, { invite: "@mallory:fake.test", pageHref: "https://example.github.io/the-fold/" });
  alice.data.rooms[room].invites["@mallory:fake.test"].exp = Date.now() - 1000;
  const p = parseShareLink(sh.link);
  const stale = sh.link.replace(/fold-share=[A-Za-z0-9_-]+/, "fold-share=" + Buffer.from(JSON.stringify({ v: 2, hs: p.hs, r: p.room, n: p.name, to: p.to, s: Buffer.from(p.secret).toString("base64url"), exp: Date.now() - 1000 })).toString("base64url"));
  const mallory = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await mallory.login(hs.base, "mallory", PW.mallory);
  const j = await mallory.joinFromLink(stale);
  assert.equal(j.joined, false); assert.match(j.gap, /expired/);
  assert.deepEqual(alice.pendingInvites(room).includes("@mallory:fake.test"), false, "an expired invite is no longer pending");
});

test("a passphrase link: neither the link nor the words alone opens the room; the wrong words are a typed gap", async () => {
  const sh = await alice.share(room, { mode: "passphrase", passphrase: "seward stanton welles chase", pageHref: "https://example.github.io/the-fold/" });
  assert.equal(sh.kind, "passphrase");
  const p = parseShareLink(sh.link); assert.equal(p.kind, "passphrase");
  assert.deepEqual(new SecretSet().add("chat key", alice.keyOf(room)).leaks(sh.link), []);
  const frank = new FoldMatrix({ storage: mapStorage(), record: () => {} });
  await fetch(hs.base + "/_matrix/client/v3/register", { method: "POST", body: JSON.stringify({ username: "frank", password: "frank-throwaway-pw-3434", auth: { type: "m.login.dummy" } }) });
  await frank.login(hs.base, "frank", "frank-throwaway-pw-3434");
  await alice.http().invite(room, "@frank:fake.test");
  assert.equal((await frank.joinFromLink(sh.link)).needs, "passphrase");
  const wrong = await frank.joinFromLink(sh.link, { passphrase: "seward stanton welles bates" });
  assert.equal(wrong.joined, false); assert.match(wrong.gap, /passphrase does not open/);
  const right = await frank.joinFromLink(sh.link, { passphrase: "seward stanton welles chase" });
  assert.equal(right.joined, true); assert.equal(right.entries.length, 6);
  await assert.rejects(() => alice.share(room, { mode: "passphrase", passphrase: "short", pageHref: "https://e.org/" }), /three words/);
});

test("rotation and removal: after alice removes bob, a new epoch seals everything after; bob opens the old blocks he already had and not the new one; carol, re-granted every epoch, reads all of it", async () => {
  const rot = await alice.remove(room, "@bob:fake.test");
  assert.equal(rot.epoch, 1);
  assert.ok(rot.regranted.includes("@carol:fake.test") && !rot.regranted.includes("@bob:fake.test"), JSON.stringify(rot));
  const p = await alice.preserve(room, [...TURNS, ...MORE, { kind: "turn", role: "user", content: "after the rotation: SEAL-CANARY-epoch1", seq: 9 }]);
  assert.equal(p.epoch, 1); assert.equal(p.pushed, 1);
  // carol's own browser from the pool test still holds epoch 0 and is re-granted epoch 1 on her slot
  const cl = await poolCarol.load(room);
  assert.equal(cl.partial, false, `gaps: ${cl.gaps}`);
  assert.deepEqual([...poolCarol.keysOf(room).keys()].sort(), [0, 1], "both epochs, from the wrap and its older list");
  assert.ok(cl.entries.some((e) => /SEAL-CANARY-epoch1/.test(e.content)), "carol reads the epoch-1 block");
  const bl = await bob.load(room).catch((e) => ({ error: e.message }));
  if (!bl.error) { assert.equal(bl.partial, true); assert.ok(bl.gaps.some((g) => /epoch 1/.test(g)), `bob's gaps: ${bl.gaps}`); assert.ok(!bl.entries.some((e) => /SEAL-CANARY-epoch1/.test(e.content))); }
  else assert.match(bl.error, /not a member|403|forbidden/i);
  const st = hs.dump().rooms.find((x) => x.id === room);
  assert.equal(st.members.find(([u]) => u === "@bob:fake.test")[1], "leave");
});

test("the vault: locked, storage holds no session, key, token or secret in any encoding; every door is a typed gap until unlock; the wrong passphrase refuses; unlock restores everything", async () => {
  const st = mapStorage(); const v = new FoldMatrix({ storage: st, record: () => {} });
  await v.login(hs.base, "alice", PW.alice);
  const roomV = await v.ensureRoom({ name: "vaulted" });
  await v.preserve(roomV, TURNS.slice(0, 1));
  await v.lock("bring me the head of alfredo garcia");
  const secrets = new SecretSet().add("token", v.data.session.access_token).add("chat key", v.keyOf(roomV)).add("private key", v.data.identity.priv);
  assert.deepEqual(secrets.leaks(st.raw()), [], "storage is the vault and nothing else");
  assert.deepEqual(Object.keys(JSON.parse(st.raw())).sort(), ["v", "vault"]);
  const again = new FoldMatrix({ storage: st, record: () => {} });
  assert.equal(again.locked, true); assert.equal(again.status().signedIn, false);
  await assert.rejects(() => again.preserve(roomV, TURNS), /locked/);
  await assert.rejects(() => again.load(roomV), /locked/);
  assert.equal((await again.joinFromLink(link)).needs, "unlock");
  await assert.rejects(() => again.unlock("bring me the head of alfredo garcias"), /does not open/);
  const s2 = await again.unlock("bring me the head of alfredo garcia");
  assert.equal(s2.user, "@alice:fake.test"); assert.deepEqual(again.keyOf(roomV), v.keyOf(roomV));
  assert.equal((await again.load(roomV)).entries.length, 1);
  await again.clearLock("bring me the head of alfredo garcia");
  assert.ok(JSON.parse(st.raw()).session, "plain again, by the passphrase");
});

test("members: who is in the room, each key's fingerprint, and who holds a wrap; a re-published key must be granted again", async () => {
  const list = await alice.members(room);
  const me = list.find((m) => m.user === "@alice:fake.test");
  assert.equal(me.fingerprint, await alice.myFingerprint()); assert.equal(me.hasKey, true);
  // dave's SECOND browser replaced the key his account publishes (one key per
  // account in room state), and the spent link meant it was never granted — so
  // the account shows a key carrying a proof and no wrap, and the rotation that
  // followed re-granted only members whose published key was covered.
  const dave = list.find((m) => m.user === "@dave:fake.test");
  assert.equal(dave.proof, "proof");
  assert.equal(dave.hasKey, false, "the replaced key holds no wrap — a re-published key must be granted again");
  assert.ok(["@carol:fake.test", "@frank:fake.test", "@eve:fake.test"].every((u) => list.find((m) => m.user === u)?.hasKey), JSON.stringify(list.map((m) => [m.user, m.hasKey])));
  assert.ok(list.some((m) => m.user === "@bob:fake.test" && m.membership === "leave"), JSON.stringify(list.map((m) => [m.user, m.membership])));
});
