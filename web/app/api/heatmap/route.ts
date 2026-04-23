import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

type DeviceClass = "phone" | "desktop";
type HeatmapPoint = {
  x: number;
  y: number;
  count: number;
};
type HeatmapPayload = {
  screen: string;
  deviceClass: DeviceClass;
  availableDeviceClasses: DeviceClass[];
  points: HeatmapPoint[];
};

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

function isHeatmapPayload(value: unknown): value is HeatmapPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<HeatmapPayload>;
  return (
    typeof payload.screen === "string" &&
    (payload.deviceClass === "phone" || payload.deviceClass === "desktop") &&
    Array.isArray(payload.availableDeviceClasses) &&
    payload.availableDeviceClasses.every((deviceClass) => deviceClass === "phone" || deviceClass === "desktop") &&
    Array.isArray(payload.points) &&
    payload.points.every(
      (point) =>
        !!point &&
        typeof point === "object" &&
        typeof point.x === "number" &&
        typeof point.y === "number" &&
        typeof point.count === "number",
    )
  );
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
  const rawDeviceClass = request.nextUrl.searchParams.get("device_class");
  const deviceClass = normalizeDeviceClass(rawDeviceClass);
  const token = request.cookies.get("maze_session_token")?.value;

  if (!screen || !token) {
    return NextResponse.json({ error: "Missing screen or session." }, { status: 400 });
  }

  if (rawDeviceClass !== null && deviceClass === null) {
    return NextResponse.json({ error: "device_class must be 'phone' or 'desktop'." }, { status: 400 });
  }

  const query = new URLSearchParams({ screen });
  if (deviceClass) {
    query.set("device_class", deviceClass);
  }

  let response: Response;
  try {
    response = await fetchHeatmap(query, token);
  } catch {
    return NextResponse.json({ error: "Unable to reach the heatmap service." }, { status: 502 });
  }

  const data = await readJsonSafely(response);
  if (!response.ok) {
    const error =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? { error: data.detail }
        : data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? { error: data.error }
          : { error: "Heatmap request failed." };
    return NextResponse.json(error, { status: response.status });
  }

  if (!isHeatmapPayload(data)) {
    return NextResponse.json({ error: "Heatmap service returned an invalid payload." }, { status: 502 });
  }

  if (deviceClass && data.deviceClass !== deviceClass) {
    return NextResponse.json({ error: "Heatmap service returned a mismatched device class." }, { status: 502 });
  }

  if (!data.availableDeviceClasses.includes(data.deviceClass)) {
    return NextResponse.json({ error: "Heatmap service returned an inconsistent device class selection." }, { status: 502 });
  }

  return NextResponse.json(data, { status: response.status });
}
