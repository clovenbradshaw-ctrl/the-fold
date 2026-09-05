// matrix-client.js — the crossing for matrix.js: the homeserver calls, and
// the flow a chat goes through (sign in, preserve, share, join, load).
//
// Everything that leaves this file toward a homeserver was produced by the
// pure half: ciphertext blocks, pointer-shaped state, public keys, wrapped
// keys. The one plaintext secret a homeserver ever receives is the password
// in the login call — that is Matrix's own protocol, and it is sent to the
// server the person named and nowhere else. The access token rides in the
// Authorization header of every call after it.
//
// The record discipline: every act lands one line through `record(kind,
// fields)`, and every line passes matrix.js `forRecord` FIRST — a field named
// for a secret is dropped, a value carrying one refuses the whole act. The
// page's record can therefore hold pointers (room ids, mxc uris, hashes,
// sizes, counts) and never a key, a token, a password, or a turn.
//
// Storage is injected (`{ get(), set(obj) }`): localStorage in the page, a Map
// in the tests. What it holds — the session, this browser's identity pair,
// each room's chat key and chain cursor — is at rest in the person's own
// browser exactly like the reading record is, and nowhere else.
import {
  TYPES, EVENTS, EVENT_SEAL_MAX_BYTES, b64, unb64, sha256B64, generateChatKey, generateIdentity, exportPublicKey, exportPrivateKey, importPrivateKey,
  wrapChatKey, unwrapChatKey, entryId, encodeBlock, decodeBlock, mergeChains, capManifest, manifestEntry, chainIsLinked,
  generateInviteSecret, INVITE_TTL_MS, inviteProof, verifyInviteProof, fingerprint, keyFromPassphrase, generateSalt, sealVault, openVault,
  paths, homeserverBase, loginBody, createRoomBody, memberKeyContent, chatKeyContent, chainContent,
  seal, open, newJobId, mouthContent, jobContent, answerContent, pickMouth, syncFilter, encryptBytes, decryptBytes,
  buildShareLink, parseShareLink, SecretSet, forRecord,
} from "./matrix.js";

const encoder = new TextEncoder();
const FETCH_CONCURRENCY = 6;
/** Blocks walked past the manifest before a chain is called partial. */
const MAX_WALK = 100_000;

export class MatrixError extends Error {
  constructor(message, { status = 0, errcode = null } = {}) { super(message); this.name = "MatrixError"; this.status = status; this.errcode = errcode; }
}

