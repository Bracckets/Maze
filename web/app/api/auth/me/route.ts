import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, updateCurrentUser } from "@/lib/service-gateway";

export async function GET() {
  const result = await getCurrentUser();
  return NextResponse.json(result.data, { status: result.status });
}

export async function PUT(request: NextRequest) {
  const payload = await request.json();
  const result = await updateCurrentUser(payload);

  if (!result.ok) {
    const message = "detail" in result.data ? result.data.detail : "Unable to update profile.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
