import { NextResponse } from "next/server";
import { loadDemoState, saveDemoState } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { contactId?: string };
    const { state } = await loadDemoState();
    const contact = state.persona.familyContacts.find((item) => item.id === body.contactId) ?? state.persona.familyContacts[0];
    const nextState = {
      ...state,
      latestCallSignal: {
        callerName: contact.name,
        phone: contact.phone,
        claimedRelationship: contact.relationship,
        verified: contact.verified,
        riskLabel: contact.verified ? ("safe" as const) : ("suspicious" as const),
        guidance: contact.verified
          ? `Calling ${contact.name} from the verified contact list`
          : "This contact has not been verified yet",
        timestamp: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await saveDemoState(nextState);
    return NextResponse.json({ signal: nextState.latestCallSignal });
  } catch (error) {
    console.error("POST /api/senior/verified-call failed", error);
    return NextResponse.json({ error: "Care-Jai could not start verified call." }, { status: 500 });
  }
}
