import type { Project } from "../model/Project";
import { TickCounter } from "../model/TickCounter";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";

function lengthLimitedTrack(track: Track, maxLength: number): Track {
  const notes = track.notes
    .filter((note) => note.tickOff <= maxLength)
    .map((note, index) => ({ ...note, id: index }));
  const pitch = track.pitch
    ? {
        ...track.pitch,
        data: track.pitch.data.filter(([tick]) => tick <= maxLength),
      }
    : track.pitch;
  return {
    ...track,
    notes,
    pitch,
  };
}

export function lengthLimited(project: Project, maxLength: number): Project {
  const tracks = project.tracks.map((track) => lengthLimitedTrack(track, maxLength));
  const tickCounter = new TickCounter();
  const timeSignatures: TimeSignature[] = [];
  project.timeSignatures.forEach((timeSignature) => {
    tickCounter.goToTimeSignatureMeasure(timeSignature);
    if (tickCounter.tick <= maxLength) {
      timeSignatures.push(timeSignature);
    }
  });
  const tempos = project.tempos.filter((tempo) => tempo.tickPosition <= maxLength);
  return {
    ...project,
    tracks,
    timeSignatures,
    tempos,
  };
}

