import { configured, env, integrationMode } from "./env";
import type { IntegrationMode } from "./types";

function parseConnectionString(connectionString: string) {
  const pairs = Object.fromEntries(
    connectionString
      .split(";")
      .map((part) => part.split("="))
      .filter(([key, value]) => key && value),
  );

  return {
    instrumentationKey: pairs.InstrumentationKey,
    ingestionEndpoint: pairs.IngestionEndpoint ?? "https://dc.services.visualstudio.com",
  };
}

export async function trackEvent(
  name: string,
  properties: Record<string, string | number | boolean | undefined> = {},
): Promise<IntegrationMode> {
  const isConfigured = configured(env.applicationInsightsConnectionString);
  if (!isConfigured) {
    console.info("[Care-Jai telemetry]", name, properties);
    return "not_configured";
  }

  try {
    const { instrumentationKey, ingestionEndpoint } = parseConnectionString(
      env.applicationInsightsConnectionString!,
    );
    if (!instrumentationKey) {
      return "fallback";
    }

    const endpoint = `${ingestionEndpoint.replace(/\/$/, "")}/v2/track`;
    const body = [
      {
        name: "Microsoft.ApplicationInsights.Event",
        time: new Date().toISOString(),
        iKey: instrumentationKey,
        data: {
          baseType: "EventData",
          baseData: {
            name,
            properties,
            measurements: {},
          },
        },
      },
    ];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return integrationMode(isConfigured, response.ok);
  } catch (error) {
    console.warn("Application Insights telemetry fallback.", error);
    return "fallback";
  }
}
