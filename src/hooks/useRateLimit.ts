import { useState, useCallback, useRef } from "react";

interface RateLimitOptions {
  /** Maximum number of actions allowed within the time window */
  maxAttempts: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional callback when rate limit is exceeded */
  onRateLimitExceeded?: () => void;
}

interface RateLimitResult {
  /** Whether the action is currently allowed */
  isAllowed: boolean;
  /** Number of remaining attempts */
  remainingAttempts: number;
  /** Execute an action with rate limiting */
  executeWithLimit: <T>(action: () => Promise<T> | T) => Promise<T | null>;
  /** Reset the rate limiter */
  reset: () => void;
  /** Time until the rate limit resets (in ms) */
  timeUntilReset: number;
}

/**
 * Custom hook for rate limiting actions (e.g., form submissions, API calls)
 * Helps prevent abuse and protects against brute-force attacks
 */
export function useRateLimit(options: RateLimitOptions): RateLimitResult {
  const { maxAttempts, windowMs, onRateLimitExceeded } = options;
  
  const [attempts, setAttempts] = useState<number[]>([]);
  const windowStartRef = useRef<number>(Date.now());

  const getActiveAttempts = useCallback(() => {
    const cutoff = Date.now() - windowMs;
    return attempts.filter((timestamp) => timestamp > cutoff);
  }, [attempts, windowMs]);

  const activeAttempts = getActiveAttempts();
  const isAllowed = activeAttempts.length < maxAttempts;
  const remainingAttempts = Math.max(0, maxAttempts - activeAttempts.length);
  const timeUntilReset =
    activeAttempts.length === 0
      ? 0
      : Math.max(0, Math.min(...activeAttempts) + windowMs - Date.now());

  const executeWithLimit = useCallback(
    async <T>(action: () => Promise<T> | T): Promise<T | null> => {
      const now = Date.now();
      const cutoff = now - windowMs;
      const current = attempts.filter((t) => t > cutoff);

      if (current.length >= maxAttempts) {
        onRateLimitExceeded?.();
        return null;
      }

      setAttempts([...current, now]);

      return await action();
    },
    [attempts, maxAttempts, windowMs, onRateLimitExceeded]
  );

  const reset = useCallback(() => {
    setAttempts([]);
    windowStartRef.current = Date.now();
  }, []);

  return {
    isAllowed,
    remainingAttempts,
    executeWithLimit,
    reset,
    timeUntilReset,
  };
}

