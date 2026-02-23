export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

function isCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "CancellationError" || error.name === "AbortError";
}

export function runCatchingCancellable<T, R>(value: T, block: (value: T) => R): Result<R> {
  try {
    return { ok: true, value: block(value) };
  } catch (error) {
    if (isCancellationError(error)) {
      throw error;
    }
    return { ok: false, error };
  }
}
