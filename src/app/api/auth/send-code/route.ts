import { NextResponse } from "next/server";

import { issueVerificationCode, validateSendCodeInput } from "@/lib/auth/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateSendCodeInput(body);

  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

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
}
