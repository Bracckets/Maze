import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/service-gateway";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function asJsonError(detail: string, status: number) {
  return NextResponse.json({ detail }, { status });
}

async function proxyToBackend(request: NextRequest, context: RouteContext, method: "GET" | "POST" | "PUT" | "DELETE") {
  const { path } = await context.params;
  const sessionToken = (await cookies()).get("maze_session_token")?.value;
  const url = new URL(request.url);
  const query = url.search || "";
  const targetUrl = `${backendBaseUrl}/liquid/${path.join("/")}${query}`;
  const headers = new Headers();
  const rawBody = method === "GET" ? "" : await request.text();

  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: rawBody.length > 0 ? rawBody : undefined,
      cache: "no-store",
    });

    const payload = await response.text();
    const responseContentType = response.headers.get("content-type") ?? "";
    if (!response.ok && !responseContentType.includes("application/json")) {
      const detail = payload.trim() && payload.trim() !== "Internal Server Error"
        ? payload.trim()
        : `The Liquid service returned ${response.status} ${response.statusText || "Error"}.`;
      return asJsonError(detail, response.status);
    }

    if (response.status === 204 || response.status === 205 || response.status === 304) {
      return new NextResponse(null, { status: response.status });
    }

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": responseContentType || "application/json",
      },
    });
  } catch (error) {
    const detail = error instanceof Error
      ? `The Liquid service proxy failed: ${error.message}`
      : "The Liquid service is unavailable right now. Check the backend server and try again.";
    return asJsonError(detail, 502);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context, "POST");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context, "PUT");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context, "DELETE");
}
