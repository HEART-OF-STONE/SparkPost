import { NextResponse } from "next/server";

import { proxyToWorkersRequest } from "@/lib/api/server";

export async function GET(request: Request) {
  const proxiedResponse = await proxyToWorkersRequest(request);
  if (proxiedResponse) {
    return proxiedResponse;
  }

  return NextResponse.json(
    { error: "Image model service is temporarily unavailable." },
    { status: 503 },
  );
}
