import { NextResponse } from "next/server";
import {
  clearRuntimeMicrosoftConfig,
  getRuntimeMicrosoftConfigStatus,
  updateRuntimeMicrosoftConfig,
  type RuntimeMicrosoftConfig,
} from "@/lib/env";
import { resetCosmosAvailability } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getRuntimeMicrosoftConfigStatus());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RuntimeMicrosoftConfig & { clear?: boolean };
    const status = body.clear
      ? clearRuntimeMicrosoftConfig()
      : updateRuntimeMicrosoftConfig({
          azureOpenAiEndpoint: body.azureOpenAiEndpoint,
          azureOpenAiDeployment: body.azureOpenAiDeployment,
          azureOpenAiKey: body.azureOpenAiKey,
          speechKey: body.speechKey,
          speechRegion: body.speechRegion,
          cosmosEndpoint: body.cosmosEndpoint,
          cosmosKey: body.cosmosKey,
          searchEndpoint: body.searchEndpoint,
          searchKey: body.searchKey,
          contentSafetyEndpoint: body.contentSafetyEndpoint,
          contentSafetyKey: body.contentSafetyKey,
          applicationInsightsConnectionString: body.applicationInsightsConnectionString,
        });

    resetCosmosAvailability();
    return NextResponse.json(status);
  } catch (error) {
    console.error("POST /api/demo/microsoft-keys failed", error);
    return NextResponse.json({ error: "Care-Jai could not update Microsoft keys." }, { status: 500 });
  }
}
