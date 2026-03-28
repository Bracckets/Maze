import { NextResponse } from "next/server";

import { getIntegrationStatus } from "@/lib/service-gateway";

export async function GET() {
  const data = await getIntegrationStatus();
  return NextResponse.json(data);
}
