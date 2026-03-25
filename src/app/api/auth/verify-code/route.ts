import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { validateVerifyCodeInput, verifyCodeAndProvisionUser } from "@/lib/auth/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateVerifyCodeInput(body);

  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const result = await verifyCodeAndProvisionUser(input.email, input.code);

  if (!result.ok) {
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

  return response;
}
