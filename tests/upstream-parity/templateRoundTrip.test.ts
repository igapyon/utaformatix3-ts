declare function require(name: string): any;

import { parseMusicXml, writeMusicXml } from "../../src/core/io/MusicXml";
import { parseUfdata, writeUfdata } from "../../src/core/io/UfData";
import { parseVsqx, writeVsqx } from "../../src/core/io/Vsqx";
import { compareArchiveEntries } from "../../src/core/util/VsqxArchiveComparison";

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
      .map(([key, child]) => [key, canonicalize(child)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function readText(path: string): string {
  return fs.readFileSync(path, "utf8");
}

function assertSemanticRoundTripEqual(leftProject: unknown, rightProject: unknown, context: string): void {
  const left = canonicalize((JSON.parse(writeUfdata(leftProject as any)) as Record<string, any>).project);
  const right = canonicalize((JSON.parse(writeUfdata(rightProject as any)) as Record<string, any>).project);
  assert(JSON.stringify(left) === JSON.stringify(right), `${context}: semantic mismatch`);
}

function testUfDataFixtureRoundTrip(): void {
  const source = readText("tests/fixtures/ufdata/ufdata_minimal_01/oracle.ufdata.json");
  const parsed = parseUfdata(source);
  const written = writeUfdata(parsed, { formatVersion: 1 });
  const reparsed = parseUfdata(written);

  assertSemanticRoundTripEqual(parsed, reparsed, "UFDATA fixture round-trip");
}

function testVsqxTemplateRoundTrip(): void {
  const source = readText("upstream/utaformatix/core/src/main/resources/format_templates/template.vsqx");
  const parsed = parseVsqx(source, { defaultLyric: "あ" });
  const generated = writeVsqx(parsed);
  const reparsed = parseVsqx(generated.content, { defaultLyric: "あ" });
  const regenerated = writeVsqx(reparsed);

  const archiveCompareResult = compareArchiveEntries(generated.content, regenerated.content, {
    canonicalizeXmlEntries: true,
  });
  assert(archiveCompareResult.ok, "VSQX template round-trip: archive/xml mismatch");

  assertSemanticRoundTripEqual(parsed, reparsed, "VSQX template round-trip");
}

function testMusicXmlTemplateRoundTrip(): void {
  const source = readText("upstream/utaformatix/core/src/main/resources/format_templates/template.musicxml");
  const parsed = parseMusicXml(source, { defaultLyric: "あ" });
  const generated = writeMusicXml(parsed, { mode: "generate" });
  const reparsed = parseMusicXml(generated, { defaultLyric: "あ" });

  assertSemanticRoundTripEqual(parsed, reparsed, "MusicXML template round-trip");
}

testUfDataFixtureRoundTrip();
testVsqxTemplateRoundTrip();
testMusicXmlTemplateRoundTrip();
