import { areCanonicalXmlEqual } from "./XmlComparison";

export interface ArchiveEntries {
  [entryName: string]: string;
}

export interface ArchiveCompareOptions {
  canonicalizeXmlEntries?: boolean;
}

export interface ArchiveCompareResult {
  ok: boolean;
  missingEntries: string[];
  extraEntries: string[];
  mismatchedEntries: string[];
}

export function toArchiveEntries(input: string | ArchiveEntries): ArchiveEntries {
  if (typeof input === "string") {
    // Phase 3 MVP: treat plain VSQX XML as a single extracted entry.
    return { "sequence.vsqx": input };
  }
  return input;
}

function compareEntryContent(
  expected: string,
  actual: string,
  entryName: string,
  options: ArchiveCompareOptions,
): boolean {
  if (options.canonicalizeXmlEntries !== false && entryName.endsWith(".xml")) {
    return areCanonicalXmlEqual(expected, actual);
  }
  return expected === actual;
}

export function compareArchiveEntries(
  expectedInput: string | ArchiveEntries,
  actualInput: string | ArchiveEntries,
  options: ArchiveCompareOptions = {},
): ArchiveCompareResult {
  const expected = toArchiveEntries(expectedInput);
  const actual = toArchiveEntries(actualInput);
  const expectedNames = Object.keys(expected).sort();
  const actualNames = Object.keys(actual).sort();

  const missingEntries = expectedNames.filter((name) => !actualNames.includes(name));
  const extraEntries = actualNames.filter((name) => !expectedNames.includes(name));
  const shared = expectedNames.filter((name) => actualNames.includes(name));
  const mismatchedEntries = shared.filter(
    (name) => !compareEntryContent(expected[name], actual[name], name, options),
  );

  return {
    ok: missingEntries.length === 0 && extraEntries.length === 0 && mismatchedEntries.length === 0,
    missingEntries,
    extraEntries,
    mismatchedEntries,
  };
}
