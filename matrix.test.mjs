// matrix.test.mjs — the pure half's proofs (P119): the envelope, the key wrap,
// the chain, the share link, the leak instrument (with its positive control),
// and the measured entropy null. No network; Node's WebCrypto.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateChatKey, encryptBytes, decryptBytes, sha256B64, b64, unb64, b64url, unb64url, hex,
  generateIdentity, exportPublicKey, exportPrivateKey, importPrivateKey, wrapChatKey, unwrapChatKey,
  entryId, encodeBlock, decodeBlock, mergeChains, capManifest, chainIsLinked, manifestEntry, MANIFEST_MAX_BYTES,
  createRoomBody, memberKeyContent, chatKeyContent, loginBody, homeserverBase, paths, TYPES, EVENTS, FULL_POWER,
  seal, open, pickMouth, syncFilter, mouthContent, jobContent, answerContent,
  buildShareLink, parseShareLink, stripShareFragment,
  generateInviteSecret, inviteProof, verifyInviteProof, fingerprint, keyFromPassphrase, generateSalt, sealVault, openVault, INVITE_TTL_MS, MAGIC_KEY_WARNING,
  SecretSet, bytesIndexOf, byteEntropy, forRecord, SERVER_SEES,
} from "./matrix.js";

const enc = new TextEncoder();
const dec = new TextDecoder();
const CANARY = "CANARY the user typed: Lincoln's second vice-president was Andrew Johnson 7f3a9c";

test("envelope: AES-256-GCM, fresh iv per call, [iv12][ct+tag]; the wrong key and a flipped byte both refuse", async () => {
  const key = generateChatKey();
  const pt = enc.encode(CANARY);
  const a = await encryptBytes(key, pt);
  const b = await encryptBytes(key, pt);
  assert.equal(a.length, 12 + pt.length + 16);
  assert.notEqual(b64(a), b64(b), "two envelopes of one plaintext differ (fresh iv)");
  assert.equal(dec.decode(await decryptBytes(key, a)), CANARY);
  assert.equal(bytesIndexOf(a, pt), -1, "the plaintext is not a substring of the ciphertext");
  await assert.rejects(() => decryptBytes(generateChatKey(), a), /wrong key or tampered/);
  const tampered = a.slice(); tampered[20] ^= 1;
  await assert.rejects(() => decryptBytes(key, tampered), /wrong key or tampered/);
  await assert.rejects(() => encryptBytes(new Uint8Array(16), pt), /32 bytes/);
});

test("identity + wrap: the chat key opens only with the recipient's private key; each wrap is fresh; the private key round-trips pkcs8", async () => {
  const key = generateChatKey();
  const alice = await generateIdentity();
  const mallory = await generateIdentity();
  const pub = await exportPublicKey(alice.publicKey);
  const w1 = await wrapChatKey(pub, key);
  const w2 = await wrapChatKey(pub, key);
  assert.notEqual(w1.blob, w2.blob); assert.notEqual(w1.eph_pub, w2.eph_pub);
  assert.deepEqual(await unwrapChatKey(alice.privateKey, w1), key);
  await assert.rejects(() => unwrapChatKey(mallory.privateKey, w1), /not for this identity/);
  const priv = await importPrivateKey(await exportPrivateKey(alice.privateKey));
  assert.deepEqual(await unwrapChatKey(priv, w2), key);
  // the wrapped blob does not carry the key in any encoding
  const s = new SecretSet().add("chat key", key);
  assert.deepEqual(s.leaks(JSON.stringify(chatKeyContent(w1))), []);
});

