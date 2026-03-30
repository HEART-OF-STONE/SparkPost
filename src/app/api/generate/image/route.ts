import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { isDatabaseUnavailableError } from "@/lib/auth/errors";
import { readJsonBody } from "@/lib/auth/request";
import { getAuthenticatedUser } from "@/lib/auth/user";
import {
  generateTextToImageForUser,
  ImageGenerationAuthError,
  ImageGenerationConfigError,
  ImageGenerationCreditsError,
  ImageGenerationProviderError,
  validateTextToImageInput,
} from "@/lib/image/service";

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function POST(request: Request) {
  try {
    const bodyResult = await readJsonBody(request);
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error }, { status: 400 });
    }

    const input = validateTextToImageInput(bodyResult.body);
    if (!input.ok) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }

    const sessionToken = getCookieValue(
      request.headers.get("cookie"),
      authConfig.sessionCookieName,
    );
    const user = await getAuthenticatedUser(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const task = await generateTextToImageForUser(user.id, input.prompt);
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    if (error instanceof ImageGenerationCreditsError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    if (error instanceof ImageGenerationAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ImageGenerationConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof ImageGenerationProviderError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Generation service is temporarily unavailable." },
        { status: 503 },
      );
    }

    console.error("Failed to generate image.", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
