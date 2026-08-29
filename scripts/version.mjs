/**
 * Sets what this build is called.
 *
 * The number is declared once, in `apps/desktop/src-tauri/tauri.conf.json`: the web app reads it
 * there through `next.config.ts`, the bundler stamps it on every installer, and `tauri-action`
 * reads it to name the release. A number kept in two places is a number that disagrees with
 * itself, so this writes the one and prints the tag that has to match it.
 *
 *   bun run bump 0.2.0
 */
import { readFileSync, writeFileSync } from "node:fs";

const config = new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url);
const next = process.argv[2];

if (!next || !/^\d+\.\d+\.\d+$/.test(next)) {
  console.error("usage: bun run bump <major.minor.patch>");
  process.exit(1);
}

const source = readFileSync(config, "utf8");
const current = JSON.parse(source).version;

// Rewritten in place rather than re-serialized: the file is hand-maintained, and `JSON.stringify`
// would reformat every line of it to change one.
const written = source.replace(`"version": "${current}"`, `"version": "${next}"`);
if (written === source) {
  console.error(`could not find "version": "${current}" to replace`);
  process.exit(1);
}
writeFileSync(config, written);

console.log(`echo ${current} → ${next}\n`);
console.log("commit it, then push the tag the release workflow waits for:\n");
console.log(`  git commit -am "echo ${next}"`);
console.log(`  git tag v${next}`);
console.log(`  git push && git push origin v${next}`);
