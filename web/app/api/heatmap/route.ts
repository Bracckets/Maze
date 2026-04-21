import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

type DeviceClass = "phone" | "desktop";

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

function normalizeDeviceClass(deviceClass: string | null): DeviceClass | null {
  if (deviceClass === "desktop") {
    return "desktop";
  }
  if (deviceClass === "phone") {
    return "phone";
  }
  return null;
}

function buildHeatmapFallback(screen: string, deviceClass: DeviceClass | null) {
  const resolvedDeviceClass = deviceClass ?? "phone";
  return {
    screen,
    deviceClass: resolvedDeviceClass,
    availableDeviceClasses: [resolvedDeviceClass],
    points: [],
  };
}

async function fetchHeatmap(query: URLSearchParams, token: string) {
  return fetch(`${backendBaseUrl}/heatmap?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  const screen = request.nextUrl.searchParams.get("screen");
  const deviceClass = normalizeDeviceClass(request.nextUrl.searchParams.get("device_class"));
  const token = request.cookies.get("maze_session_token")?.value;

  if (!screen || !token) {
    return NextResponse.json({ error: "Missing screen or session." }, { status: 400 });
  }

  const fallback = buildHeatmapFallback(screen, deviceClass);
  const query = new URLSearchParams({ screen });
  if (deviceClass) {
    query.set("device_class", deviceClass);
  }

  let response: Response | null = null;
  try {
    response = await fetchHeatmap(query, token);
  } catch {
    response = null;
  }

  if (deviceClass && (!response || response.status === 422 || response.status >= 500)) {
    try {
      response = await fetchHeatmap(new URLSearchParams({ screen }), token);
    } catch {
      response = null;
    }
  }

  if (!response) {
    return NextResponse.json(fallback);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      const data = (await readJsonSafely(response)) ?? { error: "Unauthorized." };
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(fallback);
  }

  const data = (await readJsonSafely(response)) ?? fallback;
  return NextResponse.json(data, { status: response.status });
}
