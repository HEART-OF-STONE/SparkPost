import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { isDatabaseUnavailableError } from "@/lib/auth/errors";
import { getAuthenticatedUser } from "@/lib/auth/user";

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

export async function GET(request: Request) {
  const sessionToken = getCookieValue(
    request.headers.get("cookie"),
    authConfig.sessionCookieName,
  );

  try {
    const user = await getAuthenticatedUser(sessionToken);
    return NextResponse.json({ user });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable." },
        { status: 503 },
      );
    }

    console.error("Failed to resolve authenticated user.", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
