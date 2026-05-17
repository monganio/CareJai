import { NextResponse } from "next/server";
import { handleCheckin } from "@/lib/agent";
import type { CheckinPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CheckinPayload;
    const result = await handleCheckin(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/agent/checkin failed", error);
    return NextResponse.json(
      {
        error: "Care-Jai could not process the check-in.",
      },
      { status: 500 },
    );
  }
}
