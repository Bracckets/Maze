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
  const screen = request.nextUrl.searchParams.get("screen");
  const deviceClass = request.nextUrl.searchParams.get("device_class");
  const token = request.cookies.get("maze_session_token")?.value;

  if (!screen || !token) {
    return NextResponse.json({ error: "Missing screen or session." }, { status: 400 });
  }

  const query = new URLSearchParams({ screen });
  if (deviceClass) {
    query.set("device_class", deviceClass);
  }

  const response = await fetch(`${backendBaseUrl}/heatmap?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data =
    (await readJsonSafely(response)) ?? {
      screen,
      deviceClass: deviceClass === "desktop" ? "desktop" : "phone",
      availableDeviceClasses: [deviceClass === "desktop" ? "desktop" : "phone"],
      points: [],
    };
  return NextResponse.json(data, { status: response.status });
}
