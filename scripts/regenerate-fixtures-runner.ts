declare function require(name: string): any;
declare const process: { cwd: () => string };

import { parseUfdata, writeUfdata } from "../src/core/io/UfData";

const fs = require("node:fs");
const path = require("node:path");

function collectUfdataOracleFiles(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) return [];
  const result: string[] = [];
  const queue: string[] = [baseDir];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
        continue;
      }
      if (entry.isFile() && entry.name === "oracle.ufdata.json") {
        result.push(full);
      }
    }
  }
  return result.sort();
}

function normalizeUfdataOracle(filePath: string): void {
  const source = fs.readFileSync(filePath, "utf8");
  const project = parseUfdata(source);
  const normalized = writeUfdata(project);
  const pretty = `${JSON.stringify(JSON.parse(normalized), null, 2)}\n`;
  fs.writeFileSync(filePath, pretty, "utf8");
}

function main(): void {
  const fixturesRoot = path.join(process.cwd(), "tests", "fixtures", "ufdata");
  const files = collectUfdataOracleFiles(fixturesRoot);
  for (const filePath of files) {
    normalizeUfdataOracle(filePath);
    console.log(`Regenerated: ${path.relative(process.cwd(), filePath)}`);
  }
  if (files.length === 0) {
    console.log("No UFDATA oracle fixture files found.");
  }
}

main();
