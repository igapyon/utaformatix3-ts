import type { ArchiveCompareResult } from "../../src/core/util/VsqxArchiveComparison";

export interface SemanticNote {
  key: number;
  lyric: string;
  tickOn: number;
  tickOff: number;
  phoneme?: string;
}

export interface SemanticTrack {
  name: string;
  notes: SemanticNote[];
}

export interface SemanticProject {
  tracks: SemanticTrack[];
  tempos: Array<{ tickPosition: number; bpm: number }>;
  timeSignatures: Array<{ measurePosition: number; numerator: number; denominator: number }>;
}

export function toSemanticProject(project: Record<string, any>, includePhoneme = false): SemanticProject {
  return {
    tracks: (project.tracks ?? []).map((track: Record<string, any>) => ({
      name: track.name ?? "",
      notes: (track.notes ?? []).map((note: Record<string, any>) => ({
        key: Number(note.key ?? 0),
        lyric: String(note.lyric ?? ""),
        tickOn: Number(note.tickOn ?? 0),
        tickOff: Number(note.tickOff ?? 0),
        ...(includePhoneme ? { phoneme: note.phoneme == null ? undefined : String(note.phoneme) } : {}),
      })),
    })),
    tempos: (project.tempos ?? []).map((tempo: Record<string, any>) => ({
      tickPosition: Number(tempo.tickPosition ?? 0),
      bpm: Number(tempo.bpm ?? 0),
    })),
    timeSignatures: (project.timeSignatures ?? []).map((timeSignature: Record<string, any>) => ({
      measurePosition: Number(timeSignature.measurePosition ?? 0),
      numerator: Number(timeSignature.numerator ?? 0),
      denominator: Number(timeSignature.denominator ?? 0),
    })),
  };
}

function asJson(value: unknown): string {
  return JSON.stringify(value);
}

export function diffSemanticProject(expected: SemanticProject, actual: SemanticProject): string[] {
  const issues: string[] = [];

  if (expected.tracks.length !== actual.tracks.length) {
    issues.push(`UFDATA/tracks: track count expected=${expected.tracks.length} actual=${actual.tracks.length}`);
  }
  const trackCount = Math.min(expected.tracks.length, actual.tracks.length);
  for (let i = 0; i < trackCount; i += 1) {
    const eTrack = expected.tracks[i];
    const aTrack = actual.tracks[i];
    if (eTrack.name !== aTrack.name) {
      issues.push(`UFDATA/tracks[${i}].name: expected=${asJson(eTrack.name)} actual=${asJson(aTrack.name)}`);
    }
    if (eTrack.notes.length !== aTrack.notes.length) {
      issues.push(
        `UFDATA/tracks[${i}].notes: note count expected=${eTrack.notes.length} actual=${aTrack.notes.length}`,
      );
    }
    const noteCount = Math.min(eTrack.notes.length, aTrack.notes.length);
    for (let n = 0; n < noteCount; n += 1) {
      const eNote = eTrack.notes[n];
      const aNote = aTrack.notes[n];
      if (eNote.key !== aNote.key) {
        issues.push(`UFDATA/tracks[${i}].notes[${n}].key: expected=${eNote.key} actual=${aNote.key}`);
      }
      if (eNote.lyric !== aNote.lyric) {
        issues.push(
          `UFDATA/tracks[${i}].notes[${n}].lyric: expected=${asJson(eNote.lyric)} actual=${asJson(aNote.lyric)}`,
        );
      }
      if (eNote.tickOn !== aNote.tickOn) {
        issues.push(`UFDATA/tracks[${i}].notes[${n}].tickOn: expected=${eNote.tickOn} actual=${aNote.tickOn}`);
      }
      if (eNote.tickOff !== aNote.tickOff) {
        issues.push(`UFDATA/tracks[${i}].notes[${n}].tickOff: expected=${eNote.tickOff} actual=${aNote.tickOff}`);
      }
      if (Object.prototype.hasOwnProperty.call(eNote, "phoneme") || Object.prototype.hasOwnProperty.call(aNote, "phoneme")) {
        if (eNote.phoneme !== aNote.phoneme) {
          issues.push(
            `UFDATA/tracks[${i}].notes[${n}].phoneme: expected=${asJson(eNote.phoneme)} actual=${asJson(aNote.phoneme)}`,
          );
        }
      }
    }
  }

  if (expected.tempos.length !== actual.tempos.length) {
    issues.push(`UFDATA/tempos: tempo count expected=${expected.tempos.length} actual=${actual.tempos.length}`);
  }
  const tempoCount = Math.min(expected.tempos.length, actual.tempos.length);
  for (let i = 0; i < tempoCount; i += 1) {
    const eTempo = expected.tempos[i];
    const aTempo = actual.tempos[i];
    if (eTempo.tickPosition !== aTempo.tickPosition || eTempo.bpm !== aTempo.bpm) {
      issues.push(
        `UFDATA/tempos[${i}]: expected=${asJson(eTempo)} actual=${asJson(aTempo)}`,
      );
    }
  }

  if (expected.timeSignatures.length !== actual.timeSignatures.length) {
    issues.push(
      `UFDATA/timeSignatures: count expected=${expected.timeSignatures.length} actual=${actual.timeSignatures.length}`,
    );
  }
  const timeSigCount = Math.min(expected.timeSignatures.length, actual.timeSignatures.length);
  for (let i = 0; i < timeSigCount; i += 1) {
    const eTimeSignature = expected.timeSignatures[i];
    const aTimeSignature = actual.timeSignatures[i];
    if (
      eTimeSignature.measurePosition !== aTimeSignature.measurePosition ||
      eTimeSignature.numerator !== aTimeSignature.numerator ||
      eTimeSignature.denominator !== aTimeSignature.denominator
    ) {
      issues.push(
        `UFDATA/timeSignatures[${i}]: expected=${asJson(eTimeSignature)} actual=${asJson(aTimeSignature)}`,
      );
    }
  }

  return issues;
}

export function describeArchiveCompare(result: ArchiveCompareResult): string {
  const lines = ["VSQX/archive+xml: mismatch"];
  if (result.missingEntries.length > 0) {
    lines.push(`  missingEntries=${result.missingEntries.join(",")}`);
  }
  if (result.extraEntries.length > 0) {
    lines.push(`  extraEntries=${result.extraEntries.join(",")}`);
  }
  if (result.mismatchedEntries.length > 0) {
    lines.push(`  mismatchedEntries=${result.mismatchedEntries.join(",")}`);
  }
  return lines.join("\n");
}
