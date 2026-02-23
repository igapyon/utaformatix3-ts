import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function isTestFile(name) {
  return name.endsWith(".test.ts");
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    return false;
  }
  return true;
}

function findEsbuildBin() {
  const repoRoot = resolve(".");
  if (process.platform === "win32") {
    return join(repoRoot, "node_modules", ".bin", "esbuild.cmd");
  }
  return join(repoRoot, "node_modules", ".bin", "esbuild");
}

function main() {
  const repoRoot = resolve(".");
  const testDir = join(repoRoot, "tests", "upstream-parity");
  const esbuildBin = findEsbuildBin();
  const tempRoot = mkdtempSync(join(tmpdir(), "utaformatix3-ts-tests-"));

  const testFiles = readdirSync(testDir).filter(isTestFile).sort();
  if (testFiles.length === 0) {
    console.error("No parity test files found under tests/upstream-parity.");
    process.exit(1);
  }

  let failed = false;
  for (const fileName of testFiles) {
    const source = join(testDir, fileName);
    const outFile = join(tempRoot, fileName.replace(/\.ts$/, ".cjs"));
    console.log(`\n[parity] ${fileName}`);

    const buildOk = runCommand(esbuildBin, [
      source,
      "--bundle",
      "--platform=node",
      "--format=cjs",
      `--outfile=${outFile}`,
    ]);
    if (!buildOk) {
      failed = true;
      continue;
    }

    const runOk = runCommand(process.execPath, [outFile]);
    if (!runOk) {
      failed = true;
    }
  }

  rmSync(tempRoot, { recursive: true, force: true });

  if (failed) {
    console.error("\nParity tests: FAILED");
    process.exit(1);
  }
  console.log("\nParity tests: OK");
}

main();
