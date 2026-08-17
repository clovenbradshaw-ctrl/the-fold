// wheels.js — the wheel organ's pure half (P21, amending P18): given a
// name and pyodide's own lock file (node_modules/pyodide/pyodide-lock.json
// — the same index numpy/matplotlib/pandas already come from), resolve the
// transitive dependency closure of vendored wheel filenames and their
// declared sha256 hashes. Zero network calls anywhere in this file — the
// crossing (the actual fetch from pyodide's CDN mirror) is
// explore-server.mjs's alone, the same split web.js and github.js already
// draw between shape and crossing.

/**
 * name -> { key, version, wheels: [{name, version, file_name, sha256}, …] }
 * for it and its full transitive dependency closure, or null if `name`
 * (case-sensitive, then lowercased) is not in `lock` (pyodide-lock.json's
 * own `packages` object). Dependencies are deduplicated by key — a diamond
 * (two packages sharing a third dependency) walks the shared one once.
 */
export function wheelClosure(name, lock) {
  const key = lock[name] ? name : lock[name.toLowerCase()] ? name.toLowerCase() : null;
  if (!key) return null;
  const seen = new Map();
  const stack = [key];
  while (stack.length) {
    const n = stack.pop();
    const k = lock[n] ? n : lock[n.toLowerCase()];
    if (!k || seen.has(k)) continue;
    const pkg = lock[k];
    seen.set(k, { name: k, version: pkg.version, file_name: pkg.file_name, sha256: pkg.sha256 });
    stack.push(...(pkg.depends ?? []));
  }
  return { key, version: lock[key].version, wheels: [...seen.values()] };
}
