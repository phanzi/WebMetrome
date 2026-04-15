export type Result<S = unknown, E extends string = string> =
  | {
      success: true;
      data: S;
    }
  | {
      success: false;
      code: E;
      message: string;
    };

export function Ok<const S>(data: S) {
  return {
    success: true,
    data: data,
  } satisfies Result<S, never>;
}

export function Fail<const E extends string>(code: E, message?: string) {
  return {
    success: false,
    code,
    message: message ?? "No message",
  } satisfies Result<never, E>;
}

export async function safeTryAsync<T>(fn: () => Promise<T>) {
  try {
    return Ok(await fn());
  } catch (error) {
    if (error instanceof Error) {
      return Fail("UNEXPECTED", error.message);
    }
    return Fail("UNEXPECTED", "Unexpected error");
  }
}
