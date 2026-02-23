import type { Note } from "../../model/Note";
import type { Project } from "../../model/Project";
import type { Track } from "../../model/Track";
import { validateNotes } from "../NoteShaping";

export class PhonemesMappingRequest {
  public constructor(public readonly mapText: string = "") {}

  public get isValid(): boolean {
    return this.map.length > 0;
  }

  public get map(): Array<[string, string]> {
    return this.mapText
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.includes("="))
      .map((line) => {
        const from = line.substring(0, line.indexOf("=")).trim();
        const to = line.substring(line.indexOf("=") + 1).trim();
        return [from, to] as [string, string];
      })
      .sort((a, b) => {
        const countA = a[0].split(" ").length;
        const countB = b[0].split(" ").length;
        if (countA !== countB) {
          return countB - countA;
        }
        return b[0].length - a[0].length;
      });
  }
}

export function getDefaultPhonemesMappingRequest(): PhonemesMappingRequest {
  return new PhonemesMappingRequest("");
}

export function mapPhonemesInProject(project: Project, request: PhonemesMappingRequest | null): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => replacePhonemesInTrack(track, request)),
  };
}

export function replacePhonemesInTrack(track: Track, request: PhonemesMappingRequest | null): Track {
  return {
    ...track,
    notes: validateNotes(track.notes.map((note) => replacePhonemesInNote(note, request))),
  };
}

export function replacePhonemesInNote(note: Note, request: PhonemesMappingRequest | null): Note {
  if (request == null) {
    return {
      ...note,
      phoneme: null,
    };
  }

  if (note.phoneme == null) {
    return note;
  }

  const rawInput = note.phoneme.split(" ");
  const input: Array<[string, boolean]> = rawInput.map((it) => [it, true]);
  let output: Array<[string, number]> = [];

  for (const [key, value] of request.map) {
    const keySplit = key.split(" ");
    for (let i = 0; i <= input.length - keySplit.length; i += 1) {
      const subList = input.slice(i, i + keySplit.length);
      const keysMatched = subList.map((it) => it[0]).join("\u0000") === keySplit.join("\u0000");
      const allAvailable = subList.every((it) => it[1]);
      if (!keysMatched || !allAvailable) {
        continue;
      }
      output.push([value, i]);
      for (let j = 0; j < keySplit.length; j += 1) {
        input[i + j] = [input[i + j][0], false];
      }
    }
  }

  output = output.concat(
    input
      .map((pair, index) => ({ pair, index }))
      .filter(({ pair }) => pair[1])
      .map(({ pair, index }) => [pair[0], index]),
  );
  output = output
    .filter(([text]) => text.trim().length > 0)
    .sort((a, b) => a[1] - b[1]);

  return {
    ...note,
    phoneme: output.map(([text]) => text).join(" "),
  };
}
