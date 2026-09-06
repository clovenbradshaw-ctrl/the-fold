// matrix-fake-homeserver.mjs — an ADVERSARIAL Matrix homeserver for the proofs.
//
// It implements exactly the client-server routes matrix-client.js uses, keeps
// everything it is given (every request's method, path, headers and raw body;
// every state event; every media blob), and hands all of it back to the tests
// — the position of a homeserver operator who logs everything and reads their
// own disk. The proof (matrix-client.test.mjs) is that with all of that, and
// without the chat key, no turn a person typed can be found. The auth rules it
// enforces are the ones the design leans on: a state event whose state_key is
// a user id may be sent only by that user; state needs membership and power;
// media needs a token. A fixture for tests and the browser rehearsal only —
// not in the page graph, never deployed.
//
//   node matrix-fake-homeserver.mjs [port]   runs one on localhost, prints two
//   throwaway users, and serves GET /__log (the request log and the store) so
//   the browser rehearsal can read what the operator saw.
import http from "node:http";

export function startFakeHomeserver({ port = 0, host = "127.0.0.1", users = {}, serverName = "fake.test" } = {}) {
  // One stream counter over BOTH the timeline and state writes, so a sync
  // cursor covers each: a real homeserver sends state DELTAS on incremental
  // syncs, and a fixture that only sends state on the first sync would hide
  // exactly the bugs this file exists to find (measured 2026-09-06: a worker
  // never saw a room's request that it take up a model).
  const store = { users: { ...users }, tokens: new Map(), rooms: new Map(), media: new Map(), timeline: [], stateLog: [], waiters: [], nextRoom: 1, nextMedia: 1, nextToken: 1, nextEvent: 1 };
  const wake = () => { const w = store.waiters.splice(0); for (const r of w) r(); };
  const log = [];
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS" };
  const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json", ...cors }); res.end(JSON.stringify(body)); };
  const err = (res, status, errcode, error) => json(res, status, { errcode, error });
  const readBody = (req) => new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks)))); });
  const userOf = (req) => { const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? ""); return m ? store.tokens.get(m[1]) ?? null : null; };
  const stateKey = (type, key) => `${type} ${key}`;
  const powerOf = (r, user) => { const pl = r.state.get(stateKey("m.room.power_levels", "")) ?? {}; return pl.users?.[user] ?? pl.users_default ?? 0; };
  const mintToken = (local) => { const t = `syt_${local}_${(store.nextToken++).toString(36)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`; store.tokens.set(t, `@${local}:${serverName}`); return t; };
  let server;
  const base = () => `http://${host === "127.0.0.1" ? "localhost" : host}:${server.address().port}`;
  const dump = () => ({
    users: Object.keys(store.users),
    rooms: [...store.rooms.values()].map((r) => ({ id: r.id, members: [...r.members], state: [...r.state].map(([k, content]) => { const i = k.indexOf(" "); return { type: k.slice(0, i), state_key: k.slice(i + 1), content }; }) })),
    media: [...store.media].map(([mxc, b]) => ({ mxc, bytes: b.bytes.length, type: b.type, by: b.by })),
    timeline: store.timeline.map(({ stream, ...e }) => e),
  });

  server = http.createServer(async (req, res) => {
    const body = await readBody(req);
    const url = new URL(req.url, "http://x");
    log.push({ method: req.method, path: url.pathname + url.search, headers: { ...req.headers }, body });
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const p = url.pathname;
    const parse = () => { try { return JSON.parse(Buffer.from(body).toString("utf8") || "{}"); } catch { return null; } };
    let m;
    if (p === "/__log") return json(res, 200, { log: log.map((l) => ({ method: l.method, path: l.path, headers: l.headers, body: Buffer.from(l.body).toString("base64") })), store: dump() });
    if (p === "/.well-known/matrix/client") return json(res, 200, { "m.homeserver": { base_url: base() } });
    if (p === "/_matrix/client/versions") return json(res, 200, { versions: ["v1.11"] });
    if (p === "/_matrix/client/v1/media/config" || p === "/_matrix/media/v3/config") return json(res, 200, { "m.upload.size": 50 * 1024 * 1024 });
    if (p === "/_matrix/client/v3/register" && req.method === "POST") {
      const b = parse(); if (!b?.username || !b?.password) return err(res, 400, "M_MISSING_PARAM", "username and password");
      if (!b.auth) return json(res, 401, { flows: [{ stages: ["m.login.dummy"] }], session: "s1" });
      if (store.users[b.username]) return err(res, 400, "M_USER_IN_USE", "taken");
      store.users[b.username] = b.password;
      return json(res, 200, { user_id: `@${b.username}:${serverName}`, access_token: mintToken(b.username), device_id: `D${store.nextToken}` });
    }
    if (p === "/_matrix/client/v3/login") {
      if (req.method === "GET") return json(res, 200, { flows: [{ type: "m.login.password" }] });
      const b = parse(); const name = b?.identifier?.user ?? b?.user;
      const local = String(name ?? "").replace(/^@/, "").replace(new RegExp(`:${serverName}$`), "");
      if (!local || store.users[local] !== b?.password) return err(res, 403, "M_FORBIDDEN", "Invalid username or password");
      return json(res, 200, { user_id: `@${local}:${serverName}`, access_token: mintToken(local), device_id: `D${store.nextToken}`, home_server: serverName });
    }
    const user = userOf(req);
    if (!user) return err(res, 401, "M_MISSING_TOKEN", "Unrecognised access token");
    if (p === "/_matrix/client/v3/logout") { for (const [t, u] of store.tokens) if (u === user) store.tokens.delete(t); return json(res, 200, {}); }
    if (p === "/_matrix/client/v3/account/whoami") return json(res, 200, { user_id: user, device_id: "D" });
    if (p === "/_matrix/client/v3/createRoom" && req.method === "POST") {
      const b = parse() ?? {};
      const room_id = `!r${store.nextRoom++}:${serverName}`;
      const r = { id: room_id, creator: user, members: new Map([[user, "join"]]), state: new Map() };
      r.state.set(stateKey("m.room.create", ""), { creator: user, room_version: "10" });
      const o = b.power_level_content_override ?? {};
      r.state.set(stateKey("m.room.power_levels", ""), { users: { [user]: 100 }, users_default: 0, events_default: 0, state_default: 50, invite: 0, ...o, events: { ...(o.events ?? {}) } });
      if (b.name) r.state.set(stateKey("m.room.name", ""), { name: b.name });
      r.state.set(stateKey("m.room.join_rules", ""), { join_rule: b.preset === "public_chat" ? "public" : "invite" });
      for (const s of b.initial_state ?? []) r.state.set(stateKey(s.type, s.state_key ?? ""), s.content);
      store.rooms.set(room_id, r);
      return json(res, 200, { room_id });
    }
    if (p === "/_matrix/client/v3/joined_rooms") return json(res, 200, { joined_rooms: [...store.rooms.values()].filter((r) => r.members.get(user) === "join").map((r) => r.id) });
    if ((m = /^\/_matrix\/client\/v3\/join\/([^/]+)$/.exec(p)) && req.method === "POST") {
      const r = store.rooms.get(decodeURIComponent(m[1])); if (!r) return err(res, 404, "M_NOT_FOUND", "no room");
      const rule = r.state.get(stateKey("m.room.join_rules", ""))?.join_rule;
      if (r.members.get(user) !== "invite" && r.members.get(user) !== "join" && rule !== "public") return err(res, 403, "M_FORBIDDEN", "You are not invited to this room.");
      r.members.set(user, "join"); return json(res, 200, { room_id: r.id });
    }
    if ((m = /^\/_matrix\/client\/v3\/rooms\/([^/]+)\/(invite|kick|members|state)(?:\/([^/]+)\/([^/]*))?$/.exec(p))) {
      const r = store.rooms.get(decodeURIComponent(m[1])); if (!r) return err(res, 404, "M_NOT_FOUND", "no room");
      if (r.members.get(user) !== "join") return err(res, 403, "M_FORBIDDEN", "not a member");
      if (m[2] === "invite" && req.method === "POST") { const b = parse(); if (!b?.user_id) return err(res, 400, "M_MISSING_PARAM", "user_id"); if (r.members.get(b.user_id) === "join") return err(res, 403, "M_FORBIDDEN", `${b.user_id} is already in the room.`); r.members.set(b.user_id, "invite"); return json(res, 200, {}); }
      if (m[2] === "kick" && req.method === "POST") {
        const b = parse(); if (!b?.user_id) return err(res, 400, "M_MISSING_PARAM", "user_id");
        const pl = r.state.get(stateKey("m.room.power_levels", "")); if (powerOf(r, user) < (pl.kick ?? 50)) return err(res, 403, "M_FORBIDDEN", "You don't have permission to kick");
        r.members.set(b.user_id, "leave"); return json(res, 200, {});
      }
      if (m[2] === "members") return json(res, 200, { chunk: [...r.members].map(([u, membership]) => ({ type: "m.room.member", state_key: u, sender: u, content: { membership } })) });
      if (m[2] === "state" && m[3] === undefined) return json(res, 200, [...r.state].map(([k, content]) => { const i = k.indexOf(" "); return { type: k.slice(0, i), state_key: k.slice(i + 1), content, sender: r.creator }; }));
      const type = decodeURIComponent(m[3]), key = decodeURIComponent(m[4] ?? "");
      if (req.method === "GET") { const c = r.state.get(stateKey(type, key)); return c === undefined ? err(res, 404, "M_NOT_FOUND", "Event not found.") : json(res, 200, c); }
      if (req.method === "PUT") {
        if (key.startsWith("@") && key !== user) return err(res, 403, "M_FORBIDDEN", "You are not allowed to set others state.");
        const pl = r.state.get(stateKey("m.room.power_levels", ""));
        const need = pl.events?.[type] ?? pl.state_default ?? 50;
        if (powerOf(r, user) < need) return err(res, 403, "M_FORBIDDEN", `You don't have permission to post that to the room. user level ${powerOf(r, user)} < send level ${need}`);
        const content = parse(); if (content === null) return err(res, 400, "M_NOT_JSON", "bad json");
        if (body.length > 65536) return err(res, 413, "M_TOO_LARGE", "event too large");
        r.state.set(stateKey(type, key), content);
        store.stateLog.push({ room_id: r.id, type, state_key: key, content, sender: user, event_id: `$s${store.nextEvent}`, origin_server_ts: Date.now(), stream: store.nextEvent++ });
        wake();
        return json(res, 200, { event_id: `$e${r.state.size}` });
      }
    }
    if ((m = /^\/_matrix\/client\/v3\/rooms\/([^/]+)\/send\/([^/]+)\/([^/]+)$/.exec(p)) && req.method === "PUT") {
      const r = store.rooms.get(decodeURIComponent(m[1])); if (!r) return err(res, 404, "M_NOT_FOUND", "no room");
      if (r.members.get(user) !== "join") return err(res, 403, "M_FORBIDDEN", "not a member");
      const type = decodeURIComponent(m[2]);
      const pl = r.state.get(stateKey("m.room.power_levels", ""));
      const need = pl.events?.[type] ?? pl.events_default ?? 0;
      if (powerOf(r, user) < need) return err(res, 403, "M_FORBIDDEN", "You don't have permission to post that to the room.");
      const content = parse(); if (content === null) return err(res, 400, "M_NOT_JSON", "bad json");
      if (body.length > 65536) return err(res, 413, "M_TOO_LARGE", "event too large");
      const ev = { room_id: r.id, type, sender: user, content, event_id: `$ev${store.nextEvent}`, origin_server_ts: Date.now(), stream: store.nextEvent++ };
      store.timeline.push(ev); wake();
      return json(res, 200, { event_id: ev.event_id });
    }
    if (p === "/_matrix/client/v3/sync" && req.method === "GET") {
      let filter = {}; try { filter = JSON.parse(url.searchParams.get("filter") ?? "{}"); } catch { return err(res, 400, "M_BAD_JSON", "bad filter"); }
      const since = Number(url.searchParams.get("since") ?? 0) || 0;
      const timeout = Math.min(Number(url.searchParams.get("timeout") ?? 0) || 0, 30000);
      const rooms = filter.room?.rooms ?? null; const types = filter.room?.timeline?.types ?? null; const stateTypes = filter.room?.state?.types ?? null;
      const mine = () => store.timeline.filter((e) => e.stream > since && store.rooms.get(e.room_id)?.members.get(user) === "join" && (!rooms || rooms.includes(e.room_id)) && (!types || types.includes(e.type)));
      const mineState = () => store.stateLog.filter((e) => e.stream > since && store.rooms.get(e.room_id)?.members.get(user) === "join" && (!rooms || rooms.includes(e.room_id)) && (!stateTypes || stateTypes.includes(e.type)));
      let events = mine();
      let stateDeltas = mineState();
      if (!events.length && !stateDeltas.length && timeout > 0) {
        // long-poll: a new event, the timeout, or the client going away wakes it
        // (res, not req: an IncomingMessage closes as soon as its body is read)
        await new Promise((resolve) => { let done = false; const fin = () => { if (!done) { done = true; clearTimeout(t); resolve(); } }; const t = setTimeout(fin, timeout); store.waiters.push(fin); res.on("close", fin); });
        if (res.destroyed) return;
        events = mine(); stateDeltas = mineState();
      }
      const join = {};
      for (const r of store.rooms.values()) {
        if (r.members.get(user) !== "join" || (rooms && !rooms.includes(r.id))) continue;
        const timeline = events.filter((e) => e.room_id === r.id).map(({ stream, room_id, ...e }) => e);
        const state = since
          ? stateDeltas.filter((e) => e.room_id === r.id).map(({ stream, room_id, ...e }) => e)
          : [...r.state].filter(([k]) => !stateTypes || stateTypes.includes(k.slice(0, k.indexOf(" ")))).map(([k, content]) => { const i = k.indexOf(" "); return { type: k.slice(0, i), state_key: k.slice(i + 1), content, sender: r.creator }; });
        if (timeline.length || state.length) join[r.id] = { timeline: { events: timeline, limited: false }, state: { events: state } };
      }
      return json(res, 200, { next_batch: String(store.nextEvent - 1), rooms: { join } });
    }
    if (p === "/_matrix/media/v3/upload" && req.method === "POST") {
      const id = `m${store.nextMedia++}`;
      store.media.set(`mxc://${serverName}/${id}`, { bytes: body, type: req.headers["content-type"] ?? "", name: url.searchParams.get("filename"), by: user });
      return json(res, 200, { content_uri: `mxc://${serverName}/${id}` });
    }
    if ((m = /^\/_matrix\/(?:client\/v1\/media|media\/v3)\/download\/([^/]+)\/([^/]+)$/.exec(p))) {
      const blob = store.media.get(`mxc://${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}`);
      if (!blob) return err(res, 404, "M_NOT_FOUND", "no media");
      res.writeHead(200, { "content-type": blob.type || "application/octet-stream", ...cors }); return res.end(Buffer.from(blob.bytes));
    }
    return err(res, 404, "M_UNRECOGNIZED", `no such route ${req.method} ${p}`);
  });

  return new Promise((resolve) => server.listen(port, host, () => resolve({
    server, base: base(), log, store, dump,
    /** Everything the operator could ever read, as one byte string: every
     * request line, header and body; every state event; every media blob. */
    everything() {
      const parts = [];
      for (const l of log) parts.push(Buffer.from(`${l.method} ${l.path}\n${JSON.stringify(l.headers)}\n`), Buffer.from(l.body));
      for (const r of store.rooms.values()) parts.push(Buffer.from(JSON.stringify([...r.state])));
      parts.push(Buffer.from(JSON.stringify(store.timeline)));
      for (const b of store.media.values()) parts.push(Buffer.from(b.bytes));
      return new Uint8Array(Buffer.concat(parts));
    },
    close: () => new Promise((r) => { wake(); server.closeAllConnections?.(); server.close(r); }),
  })));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.argv[2] ?? 8448);
  const users = { alice: `alice-throwaway-${Math.random().toString(36).slice(2)}`, bob: `bob-throwaway-${Math.random().toString(36).slice(2)}` };
  const hs = await startFakeHomeserver({ port, users });
  console.log(`fake homeserver at ${hs.base} — users ${Object.entries(users).map(([u, p]) => `${u} / ${p}`).join("  ·  ")} — GET /__log for what it saw`);
}
