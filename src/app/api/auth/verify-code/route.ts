import { NextResponse } from "next/server";

import { proxyToWorkersRequest } from "@/lib/api/server";

import { authConfig } from "@/lib/auth/config";
import { isDatabaseUnavailableError } from "@/lib/auth/errors";
import { readJsonBody } from "@/lib/auth/request";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { validateVerifyCodeInput, verifyCodeAndProvisionUser } from "@/lib/auth/service";
import {
  checkVerifyCodeThrottle,
  clearVerifyCodeThrottle,
  getVerifyCodeThrottleKey,
  recordVerifyCodeFailure,
} from "@/lib/auth/verification-throttle";

export async function POST(request: Request) {
  const proxiedResponse = await proxyToWorkersRequest(request);
  if (proxiedResponse) {
    return proxiedResponse;
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  }

  const body = bodyResult.body;
  const input = validateVerifyCodeInput(body);

  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const throttleKey = getVerifyCodeThrottleKey(input.email, request);
  const throttledBeforeCheck = checkVerifyCodeThrottle(throttleKey);
  if (!throttledBeforeCheck.ok) {
    return NextResponse.json(
      {
        error: "Too many verification attempts. Please wait before trying again.",
        retryAfterSeconds: throttledBeforeCheck.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(throttledBeforeCheck.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const result = await verifyCodeAndProvisionUser(input.email, input.code);

    if (!result.ok) {
      if (result.reason === "locked") {
        return NextResponse.json(
          {
            error: "Too many verification attempts. Please wait before trying again.",
            retryAfterSeconds: result.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(result.retryAfterSeconds),
            },
          },
        );
      }

      const throttledAfterFailure = recordVerifyCodeFailure(throttleKey);
      if (!throttledAfterFailure.ok) {
        return NextResponse.json(
          {
            error: "Too many verification attempts. Please wait before trying again.",
            retryAfterSeconds: throttledAfterFailure.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(throttledAfterFailure.retryAfterSeconds),
            },
          },
        );
      }

      const errorMessage =
        result.reason === "expired"
          ? "Verification code has expired."
          : result.reason === "used"
            ? "Verification code has already been used."
            : "Invalid verification code.";

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const response = NextResponse.json({
      ok: true,
      isNewUser: result.isNewUser,
      user: result.user,
    });

    response.cookies.set(
      authConfig.sessionCookieName,
      createSessionToken(result.user.id, result.user.email),
      getSessionCookieOptions(),
    );

    clearVerifyCodeThrottle(throttleKey);

    return response;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable." },
        { status: 503 },
      );
    }

    console.error("Failed to verify code.", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
