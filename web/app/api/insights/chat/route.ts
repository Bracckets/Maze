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

export async function POST(request: NextRequest) {
  const token = request.cookies.get("maze_session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing session." }, { status: 401 });
  }

  const payload = await request.json();
  const response = await fetch(`${backendBaseUrl}/insights/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await readJsonSafely(response)) ?? { error: "Unable to discuss this issue right now." };
  return NextResponse.json(data, { status: response.status });
}
