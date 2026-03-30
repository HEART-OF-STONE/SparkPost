import { NextResponse } from "next/server";

import { isDatabaseUnavailableError } from "@/lib/auth/errors";
import { readJsonBody } from "@/lib/auth/request";
import { issueVerificationCode, validateSendCodeInput } from "@/lib/auth/service";

export async function POST(request: Request) {
  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  }

  const body = bodyResult.body;
  const input = validateSendCodeInput(body);

  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  try {
    const result = await issueVerificationCode(input.email);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Please wait before requesting another verification code.",
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

    return NextResponse.json({
      ok: true,
      email: input.email,
      expiresAt: result.expiresAt.toISOString(),
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable." },
        { status: 503 },
      );
    }

    console.error("Failed to issue verification code.", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
