/**
 * Inspect the raw structure of the xlsx file to understand the grid layout.
 */
import { readFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const file = join(__dirname, "..", "202603上半月V3.xlsx");
const wb = XLSX.read(readFileSync(file), { type: "buffer", cellText: true, cellNF: true });
console.log("Sheet names:", wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws["!ref"]!);

console.log("Sheet range:", ws["!ref"]);
console.log("Merges count:", (ws["!merges"] ?? []).length);
console.log("\n=== First 40 rows, first 12 columns (raw) ===\n");

for (let r = range.s.r; r <= Math.min(range.s.r + 39, range.e.r); r++) {
  const cols: string[] = [];
  for (let c = range.s.c; c <= Math.min(range.s.c + 11, range.e.c); c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) {
      cols.push("(null)");
    } else {
      const val = cell.w ?? cell.v ?? "";
      cols.push(String(val).slice(0, 12).padEnd(12));
    }
  }
  const rowLabel = String(r + 1).padStart(3);
  console.log(`R${rowLabel}: ${cols.join(" | ")}`);
}

console.log("\n=== First 10 merges ===");
for (const m of (ws["!merges"] ?? []).slice(0, 10)) {
  const from = XLSX.utils.encode_cell(m.s);
  const to = XLSX.utils.encode_cell(m.e);
  const masterAddr = XLSX.utils.encode_cell(m.s);
  const masterCell = ws[masterAddr];
  const val = masterCell ? (masterCell.w ?? masterCell.v ?? "") : "(empty)";
  console.log(`  ${from}:${to} = "${val}"`);
}
