import { build } from "esbuild";
import { rm, mkdir, cp, copyFile, readFile, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
const out = "dist/games/castle-wolfenstein";
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["game-src/main.ts"],
  bundle: true,
  outfile: out + "/app.js",
  format: "iife",
  target: "chrome90",
  minify: true,
  alias: { "@whscullin/cpu6502": "./vendor/cpu6502/js/index.ts" },
});
for (const f of ["index.html", "style.css", "castle.dsk"])
  await copyFile("game-src/" + f, out + "/" + f);
for (const lib of ["apple2js", "cpu6502"])
  await copyFile(
    "vendor/" + lib + "/LICENSE",
    out + "/LICENSE-" + lib + ".txt",
  );
await copyFile("THIRD_PARTY.md", "dist/credits.txt");

await cp("choplifter-src", "dist/games/choplifter", { recursive: true });