/** The client-server calls, one per route, over an injected fetch. */
export class MatrixHttp {
  constructor({ base, token = null, fetch: f = globalThis.fetch?.bind(globalThis), onRequest = null }) {
    this.base = base; this.token = token; this.fetch = f; this.onRequest = onRequest;
  }
  /** The base URL for a name the person typed: its well-known delegation if
   * it has one, else the origin itself. */
  static async resolve(input, f = globalThis.fetch?.bind(globalThis)) {
    const origin = homeserverBase(input);
    try {
      const r = await f(origin + paths.wellKnown());
      if (r.ok) { const j = await r.json(); const b = j?.["m.homeserver"]?.base_url; if (typeof b === "string") return homeserverBase(b); }
    } catch { /* no delegation: the origin is the homeserver */ }
    return origin;
  }
  async req(method, path, { json, bytes, auth = true, contentType, signal = null } = {}) {
    const headers = {};
    if (auth) { if (!this.token) throw new MatrixError("not signed in", { status: 0 }); headers.authorization = `Bearer ${this.token}`; }
    let body;
    if (json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(json); }
    else if (bytes) { headers["content-type"] = contentType ?? "application/octet-stream"; body = bytes; }
    const started = Date.now();
    let res;
    try { res = await this.fetch(this.base + path, { method, headers, body, signal: signal ?? undefined }); }
    catch (e) { if (signal?.aborted) throw new MatrixError("cancelled", { status: 0, errcode: "ABORTED" }); throw new MatrixError(`no answer from ${this.base}: ${e?.message ?? e}`, { status: 0 }); }
    this.onRequest?.({ method, path: path.replace(/\?.*$/, ""), status: res.status, bytes: body ? (typeof body === "string" ? encoder.encode(body).length : body.length) : 0, ms: Date.now() - started });
    if (!res.ok) {
      let j = null; try { j = await res.json(); } catch { /* not json */ }
      throw new MatrixError(j?.error ?? `${res.status} from ${this.base}`, { status: res.status, errcode: j?.errcode ?? null });
    }
    return res;
  }
  async json(method, path, opts) { return (await this.req(method, path, opts)).json(); }
  async login(user, password) { const r = await this.json("POST", paths.login(), { json: loginBody(user, password), auth: false }); this.token = r.access_token; return r; }
  async logout() { await this.req("POST", paths.logout(), { json: {} }); this.token = null; }
  async whoami() { return this.json("GET", paths.whoami()); }
  async createRoom(name) { return (await this.json("POST", paths.createRoom(), { json: createRoomBody(name) })).room_id; }
  async joinedRooms() { return (await this.json("GET", paths.joinedRooms())).joined_rooms ?? []; }
  async join(room) { return (await this.json("POST", paths.join(room), { json: {} })).room_id; }
  async invite(room, userId) { try { await this.req("POST", paths.invite(room), { json: { user_id: userId } }); } catch (e) { if (!(e.status === 403 && /already in the room/i.test(e.message))) throw e; } }
  async kick(room, userId, reason = "removed") { await this.req("POST", paths.kick(room), { json: { user_id: userId, reason } }); }
  async members(room) { return ((await this.json("GET", paths.members(room))).chunk ?? []).map((ev) => ({ user_id: ev.state_key, membership: ev.content?.membership ?? null })); }
  async allState(room) { return this.json("GET", paths.allState(room)); }
  async getState(room, type, key = "") {
    try { return await this.json("GET", paths.state(room, type, key)); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  async putState(room, type, key, content) { return this.json("PUT", paths.state(room, type, key), { json: content }); }
  async send(room, type, content) { const txn = `${Date.now()}-${Math.random().toString(36).slice(2)}`; return (await this.json("PUT", paths.send(room, type, txn), { json: content })).event_id; }
  async sync({ since = null, filter, timeout = 0, signal = null } = {}) { return this.json("GET", paths.sync({ since, filter, timeout }), { signal }); }
  async upload(bytes, name = "block") { const r = await this.json("POST", paths.upload(name), { bytes }); if (!r.content_uri) throw new MatrixError("upload returned no content_uri"); return r.content_uri; }
  async download(mxc) {
    let last = null;
    for (const p of paths.download(mxc)) {
      try { return new Uint8Array(await (await this.req("GET", p)).arrayBuffer()); }
      catch (e) { last = e; if (e.status && e.status !== 404 && e.status !== 400) break; }
    }
    throw last ?? new MatrixError(`no media at ${mxc}`);
  }
}

/** Storage as this version keeps it; older layouts are lifted on read. */
function migrate(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  const rooms = {};
  for (const [id, r] of Object.entries(d.rooms ?? {})) {
    const keys = { ...(r.keys ?? {}) }; if (r.key && !keys[0]) keys[0] = r.key;
    rooms[id] = { name: r.name ?? null, keys, epoch: r.epoch ?? Math.max(0, ...Object.keys(keys).map(Number)), idx: r.idx ?? -1, head: r.head ?? null, manifest: r.manifest ?? [], base: r.base ?? 0, count: r.count ?? 0, pushed: r.pushed ?? [], invites: r.invites ?? {}, pending: r.pending ?? null };
  }
  return { v: 2, session: d.session ?? null, identity: d.identity ?? null, rooms };
}
const freshRoom = () => ({ name: null, keys: {}, epoch: 0, idx: -1, head: null, manifest: [], base: 0, count: 0, pushed: [], invites: {}, pending: null });

/** A chat's life on a homeserver, over injected storage and fetch. */
export class FoldMatrix {
  constructor({ storage, fetch: f = globalThis.fetch?.bind(globalThis), record = () => {}, secrets = new SecretSet() } = {}) {
    if (!storage?.get || !storage?.set) throw new Error("FoldMatrix needs storage {get, set}");
    this.storage = storage; this.fetchImpl = f; this.recordHook = record; this.secrets = secrets;
    this.traffic = { requests: 0, bytesOut: 0, last: null };
    /** Per room: what this browser knows of the pool — offers from state,
     * and what its own jobs measured of each worker. Memory only. */
    this.pools = {};
    this.sentJobs = new Set();
    this.saving = Promise.resolve();
    const raw = storage.get();
    // A vault at rest: nothing is readable until `unlock` — not the session,
    // not the keys. Storage holds {v, vault:{salt, rounds, blob}} and nothing else.
    this.vault = raw?.vault ?? null; this.vaultKey = null;
    this.data = this.vault ? migrate(null) : migrate(raw);
    this.registerSecrets();
  }
  get locked() { return !!this.vault && !this.vaultKey; }
  registerSecrets() {
    const s = this.secrets;
    if (this.data.session?.access_token) s.add("access token", this.data.session.access_token);
    if (this.data.identity?.priv) s.add("identity private key", this.data.identity.priv);
    for (const r of Object.values(this.data.rooms)) {
      for (const k of Object.values(r.keys)) s.add("chat key", unb64(k));
      for (const inv of Object.values(r.invites)) if (inv?.s) s.add("invite secret", unb64(inv.s));
      if (r.pending?.s) s.add("invite secret", unb64(r.pending.s));
    }
  }
  save() {
    if (this.locked) return; // nothing readable to write
    if (!this.vaultKey) { this.storage.set(this.data); return; }
    const snapshot = JSON.stringify(this.data);
    this.saving = this.saving.then(async () => { this.vault = { ...this.vault, blob: b64(await encryptBytes(this.vaultKey, encoder.encode(snapshot))) }; this.storage.set({ v: 2, vault: this.vault }); }).catch(() => {});
  }
  /** Seal everything at rest under a passphrase; from now on storage holds
   * only the vault. The passphrase is asked for on every page load. */
  async lock(passphrase) {
    const { vault, key } = await sealVault(passphrase, this.data);
    this.vault = vault; this.vaultKey = key; this.storage.set({ v: 2, vault });
    this.record("matrix-vault", { locked: true });
    return { locked: true };
  }
  async unlock(passphrase) {
    if (!this.vault) throw new MatrixError("nothing is locked");
    const { data, key } = await openVault(passphrase, this.vault);
    this.vaultKey = key; this.data = migrate(data); this.registerSecrets();
    this.record("matrix-vault", { unlocked: true });
    return this.status();
  }
  /** Back to plain storage (the passphrase proves it is the person asking). */
  async clearLock(passphrase) {
    if (this.vault) { if (this.locked) await this.unlock(passphrase); else await openVault(passphrase, this.vault); }
    this.vault = null; this.vaultKey = null; this.storage.set(this.data);
    this.record("matrix-vault", { locked: false });
    return { locked: false };
  }
  /** One line on the record per act — after forRecord, never before. */
  record(kind, fields = {}) { const { fields: safe } = forRecord(fields, this.secrets); this.recordHook(kind, safe); return safe; }
  get session() { const s = this.data.session; return s ? { hs: s.hs, user_id: s.user_id, device_id: s.device_id } : null; }
  http() {
    if (this.locked) throw new MatrixError("locked — /matrix unlock first", { status: 0 });
    const s = this.data.session;
    if (!s?.access_token) throw new MatrixError("not signed in — /matrix login <homeserver>", { status: 0 });
    return new MatrixHttp({ base: s.hs, token: s.access_token, fetch: this.fetchImpl, onRequest: (r) => { this.traffic.requests++; this.traffic.bytesOut += r.bytes; this.traffic.last = r; } });
  }
  status() {
    return { locked: this.locked, vaulted: !!this.vault, signedIn: !!this.data.session, user: this.data.session?.user_id ?? null, hs: this.data.session?.hs ?? null, identity: this.data.identity?.pub ?? null,
      rooms: Object.entries(this.data.rooms).map(([id, r]) => ({ id, name: r.name ?? null, blocks: (r.idx ?? -1) + 1, entries: r.count ?? 0, hasKey: Object.keys(r.keys).length > 0, epoch: r.epoch, invites: Object.values(r.invites).filter((i) => !i.spent && (!i.exp || i.exp > Date.now())).length, pending: !!r.pending })), traffic: { ...this.traffic } };
  }

  // ── session ──
  async login(hsInput, user, password) {
    if (this.locked) throw new MatrixError("locked — /matrix unlock first");
    if (!user || !password) throw new MatrixError("a user name and a password");
    this.secrets.add("password", password);
    const base = await MatrixHttp.resolve(hsInput, this.fetchImpl);
    const h = new MatrixHttp({ base, fetch: this.fetchImpl, onRequest: (r) => { this.traffic.requests++; this.traffic.bytesOut += r.bytes; this.traffic.last = r; } });
    const r = await h.login(user, password);
    this.secrets.add("access token", r.access_token);
    this.data.session = { hs: base, user_id: r.user_id, device_id: r.device_id ?? null, access_token: r.access_token };
    await this.identity();
    this.save();
    this.record("matrix-login", { hs: base, user: r.user_id });
    return this.status();
  }
  async logout() {
    try { await this.http().logout(); } catch { /* the token may already be dead; forgetting it here is the point */ }
    const user = this.data.session?.user_id ?? null;
    this.data.session = null; this.save();
    this.record("matrix-logout", { user });
  }
  /** This browser's identity pair, minted once. */
  async identity() {
    if (!this.data.identity) {
      const kp = await generateIdentity();
      this.data.identity = { pub: await exportPublicKey(kp.publicKey), priv: await exportPrivateKey(kp.privateKey) };
      this.secrets.add("identity private key", this.data.identity.priv);
      this.save();
    }
    return this.data.identity;
  }
  async myFingerprint() { return fingerprint((await this.identity()).pub); }
  /** The current epoch's key, or null. */
  keyOf(roomId) { const r = this.data.rooms[roomId]; if (!r) return null; const k = r.keys[r.epoch]; return k ? unb64(k) : null; }
  keysOf(roomId) { const r = this.data.rooms[roomId]; const out = new Map(); for (const [e, k] of Object.entries(r?.keys ?? {})) out.set(Number(e), unb64(k)); return out; }
  rememberRoom(roomId, patch) { const r = this.data.rooms[roomId] ?? freshRoom(); Object.assign(r, patch); this.data.rooms[roomId] = r; this.save(); return r; }
  rememberKey(roomId, epoch, key) { const r = this.data.rooms[roomId] ?? freshRoom(); r.keys[epoch] = b64(key); if (epoch >= r.epoch) r.epoch = epoch; this.secrets.add("chat key", key); this.data.rooms[roomId] = r; this.save(); }
  /** Every epoch's key we hold, wrapped to one public key: the current one
   * on top, the earlier ones under `older`, so a reader opens the whole record. */
  async wrapAllFor(roomId, pub) {
    const r = this.data.rooms[roomId]; const epochs = Object.keys(r.keys).map(Number).sort((a, b) => a - b);
    const current = r.epoch; const older = [];
    for (const e of epochs) if (e !== current) older.push({ epoch: e, ...(await wrapChatKey(pub, unb64(r.keys[e]))) });
    return chatKeyContent(await wrapChatKey(pub, unb64(r.keys[current])), pub, { epoch: current, older });
  }

  // ── rooms ──
  async ensureRoom({ roomId = null, name = "a fold chat" } = {}) {
    if (roomId && this.keyOf(roomId)) return roomId;
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    const room = await h.createRoom(name);
    const key = generateChatKey();
    this.rememberRoom(room, { name }); this.rememberKey(room, 0, key);
    await h.putState(room, TYPES.memberKey, me, memberKeyContent(id.pub));
    await h.putState(room, TYPES.chatKey, me, await this.wrapAllFor(room, id.pub));
    this.record("matrix-room", { room, name });
    return room;
  }
  /** Push what is new under the current epoch's key: entries whose content
   * id this browser has not pushed to this room. One block, hash-linked. */
  async preserve(roomId, entries) {
    if (this.locked) throw new MatrixError("locked — /matrix unlock first");
    const r = this.data.rooms[roomId]; const key = this.keyOf(roomId);
    if (!r || !key) throw new MatrixError("no key for this room — open its share link, or ask a member to grant you");
    const h = this.http(); const me = this.data.session.user_id;
    const fresh = [];
    for (const e of entries) { const id = e.id ?? (await entryId(e)); if (!r.pushed.includes(id)) fresh.push({ ...e, id }); }
    if (!fresh.length) return { pushed: 0, skipped: entries.length, idx: r.idx, bytes: 0 };
    const idx = r.idx + 1; const epoch = r.epoch;
    const { bytes, sha256 } = await encodeBlock(key, { idx, prev: r.head, entries: fresh });
    const mxc = await h.upload(bytes, `block_${idx}`);
    const { manifest, base } = capManifest([...r.manifest, manifestEntry(mxc, sha256, epoch)], r.base);
    const count = (r.count ?? 0) + fresh.length;
    await h.putState(roomId, TYPES.chain, me, chainContent({ head: { mxc, sha256, epoch }, idx, count, manifest, base }));
    this.rememberRoom(roomId, { idx, head: { mxc, sha256, epoch }, manifest, base, count, pushed: [...r.pushed, ...fresh.map((e) => e.id)] });
    const line = this.record("matrix-preserve", { room: roomId, idx, epoch, mxc, sha256, bytes: bytes.length, entries: fresh.length, skipped: entries.length - fresh.length });
    return { pushed: fresh.length, skipped: entries.length - fresh.length, idx, epoch, mxc, sha256, bytes: bytes.length, line };
  }
  /** Every epoch's key this identity can open, from our own slot or a grant
   * on any member's slot; the current epoch's key is returned. */
  async keyFor(roomId) {
    const held = this.keyOf(roomId);
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    const priv = await importPrivateKey(id.priv);
    let state; try { state = await h.allState(roomId); } catch (e) { if (held) return held; throw e; }
    let found = 0;
    for (const ev of state.filter((s) => s.type === TYPES.chatKey)) {
      const wrapped = ev.state_key === me ? ev.content : ev.content?.grants?.[me];
      if (!wrapped?.blob || !wrapped?.eph_pub) continue;
      for (const w of [wrapped, ...(wrapped.older ?? [])]) {
        const epoch = Number(w.epoch ?? 0);
        if (this.data.rooms[roomId]?.keys[epoch]) { found++; continue; }
        try { this.rememberKey(roomId, epoch, await unwrapChatKey(priv, w)); found++; } catch { /* wrapped for another identity of ours, or stale */ }
      }
    }
    if (found) { const name = this.data.rooms[roomId]?.name ?? state.find((s) => s.type === "m.room.name")?.content?.name ?? null; this.rememberRoom(roomId, { name, pending: null }); }
    return this.keyOf(roomId);
  }
  /** Say who we are in a room so a holder can grant us the key. */
  async requestKey(roomId) {
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    await h.putState(roomId, TYPES.memberKey, me, memberKeyContent(id.pub));
    this.record("matrix-key-request", { room: roomId });
    return { published: true, fingerprint: await fingerprint(id.pub) };
  }
  /** Every member's chain, fetched by manifest in bounded parallel, walked
   * past the manifest by prev-pointers, hash-checked, decoded with the key
   * of each block's epoch, merged. A block whose epoch we hold no key for
   * is a typed gap, never a silently shorter chat. */
  async load(roomId) {
    if (this.locked) throw new MatrixError("locked — /matrix unlock first");
    const key = await this.keyFor(roomId);
    if (!key) { this.record("matrix-load", { room: roomId, gap: "no key" }); return { entries: [], chains: 0, blocks: 0, partial: true, gaps: ["no key for this room: open its share link, or /matrix request and ask a member to /share again"] }; }
    const keys = this.keysOf(roomId);
    const h = this.http();
    const state = await h.allState(roomId);
    this.noteOffers(roomId, state); // the pool's offers come with the same read
    const heads = state.filter((s) => s.type === TYPES.chain && s.content?.head?.mxc);
    const chains = []; const gaps = []; let blocks = 0;
    const fetchOne = async (mxc, sha, epoch) => { const k = keys.get(epoch ?? 0); if (!k) throw new MatrixError(`sealed under epoch ${epoch ?? 0}, which this browser holds no key for`); const bytes = await h.download(mxc); return { block: await decodeBlock(k, bytes, sha), sha256: sha }; };
    for (const head of heads) {
      const c = head.content; const listed = (c.manifest ?? []).map((m) => ({ mxc: m.m, sha: m.h, epoch: m.e ?? c.head.epoch ?? 0 }));
      const got = [];
      for (let i = 0; i < listed.length; i += FETCH_CONCURRENCY) {
        const part = await Promise.allSettled(listed.slice(i, i + FETCH_CONCURRENCY).map((p) => fetchOne(p.mxc, p.sha, p.epoch)));
        for (const [j, r] of part.entries()) { if (r.status === "fulfilled") got.push(r.value); else gaps.push(`${head.state_key} block ${(c.manifestBase ?? 0) + i + j}: ${r.reason?.message ?? r.reason}`); }
      }
      if (!listed.length) { try { got.push(await fetchOne(c.head.mxc, c.head.sha256, c.head.epoch ?? 0)); } catch (e) { gaps.push(`${head.state_key} head: ${e.message}`); } }
      got.sort((a, b) => a.block.idx - b.block.idx);
      let cursor = got[0]?.block?.prev ?? null; let walked = 0;
      while (cursor && walked < MAX_WALK) { try { const b = await fetchOne(cursor.mxc, cursor.sha256, cursor.epoch ?? 0); got.unshift(b); cursor = b.block.prev; walked++; } catch (e) { gaps.push(`${head.state_key} walk: ${e.message}`); break; } }
      const link = chainIsLinked(got);
      if (!link.linked && got.length > 1) gaps.push(`${head.state_key} chain not linked at block ${got[link.at]?.block?.idx}`);
      blocks += got.length;
      chains.push(got.map((g) => g.block));
      if (head.state_key === this.data.session.user_id && got.length) {
        const last = got.at(-1);
        this.rememberRoom(roomId, { idx: last.block.idx, head: { mxc: c.head.mxc, sha256: last.sha256, epoch: c.head.epoch ?? 0 }, manifest: c.manifest ?? [], base: c.manifestBase ?? 0, count: c.count ?? 0 });
      }
    }
    const entries = mergeChains(chains);
    if (entries.length) this.rememberRoom(roomId, { pushed: [...new Set([...(this.data.rooms[roomId]?.pushed ?? []), ...entries.map((e) => e.id)])] });
    this.record("matrix-load", { room: roomId, chains: heads.length, blocks, entries: entries.length, gaps: gaps.length });
    return { entries, chains: heads.length, blocks, partial: gaps.length > 0, gaps };
  }

  // ── sharing: bound, open, passphrase; grants by proof or by fingerprint ──
  /**
   * `mode` "bound" (the default when someone is named): invite them, mint a
   * one-shot secret, and print a link with no key in it — it works only for
   * that account, signed in, whose published key carries the secret's proof;
   * the grant lands from any member's page or worker that holds the secret.
   * "open": the magic key in the fragment. "passphrase": the key sealed under
   * words said aloud. `grant`: wrap to a member's unverified key by name,
   * after comparing fingerprints out of band.
   */
  async share(roomId, { invite = null, pageHref = "https://localhost/", mode = null, passphrase = null, grant = null } = {}) {
    const key = this.keyOf(roomId); if (!key) throw new MatrixError("no key for this room");
    const h = this.http(); const r = this.data.rooms[roomId]; const hs = this.data.session.hs;
    if (grant) { const g = await this.grantTo(roomId, grant); return { link: null, kind: "grant", ...g }; }
    if (invite && !/^@[^:]+:.+$/.test(invite)) throw new MatrixError("a Matrix id looks like @who:their.server");
    const kind = mode ?? (invite ? "bound" : "open");
    if (invite) await h.invite(roomId, invite);
    let link, expiresAt = null;
    if (kind === "bound") {
      if (!invite) throw new MatrixError("a bound link is for someone: /share @who:server");
      const secret = generateInviteSecret(); expiresAt = Date.now() + INVITE_TTL_MS;
      this.secrets.add("invite secret", secret);
      r.invites[invite] = { s: b64(secret), exp: expiresAt, spent: false }; this.save();
      link = buildShareLink(pageHref, { hs, room: roomId, name: r.name, to: invite, secret, exp: expiresAt });
    } else if (kind === "passphrase") {
      if (!passphrase || String(passphrase).trim().split(/\s+/).length < 3) throw new MatrixError("a passphrase of at least three words");
      const salt = generateSalt(); const wrapped = await encryptBytes(await keyFromPassphrase(passphrase, salt), key);
      link = buildShareLink(pageHref, { hs, room: roomId, name: r.name, wrapped, salt });
    } else if (kind === "open") {
      link = buildShareLink(pageHref, { hs, room: roomId, name: r.name, key });
    } else throw new MatrixError(`no such share mode ${kind}`);
    const pending = await this.grantPending(roomId);
    this.record("matrix-share", { room: roomId, kind, invited: invite, granted: pending.granted.length, expiresAt });
    return { link, kind, invited: invite, expiresAt, ...pending };
  }
  /** Members holding a wrap to their CURRENT key, per "user pub". */
  coveredIn(state) {
    const covered = new Set();
    for (const s of state.filter((x) => x.type === TYPES.chatKey)) {
      if (s.content?.pub) covered.add(`${s.state_key} ${s.content.pub}`);
      for (const [who, g] of Object.entries(s.content?.grants ?? {})) if (g?.pub) covered.add(`${who} ${g.pub}`);
    }
    return covered;
  }
  /**
   * Grant to every member whose key carries a proof that verifies against an
   * unspent, unexpired secret this browser issued; say who is unverified
   * (a key with no proof — /share grant after comparing fingerprints) and
   * who was refused (a proof that does not verify, or a spent/expired one).
   */
  async grantPending(roomId) {
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity(); const r = this.data.rooms[roomId];
    const state = await h.allState(roomId);
    const covered = this.coveredIn(state);
    const own = state.find((s) => s.type === TYPES.chatKey && s.state_key === me)?.content ?? (await this.wrapAllFor(roomId, id.pub));
    const grants = { ...(own.grants ?? {}) }; const granted = []; const unverified = []; const refused = [];
    for (const mk of state.filter((s) => s.type === TYPES.memberKey && s.state_key !== me && s.content?.pub)) {
      const user = mk.state_key, pub = mk.content.pub;
      if (covered.has(`${user} ${pub}`)) continue;
      const fp = await fingerprint(pub);
      const inv = r.invites[user];
      if (!mk.content.proof) { unverified.push({ user, fingerprint: fp }); continue; }
      if (!inv) { refused.push({ user, fingerprint: fp, why: "a proof for a link this browser did not issue" }); continue; }
      if (inv.spent) { refused.push({ user, fingerprint: fp, why: "the link was already used once" }); continue; }
      if (inv.exp && Date.now() > inv.exp) { refused.push({ user, fingerprint: fp, why: "the link expired" }); continue; }
      if (!(await verifyInviteProof(unb64(inv.s), { room: roomId, user, pub }, mk.content.proof))) { refused.push({ user, fingerprint: fp, why: "the proof does not verify — the key is not the one this account published with this link's secret" }); continue; }
      grants[user] = { ...(await this.wrapAllFor(roomId, pub)) };
      inv.spent = true; granted.push({ user, fingerprint: fp });
    }
    if (granted.length) { await h.putState(roomId, TYPES.chatKey, me, { ...own, grants }); this.save(); this.record("matrix-grant", { room: roomId, granted: granted.length, verified: true }); }
    return { granted, unverified, refused };
  }
  /** Wrap to one member's key by name — the person compared fingerprints. */
  async grantTo(roomId, user) {
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    const state = await h.allState(roomId);
    const mk = state.find((s) => s.type === TYPES.memberKey && s.state_key === user);
    if (!mk?.content?.pub) throw new MatrixError(`${user} has published no key in this room`);
    const own = state.find((s) => s.type === TYPES.chatKey && s.state_key === me)?.content ?? (await this.wrapAllFor(roomId, id.pub));
    const grants = { ...(own.grants ?? {}), [user]: await this.wrapAllFor(roomId, mk.content.pub) };
    await h.putState(roomId, TYPES.chatKey, me, { ...own, grants });
    const fp = await fingerprint(mk.content.pub);
    this.record("matrix-grant", { room: roomId, granted: 1, verified: false });
    return { granted: [{ user, fingerprint: fp }], unverified: [], refused: [] };
  }
  /** Who is in the room, each key's fingerprint, and whether they hold a wrap. */
  async members(roomId) {
    const h = this.http(); const state = await h.allState(roomId); const covered = this.coveredIn(state);
    const list = await h.members(roomId);
    const keys = new Map(state.filter((s) => s.type === TYPES.memberKey).map((s) => [s.state_key, s.content]));
    return Promise.all(list.map(async (m) => { const k = keys.get(m.user_id); return { user: m.user_id, membership: m.membership, fingerprint: k?.pub ? await fingerprint(k.pub) : null, proof: k?.proof ? "proof" : k ? "none" : null, hasKey: !!k?.pub && covered.has(`${m.user_id} ${k.pub}`) }; }));
  }
  pendingInvites(roomId) { return Object.entries(this.data.rooms[roomId]?.invites ?? {}).filter(([, i]) => !i.spent && (!i.exp || i.exp > Date.now())).map(([u]) => u); }
  /** Keep granting while bound invites are outstanding (the sharer's page or
   * worker); polls the room's state — a small GET — every `everyMs`. */
  async watchInvites(roomId, { signal = null, everyMs = 5000, onGrant = null } = {}) {
    let rounds = 0;
    while (!signal?.aborted && this.pendingInvites(roomId).length) {
      try { const g = await this.grantPending(roomId); if (g.granted.length) onGrant?.(g); } catch { /* the next round tries again */ }
      rounds++;
      await new Promise((r) => { const t = setTimeout(r, everyMs); signal?.addEventListener?.("abort", () => { clearTimeout(t); r(); }, { once: true }); });
    }
    return { rounds };
  }
  /**
   * Open a share link. Open: the key from the fragment. Passphrase: the key
   * unsealed with the words. Bound: only signed in as the account it names —
   * join, publish this browser's key with the secret's proof, then wait for
   * a member's grant (polling the state every 3 s up to `waitMs`); if none
   * lands in time the key request stays published and a later /matrix open
   * finds the grant.
   */
  async joinFromLink(href, { passphrase = null, waitMs = 60_000, onWait = null } = {}) {
    const p = parseShareLink(href);
    if (!p) throw new MatrixError("not a fold share link");
    if (this.locked) return { needs: "unlock", hs: p.hs, room: p.room, name: p.name, to: p.to ?? null };
    if (!this.data.session) return { needs: "login", hs: p.hs, room: p.room, name: p.name, to: p.to ?? null };
    const h = this.http(); const me = this.data.session.user_id;
    let key = null;
    if (p.kind === "open") key = p.key;
    else if (p.kind === "passphrase") {
      if (!passphrase) return { needs: "passphrase", hs: p.hs, room: p.room, name: p.name };
      try { key = await decryptBytes(await keyFromPassphrase(passphrase, p.salt), p.wrapped); } catch { return { room: p.room, name: p.name, joined: false, gap: "the passphrase does not open this link" }; }
    } else if (p.kind === "bound") {
      if (p.to !== me) return { room: p.room, name: p.name, joined: false, gap: `this link is for ${p.to}; you are signed in as ${me}` };
      if (p.exp && Date.now() > p.exp) return { room: p.room, name: p.name, joined: false, gap: "this link has expired — ask for a new one" };
    }
    if (key) this.secrets.add("chat key", key);
    let joined = true;
    try { await h.join(p.room); } catch (e) { if (e.status === 403) joined = false; else throw e; }
    if (!joined) { this.record("matrix-join", { room: p.room, joined: false }); return { room: p.room, name: p.name, joined: false, gap: "not invited: ask the sharer to /share " + me }; }
    const id = await this.identity();
    if (key) {
      this.rememberRoom(p.room, { name: p.name }); this.rememberKey(p.room, 0, key);
      try { await h.putState(p.room, TYPES.memberKey, me, memberKeyContent(id.pub)); await h.putState(p.room, TYPES.chatKey, me, await this.wrapAllFor(p.room, id.pub)); }
      catch { /* a member without state power still reads through the link's key */ }
      this.record("matrix-join", { room: p.room, joined: true, kind: p.kind });
      const loaded = await this.load(p.room);
      return { room: p.room, name: p.name, joined: true, kind: p.kind, ...loaded };
    }
    // bound: publish the proof, then wait for the grant
    this.secrets.add("invite secret", p.secret);
    this.rememberRoom(p.room, { name: p.name, pending: { s: b64(p.secret), to: p.to, exp: p.exp } });
    await h.putState(p.room, TYPES.memberKey, me, memberKeyContent(id.pub, await inviteProof(p.secret, { room: p.room, user: me, pub: id.pub })));
    this.record("matrix-join", { room: p.room, joined: true, kind: "bound", awaiting: true });
    const started = Date.now();
    while (Date.now() - started < waitMs) {
      const k = await this.keyFor(p.room);
      if (k) { const loaded = await this.load(p.room); this.record("matrix-granted", { room: p.room, ms: Date.now() - started }); return { room: p.room, name: p.name, joined: true, kind: "bound", fingerprint: await fingerprint(id.pub), ...loaded }; }
      onWait?.({ ms: Date.now() - started });
      await new Promise((r) => setTimeout(r, 3000));
    }
    return { room: p.room, name: p.name, joined: true, kind: "bound", awaiting: true, fingerprint: await fingerprint(id.pub), entries: [], chains: 0, blocks: 0, partial: true, gaps: [`no grant yet: your key is published in the room with the link's proof; it is granted the moment a member's page or worker that issued the link is open — reopen the link, or /matrix open ${p.room}, later`] };
  }
  /** A new key epoch: everything from now on is sealed under a key the
   * excluded members never receive; every other member with a key gets it
   * (and every earlier epoch) re-wrapped on our slot. */
  async rotate(roomId, { exclude = [] } = {}) {
    const key = this.keyOf(roomId); if (!key) throw new MatrixError("no key for this room");
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    const state = await h.allState(roomId); const covered = this.coveredIn(state);
    const r = this.data.rooms[roomId]; const epoch = r.epoch + 1;
    this.rememberKey(roomId, epoch, generateChatKey());
    const own = await this.wrapAllFor(roomId, id.pub);
    const grants = {}; const regranted = [];
    for (const mk of state.filter((s) => s.type === TYPES.memberKey && s.state_key !== me && s.content?.pub)) {
      const user = mk.state_key;
      if (exclude.includes(user) || !covered.has(`${user} ${mk.content.pub}`)) continue;
      grants[user] = await this.wrapAllFor(roomId, mk.content.pub); regranted.push(user);
    }
    await h.putState(roomId, TYPES.chatKey, me, { ...own, grants });
    this.record("matrix-rotate", { room: roomId, epoch, regranted: regranted.length, excluded: exclude.length });
    return { epoch, regranted, excluded: exclude };
  }
  /** Remove a member and rotate, so nothing after this reaches them. What
   * they already read, they keep — no key can un-read a block. */
  async remove(roomId, user) {
    const h = this.http();
    await h.kick(roomId, user);
    delete this.data.rooms[roomId]?.invites[user];
    const rot = await this.rotate(roomId, { exclude: [user] });
    this.record("matrix-remove", { room: roomId, user, epoch: rot.epoch });
    return { user, ...rot };
  }

  // ── the room as a mouth: sealed jobs to members who offered one ──
  poolOf(roomId) { return (this.pools[roomId] ??= { offers: [], workers: {}, synced: null }); }
  workerStats(roomId, user) { const pool = this.poolOf(roomId); return (pool.workers[user] ??= { sent: 0, answered: 0, failed: 0, ms: [], tokens: 0, device: null, model: null }); }
  noteOffers(roomId, stateEvents) {
    const pool = this.poolOf(roomId);
    for (const ev of stateEvents.filter((e) => e.type === TYPES.mouth)) {
      pool.offers = pool.offers.filter((o) => o.user !== ev.state_key);
      if (Array.isArray(ev.content?.models) && ev.content.models.length) pool.offers.push({ user: ev.state_key, models: ev.content.models, home: ev.content.home ?? null, since: ev.content.since ?? 0 });
    }
    return pool.offers;
  }
  /** Say what this machine can answer for the room. `models: []` withdraws. */
  async offerMouth(roomId, { models = [], home = null } = {}) {
    const h = this.http(); const me = this.data.session.user_id;
    await h.putState(roomId, TYPES.mouth, me, mouthContent({ models, home }));
    this.record(models.length ? "matrix-mouth-offer" : "matrix-mouth-withdraw", { room: roomId, models: models.length, home });
    return { models, home };
  }
  /** Who offers a mouth in a room, off its state — refreshed, not remembered. */
  async mouths(roomId) { const state = await this.http().allState(roomId); return this.noteOffers(roomId, state); }
  /** A prompt or an answer, sealed: inline when it fits an event, else as a
   * ciphertext blob in the media store with its hash. */
  async sealFor(key, obj) {
    const env = await seal(key, obj);
    if (env.length <= EVENT_SEAL_MAX_BYTES) return { env };
    const bytes = unb64(env); const mxc = await this.http().upload(bytes, "seal");
    return { mxc, sha256: await sha256B64(bytes), bytes: bytes.length };
  }
  async unsealFrom(key, content) {
    if (content.env) return open(key, content.env);
    if (!content.mxc) throw new MatrixError("a sealed event with neither env nor mxc");
    const bytes = await this.http().download(content.mxc);
    if (content.sha256 && (await sha256B64(bytes)) !== content.sha256) throw new MatrixError("sealed blob hash mismatch");
    return open(key, b64(bytes));
  }
  /**
   * Ask the room: seal the prompt, address it to an offered mouth (the one
   * asked for, or the least loaded that has the model), wait for its sealed
   * answer over long-poll sync. The wait bound is operational and stated;
   * running out is a typed gap that also counts against that worker.
   */
  async ask(roomId, { messages, model = null, to = null, options = null } = {}, { timeoutMs = 120_000, onWait = null, signal = null } = {}) {
    const key = await this.keyFor(roomId); if (!key) throw new MatrixError("no key for this room");
    const h = this.http(); const pool = this.poolOf(roomId);
    const filter = syncFilter(roomId);
    if (!to && !pool.offers.length) this.noteOffers(roomId, await h.allState(roomId));
    // The pick and the count are one synchronous step, so concurrent asks
    // see each other's jobs in flight and spread across the pool.
    const inflight = Object.fromEntries(Object.entries(pool.workers).map(([u, w]) => [u, w.sent - w.answered - w.failed]));
    const worker = to ? { user: to } : pickMouth(pool.offers, { model, inflight });
    if (!worker) throw new MatrixError(pool.offers.length ? `no offered mouth has ${model}` : "nobody in this room offers a mouth — /serve on a machine that has one");
    const stats = this.workerStats(roomId, worker.user); stats.sent++;
    const id = newJobId(); this.sentJobs.add(id);
    const first = await h.sync({ filter, timeout: 0 });
    let since = first.next_batch;
    this.noteOffers(roomId, first.rooms?.join?.[roomId]?.state?.events ?? []);
    const sealed = await this.sealFor(key, { id, kind: "complete", model, messages, options, ts: Date.now() });
    const started = Date.now();
    await h.send(roomId, EVENTS.job, jobContent({ to: worker.user, id, ...sealed }));
    this.record("matrix-ask", { room: roomId, to: worker.user, bytes: sealed.env?.length ?? sealed.bytes ?? 0, viaMedia: !!sealed.mxc });
    while (Date.now() - started < timeoutMs) {
      if (signal?.aborted) { stats.failed++; throw new MatrixError("cancelled"); }
      onWait?.({ worker: worker.user, ms: Date.now() - started });
      let res;
      try { res = await h.sync({ since, filter, timeout: Math.max(1000, Math.min(30_000, timeoutMs - (Date.now() - started))), signal }); }
      catch (e) { if (e.errcode === "ABORTED") { stats.failed++; throw new MatrixError("cancelled"); } throw e; }
      since = res.next_batch;
      for (const ev of res.rooms?.join?.[roomId]?.timeline?.events ?? []) {
        if (ev.type !== EVENTS.answer || ev.content?.job !== id) continue;
        let answer; try { answer = await this.unsealFrom(key, ev.content); } catch (e) { stats.failed++; throw new MatrixError(`the answer from ${ev.sender} would not open: ${e.message}`); }
        const ms = Date.now() - started;
        stats.answered++; stats.ms.push(ms); stats.tokens += answer.usage?.outTokens ?? 0; stats.device = answer.device ?? stats.device; stats.model = answer.model ?? stats.model;
        this.record("matrix-answered", { room: roomId, by: ev.sender, ms, bytes: ev.content.env?.length ?? 0 });
        if (answer.gap) throw new MatrixError(`${ev.sender} could not answer: ${answer.gap}`);
        return { text: answer.text ?? "", usage: answer.usage ?? null, by: ev.sender, model: answer.model ?? model, ms, device: answer.device ?? null };
      }
    }
    stats.failed++;
    this.record("matrix-ask-timeout", { room: roomId, to: worker.user, ms: Date.now() - started });
    throw new MatrixError(`no answer from ${worker.user} in ${Math.round(timeoutMs / 1000)}s — its page or worker may be closed`);
  }
  /**
   * Serve the room from this machine: offer the models, then answer every
   * sealed job addressed to this user (from any device of theirs, from
   * anyone) until aborted, then withdraw. `complete({model, messages,
   * options})` is the local mouth — Ollama or the in-tab rung — and returns
   * `{text, usage, device}`; a throw becomes a typed gap in the answer.
   */
  async serve(roomId, { complete, models = [], home = null, signal = null, onJob = null } = {}) {
    const key = await this.keyFor(roomId); if (!key) throw new MatrixError("no key for this room");
    const h = this.http(); const me = this.data.session.user_id;
    await this.offerMouth(roomId, { models, home });
    const filter = syncFilter(roomId);
    let since = (await h.sync({ filter, timeout: 0 })).next_batch;
    const answered = new Set(); let served = 0;
    try {
      while (!signal?.aborted) {
        let res; try { res = await h.sync({ since, filter, timeout: 30_000, signal }); } catch (e) { if (signal?.aborted || e.errcode === "ABORTED") break; await new Promise((r) => setTimeout(r, 2000)); continue; }
        since = res.next_batch;
        if (this.pendingInvites(roomId).length) { try { await this.grantPending(roomId); } catch { /* next pass */ } }
        const events = res.rooms?.join?.[roomId]?.timeline?.events ?? [];
        for (const ev of events) if (ev.type === EVENTS.answer && ev.sender === me) answered.add(ev.content?.job);
        for (const ev of events) {
          if (ev.type !== EVENTS.job || ev.content?.to !== me || !ev.content?.id || answered.has(ev.content.id) || this.sentJobs.has(ev.content.id)) continue;
          answered.add(ev.content.id);
          const started = Date.now(); let reply;
          try {
            const job = await this.unsealFrom(key, ev.content);
            if (job.kind !== "complete") throw new MatrixError(`a job of kind ${job.kind} — this worker answers only complete`);
            onJob?.({ from: ev.sender, id: job.id, model: job.model, messages: job.messages?.length ?? 0 });
            const out = await complete({ model: job.model, messages: job.messages, options: job.options ?? null });
            reply = { id: job.id, text: out.text ?? "", usage: out.usage ?? null, model: out.model ?? job.model, device: out.device ?? { home }, ms: Date.now() - started };
          } catch (e) { reply = { id: ev.content.id, gap: e?.message ?? String(e), ms: Date.now() - started }; }
          const sealed = await this.sealFor(key, reply);
          await h.send(roomId, EVENTS.answer, answerContent({ job: ev.content.id, ...sealed }));
          served++;
          this.record("matrix-served", { room: roomId, from: ev.sender, ms: reply.ms, gap: reply.gap ? true : false });
        }
      }
    } finally {
      try { await this.offerMouth(roomId, { models: [], home }); } catch { /* the token may be gone; the offer ages out with the page */ }
    }
    return { served };
  }
  /** The pool, as this browser has measured it: offers from state, and per
   * worker what its own jobs found — counts, mean latency, tokens, device. */
  pool(roomId) {
    const pool = this.poolOf(roomId);
    const workers = pool.offers.map((o) => {
      const w = pool.workers[o.user] ?? { sent: 0, answered: 0, failed: 0, ms: [], tokens: 0, device: null, model: null };
      const meanMs = w.ms.length ? Math.round(w.ms.reduce((a, b) => a + b, 0) / w.ms.length) : null;
      const totalMs = w.ms.reduce((a, b) => a + b, 0);
      return { user: o.user, models: o.models, home: o.home, since: o.since, sent: w.sent, answered: w.answered, failed: w.failed, inflight: w.sent - w.answered - w.failed, meanMs, tokPerSec: w.tokens && totalMs ? Math.round((w.tokens / totalMs) * 1000) : null, device: w.device };
    });
    for (const [user, w] of Object.entries(pool.workers)) if (!workers.some((x) => x.user === user)) workers.push({ user, models: [], home: null, since: 0, withdrawn: true, sent: w.sent, answered: w.answered, failed: w.failed, inflight: w.sent - w.answered - w.failed, meanMs: w.ms.length ? Math.round(w.ms.reduce((a, b) => a + b, 0) / w.ms.length) : null, tokPerSec: null, device: w.device });
    return { room: roomId, offers: pool.offers.length, workers };
  }
}

/** localStorage-backed storage for the page. */
export function localStorageStorage(name = "fold-matrix") {
  return {
    get() { try { const s = localStorage.getItem(name); return s ? JSON.parse(s) : null; } catch { return null; } },
    set(obj) { try { localStorage.setItem(name, JSON.stringify(obj)); } catch { /* storage full or off: the session lives for this page */ } },
    clear() { try { localStorage.removeItem(name); } catch { /* nothing to clear */ } },
  };
}
