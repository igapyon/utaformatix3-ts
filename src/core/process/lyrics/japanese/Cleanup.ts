import { JapaneseLyricsType } from "../../../model/JapaneseLyricsType";
import type { Track } from "../../../model/Track";
import { isKana, isRomaji, romajis } from "./Words";

const romajiTails = ["a", "i", "u", "e", "o", "n", "-"];

function isRomajiTail(char: string): boolean {
  return romajiTails.includes(char);
}

export function cleanupJapaneseLyrics(tracks: Track[], type: JapaneseLyricsType): Track[] {
  switch (type) {
    case JapaneseLyricsType.Unknown:
      return tracks;
    case JapaneseLyricsType.RomajiCv:
      return cleanupTracksLyrics(tracks, (lyric) => cleanupAsRomajiCV(lyric));
    case JapaneseLyricsType.RomajiVcv:
      return cleanupTracksLyrics(tracks, (lyric) => cleanupAsRomajiVCV(lyric));
    case JapaneseLyricsType.KanaCv:
      return cleanupTracksLyrics(tracks, (lyric) => cleanupAsKanaCV(lyric));
    case JapaneseLyricsType.KanaVcv:
      return cleanupTracksLyrics(tracks, (lyric) => cleanupAsKanaVCV(lyric));
    default:
      return tracks;
  }
}

function cleanupAsRomajiCV(input: string): string {
  if (input.length === 0) {
    return input;
  }

  let result = input.toLowerCase();
  result = result.trim();
  result = result.replace(/^\?+/, "");

  const maxLength = Math.max(...romajis.map((it) => it.length), 0);
  for (let length = maxLength; length >= 1; length -= 1) {
    const text = result.slice(0, length);
    if (isRomaji(text)) {
      result = text;
    }
    break;
  }

  return result;
}

function cleanupAsRomajiVCV(input: string): string {
  if (input.length === 0) {
    return input;
  }

  let result = input.toLowerCase();
  result = result.trim();

  if (!result.includes(" ")) {
    return cleanupAsRomajiCV(result);
  }

  const blankPos = result.indexOf(" ");
  let body = "";

  const maxLength = Math.max(...romajis.map((it) => it.length), 0);
  for (let length = 1; length <= maxLength; length += 1) {
    const startPos = blankPos + 1;
    const endPos = startPos + length;
    if (result.length < endPos) {
      break;
    }
    const text = result.slice(startPos, endPos);
    if (isRomaji(text)) {
      body = text;
    }
    break;
  }

  const prefixChar = result[blankPos - 1];
  if (body.length > 0 && isRomajiTail(prefixChar)) {
    result = `${prefixChar} ${body}`;
  }

  return result;
}

function cleanupAsKanaCV(input: string): string {
  if (input.length === 0) {
    return input;
  }

  let result = input.trim();

  for (let index = 0; index < result.length; index += 1) {
    let text: string;
    if (index + 2 <= result.length) {
      text = result.slice(index, index + 2);
      if (!isKana(text)) {
        text = result.slice(index, index + 1);
      }
    } else {
      text = result.slice(index, index + 1);
    }
    if (isKana(text)) {
      result = text;
      break;
    }
  }

  return result;
}

function cleanupAsKanaVCV(input: string): string {
  if (input.length === 0) {
    return input;
  }

  let result = input.trim();

  if (!result.includes(" ")) {
    return cleanupAsKanaCV(result);
  }

  const blankPos = result.indexOf(" ");
  const startPos = blankPos + 1;
  let body: string;

  if (startPos + 2 <= result.length) {
    body = result.slice(startPos, startPos + 2);
    if (!isKana(body)) {
      body = result.slice(startPos, startPos + 1);
    }
  } else {
    body = result.slice(startPos, startPos + 1);
  }

  const prefixChar = result[blankPos - 1];
  if (isKana(body) && isRomajiTail(prefixChar)) {
    result = `${prefixChar} ${body}`;
  }

  return result;
}

function cleanupTracksLyrics(tracks: Track[], noteCleanup: (lyric: string) => string): Track[] {
  return tracks.map((track) => ({
    ...track,
    notes: track.notes.map((note) => ({
      ...note,
      lyric: noteCleanup(note.lyric),
    })),
  }));
}
