import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenshotId: string }> },
) {
  const { screenshotId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!screenshotId || !token) {
    return NextResponse.json({ error: "Missing screenshot id or token." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl}/screenshots/file/${screenshotId}?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Screenshot upstream unavailable." }, { status: 502 });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  headers.set("cache-control", response.headers.get("cache-control") ?? "no-store, max-age=0");

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
