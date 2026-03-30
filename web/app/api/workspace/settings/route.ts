import { NextRequest, NextResponse } from "next/server";

import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/service-gateway";

export async function GET() {
  const settings = await getWorkspaceSettings();
  return NextResponse.json(settings, { status: "detail" in settings ? 401 : 200 });
}

export async function PUT(request: NextRequest) {
  const payload = await request.json();
  const result = await updateWorkspaceSettings(payload);

  if (!result.ok) {
    const message = "detail" in result.data ? result.data.detail : "Unable to save settings.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
