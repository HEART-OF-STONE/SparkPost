import { NextResponse } from "next/server";

import { proxyToWorkersRequest } from "@/lib/api/server";

import { imageConfig, isImageBackendConfigured } from "@/lib/image/config";

export async function GET() {
  return NextResponse.json({
    status: isImageBackendConfigured() ? "available" : "unavailable",
    model: imageConfig.model,
  });
}
