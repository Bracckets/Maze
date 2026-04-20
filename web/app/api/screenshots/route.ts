import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

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
  const data = (await readJsonSafely(response)) ?? [];
  return NextResponse.json(data, { status: response.status });
}
