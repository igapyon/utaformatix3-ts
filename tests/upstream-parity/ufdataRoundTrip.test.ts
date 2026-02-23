declare function require(name: string): any;

import {
  collectUfDataDiagnostics,
  generateUfdataDocument,
  parseUfdata,
  parseUfdataDocument,
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

function testUfdataSimpleImportDisablesPitch(): void {
  const document = {
    formatVersion: UTAFORMATIX_DATA_VERSION,
    project: {
      name: "simple-import",
      tracks: [
        {
          name: "Track 1",
          notes: [{ key: 60, lyric: "la", tickOn: 0, tickOff: 480 }],
          pitch: {
            ticks: [0, 240, 480],
            values: [0, 100, null],
            isAbsolute: false,
          },
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
    },
  };

  const project = parseUfdata(document, { simpleImport: true });
  assert(project.tracks[0].pitch == null, "simpleImport should disable pitch import");
}

function testUfdataParseValidatesNotes(): void {
  const document = {
    formatVersion: UTAFORMATIX_DATA_VERSION,
    project: {
      name: "validate-notes",
      tracks: [
        {
          name: "Track 1",
          notes: [
            { key: 60, lyric: "a", tickOn: 240, tickOff: 960 },
            { key: 62, lyric: "b", tickOn: 0, tickOff: 480 },
          ],
          pitch: {
            ticks: [],
            values: [],
            isAbsolute: false,
          },
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
    },
  };

  const project = parseUfdata(document);
  assert(project.tracks[0].notes[0].tickOn === 0, "validateNotes should sort notes by tickOn");
  assert(project.tracks[0].notes[0].tickOff === 240, "validateNotes should trim overlap");
  assert(project.tracks[0].notes[1].tickOn === 240, "validateNotes second note tickOn mismatch");
}

function testUfdataWriteAlwaysContainsPitch(): void {
  const project = parseUfdata({
    formatVersion: UTAFORMATIX_DATA_VERSION,
    project: {
      name: "empty-pitch",
      tracks: [
        {
          name: "Track 1",
          notes: [{ key: 60, lyric: "la", tickOn: 0, tickOff: 480 }],
          pitch: {
            ticks: [],
            values: [],
            isAbsolute: false,
          },
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
    },
  }, { simpleImport: true });
  const output = JSON.parse(writeUfdata(project)) as Record<string, any>;
  const pitch = output.project.tracks[0].pitch;
  assert(Array.isArray(pitch.ticks), "pitch.ticks should exist");
  assert(Array.isArray(pitch.values), "pitch.values should exist");
  assert(pitch.isAbsolute === false, "pitch.isAbsolute should default false");
}

function testParseUfdataDocumentWithInputFiles(): void {
  const document = {
    formatVersion: UTAFORMATIX_DATA_VERSION,
    project: {
      name: "doc-parse",
      tracks: [
        {
          name: "Track 1",
          notes: [{ key: 60, lyric: "la", tickOn: 0, tickOff: 480 }],
          pitch: {
            ticks: [],
            values: [],
            isAbsolute: false,
          },
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
    },
  };
  const inputFiles = ["dummy.ufdata"];
  const project = parseUfdataDocument(document, { inputFiles, simpleImport: false });
  assert(project.inputFiles.length === 1, "parseUfdataDocument should keep inputFiles");
  assert(project.inputFiles[0] === "dummy.ufdata", "parseUfdataDocument inputFiles mismatch");
}

function testGenerateUfdataDocumentWithoutPitch(): void {
  const project = parseUfdata({
    formatVersion: UTAFORMATIX_DATA_VERSION,
    project: {
      name: "doc-generate",
      tracks: [
        {
          name: "Track 1",
          notes: [{ key: 60, lyric: "la", tickOn: 0, tickOff: 480 }],
          pitch: {
            ticks: [0, 240, 480],
            values: [0, 10, null],
            isAbsolute: false,
          },
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
    },
  });

  const document = generateUfdataDocument(project, { includePitch: false });
  assert(document.project.tracks[0].pitch.ticks.length === 0, "includePitch=false should clear pitch.ticks");
  assert(document.project.tracks[0].pitch.values.length === 0, "includePitch=false should clear pitch.values");
  assert(document.project.tracks[0].pitch.isAbsolute === false, "includePitch=false pitch.isAbsolute mismatch");
}

testUfdataRoundTrip();
testUfdataVersionWarning();
testUfdataIgnoresExtrasInSemanticCheck();
testUfdataDiagnostics();
testUfdataSimpleImportDisablesPitch();
testUfdataParseValidatesNotes();
testUfdataWriteAlwaysContainsPitch();
testParseUfdataDocumentWithInputFiles();
testGenerateUfdataDocumentWithoutPitch();
