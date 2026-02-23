import {
  MidiEventType,
  MidiMetaType,
  convertBpmToMidiTempo,
  convertInputTimeToStandardTime,
  convertMidiTempoToBpm,
  generateMidiTimeSignatureBytes,
  getMetaEventHeaderBytes,
  getStatusByte,
} from "../../src/core/util/MidiUtil";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(expected: T, actual: T, message: string): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

function testMidiUtil(): void {
  assert(convertInputTimeToStandardTime(240, 240) === 480, "convertInputTimeToStandardTime mismatch");
  assert(getStatusByte(MidiEventType.NoteOn, 1) === 0x91, "status byte mismatch");
  assertEquals([0xff, 0x58], getMetaEventHeaderBytes(MidiMetaType.TimeSignature), "meta bytes mismatch");
  assert(convertMidiTempoToBpm(500000) === 120, "convertMidiTempoToBpm mismatch");
  assert(convertBpmToMidiTempo(120) === 500000, "convertBpmToMidiTempo mismatch");
  assertEquals([4, 2, 0x18, 0x08], generateMidiTimeSignatureBytes(4, 4), "time signature bytes mismatch");
}

testMidiUtil();

