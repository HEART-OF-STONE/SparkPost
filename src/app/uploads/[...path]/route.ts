import { NextResponse } from "next/server";

import { hasServerWorkersApiBaseUrl, proxyToWorkersRequest } from "@/lib/api/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params;
  const segments = params.path ?? [];

  if (segments.length === 0) {
    return new NextResponse("Not found.", { status: 404 });
  }

  if (hasServerWorkersApiBaseUrl()) {
    const proxiedResponse = await proxyToWorkersRequest(
      request,
      "/api/assets/" + segments.map((segment) => encodeURIComponent(segment)).join("/"),
    );

    if (proxiedResponse) {
      return proxiedResponse;
    }
  }

  return NextResponse.json(
    { error: "Legacy upload assets are no longer served by Next.js." },
    { status: 410 },
  );
}
