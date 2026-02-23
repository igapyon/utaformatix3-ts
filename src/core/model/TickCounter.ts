import {
  DEFAULT_METER_HIGH,
  DEFAULT_METER_LOW,
  TICKS_IN_FULL_NOTE,
} from "./Constants";
import type { TimeSignature } from "./TimeSignature";

export class TickCounter {
  private readonly tickRate: number;
  private readonly ticksInFullNote: number;
  private _tick = 0;
  private _measure = 0;
  private _numerator = DEFAULT_METER_HIGH;
  private _denominator = DEFAULT_METER_LOW;

  public constructor(tickRate = 1.0, ticksInFullNote = TICKS_IN_FULL_NOTE) {
    this.tickRate = tickRate;
    this.ticksInFullNote = ticksInFullNote;
  }

  public get tick(): number {
    return this._tick;
  }

  public get outputTick(): number {
    return Math.trunc(this._tick * this.tickRate);
  }

  public get measure(): number {
    return this._measure;
  }

  public get numerator(): number {
    return this._numerator;
  }

  public get denominator(): number {
    return this._denominator;
  }

  public get ticksInMeasure(): number {
    return (this.ticksInFullNote * this._numerator) / this._denominator;
  }

  public goToTick(newTick: number, newNumerator?: number, newDenominator?: number): void {
    const normalizedNewTick = newTick / this.tickRate;
    const tickDiff = normalizedNewTick - this._tick;
    const measureDiff = tickDiff / this.ticksInMeasure;
    this._measure += Math.trunc(measureDiff);
    this._tick = Math.trunc(normalizedNewTick);
    this._numerator = newNumerator ?? this._numerator;
    this._denominator = newDenominator ?? this._denominator;
  }

  public goToTimeSignatureMeasure(timeSignature: TimeSignature): void {
    this.goToMeasure(
      timeSignature.measurePosition,
      timeSignature.numerator,
      timeSignature.denominator,
    );
  }

  public goToMeasure(newMeasure: number, newNumerator?: number, newDenominator?: number): void {
    const measureDiff = newMeasure - this._measure;
    const tickDiff = measureDiff * this.ticksInMeasure;
    this._tick += tickDiff;
    this._measure = newMeasure;
    if (newNumerator != null) this._numerator = newNumerator;
    if (newDenominator != null) this._denominator = newDenominator;
  }
}
