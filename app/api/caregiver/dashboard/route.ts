import { NextResponse } from "next/server";
import { getCaregiverDashboard } from "@/lib/agent";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dashboard = await getCaregiverDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("GET /api/caregiver/dashboard failed", error);
    return NextResponse.json({ error: "Care-Jai could not load caregiver dashboard." }, { status: 500 });
  }
}
