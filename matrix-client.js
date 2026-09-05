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
  async invite(room, userId) { await this.req("POST", paths.invite(room), { json: { user_id: userId } }); }
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
    this.data = storage.get() ?? { session: null, identity: null, rooms: {} };
    this.data.rooms ??= {};
    if (this.data.session?.access_token) secrets.add("access token", this.data.session.access_token);
    if (this.data.identity?.priv) secrets.add("identity private key", this.data.identity.priv);
    for (const r of Object.values(this.data.rooms)) if (r.key) secrets.add("chat key", unb64(r.key));
  }
  save() { this.storage.set(this.data); }
  /** One line on the record per act — after forRecord, never before. */
  record(kind, fields = {}) { const { fields: safe } = forRecord(fields, this.secrets); this.recordHook(kind, safe); return safe; }
  get session() { const s = this.data.session; return s ? { hs: s.hs, user_id: s.user_id, device_id: s.device_id } : null; }
  http() {
    const s = this.data.session;
    if (!s?.access_token) throw new MatrixError("not signed in — /matrix login <homeserver>", { status: 0 });
    return new MatrixHttp({ base: s.hs, token: s.access_token, fetch: this.fetchImpl, onRequest: (r) => { this.traffic.requests++; this.traffic.bytesOut += r.bytes; this.traffic.last = r; } });
  }
  status() {
    return { signedIn: !!this.data.session, user: this.data.session?.user_id ?? null, hs: this.data.session?.hs ?? null, identity: this.data.identity?.pub ?? null,
      rooms: Object.entries(this.data.rooms).map(([id, r]) => ({ id, name: r.name ?? null, blocks: (r.idx ?? -1) + 1, entries: r.count ?? 0, hasKey: !!r.key })), traffic: { ...this.traffic } };
  }

  // ── session ──
  async login(hsInput, user, password) {
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
  keyOf(roomId) { const k = this.data.rooms[roomId]?.key; return k ? unb64(k) : null; }
  rememberRoom(roomId, patch) { const r = this.data.rooms[roomId] ?? { name: null, key: null, idx: -1, head: null, manifest: [], base: 0, count: 0, pushed: [] }; Object.assign(r, patch); this.data.rooms[roomId] = r; this.save(); return r; }

  // ── rooms ──
  /** A room of ours for this chat: the one given if we hold its key, else a
   * new private room with a fresh chat key, our member key published and the
   * key wrapped to ourselves. */
  async ensureRoom({ roomId = null, name = "a fold chat" } = {}) {
    if (roomId && this.keyOf(roomId)) return roomId;
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    const room = await h.createRoom(name);
    const key = generateChatKey(); this.secrets.add("chat key", key);
    this.rememberRoom(room, { name, key: b64(key) });
    await h.putState(room, TYPES.memberKey, me, memberKeyContent(id.pub));
    await h.putState(room, TYPES.chatKey, me, chatKeyContent(await wrapChatKey(id.pub, key), id.pub));
    this.record("matrix-room", { room, name });
    return room;
  }
  /** Push what is new: entries whose content id this browser has not pushed
   * to this room. One block, hash-linked to the last, then the chain head. */
  async preserve(roomId, entries) {
    const r = this.data.rooms[roomId]; const key = this.keyOf(roomId);
    if (!r || !key) throw new MatrixError("no key for this room — open its share link, or ask a member to grant you");
    const h = this.http(); const me = this.data.session.user_id;
    const fresh = [];
    for (const e of entries) { const id = e.id ?? (await entryId(e)); if (!r.pushed.includes(id)) fresh.push({ ...e, id }); }
    if (!fresh.length) return { pushed: 0, skipped: entries.length, idx: r.idx, bytes: 0 };
    const idx = r.idx + 1;
    const { bytes, sha256 } = await encodeBlock(key, { idx, prev: r.head, entries: fresh });
    const mxc = await h.upload(bytes, `block_${idx}`);
    const { manifest, base } = capManifest([...r.manifest, manifestEntry(mxc, sha256)], r.base);
    const count = (r.count ?? 0) + fresh.length;
    await h.putState(roomId, TYPES.chain, me, chainContent({ head: { mxc, sha256 }, idx, count, manifest, base }));
    this.rememberRoom(roomId, { idx, head: { mxc, sha256 }, manifest, base, count, pushed: [...r.pushed, ...fresh.map((e) => e.id)] });
    const line = this.record("matrix-preserve", { room: roomId, idx, mxc, sha256, bytes: bytes.length, entries: fresh.length, skipped: entries.length - fresh.length });
    return { pushed: fresh.length, skipped: entries.length - fresh.length, idx, mxc, sha256, bytes: bytes.length, line };
  }
  /** The chat key for a room we hold no key for: our own wrapped slot, or a
   * grant on any member's slot, opened with this browser's private key. */
  async keyFor(roomId) {
    const held = this.keyOf(roomId); if (held) return held;
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    const priv = await importPrivateKey(id.priv);
    const state = await h.allState(roomId);
    for (const ev of state.filter((s) => s.type === TYPES.chatKey)) {
      const wrapped = ev.state_key === me ? ev.content : ev.content?.grants?.[me];
      if (!wrapped?.blob || !wrapped?.eph_pub) continue;
      try { const key = await unwrapChatKey(priv, wrapped); this.secrets.add("chat key", key); this.rememberRoom(roomId, { key: b64(key), name: this.data.rooms[roomId]?.name ?? state.find((s) => s.type === "m.room.name")?.content?.name ?? null }); return key; }
      catch { /* wrapped for another identity of ours, or stale */ }
    }
    return null;
  }
  /** Say who we are in a room so a holder can grant us the key. */
  async requestKey(roomId) {
    const h = this.http(); const me = this.data.session.user_id; const id = await this.identity();
    await h.putState(roomId, TYPES.memberKey, me, memberKeyContent(id.pub));
    this.record("matrix-key-request", { room: roomId });
    return { published: true };
  }
  /** Every member's chain, fetched by manifest in bounded parallel, walked
   * past the manifest by prev-pointers, hash-checked, decoded, merged. */
  async load(roomId) {
    const key = await this.keyFor(roomId);
    if (!key) { this.record("matrix-load", { room: roomId, gap: "no key" }); return { entries: [], chains: 0, blocks: 0, partial: true, gaps: ["no key for this room: open its share link, or /matrix request and ask a member to /share again"] }; }
    const h = this.http();
    const state = await h.allState(roomId);
    this.noteOffers(roomId, state); // the pool's offers come with the same read
    const heads = state.filter((s) => s.type === TYPES.chain && s.content?.head?.mxc);
    const chains = []; const gaps = []; let blocks = 0;
    const fetchOne = async (mxc, sha) => { const bytes = await h.download(mxc); return { block: await decodeBlock(key, bytes, sha), sha256: sha }; };
    for (const head of heads) {
      const c = head.content; const listed = (c.manifest ?? []).map((m) => ({ mxc: m.m, sha: m.h }));
      const got = [];
      for (let i = 0; i < listed.length; i += FETCH_CONCURRENCY) {
        const part = await Promise.allSettled(listed.slice(i, i + FETCH_CONCURRENCY).map((p) => fetchOne(p.mxc, p.sha)));
        for (const [j, r] of part.entries()) { if (r.status === "fulfilled") got.push(r.value); else gaps.push(`${head.state_key} block ${c.manifestBase + i + j}: ${r.reason?.message ?? r.reason}`); }
      }
      if (!listed.length) { try { got.push(await fetchOne(c.head.mxc, c.head.sha256)); } catch (e) { gaps.push(`${head.state_key} head: ${e.message}`); } }
      // walk past the manifest's oldest entry
      let cursor = got[0]?.block?.prev ?? null; let walked = 0;
      while (cursor && walked < MAX_WALK) { try { const b = await fetchOne(cursor.mxc, cursor.sha256); got.unshift(b); cursor = b.block.prev; walked++; } catch (e) { gaps.push(`${head.state_key} walk: ${e.message}`); break; } }
      got.sort((a, b) => a.block.idx - b.block.idx);
      const link = chainIsLinked(got);
      if (!link.linked) gaps.push(`${head.state_key} chain not linked at block ${got[link.at]?.block?.idx}`);
      blocks += got.length;
      chains.push(got.map((g) => g.block));
      if (head.state_key === this.data.session.user_id && got.length) {
        const last = got.at(-1);
        this.rememberRoom(roomId, { idx: last.block.idx, head: { mxc: c.head.mxc, sha256: last.sha256 }, manifest: c.manifest ?? [], base: c.manifestBase ?? 0, count: c.count ?? 0, pushed: [...new Set([...(this.data.rooms[roomId]?.pushed ?? []), ...got.flatMap((g) => g.block.entries.map((e) => e.id))])] });
      }
    }
    const entries = mergeChains(chains);
    if (entries.length) this.rememberRoom(roomId, { pushed: [...new Set([...(this.data.rooms[roomId]?.pushed ?? []), ...entries.map((e) => e.id)])] });
    this.record("matrix-load", { room: roomId, chains: heads.length, blocks, entries: entries.length, gaps: gaps.length });
    return { entries, chains: heads.length, blocks, partial: gaps.length > 0, gaps };
  }
  /** Invite someone (optional), grant the key to every member who has
   * published a member key and holds no wrap yet, and mint the link. */
  async share(roomId, { invite = null, pageHref = "https://localhost/" } = {}) {
    const key = this.keyOf(roomId); if (!key) throw new MatrixError("no key for this room");
    const h = this.http(); const me = this.data.session.user_id;
    if (invite) await h.invite(roomId, invite);
    const state = await h.allState(roomId);
    const id = await this.identity();
    const own = state.find((s) => s.type === TYPES.chatKey && s.state_key === me)?.content ?? chatKeyContent(await wrapChatKey(id.pub, key), id.pub);
    // A member is covered when some wrap in the room names their CURRENT
    // public key: their own slot, or a grant on any member's slot. A wiped
    // browser publishes a new member key, and nothing names it until now.
    const covered = new Set();
    for (const s of state.filter((x) => x.type === TYPES.chatKey)) {
      if (s.content?.pub) covered.add(`${s.state_key} ${s.content.pub}`);
      for (const [who, g] of Object.entries(s.content?.grants ?? {})) if (g?.pub) covered.add(`${who} ${g.pub}`);
    }
    const grants = { ...(own.grants ?? {}) }; const granted = [];
    for (const mk of state.filter((s) => s.type === TYPES.memberKey && s.state_key !== me && s.content?.pub)) {
      if (covered.has(`${mk.state_key} ${mk.content.pub}`)) continue;
      grants[mk.state_key] = { v: 1, epoch: 0, pub: mk.content.pub, ...(await wrapChatKey(mk.content.pub, key)) };
      granted.push(mk.state_key);
    }
    if (granted.length) await h.putState(roomId, TYPES.chatKey, me, { ...own, grants });
    const link = buildShareLink(pageHref, { hs: this.data.session.hs, room: roomId, key, name: this.data.rooms[roomId]?.name ?? null });
    this.record("matrix-share", { room: roomId, invited: invite, granted: granted.length });
    return { link, invited: invite, granted };
  }
  /** Open a share link: the key from the fragment, the room joined, our
   * member key published and the key self-wrapped, the chat loaded. */
  async joinFromLink(href) {
    const p = parseShareLink(href);
    if (!p) throw new MatrixError("not a fold share link");
    if (!this.data.session) return { needs: "login", hs: p.hs, room: p.room, name: p.name };
    const h = this.http(); const me = this.data.session.user_id;
    this.secrets.add("chat key", p.key);
    let joined = true;
    try { await h.join(p.room); } catch (e) { if (e.status === 403) joined = false; else throw e; }
    if (!joined) { this.record("matrix-join", { room: p.room, joined: false }); return { room: p.room, name: p.name, joined: false, gap: "not invited: ask the sharer to /share " + me }; }
    this.rememberRoom(p.room, { name: p.name, key: b64(p.key) });
    const id = await this.identity();
    try { await h.putState(p.room, TYPES.memberKey, me, memberKeyContent(id.pub)); await h.putState(p.room, TYPES.chatKey, me, chatKeyContent(await wrapChatKey(id.pub, p.key), id.pub)); }
    catch { /* a viewer without state power still reads through the link's key */ }
    this.record("matrix-join", { room: p.room, joined: true });
    const loaded = await this.load(p.room);
    return { room: p.room, name: p.name, joined: true, ...loaded };
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
