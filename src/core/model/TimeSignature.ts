import {
  DEFAULT_METER_HIGH,
  DEFAULT_METER_LOW,
  TICKS_IN_FULL_NOTE,
} from "./Constants";

export interface TimeSignature {
  measurePosition: number;
  numerator: number;
  denominator: number;
  extras?: Record<string, unknown>;
}

export function getTimeSignatureDisplayValue(timeSignature: TimeSignature): string {
  return `${timeSignature.numerator}/${timeSignature.denominator}`;
}

export function getTicksInMeasure(timeSignature: TimeSignature): number {
  return (TICKS_IN_FULL_NOTE * timeSignature.numerator) / timeSignature.denominator;
}

export function getDefaultTimeSignature(): TimeSignature {
  return {
    measurePosition: 0,
    numerator: DEFAULT_METER_HIGH,
    denominator: DEFAULT_METER_LOW,
  };
}
