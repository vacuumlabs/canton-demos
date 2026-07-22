import { describe, expect, it } from 'vitest';
import { isExpired } from './expiry';

describe('isExpired', () => {
  const deadline = '2026-07-17T12:00:00Z';
  const deadlineMs = Date.parse(deadline);

  it('is false before the deadline', () => {
    expect(isExpired(deadline, deadlineMs - 1000)).toBe(false);
  });
  it('is false exactly at the deadline (Accept still allowed)', () => {
    expect(isExpired(deadline, deadlineMs)).toBe(false);
  });
  it('is true after the deadline', () => {
    expect(isExpired(deadline, deadlineMs + 1000)).toBe(true);
  });
});
