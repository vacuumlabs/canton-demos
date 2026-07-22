import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from './useNow';

describe('useNow', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the current time and advances after each tick', () => {
    vi.useFakeTimers();
    const start = 1_000_000;
    vi.setSystemTime(start);

    const { result } = renderHook(() => useNow(1000));
    expect(result.current).toBe(start);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(start + 1000);
  });
});
