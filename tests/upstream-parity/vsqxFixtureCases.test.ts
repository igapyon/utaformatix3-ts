declare function require(name: string): any;

import { parseUfdata, writeUfdata } from "../../src/core/io/UfData";
import { parseVsqx, writeVsqx } from "../../src/core/io/Vsqx";
import { compareArchiveEntries } from "../../src/core/util/VsqxArchiveComparison";

const fs = require("node:fs");
const path = require("node:path");

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalize(child)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function toSemanticProject(project: Record<string, any>): Record<string, any> {
  return {
    tracks: (project.tracks ?? []).map((track: Record<string, any>) => ({
      name: track.name,
      notes: (track.notes ?? []).map((note: Record<string, any>) => ({
        key: note.key,
        lyric: note.lyric,
        tickOn: note.tickOn,
        tickOff: note.tickOff,
        phoneme: note.phoneme,
      })),
    })),
    tempos: project.tempos ?? [],
    timeSignatures: project.timeSignatures ?? [],
  };
}

function getFixtureCaseNames(): string[] {
  const baseDir = "tests/fixtures/vsqx";
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry: { isDirectory: () => boolean; name: string }) => entry.isDirectory())
    .map((entry: { name: string }) => entry.name)
    .sort();
}

function testVsqxFixtures(): void {
  const caseNames = getFixtureCaseNames();
  assert(caseNames.length > 0, "no vsqx fixture cases found");

  for (const caseName of caseNames) {
    const dir = path.join("tests/fixtures/vsqx", caseName);
    const inputVsqx = readText(path.join(dir, "input.vsqx"));
    const oracleUfDataText = readText(path.join(dir, "oracle.ufdata.json"));

    const parsed = parseVsqx(inputVsqx, { defaultLyric: "あ" });
    const parsedUfDataProject = canonicalize(
      toSemanticProject((JSON.parse(writeUfdata(parsed)) as Record<string, any>).project),
    );
    const oracleUfDataProject = canonicalize(toSemanticProject((JSON.parse(oracleUfDataText) as Record<string, any>).project));

    assert(
      JSON.stringify(parsedUfDataProject) === JSON.stringify(oracleUfDataProject),
      `${caseName}: parsed project does not match oracle.ufdata`,
    );

    const generated = writeVsqx(parsed);
    const reparsed = parseVsqx(generated.content, { defaultLyric: "あ" });
    const regenerated = writeVsqx(reparsed);

    const archiveCompareResult = compareArchiveEntries(generated.content, regenerated.content, {
      canonicalizeXmlEntries: true,
    });
    assert(archiveCompareResult.ok, `${caseName}: round-trip archive/xml compare failed`);

    const reparsedUfDataProject = canonicalize(
      toSemanticProject((JSON.parse(writeUfdata(reparsed)) as Record<string, any>).project),
    );
    assert(
      JSON.stringify(parsedUfDataProject) === JSON.stringify(reparsedUfDataProject),
      `${caseName}: parsed and reparsed semantic mismatch`,
    );

    // Keep UFDATA parse path in the same fixture flow.
    const reparsedFromUfData = parseUfdata(JSON.stringify({ formatVersion: 1, project: parsedUfDataProject }));
    assert(reparsedFromUfData.tracks.length === parsed.tracks.length, `${caseName}: ufdata reparse track mismatch`);
  }
}

testVsqxFixtures();
