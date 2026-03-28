import { NextRequest, NextResponse } from "next/server";

import { signInWithProvider } from "@/lib/service-gateway";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await signInWithProvider(payload);

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status });
  }

  return NextResponse.json({ ...result.data, mode: process.env.MAZE_AUTH_SERVICE_URL ? "connected" : "mock" }, { status: result.status });
}
