import { NextResponse } from "next/server";

import { proxyToWorkersRequest } from "@/lib/api/server";

import { authConfig } from "@/lib/auth/config";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authConfig.sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
