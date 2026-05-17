import { NextResponse } from "next/server";
import { configured, env, integrationMode } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  const isConfigured = configured(env.speechKey, env.speechRegion);

  if (!isConfigured) {
    return NextResponse.json({
      token: null,
      region: null,
      mode: "not_configured",
      message: "Azure AI Speech is not configured; the UI will use browser fallback speech.",
    });
  }

  try {
    const response = await fetch(
      `https://${env.speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": env.speechKey!,
          "content-length": "0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Azure Speech token request returned ${response.status}`);
    }

    return NextResponse.json({
      token: await response.text(),
      region: env.speechRegion,
      mode: "azure",
    });
  } catch (error) {
    console.warn("Azure Speech token fallback.", error);
    return NextResponse.json({
      token: null,
      region: env.speechRegion,
      mode: integrationMode(isConfigured, false),
      message: "Azure AI Speech token could not be issued; the UI will use browser fallback speech.",
    });
  }
}
