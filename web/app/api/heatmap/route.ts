import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

export async function GET(request: NextRequest) {
  const screen = request.nextUrl.searchParams.get("screen");
  const token = request.cookies.get("maze_session_token")?.value;

  if (!screen || !token) {
    return NextResponse.json({ error: "Missing screen or session." }, { status: 400 });
  }

  const response = await fetch(`${backendBaseUrl}/heatmap?screen=${encodeURIComponent(screen)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
