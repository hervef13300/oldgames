import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
const manifest = JSON.parse(await readFile(".openai/hosting.json", "utf8"));
assert(manifest.project_id);
assert.equal(manifest.static.directory, "dist");
for (const f of [
  "dist/index.html",
  "dist/games/castle-wolfenstein/index.html",
  "dist/games/choplifter/index.html",
  "dist/zanygolf/index.html",
]) {
  const html = await readFile(f, "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate IDs");
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(#|https?:|data:)/.test(url)) continue;
    let p = resolve(dirname(f), url.split("#")[0]);
    assert(p.startsWith(resolve("dist")));
    if ((await stat(p)).isDirectory()) p += "/index.html";
    assert((await stat(p)).isFile(), p);
  }
}
const provenance = JSON.parse(await readFile("games/castle-wolfenstein/disk-provenance.json", "utf8"));
assert.equal(
  createHash("sha256")
    .update(await readFile("dist/games/castle-wolfenstein/castle.dsk"))
    .digest("hex"),
  provenance.sha256,
);
console.log(
  "PASS: hosting manifest, static routes, local assets, unique IDs and original game disk checksum. Browser QA unavailable in this Sites environment.",
);

for (const f of [
  "dist/games/castle-wolfenstein/index.html",
  "dist/games/choplifter/index.html",
]) {
  const html = await readFile(f, "utf8");
  assert(
    !/class="stick"|class="stick-area"|id="move"|id="aim"/.test(html),
    "Virtual joystick still present",
  );
}
for (const sound of [
  "rotor",
  "fire",
  "open",
  "board",
  "save",
  "explosion",
  "win",
])
  assert(
    (await stat("dist/games/choplifter/audio/" + sound + ".wav")).size > 44,
  );
console.log("PASS: both keyboard game pages and all Choplifter sound assets");
