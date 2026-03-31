import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("maze_session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing session." }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.toString();
  const suffix = query ? `?${query}` : "";
  const response = await fetch(`${backendBaseUrl}/screenshots${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
