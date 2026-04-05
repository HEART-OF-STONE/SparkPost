import { NextResponse } from "next/server";

import { isDatabaseUnavailableError } from "@/lib/auth/errors";
import { normalizeEmail, isValidEmail } from "@/lib/auth/email";
import { readJsonBody } from "@/lib/auth/request";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

function isDevLoginEnabled() {
  return process.env.DEV_AUTH_DEBUG_CODE === "true";
}

export async function POST(request: Request) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  }

  const emailValue =
    typeof bodyResult.body === "object" &&
    bodyResult.body !== null &&
    !Array.isArray(bodyResult.body) &&
    "email" in bodyResult.body
      ? bodyResult.body.email
      : undefined;

  if (typeof emailValue !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const email = normalizeEmail(emailValue);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { creditAccount: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Developer login account does not exist. Create it in the database first." },
        { status: 404 },
      );
    }

    const timestamp = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: user.emailVerifiedAt ?? timestamp,
        lastLoginAt: timestamp,
      },
      include: { creditAccount: true },
    });

    const response = NextResponse.json({
      ok: true,
      isNewUser: false,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        emailVerifiedAt: updatedUser.emailVerifiedAt,
        lastLoginAt: updatedUser.lastLoginAt,
        creditBalance: updatedUser.creditAccount?.balance ?? 0,
      },
    });

    response.cookies.set(
      authConfig.sessionCookieName,
      createSessionToken(updatedUser.id, updatedUser.email),
      { ...getSessionCookieOptions(), secure: false },
    );

    return response;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable." },
        { status: 503 },
      );
    }

    console.error("Failed to create debug login session.", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}