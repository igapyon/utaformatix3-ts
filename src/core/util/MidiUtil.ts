const STANDARD_TIME_DIVISION = 480;

export function convertInputTimeToStandardTime(inputTime: number, timeDivision: number): number {
  return Math.trunc((inputTime * STANDARD_TIME_DIVISION) / timeDivision);
}

export enum MidiEventType {
  NoteOff = 0x08,
  NoteOn = 0x09,
}

export function getStatusByte(type: MidiEventType, channel: number): number {
  return (type << 4) | channel;
}

export enum MidiMetaType {
  Text = 0x01,
  TrackName = 0x03,
  Lyric = 0x05,
  Tempo = 0x51,
  TimeSignature = 0x58,
  EndOfTrack = 0x2f,
}

export function getMetaEventHeaderBytes(type: MidiMetaType): number[] {
  return [0xff, type];
}

export function convertMidiTempoToBpm(midiTempo: number): number {
  return Math.trunc(((1000 * 1000 * 60) / midiTempo) * 100) / 100;
}

export function convertBpmToMidiTempo(bpm: number): number {
  return Math.trunc((1000 * 1000 * 60) / bpm);
}

export function generateMidiTimeSignatureBytes(numerator: number, denominator: number): number[] {
  return [numerator, Math.trunc(Math.log2(denominator)), 0x18, 0x08];
}

