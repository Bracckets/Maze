import { NextRequest, NextResponse } from "next/server";

import { createApiKey, listApiKeys } from "@/lib/service-gateway";

export async function GET() {
  const keys = await listApiKeys();
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await createApiKey(payload);

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status });
  }

  return NextResponse.json({ ...result.data, mode: process.env.MAZE_API_KEYS_SERVICE_URL ? "connected" : "mock" }, { status: result.status });
}
