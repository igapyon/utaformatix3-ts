import type { Project } from "../../../model/Project";

export function convertChineseLyricsToPinyin(project: Project, dictionaryText = ""): Project {
  const dictionary = parseDictionary(dictionaryText);
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      notes: track.notes.map((note) => ({
        ...note,
        lyric: dictionary.get(note.lyric) ?? note.lyric,
      })),
    })),
  };
}

function parseDictionary(text: string): Map<string, string> {
  return new Map(
    text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(","))
      .filter((parts) => parts.length >= 2)
      .map((parts) => [parts[0], parts[1]] as [string, string]),
  );
}
