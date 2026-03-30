import { NextRequest, NextResponse } from "next/server";

import { createApiKey, listApiKeys } from "@/lib/service-gateway";

export async function GET() {
  const keys = await listApiKeys();
  return NextResponse.json(keys, { status: "detail" in keys ? 401 : 200 });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await createApiKey(payload);

  if (!result.ok) {
    const message = "detail" in result.data ? result.data.detail : "Unable to create API key.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
