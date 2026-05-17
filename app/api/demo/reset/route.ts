import { NextResponse } from "next/server";
import { resetScenario } from "@/lib/agent";
import type { DemoScenario } from "@/lib/types";

export const runtime = "nodejs";

const scenarios = new Set<DemoScenario>(["normal", "missed_medicine", "high_risk", "scam_call", "community_post"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scenario?: DemoScenario };
    const scenario = scenarios.has(body.scenario ?? "normal") ? body.scenario ?? "normal" : "normal";
    const summary = await resetScenario(scenario);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("POST /api/demo/reset failed", error);
    return NextResponse.json(
      {
        error: "Care-Jai could not reset the demo scenario.",
      },
      { status: 500 },
    );
  }
}
