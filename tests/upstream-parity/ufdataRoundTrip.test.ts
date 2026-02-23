declare function require(name: string): any;

import {
  collectUfDataDiagnostics,
  parseUfdata,
  UTAFORMATIX_DATA_VERSION,
  writeUfdata,
} from "../../src/core/io/UfData";

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
  assert((output as Record<string, any>).formatVersion === UTAFORMATIX_DATA_VERSION, "formatVersion mismatch");
}

function testUfdataVersionWarning(): void {
  const document = {
    formatVersion: UTAFORMATIX_DATA_VERSION + 1,
    project: {
      name: "version-warning",
      tracks: [],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
    },
  };
  const project = parseUfdata(document);
  assert(project.importWarnings.length === 1, "expected one import warning");
  assert(
    project.importWarnings[0].kind === "IncompatibleFormatSerializationVersion",
    "expected incompatible version warning",
  );
}

function testUfdataIgnoresExtrasInSemanticCheck(): void {
  const base = {
    formatVersion: UTAFORMATIX_DATA_VERSION,
    project: {
      name: "with-extras",
      tracks: [
        {
          name: "Track 1",
          notes: [{ key: 60, lyric: "la", tickOn: 0, tickOff: 480, phoneme: "l a", extras: { x: 1 } }],
          extras: { trackExtra: true },
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4, extras: { a: 1 } }],
      tempos: [{ tickPosition: 0, bpm: 120, extras: { b: 2 } }],
      measurePrefix: 0,
      extras: { projectExtra: true },
    },
  };

  const project = parseUfdata(base);
  const outputText = writeUfdata(project);
  const outputProject = (JSON.parse(outputText) as Record<string, any>).project;

  // Phase 1-2 rule: semantic checks compare core musical fields and ignore extras.
  assert(outputProject.tracks[0].notes[0].key === 60, "note key mismatch");
  assert(outputProject.tracks[0].notes[0].tickOn === 0, "note tickOn mismatch");
  assert(outputProject.tempos[0].bpm === 120, "tempo mismatch");
  assert(outputProject.timeSignatures[0].numerator === 4, "timeSignature mismatch");
}

function testUfdataDiagnostics(): void {
  const invalidJsonDiagnostics = collectUfDataDiagnostics("{");
  assert(invalidJsonDiagnostics.length === 1, "expected invalid json diagnostic");
  assert(invalidJsonDiagnostics[0].code === "INVALID_JSON", "invalid json code mismatch");

  const missingProjectDiagnostics = collectUfDataDiagnostics({ formatVersion: 1 });
  assert(missingProjectDiagnostics.length === 1, "expected missing project diagnostic");
  assert(missingProjectDiagnostics[0].code === "MISSING_PROJECT", "missing project code mismatch");
}

testUfdataRoundTrip();
testUfdataVersionWarning();
testUfdataIgnoresExtrasInSemanticCheck();
testUfdataDiagnostics();
