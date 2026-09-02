// web-seam.test.mjs — P13's seam on the SURFACE: the Explore page's own
// files fetch only same-origin paths. This test lived in web.test.mjs and
// moved back here when that organ crossed into eoreader7 (2026-09-02): it
// reads the-fold's page files, which is a fact about the surface, not about
// the pure web organ — and an organ test may not reach into the surface.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// P13 sanctions egress from the SERVER only. The Explore page may render an
// archive.org address as a link the user can choose to follow, but the page
// itself must never fetch from a non-local host — same rule II.13 pins for
// the Converse page's files.
test("P13 seam: explore.js and explore.html fetch only same-origin paths", () => {
  // preview.js joins the scan for the reason the others are in it: it builds
  // the src of every img, iframe, audio and video the preview shows, so it is
  // exactly where a remote host would slip in. relations-chain.js joins it
  // because the Explore page loads it (renderLink's handles).
  for (const file of ["explore/explore.js", "explore/preview.js", "explore.html", "explore-bridge.js", "relations-chain.js"]) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    const hosts = [...src.matchAll(/https?:\/\/([^/"'` )>]+)/g)].map((m) => m[1]);
    for (const h of hosts) {
      assert.ok(
        /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) || h === "www.w3.org",
        `non-local host in ${file}: ${h} — remote fetching belongs to the server (P13), links to it must be built from server data, not hardcoded`,
      );
    }
  }
});

