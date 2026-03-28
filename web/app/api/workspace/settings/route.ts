import { NextRequest, NextResponse } from "next/server";

import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/service-gateway";

export async function GET() {
  const settings = await getWorkspaceSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const payload = await request.json();
  const result = await updateWorkspaceSettings(payload);

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status });
  }

  return NextResponse.json({ ...result.data, mode: process.env.MAZE_WORKSPACE_SERVICE_URL ? "connected" : "mock" }, { status: result.status });
}
