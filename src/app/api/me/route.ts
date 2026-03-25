import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
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
  const user = await getAuthenticatedUser(sessionToken);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