test("blocks: encode/decode, hash-checked, hash-linked; a substituted block breaks the walk; entries dedup on read by content id", async () => {
  const key = generateChatKey();
  const e1 = { kind: "turn", role: "user", content: CANARY, seq: 0, ts: 1 }; e1.id = await entryId(e1);
  const e2 = { kind: "turn", role: "assistant", content: "Hamlin, then Johnson.", seq: 1, ts: 2 }; e2.id = await entryId(e2);
  const b0 = await encodeBlock(key, { idx: 0, prev: null, entries: [e1] });
  const b1 = await encodeBlock(key, { idx: 1, prev: { mxc: "mxc://x/0", sha256: b0.sha256 }, entries: [e2, e1] });
  assert.equal(bytesIndexOf(b0.bytes, enc.encode("Lincoln")), -1);
  const d0 = await decodeBlock(key, b0.bytes, b0.sha256);
  const d1 = await decodeBlock(key, b1.bytes, b1.sha256);
  assert.equal(d0.entries[0].content, CANARY);
  await assert.rejects(() => decodeBlock(key, b0.bytes, b1.sha256), /hash mismatch/);
  await assert.rejects(() => decodeBlock(generateChatKey(), b0.bytes, b0.sha256), /wrong key/);
  assert.deepEqual(chainIsLinked([{ block: d0, sha256: b0.sha256 }, { block: d1, sha256: b1.sha256 }]), { linked: true, at: null });
  const forged = await encodeBlock(key, { idx: 0, prev: null, entries: [e2] });
  assert.deepEqual(chainIsLinked([{ block: await decodeBlock(key, forged.bytes), sha256: forged.sha256 }, { block: d1, sha256: b1.sha256 }]), { linked: false, at: 1 });
  const merged = mergeChains([[d0], [d1]]);
  assert.deepEqual(merged.map((e) => e.seq), [0, 1], "e1 appears once though two blocks carry it");
  assert.equal(await entryId(e1), e1.id, "ids are content-derived");
});

test("manifest: capped to the state-event budget from the oldest end, base advanced by what was dropped", () => {
  const entries = Array.from({ length: 2000 }, (_, i) => manifestEntry(`mxc://h/${"m".repeat(30)}${i}`, "s".repeat(44)));
  const { manifest, base } = capManifest(entries, 5);
  assert.ok(manifest.length < 2000 && manifest.length > 100);
  assert.ok(enc.encode(JSON.stringify(manifest)).length <= MANIFEST_MAX_BYTES);
  assert.equal(base, 5 + (2000 - manifest.length));
  assert.deepEqual(manifest.at(-1), entries.at(-1), "the newest pointer is kept");
});

test("room shape: private, invite-only, EVERY member at full power (no viewer level), our meta event, and NO m.room.encryption (readable content is never in the timeline)", () => {
  const body = createRoomBody("a chat", { now: "2026-09-05T00:00:00Z" });
  assert.equal(body.visibility, "private");
  assert.ok(body.initial_state.some((s) => s.type === "m.room.join_rules" && s.content.join_rule === "invite"));
  assert.ok(body.initial_state.some((s) => s.type === TYPES.meta && s.content.app === "fold"));
  assert.ok(!body.initial_state.some((s) => s.type === "m.room.encryption"));
  const pl = body.power_level_content_override;
  assert.equal(pl.users_default, FULL_POWER); assert.equal(pl.state_default, FULL_POWER); assert.equal(pl.invite, 0);
  assert.ok(!pl.events, "no per-type flattening");
  assert.deepEqual(memberKeyContent("PUB"), { v: 1, alg: "ecdh-p256", pub: "PUB" });
  assert.equal(paths.send("!r:h", EVENTS.job, "t1"), "/_matrix/client/v3/rooms/!r%3Ah/send/fold.job/t1");
  assert.match(paths.sync({ since: "s9", filter: { a: 1 }, timeout: 30000 }), /^\/_matrix\/client\/v3\/sync\?filter=%7B%22a%22%3A1%7D&timeout=30000&since=s9$/);
  assert.equal(loginBody("alice", "pw").identifier.user, "alice");
  assert.equal(homeserverBase("matrix.org"), "https://matrix.org");
  assert.equal(homeserverBase("http://localhost:8448/"), "http://localhost:8448");
  assert.throws(() => homeserverBase("http://example.org"), /https/);
  assert.equal(paths.state("!r:h", "fold.chain", "@a:h"), "/_matrix/client/v3/rooms/!r%3Ah/state/fold.chain/%40a%3Ah");
  assert.deepEqual(paths.download("mxc://h/abc"), ["/_matrix/client/v1/media/download/h/abc", "/_matrix/media/v3/download/h/abc"]);
});

