/**
 * Domain failures. Every fallible domain/application operation returns
 * `Result<T, Failure>` (neverthrow) instead of throwing, so error paths are
 * explicit and exhaustively handled at the edges.
 */

export type Failure =
  | { _tag: 'NotFound'; message: string }
  | { _tag: 'Conflict'; message: string }
  | { _tag: 'Validation'; message: string; field?: string }
  | { _tag: 'Network'; message: string }
  | { _tag: 'Database'; message: string }
  | { _tag: 'Unauthorized'; message: string };

export type FailureTag = Failure['_tag'];

export const notFound = (message: string): Failure => ({ _tag: 'NotFound', message });
export const conflict = (message: string): Failure => ({ _tag: 'Conflict', message });
export const validation = (message: string, field?: string): Failure => ({
  _tag: 'Validation',
  message,
  field,
});
export const networkFail = (message: string): Failure => ({ _tag: 'Network', message });
export const dbFail = (message: string): Failure => ({ _tag: 'Database', message });
export const unauthorized = (message: string): Failure => ({ _tag: 'Unauthorized', message });

/** Maps a domain failure to an HTTP status code for the presentation layer. */
export function failureToStatusCode(failure: Failure): number {
  switch (failure._tag) {
    case 'Validation':
      return 422;
    case 'Unauthorized':
      return 401;
    case 'NotFound':
      return 404;
    case 'Conflict':
      return 409;
    case 'Network':
      return 502;
    case 'Database':
      return 500;
    default: {
      const _exhaustive: never = failure;
      void _exhaustive;
      return 500;
    }
  }
}
