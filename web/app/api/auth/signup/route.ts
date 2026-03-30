import { NextRequest, NextResponse } from "next/server";

import { signUpWithProvider } from "@/lib/service-gateway";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await signUpWithProvider(payload);

  if (!result.ok) {
    const message = "detail" in result.data ? result.data.detail : "Sign up failed.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  const authPayload = result.data as { user: { id: string; email: string; workspace_id: string; workspace_name: string }; token: string };
  const response = NextResponse.json(result.data, { status: result.status });
  response.cookies.set("maze_session_token", authPayload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
