import { NextResponse } from "next/server";
import { getCaregiverSummary } from "@/lib/agent";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await getCaregiverSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/caregiver/summary failed", error);
    return NextResponse.json(
      {
        error: "Care-Jai could not load caregiver summary.",
      },
      { status: 500 },
    );
  }
}