test("share link: the key rides only in the fragment; parse round-trips; a link without a 32-byte key is null; strip removes it and nothing else", () => {
  const key = generateChatKey();
  const link = buildShareLink("https://example.github.io/the-fold/index.html?x=1#tab=chat", { hs: "https://hs.example", room: "!abc:hs.example", key, name: "Lincoln's cabinet" });
  const u = new URL(link);
  assert.ok(u.hash.includes("fold-share="));
  assert.equal(u.pathname + u.search, "/the-fold/index.html?x=1", "nothing secret before the #");
  const s = new SecretSet().add("chat key", key);
  assert.deepEqual(s.leaks(u.origin + u.pathname + u.search), []);
  // positive control: the key IS in the fragment — one base64url layer down
  // (the payload is base64url JSON, the key base64url inside it), which is
  // why the adversarial test also opens every base64-looking run it finds.
  const payload = dec.decode(unb64url(/fold-share=([A-Za-z0-9_-]+)/.exec(u.hash)[1]));
  assert.ok(s.leaks(payload).length, "the key IS in the fragment's payload (positive control)");
  const p = parseShareLink(link);
  assert.equal(p.kind, "open");
  assert.deepEqual(p.key, key); assert.equal(p.room, "!abc:hs.example"); assert.equal(p.hs, "https://hs.example"); assert.equal(p.name, "Lincoln's cabinet");
  assert.equal(parseShareLink("https://example.org/#fold-share=" + b64url(enc.encode(JSON.stringify({ v: 1, hs: "h", r: "!r:h", k: b64url(new Uint8Array(5)) })))), null);
  assert.equal(parseShareLink("https://example.org/#fold-share=%%%"), null);
  assert.equal(parseShareLink("https://example.org/#tab=chat"), null);
  assert.equal(stripShareFragment(link), "https://example.github.io/the-fold/index.html?x=1#tab=chat");
  assert.equal(stripShareFragment(buildShareLink("https://e.org/i.html", { hs: "h", room: "!r:h", key })), "https://e.org/i.html");
});

test("bound and passphrase links: a bound link carries no key, names the account and a one-shot secret with an expiry; a passphrase link carries the key sealed under the words; v1 links still read as open", async () => {
  const key = generateChatKey(); const s = new SecretSet().add("chat key", key);
  const secret = generateInviteSecret();
  const bound = buildShareLink("https://e.org/i.html", { hs: "https://hs.example", room: "!r:hs.example", name: "n", to: "@bob:hs.example", secret });
  const pb = parseShareLink(bound);
  assert.equal(pb.kind, "bound"); assert.equal(pb.to, "@bob:hs.example"); assert.deepEqual(pb.secret, secret); assert.ok(pb.exp > Date.now() && pb.exp <= Date.now() + INVITE_TTL_MS);
  assert.equal(pb.key, undefined);
  assert.deepEqual(s.leaks(dec.decode(unb64url(/fold-share=([A-Za-z0-9_-]+)/.exec(new URL(bound).hash)[1]))), [], "the bound link's payload carries no key");
  assert.throws(() => buildShareLink("https://e.org/", { hs: "h", room: "!r:h", to: "bob", secret }), /Matrix id/);
  const salt = generateSalt(); const kdf = await keyFromPassphrase("correct horse battery staple", salt);
  const wrapped = await encryptBytes(kdf, key);
  const pass = buildShareLink("https://e.org/i.html", { hs: "https://hs.example", room: "!r:hs.example", wrapped, salt });
  const pp = parseShareLink(pass);
  assert.equal(pp.kind, "passphrase"); assert.deepEqual(pp.salt, salt);
  assert.deepEqual(await decryptBytes(await keyFromPassphrase("correct horse battery staple", pp.salt), pp.wrapped), key);
  await assert.rejects(async () => decryptBytes(await keyFromPassphrase("wrong words", pp.salt), pp.wrapped), /wrong key/);
  assert.deepEqual(s.leaks(dec.decode(unb64url(/fold-share=([A-Za-z0-9_-]+)/.exec(new URL(pass).hash)[1]))), [], "the passphrase link's payload carries no key");
  const v1 = "https://e.org/#fold-share=" + b64url(enc.encode(JSON.stringify({ v: 1, hs: "h", r: "!r:h", k: b64url(key) })));
  assert.equal(parseShareLink(v1).kind, "open");
  assert.match(MAGIC_KEY_WARNING, /magic key/);
});

