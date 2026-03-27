import { normalizeEmail } from "@/lib/auth/email";

const MAX_FAILURES_PER_WINDOW = 5;
const FAILURE_WINDOW_SECONDS = 15 * 60;
const FAILURE_THROTTLE_SECONDS = 3;
const LOCKOUT_SECONDS = 15 * 60;
const STALE_STATE_RETENTION_SECONDS = 60 * 60;

type VerificationThrottleState = {
  failureCount: number;
  windowStartedAt: number;
  nextAllowedAt: number | null;
  blockedUntil: number | null;
  lastTouchedAt: number;
};

type ThrottleResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      retryAfterSeconds: number;
    };

const verificationThrottleStates = new Map<string, VerificationThrottleState>();

let operationCount = 0;

function secondsUntil(targetTime: number, now: number) {
  return Math.max(1, Math.ceil((targetTime - now) / 1000));
}

function getState(key: string, now: number) {
  const existingState = verificationThrottleStates.get(key);
  if (existingState) {
    existingState.lastTouchedAt = now;
    return existingState;
  }

  const newState: VerificationThrottleState = {
    failureCount: 0,
    windowStartedAt: now,
    nextAllowedAt: null,
    blockedUntil: null,
    lastTouchedAt: now,
  };

  verificationThrottleStates.set(key, newState);
  return newState;
}

function pruneStaleStates(now: number) {
  operationCount += 1;
  if (operationCount % 25 !== 0) {
    return;
  }

  for (const [key, state] of verificationThrottleStates) {
    const blockedExpired = state.blockedUntil !== null && now >= state.blockedUntil;
    const idleTooLong = now - state.lastTouchedAt > STALE_STATE_RETENTION_SECONDS * 1000;

    if (blockedExpired && idleTooLong) {
      verificationThrottleStates.delete(key);
      continue;
    }

    if (!blockedExpired && state.failureCount === 0 && idleTooLong) {
      verificationThrottleStates.delete(key);
    }
  }
}

function refreshWindowIfNeeded(state: VerificationThrottleState, now: number) {
  if (now - state.windowStartedAt >= FAILURE_WINDOW_SECONDS * 1000) {
    state.failureCount = 0;
    state.windowStartedAt = now;
    state.nextAllowedAt = null;
  }
}

export function getVerifyCodeThrottleKey(email: string, request: Request) {
  const normalizedEmail = normalizeEmail(email);
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  return ip ? `${normalizedEmail}|${ip}` : normalizedEmail;
}

export function checkVerifyCodeThrottle(key: string, now = Date.now()): ThrottleResult {
  const state = verificationThrottleStates.get(key);
  if (!state) {
    return { ok: true };
  }

  state.lastTouchedAt = now;

  if (state.blockedUntil !== null) {
    if (now < state.blockedUntil) {
      pruneStaleStates(now);
      return { ok: false, retryAfterSeconds: secondsUntil(state.blockedUntil, now) };
    }

    state.blockedUntil = null;
    state.failureCount = 0;
    state.windowStartedAt = now;
    state.nextAllowedAt = null;
  }

  if (state.nextAllowedAt !== null) {
    if (now < state.nextAllowedAt) {
      pruneStaleStates(now);
      return { ok: false, retryAfterSeconds: secondsUntil(state.nextAllowedAt, now) };
    }

    state.nextAllowedAt = null;
  }

  refreshWindowIfNeeded(state, now);
  pruneStaleStates(now);

  return { ok: true };
}

export function recordVerifyCodeFailure(key: string, now = Date.now()): ThrottleResult {
  const state = getState(key, now);
  refreshWindowIfNeeded(state, now);

  if (state.blockedUntil !== null && now < state.blockedUntil) {
    pruneStaleStates(now);
    return { ok: false, retryAfterSeconds: secondsUntil(state.blockedUntil, now) };
  }

  state.failureCount += 1;
  state.nextAllowedAt = now + FAILURE_THROTTLE_SECONDS * 1000;
  state.lastTouchedAt = now;

  if (state.failureCount < MAX_FAILURES_PER_WINDOW) {
    pruneStaleStates(now);
    return { ok: true };
  }

  state.failureCount = 0;
  state.windowStartedAt = now;
  state.nextAllowedAt = null;
  state.blockedUntil = now + LOCKOUT_SECONDS * 1000;
  pruneStaleStates(now);

  return { ok: false, retryAfterSeconds: LOCKOUT_SECONDS };
}

export function clearVerifyCodeThrottle(key: string) {
  verificationThrottleStates.delete(key);
}
