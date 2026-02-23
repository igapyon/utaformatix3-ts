import { Format } from "../model/Format";
import { JapaneseLyricsType } from "../model/JapaneseLyricsType";
import type { Note } from "../model/Note";
import type { Project } from "../model/Project";
import type { Tempo } from "../model/Tempo";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";

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

function asDocument(input: string | object): UfDataDocument {
  const raw = typeof input === "string" ? (JSON.parse(input) as object) : input;
  const document = raw as Partial<UfDataDocument>;
  if (!document.project) {
    throw new Error("Invalid UFDATA: missing project");
  }
  return document as UfDataDocument;
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
  return {
    format: Format.UfData,
    inputFiles: [],
    name: document.project.name,
    tracks: document.project.tracks.map((track, index) => parseTrack(index, track)),
    timeSignatures: document.project.timeSignatures,
    tempos: document.project.tempos,
    ppq: 480,
    measurePrefix: document.project.measurePrefix,
    importWarnings: [],
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
    formatVersion: opts?.formatVersion,
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
