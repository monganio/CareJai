import { NextResponse } from "next/server";
import { loadDemoState, saveDemoState } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { state } = await loadDemoState();
    const nextState = {
      ...state,
      alerts: state.alerts.map((alert, index) =>
        index === 0 ? { ...alert, humanReviewStatus: "acknowledged" as const } : alert,
      ),
      updatedAt: new Date().toISOString(),
    };
    await saveDemoState(nextState);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/family/ack-alert failed", error);
    return NextResponse.json({ error: "Care-Jai could not acknowledge alert." }, { status: 500 });
  }
}
