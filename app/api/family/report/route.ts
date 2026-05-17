import { NextResponse } from "next/server";
import { getFamilyReport } from "@/lib/agent";

export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await getFamilyReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/family/report failed", error);
    return NextResponse.json({ error: "Care-Jai could not load family report." }, { status: 500 });
  }
}
