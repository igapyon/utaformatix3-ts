export function toFixed(value: number, count: number): string {
  return value.toFixed(count);
}

export function padStartZero(value: number, length: number): string {
  return value.toString().padStart(length, "0");
}

export function linesNotBlank(value: string): string[] {
  return value
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
}

export function splitFirst(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator);
  if (index < 0) return [value, ""];
  return [value.slice(0, index), value.slice(index + separator.length)];
}
