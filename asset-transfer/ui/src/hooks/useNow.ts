import { useEffect, useState } from 'react';

/** Current wall-clock time in ms, re-rendering every `intervalMs` so that
 *  time-derived UI (e.g. Active/Expired badges) updates on its own. */
export const useNow = (intervalMs = 1000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
