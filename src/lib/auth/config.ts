const DEFAULT_CODE_TTL_MINUTES = 10;
const DEFAULT_CODE_COOLDOWN_SECONDS = 60;
const DEFAULT_SESSION_TTL_DAYS = 7;
const DEFAULT_SIGNUP_BONUS_CREDITS = 20;

export const authConfig = {
  codeLength: 6,
  codeTtlMinutes: parseInt(process.env.AUTH_CODE_TTL_MINUTES ?? "", 10) || DEFAULT_CODE_TTL_MINUTES,
  codeCooldownSeconds:
    parseInt(process.env.AUTH_CODE_COOLDOWN_SECONDS ?? "", 10) || DEFAULT_CODE_COOLDOWN_SECONDS,
  sessionTtlDays:
    parseInt(process.env.AUTH_SESSION_TTL_DAYS ?? "", 10) || DEFAULT_SESSION_TTL_DAYS,
  signupBonusCredits:
    parseInt(process.env.SIGNUP_BONUS_CREDITS ?? "", 10) || DEFAULT_SIGNUP_BONUS_CREDITS,
  sessionCookieName: "sparkpost_session",
};

export function isDevelopmentMode() {
  return process.env.NODE_ENV !== "production";
}

export function shouldExposeDebugCode() {
  return isDevelopmentMode() && process.env.DEV_AUTH_DEBUG_CODE === "true";
}

export function getSessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (isDevelopmentMode()) {
    return "sparkpost-dev-session-secret";
  }

  throw new Error("SESSION_SECRET is required in production.");
}
