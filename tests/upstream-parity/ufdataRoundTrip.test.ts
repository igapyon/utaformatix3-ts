declare function require(name: string): any;

import { parseUfdata, writeUfdata } from "../../src/core/io/UfData";

const fs = require("node:fs");

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, canonicalize(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function readFixture(path: string): string {
  return fs.readFileSync(path, "utf8");
}

function testUfdataRoundTrip(): void {
  const path = "tests/fixtures/ufdata/ufdata_minimal_01/oracle.ufdata.json";
  const oracleText = readFixture(path);
  const project = parseUfdata(oracleText);
  const outputText = writeUfdata(project, { formatVersion: 1 });

  const oracle = canonicalize(JSON.parse(oracleText));
  const output = canonicalize(JSON.parse(outputText));
  const oracleProject = (oracle as Record<string, any>).project;
  const outputProject = (output as Record<string, any>).project;

  assert(
    JSON.stringify(oracleProject.tempos) === JSON.stringify(outputProject.tempos),
    "tempo mismatch",
  );
  assert(
    JSON.stringify(oracleProject.timeSignatures) === JSON.stringify(outputProject.timeSignatures),
    "timeSignature mismatch",
  );
  assert(
    JSON.stringify(oracleProject.tracks[0].notes) === JSON.stringify(outputProject.tracks[0].notes),
    "notes mismatch",
  );
}

testUfdataRoundTrip();
