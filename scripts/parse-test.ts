/**
 * CLI script to test the parser against the real Excel files.
 * Usage: pnpm parse-test
 */
import { readFileSync } from "fs";
import { join } from "path";
import { parseFiles } from "../src/lib/parser/index";

const root = join(__dirname, "..");

const files = [
  { name: "202603上半月V3.xlsx", path: join(root, "202603上半月V3.xlsx") },
  { name: "202603下半月V3.xlsx", path: join(root, "202603下半月V3.xlsx") },
];

const inputs = files.map((f) => ({
  fileName: f.name,
  data: readFileSync(f.path),
}));

console.log("Parsing files...");
const result = parseFiles(inputs, { code: "中", month: "2026-03" });

console.log("\n=== DIAGNOSTICS ===");
console.log("Blocks found:", result.diagnostics.blocksFound);
console.log("Event count:", result.diagnostics.eventCount);
console.log("Warnings:", result.diagnostics.warnings);
console.log("Errors:", result.diagnostics.errors);
console.log("Conflicts:", result.diagnostics.conflicts);

console.log("\n=== EVENTS ===");
for (const event of result.events) {
  console.log(
    `${event.date} [${event.slot.padEnd(9)}] ${event.title}${event.notes ? " ⚠️" : ""}`
  );
}

console.log(`\nTotal: ${result.events.length} events`);
