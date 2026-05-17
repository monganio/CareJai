import { NextResponse } from "next/server";
import { handleSeniorMessage } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await handleSeniorMessage(message);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/agent/message failed", error);
    return NextResponse.json(
      {
        error: "Care-Jai could not process the message.",
      },
      { status: 500 },
    );
  }
}