test("the invite proof binds a key to the secret, the room and the account; a swapped key, another account, another room or another secret all fail; the fingerprint is stable and short", async () => {
  const secret = generateInviteSecret();
  const bob = await exportPublicKey((await generateIdentity()).publicKey);
  const mallory = await exportPublicKey((await generateIdentity()).publicKey);
  const fields = { room: "!r:h", user: "@bob:h", pub: bob };
  const proof = await inviteProof(secret, fields);
  assert.equal(await verifyInviteProof(secret, fields, proof), true);
  assert.equal(await verifyInviteProof(secret, { ...fields, pub: mallory }, proof), false, "the homeserver swapped the key");
  assert.equal(await verifyInviteProof(secret, { ...fields, user: "@mallory:h" }, proof), false);
  assert.equal(await verifyInviteProof(secret, { ...fields, room: "!other:h" }, proof), false);
  assert.equal(await verifyInviteProof(generateInviteSecret(), fields, proof), false);
  assert.equal(await verifyInviteProof(secret, fields, "not base64!!"), false);
  const fp = await fingerprint(bob);
  assert.match(fp, /^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
  assert.equal(fp, await fingerprint(bob)); assert.notEqual(fp, await fingerprint(mallory));
});

test("the vault: sealed under a passphrase, storage holds no secret in any encoding; the wrong passphrase refuses; the right one returns the same data", async () => {
  const key = generateChatKey(); const token = "syt_alice_secret_token_0123456789";
  const data = { session: { access_token: token }, rooms: { "!r:h": { keys: { 0: b64(key) } } } };
  const { vault } = await sealVault("a long passphrase of my own", data);
  assert.deepEqual(Object.keys(vault).sort(), ["blob", "rounds", "salt", "v"]);
  const s = new SecretSet().add("chat key", key).add("token", token);
  assert.deepEqual(s.leaks(JSON.stringify(vault)), []);
  assert.deepEqual(s.leaks(unb64(vault.blob)), []);
  await assert.rejects(() => openVault("a long passphrase of my ownn", vault), /does not open/);
  assert.deepEqual((await openVault("a long passphrase of my own", vault)).data, data);
});

test("the leak instrument: finds a secret raw, base64, base64url, hex, JSON-escaped and percent-encoded, in text and in bytes — and reports nothing when nothing is there", () => {
  const key = generateChatKey();
  const token = "syt_YWxpY2U_abcdefghijklmnopqrstuvwxyz_012345";
  const password = 'correct horse "battery" staple';
  const s = new SecretSet().add("chat key", key).add("access token", token).add("password", password);
  assert.deepEqual(s.leaks("nothing here but pointers: mxc://h/abc sha256 " + "x".repeat(44)), []);
  assert.deepEqual(s.leaks(enc.encode("plain bytes")), []);
  for (const [form, text] of [["raw", token], ["b64", b64(enc.encode(token))], ["b64url", b64url(enc.encode(token))], ["hex", hex(enc.encode(token))]]) assert.equal(s.leaks(`Authorization: ${text}`)[0]?.kind, "access token", form);
  assert.equal(s.leaks(JSON.stringify({ password }))[0]?.kind, "password", "JSON-escaped quotes");
  assert.equal(s.leaks(`?p=${encodeURIComponent(password)}`)[0]?.kind, "password", "percent-encoded");
  assert.equal(s.leaks(key)[0]?.kind, "chat key", "raw key bytes");
  const body = new Uint8Array([...enc.encode('{"k":"'), ...enc.encode(b64(key)), ...enc.encode('"}')]);
  assert.equal(s.leaks(body)[0]?.kind, "chat key", "base64 key inside a byte body");
});

test("the entropy null is measured: ciphertext sits in the band random bytes of the same length occupy; the JSON plaintext sits below it", async () => {
  const key = generateChatKey();
  const entries = Array.from({ length: 40 }, (_, i) => ({ id: String(i), kind: "turn", role: i % 2 ? "assistant" : "user", content: `${CANARY} ${i}`, seq: i, ts: i }));
  const { bytes, plaintext } = await encodeBlock(key, { idx: 0, prev: null, entries });
  const draws = 200; let lo = 8, hi = 0;
  for (let d = 0; d < draws; d++) { const h = byteEntropy(globalThis.crypto.getRandomValues(new Uint8Array(bytes.length))); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  const ct = byteEntropy(bytes), pt = byteEntropy(plaintext);
  assert.ok(ct >= lo && ct <= hi, `ciphertext ${ct.toFixed(3)} within the random band [${lo.toFixed(3)}, ${hi.toFixed(3)}] over ${draws} draws`);
  assert.ok(pt < lo, `plaintext ${pt.toFixed(3)} below the band (the statistic resolves the two, II.23)`);
});

test("sealed events and the pool: a seal opens only with the key; a job and an answer carry nothing but an address, an id, a seal and a size; the least-loaded able mouth takes the next job", async () => {
  const key = generateChatKey();
  const env = await seal(key, { id: "j1", kind: "complete", model: "gemma2:2b", messages: [{ role: "user", content: CANARY }] });
  assert.deepEqual(new SecretSet().add("turn", CANARY).leaks(env), []);
  assert.equal((await open(key, env)).messages[0].content, CANARY);
  await assert.rejects(() => open(generateChatKey(), env), /wrong key/);
  assert.deepEqual(Object.keys(jobContent({ to: "@w:h", id: "j1", env })).sort(), ["bytes", "env", "id", "to", "v"]);
  assert.deepEqual(Object.keys(answerContent({ job: "j1", env })).sort(), ["env", "job", "v"]);
  assert.deepEqual(Object.keys(answerContent({ job: "j1", mxc: "mxc://h/1", sha256: "s" })).sort(), ["job", "mxc", "sha256", "v"]);
  assert.deepEqual(Object.keys(mouthContent({ models: ["a"], home: "terminal", since: 5 })), ["v", "models", "home", "since"]);
  assert.deepEqual(manifestEntry("mxc://h/1", "s", 2), { m: "mxc://h/1", h: "s", e: 2 });
  assert.deepEqual(memberKeyContent("P", "PROOF"), { v: 1, alg: "ecdh-p256", pub: "P", proof: "PROOF" });
  assert.deepEqual(chatKeyContent({ eph_pub: "E", blob: "B" }, "P", { epoch: 1, older: [{ epoch: 0, eph_pub: "E0", blob: "B0" }] }), { v: 1, epoch: 1, pub: "P", eph_pub: "E", blob: "B", older: [{ epoch: 0, eph_pub: "E0", blob: "B0" }] });
  const offers = [{ user: "@a:h", models: ["gemma2:2b"], since: 2 }, { user: "@b:h", models: ["gemma2:2b", "qwen"], since: 1 }, { user: "@c:h", models: [], since: 0 }];
  assert.equal(pickMouth(offers, { inflight: {} }).user, "@b:h", "earliest offer on a tie; an empty offer is no mouth");
  assert.equal(pickMouth(offers, { inflight: { "@b:h": 2 } }).user, "@a:h", "the least loaded");
  assert.equal(pickMouth(offers, { model: "qwen" }).user, "@b:h", "the one that has the model");
  assert.equal(pickMouth(offers, { model: "llama" }), null);
  const f = syncFilter("!r:h");
  assert.deepEqual(f.room.rooms, ["!r:h"]); assert.deepEqual(f.room.timeline.types, [EVENTS.job, EVENTS.answer]); assert.deepEqual(f.presence.types, []);
});

test("forRecord: a field named for a secret is dropped and said; a value carrying one refuses the line", () => {
  const key = generateChatKey();
  const s = new SecretSet().add("chat key", key);
  const r = forRecord({ mxc: "mxc://h/1", bytes: 1234, sha256: "abc", access_token: "syt_x", eph_pub: "p" }, s);
  assert.deepEqual(r.fields, { mxc: "mxc://h/1", bytes: 1234, sha256: "abc" });
  assert.deepEqual(r.dropped, ["access_token", "eph_pub"]);
  assert.throws(() => forRecord({ note: `k=${b64(key)}` }, s), /refusing to record note: it carries the chat key/);
  assert.equal(SERVER_SEES.length, 5);
  assert.deepEqual(unb64url(b64url(key)), key);
});
