import { createHmac, timingSafeEqual } from "node:crypto";

import { authConfig, getSessionSecret, isDevelopmentMode } from "@/lib/auth/config";

type SessionPayload = {
  userId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string, email: string) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + authConfig.sessionTtlDays * 24 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    userId,
    email,
    issuedAt,
    expiresAt,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;

    if (!payload.userId || !payload.email || Date.now() >= payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: !isDevelopmentMode(),
    path: "/",
    maxAge: authConfig.sessionTtlDays * 24 * 60 * 60,
  };
}
