import { Encoding } from "../external/Encoding";

export function asByteTypedArray(value: string): number[] {
  return Array.from(value).map((character) => character.charCodeAt(0) & 0xff);
}

export function encode(value: string, encoding: string): number[] {
  return Encoding.convert(asByteTypedArray(value), encoding);
}

export function decode(bytes: number[], encoding: string): string {
  const convertedBytes = Encoding.convert(bytes, "UTF8", encoding);
  return String.fromCharCode(...convertedBytes);
}
