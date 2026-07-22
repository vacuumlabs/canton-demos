/**
 * True once wall-clock `now` (ms since epoch) has passed the proposal's ISO-8601
 * deadline. Uses strict `>` to mirror the ledger: Accept is allowed while
 * `now <= expiresAt`, so a proposal is "expired" only once `now > expiresAt`.
 */
export const isExpired = (expiresAt: string, now: number): boolean =>
  now > Date.parse(expiresAt);

/** Human-readable local rendering of an ISO-8601 deadline. */
export const formatDeadline = (expiresAt: string): string =>
  new Date(expiresAt).toLocaleString();
