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

export async function GET(request: NextRequest) {
  const token = request.cookies.get("maze_session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing session." }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.toString();
  const suffix = query ? `?${query}` : "";
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl}/screenshots${suffix}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
  const data = (await readJsonSafely(response)) ?? [];
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
