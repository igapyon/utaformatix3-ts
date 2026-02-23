import { Format } from "../model/Format";
import { JapaneseLyricsType } from "../model/JapaneseLyricsType";
import type { ImportWarning } from "../model/ImportWarning";
import type { Note } from "../model/Note";
import type { Project } from "../model/Project";
import type { Tempo } from "../model/Tempo";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";
import { validateTrackNotes } from "../process/NoteShaping";

export const UTAFORMATIX_DATA_VERSION = 1;

export interface UfDataNote {
  key: number;
  lyric: string;
  tickOn: number;
  tickOff: number;
  phoneme?: string | null;
}

export interface UfDataPitch {
  ticks: number[];
  values: Array<number | null>;
  isAbsolute?: boolean;
}

export interface UfDataTrack {
  name: string;
  notes: UfDataNote[];
  pitch?: UfDataPitch;
}

export interface UfDataProject {
  name: string;
  tracks: UfDataTrack[];
  timeSignatures: TimeSignature[];
  tempos: Tempo[];
  measurePrefix: number;
}

export interface UfDataDocument {
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

function normalizePitch(pitch: UfDataPitch | undefined): UfDataPitch {
  return {
    ticks: pitch?.ticks ?? [],
    values: pitch?.values ?? [],
    isAbsolute: pitch?.isAbsolute ?? false,
  };
}

function normalizeDocument(document: UfDataDocument): UfDataDocument {
  const project = document.project as Partial<UfDataProject>;
  return {
    formatVersion: document.formatVersion,
    project: {
      name: project.name ?? "",
      tracks: (project.tracks ?? []).map((track) => ({
        name: track.name ?? "",
        notes: track.notes ?? [],
        pitch: normalizePitch(track.pitch),
      })),
      timeSignatures: project.timeSignatures ?? [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: project.tempos ?? [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: project.measurePrefix ?? 0,
    },
  };
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

function parseTrack(index: number, track: UfDataTrack, simpleImport: boolean): Track {
  const notes: Note[] = track.notes.map((note, noteIndex) => ({
    id: noteIndex,
    key: note.key,
    lyric: note.lyric,
    tickOn: note.tickOn,
    tickOff: note.tickOff,
    phoneme: note.phoneme,
  }));
  const parsedTrack: Track = {
    id: index,
    name: track.name,
    notes,
    pitch: simpleImport
      ? null
      : track.pitch
      ? {
          data: track.pitch.ticks.map((tick, i) => [tick, track.pitch?.values[i] ?? null]),
          isAbsolute: track.pitch.isAbsolute ?? false,
        }
      : null,
  };
  return validateTrackNotes(parsedTrack);
}

export interface ParseUfdataOptions {
  simpleImport?: boolean;
  inputFiles?: unknown[];
}

export function parseUfdataDocument(document: UfDataDocument, options?: ParseUfdataOptions): Project {
  const normalizedDocument = normalizeDocument(document);
  const importWarnings: ImportWarning[] = [];
  const formatVersion = normalizedDocument.formatVersion ?? UTAFORMATIX_DATA_VERSION;
  if (formatVersion > UTAFORMATIX_DATA_VERSION) {
    importWarnings.push({
      kind: "IncompatibleFormatSerializationVersion",
      currentVersion: String(UTAFORMATIX_DATA_VERSION),
      dataVersion: String(formatVersion),
    });
  }
  return {
    format: Format.UfData,
    inputFiles: options?.inputFiles ?? [],
    name: normalizedDocument.project.name,
    tracks: normalizedDocument.project.tracks.map((track, index) =>
      parseTrack(index, track, options?.simpleImport ?? false)
    ),
    timeSignatures: normalizedDocument.project.timeSignatures,
    tempos: normalizedDocument.project.tempos,
    ppq: 480,
    measurePrefix: normalizedDocument.project.measurePrefix,
    importWarnings,
    japaneseLyricsType: JapaneseLyricsType.Unknown,
  };
}

export function parseUfdata(input: string | object, options?: ParseUfdataOptions): Project {
  const document = asDocument(input);
  return parseUfdataDocument(document, options);
}

function writeTrack(track: Track, includePitch: boolean): UfDataTrack {
  return {
    name: track.name,
    notes: track.notes.map((note) => ({
      key: note.key,
      lyric: note.lyric,
      tickOn: note.tickOn,
      tickOff: note.tickOff,
      phoneme: note.phoneme,
    })),
    pitch:
      includePitch && track.pitch
        ? {
            ticks: track.pitch.data.map((point) => point[0]),
            values: track.pitch.data.map((point) => point[1]),
            isAbsolute: track.pitch.isAbsolute,
          }
        : {
            ticks: [],
            values: [],
            isAbsolute: false,
          },
  };
}

export interface WriteUfdataOptions {
  formatVersion?: number;
  includePitch?: boolean;
}

export function generateUfdataDocument(project: Project, opts?: WriteUfdataOptions): UfDataDocument {
  const includePitch = opts?.includePitch ?? true;
  return {
    formatVersion: opts?.formatVersion ?? UTAFORMATIX_DATA_VERSION,
    project: {
      name: project.name,
      tracks: project.tracks.map((track) => writeTrack(track, includePitch)),
      timeSignatures: project.timeSignatures,
      tempos: project.tempos,
      measurePrefix: project.measurePrefix,
    },
  };
}

export function writeUfdata(project: Project, opts?: WriteUfdataOptions): string {
  const document = generateUfdataDocument(project, opts);
  return JSON.stringify(document);
}
