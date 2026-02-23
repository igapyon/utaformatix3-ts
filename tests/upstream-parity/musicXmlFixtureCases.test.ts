declare function require(name: string): any;

import { parseMusicXml, writeMusicXml } from "../../src/core/io/MusicXml";
import { parseUfdata, writeUfdata } from "../../src/core/io/UfData";
import { areCanonicalXmlEqual, canonicalizeXmlMinimal } from "../../src/core/util/XmlComparison";
import { diffSemanticProject, toSemanticProject } from "./layeredDiagnostics";

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

function getFixtureCaseNames(): string[] {
  const baseDir = "tests/fixtures/musicxml";
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry: { isDirectory: () => boolean; name: string }) => entry.isDirectory())
    .map((entry: { name: string }) => entry.name)
    .sort();
}

function testMusicXmlFixtures(): void {
  const caseNames = getFixtureCaseNames();
  assert(caseNames.length > 0, "no musicxml fixture cases found");

  for (const caseName of caseNames) {
    const dir = path.join("tests/fixtures/musicxml", caseName);
    const inputMusicXml = readText(path.join(dir, "input.musicxml"));
    const oracleUfDataText = readText(path.join(dir, "oracle.ufdata.json"));

    const parsed = parseMusicXml(inputMusicXml, { defaultLyric: "あ" });
    const parsedUfDataProject = canonicalize(
      toSemanticProject((JSON.parse(writeUfdata(parsed)) as Record<string, any>).project),
    ) as ReturnType<typeof toSemanticProject>;
    const oracleUfDataProject = canonicalize(
      toSemanticProject((JSON.parse(oracleUfDataText) as Record<string, any>).project),
    ) as ReturnType<typeof toSemanticProject>;
    const parseIssues = diffSemanticProject(oracleUfDataProject, parsedUfDataProject);
    assert(
      parseIssues.length === 0,
      `${caseName}: UFDATA semantic mismatch after parse\n${parseIssues.join("\n")}`,
    );

    const generated = writeMusicXml(parsed, { mode: "generate" });
    const reparsed = parseMusicXml(generated, { defaultLyric: "あ" });
    const reparsedUfDataProject = canonicalize(
      toSemanticProject((JSON.parse(writeUfdata(reparsed)) as Record<string, any>).project),
    ) as ReturnType<typeof toSemanticProject>;
    const generateIssues = diffSemanticProject(parsedUfDataProject, reparsedUfDataProject);
    assert(
      generateIssues.length === 0,
      `${caseName}: UFDATA semantic mismatch after generate round-trip\n${generateIssues.join("\n")}`,
    );
    const regenerated = writeMusicXml(reparsed, { mode: "generate" });
    assert(
      areCanonicalXmlEqual(generated, regenerated),
      [
        `${caseName}: XML canonicalized comparison mismatch after generate round-trip`,
        `XML/generated(canonical)=${canonicalizeXmlMinimal(generated).slice(0, 240)}`,
        `XML/regenerated(canonical)=${canonicalizeXmlMinimal(regenerated).slice(0, 240)}`,
      ].join("\n"),
    );

    const preservedNoOp = writeMusicXml(parsed, {
      mode: "preserve",
      originalText: inputMusicXml,
      noOp: true,
    });
    assert(preservedNoOp === inputMusicXml, `${caseName}: preserve no-op should be diff 0`);

    const reparsedFromUfData = parseUfdata(JSON.stringify({ formatVersion: 1, project: parsedUfDataProject }));
    assert(reparsedFromUfData.tracks.length === parsed.tracks.length, `${caseName}: ufdata reparse track mismatch`);
  }
}

testMusicXmlFixtures();
