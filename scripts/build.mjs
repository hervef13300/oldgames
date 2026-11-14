import { build } from "esbuild";
import { rm, mkdir, cp, copyFile, readFile, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
const out = "dist/games/castle-wolfenstein";
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["games/castle-wolfenstein/src/main.ts"],
  bundle: true,
  outfile: out + "/app.js",
  format: "iife",
  target: "chrome90",
  minify: true,
  alias: { "@whscullin/cpu6502": "./games/castle-wolfenstein/vendor/cpu6502/js/index.ts" },
});
for (const f of ["index.html", "style.css", "castle.dsk"])
  await copyFile("games/castle-wolfenstein/src/" + f, out + "/" + f);
for (const lib of ["apple2js", "cpu6502"])
  await copyFile(
    "games/castle-wolfenstein/vendor/" + lib + "/LICENSE",
    out + "/LICENSE-" + lib + ".txt",
  );
await copyFile("THIRD_PARTY.md", "dist/credits.txt");

await cp("games/choplifter/src", "dist/games/choplifter", { recursive: true });
