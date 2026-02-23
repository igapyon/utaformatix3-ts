import { Format } from "../model/Format";
import { JapaneseLyricsType } from "../model/JapaneseLyricsType";
import type { ImportWarning } from "../model/ImportWarning";
import type { Note } from "../model/Note";
import type { Project } from "../model/Project";
import type { Tempo } from "../model/Tempo";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";

export const UTAFORMATIX_DATA_VERSION = 1;

interface UfDataNote {
  key: number;
  lyric: string;
  tickOn: number;
  tickOff: number;
  phoneme?: string | null;
}

interface UfDataPitch {
  ticks: number[];
  values: Array<number | null>;
  isAbsolute?: boolean;
}

interface UfDataTrack {
  name: string;
  notes: UfDataNote[];
  pitch?: UfDataPitch;
}

interface UfDataProject {
  name: string;
  tracks: UfDataTrack[];
  timeSignatures: TimeSignature[];
  tempos: Tempo[];
  measurePrefix: number;
}

interface UfDataDocument {
  formatVersion?: number;
  project: UfDataProject;
}

export type UfDataDiagnosticCode = "INVALID_JSON" | "MISSING_PROJECT";

export interface UfDataDiagnostic {
  code: UfDataDiagnosticCode;
  message: string;
  path: string;
}

function parseRawUfData(input: string | object): object {
  if (typeof input !== "string") return input;
  return JSON.parse(input) as object;
}

function asDocument(input: string | object): UfDataDocument {
  const raw = parseRawUfData(input);
  const document = raw as Partial<UfDataDocument>;
  if (!document.project) {
    throw new Error("Invalid UFDATA: missing project");
  }
  return document as UfDataDocument;
}

export function collectUfDataDiagnostics(input: string | object): UfDataDiagnostic[] {
  try {
    const raw = parseRawUfData(input);
    const document = raw as Partial<UfDataDocument>;
    if (!document.project) {
      return [{ code: "MISSING_PROJECT", message: "Invalid UFDATA: missing project", path: "$.project" }];
    }
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [{ code: "INVALID_JSON", message, path: "$" }];
  }
}

function parseTrack(index: number, track: UfDataTrack): Track {
  const notes: Note[] = track.notes.map((note, noteIndex) => ({
    id: noteIndex,
    key: note.key,
    lyric: note.lyric,
    tickOn: note.tickOn,
    tickOff: note.tickOff,
    phoneme: note.phoneme,
  }));
  return {
    id: index,
    name: track.name,
    notes,
    pitch: track.pitch
      ? {
          data: track.pitch.ticks.map((tick, i) => [tick, track.pitch?.values[i] ?? null]),
          isAbsolute: track.pitch.isAbsolute ?? false,
        }
      : null,
  };
}

export function parseUfdata(input: string | object): Project {
  const document = asDocument(input);
  const importWarnings: ImportWarning[] = [];
  const formatVersion = document.formatVersion ?? UTAFORMATIX_DATA_VERSION;
  if (formatVersion > UTAFORMATIX_DATA_VERSION) {
    importWarnings.push({
      kind: "IncompatibleFormatSerializationVersion",
      currentVersion: String(UTAFORMATIX_DATA_VERSION),
      dataVersion: String(formatVersion),
    });
  }
  return {
    format: Format.UfData,
    inputFiles: [],
    name: document.project.name,
    tracks: document.project.tracks.map((track, index) => parseTrack(index, track)),
    timeSignatures: document.project.timeSignatures,
    tempos: document.project.tempos,
    ppq: 480,
    measurePrefix: document.project.measurePrefix,
    importWarnings,
    japaneseLyricsType: JapaneseLyricsType.Unknown,
  };
}

function writeTrack(track: Track): UfDataTrack {
  return {
    name: track.name,
    notes: track.notes.map((note) => ({
      key: note.key,
      lyric: note.lyric,
      tickOn: note.tickOn,
      tickOff: note.tickOff,
      phoneme: note.phoneme,
    })),
    pitch: track.pitch
      ? {
          ticks: track.pitch.data.map((point) => point[0]),
          values: track.pitch.data.map((point) => point[1]),
          isAbsolute: track.pitch.isAbsolute,
        }
      : undefined,
  };
}

export interface WriteUfdataOptions {
  formatVersion?: number;
}

export function writeUfdata(project: Project, opts?: WriteUfdataOptions): string {
  const document: UfDataDocument = {
    formatVersion: opts?.formatVersion ?? UTAFORMATIX_DATA_VERSION,
    project: {
      name: project.name,
      tracks: project.tracks.map(writeTrack),
      timeSignatures: project.timeSignatures,
      tempos: project.tempos,
      measurePrefix: project.measurePrefix,
    },
  };
  return JSON.stringify(document);
}
