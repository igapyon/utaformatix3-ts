import type { Format } from "./Format";
import type { ImportWarning } from "./ImportWarning";
import type { JapaneseLyricsType } from "./JapaneseLyricsType";
import type { Tempo } from "./Tempo";
import type { TimeSignature } from "./TimeSignature";
import type { Track } from "./Track";
import { assertProjectInvariants } from "./assertProjectInvariants";

export interface Project {
  format: Format;
  inputFiles: unknown[];
  name: string;
  tracks: Track[];
  timeSignatures: TimeSignature[];
  tempos: Tempo[];
  ppq: number;
  measurePrefix: number;
  importWarnings: ImportWarning[];
  japaneseLyricsType: JapaneseLyricsType;
  extras?: Record<string, unknown>;
}

export function hasXSampaData(project: Project): boolean {
  return project.tracks.some((track) =>
    track.notes.some((note) => note.phoneme !== undefined && note.phoneme !== null),
  );
}

export function requireValidProject(project: Project): Project {
  assertProjectInvariants(project);
  return project;
}
