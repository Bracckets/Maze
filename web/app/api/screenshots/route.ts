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

function rewriteScreenshotUrl(signedUrl: string, origin: string) {
  try {
    const parsed = new URL(signedUrl, backendBaseUrl);
    const screenshotId = parsed.pathname.split("/").pop();
    const token = parsed.searchParams.get("token");
    if (!screenshotId || !token) {
      return signedUrl;
    }
    const rewritten = new URL(`/api/screenshots/file/${screenshotId}`, origin);
    rewritten.searchParams.set("token", token);
    return rewritten.toString();
  } catch {
    return signedUrl;
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

export async function GET(request: NextRequest) {
  const token = request.cookies.get("maze_session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing session." }, { status: 401 });
  }

  const query = new URLSearchParams(request.nextUrl.searchParams);
  const rawDeviceClass = query.get("device_class");
  const deviceClass = normalizeDeviceClass(rawDeviceClass);
  if (rawDeviceClass !== null && deviceClass === null) {
    return NextResponse.json({ error: "device_class must be 'phone' or 'desktop'." }, { status: 400 });
  }
  if (deviceClass) {
    query.set("device_class", deviceClass);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl}/screenshots${suffix}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach the screenshot service." }, { status: 502 });
  }
  const data = (await readJsonSafely(response)) ?? [];
  if (!response.ok) {
    const error =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? { error: data.detail }
        : data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? { error: data.error }
          : { error: "Screenshot request failed." };
    return NextResponse.json(error, { status: response.status });
  }
  const rewrittenData = Array.isArray(data)
    ? data.map((entry) => {
        if (!entry || typeof entry !== "object" || typeof entry.signed_url !== "string") {
          return entry;
        }
        return {
          ...entry,
          signed_url: rewriteScreenshotUrl(entry.signed_url, request.nextUrl.origin),
        };
      })
    : data;
  return NextResponse.json(rewrittenData, { status: response.status });
}
