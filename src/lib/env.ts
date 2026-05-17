import type { IntegrationMode } from "./types";

export interface RuntimeMicrosoftConfig {
  azureOpenAiEndpoint?: string;
  azureOpenAiDeployment?: string;
  azureOpenAiKey?: string;
  speechKey?: string;
  speechRegion?: string;
  cosmosEndpoint?: string;
  cosmosKey?: string;
  searchEndpoint?: string;
  searchKey?: string;
  contentSafetyEndpoint?: string;
  contentSafetyKey?: string;
  applicationInsightsConnectionString?: string;
}

const runtimeState = globalThis as typeof globalThis & {
  careJaiRuntimeMicrosoftConfig?: RuntimeMicrosoftConfig;
};

runtimeState.careJaiRuntimeMicrosoftConfig ??= {};

function runtimeValue(key: keyof RuntimeMicrosoftConfig, fallback?: string) {
  return runtimeState.careJaiRuntimeMicrosoftConfig?.[key] || fallback;
}

export const env = {
  get azureOpenAiEndpoint() {
    return runtimeValue("azureOpenAiEndpoint", process.env.AZURE_OPENAI_ENDPOINT);
  },
  get azureOpenAiDeployment() {
    return runtimeValue("azureOpenAiDeployment", process.env.AZURE_OPENAI_DEPLOYMENT);
  },
  get azureOpenAiKey() {
    return runtimeValue("azureOpenAiKey", process.env.AZURE_OPENAI_API_KEY);
  },
  azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
  get speechKey() {
    return runtimeValue("speechKey", process.env.AZURE_SPEECH_KEY);
  },
  get speechRegion() {
    return runtimeValue("speechRegion", process.env.AZURE_SPEECH_REGION);
  },
  get cosmosEndpoint() {
    return runtimeValue("cosmosEndpoint", process.env.AZURE_COSMOS_ENDPOINT);
  },
  get cosmosKey() {
    return runtimeValue("cosmosKey", process.env.AZURE_COSMOS_KEY);
  },
  cosmosDatabase: process.env.AZURE_COSMOS_DATABASE ?? "carejai-demo",
  cosmosContainer: process.env.AZURE_COSMOS_CONTAINER ?? "state",
  get searchEndpoint() {
    return runtimeValue("searchEndpoint", process.env.AZURE_SEARCH_ENDPOINT);
  },
  get searchKey() {
    return runtimeValue("searchKey", process.env.AZURE_SEARCH_KEY);
  },
  searchIndex: process.env.AZURE_SEARCH_INDEX ?? "carejai-knowledge",
  searchApiVersion: process.env.AZURE_SEARCH_API_VERSION ?? "2024-07-01",
  get contentSafetyEndpoint() {
    return runtimeValue("contentSafetyEndpoint", process.env.AZURE_CONTENT_SAFETY_ENDPOINT);
  },
  get contentSafetyKey() {
    return runtimeValue("contentSafetyKey", process.env.AZURE_CONTENT_SAFETY_KEY);
  },
  contentSafetyApiVersion: process.env.AZURE_CONTENT_SAFETY_API_VERSION ?? "2024-09-01",
  get applicationInsightsConnectionString() {
    return runtimeValue("applicationInsightsConnectionString", process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
  },
};

export function configured(...values: Array<string | undefined>): boolean {
  return values.every((value) => Boolean(value && value.trim().length > 0));
}

export function updateRuntimeMicrosoftConfig(values: RuntimeMicrosoftConfig) {
  const nextValues = Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      .filter(([, value]) => typeof value === "string" && value.length > 0),
  ) as RuntimeMicrosoftConfig;

  runtimeState.careJaiRuntimeMicrosoftConfig = {
    ...runtimeState.careJaiRuntimeMicrosoftConfig,
    ...nextValues,
  };

  return getRuntimeMicrosoftConfigStatus();
}

export function clearRuntimeMicrosoftConfig() {
  runtimeState.careJaiRuntimeMicrosoftConfig = {};
  return getRuntimeMicrosoftConfigStatus();
}

export function getRuntimeMicrosoftConfigStatus() {
  return {
    openAi: configured(env.azureOpenAiEndpoint, env.azureOpenAiDeployment, env.azureOpenAiKey),
    speech: configured(env.speechKey, env.speechRegion),
    cosmos: configured(env.cosmosEndpoint, env.cosmosKey),
    search: configured(env.searchEndpoint, env.searchKey),
    contentSafety: configured(env.contentSafetyEndpoint, env.contentSafetyKey),
    appInsights: configured(env.applicationInsightsConnectionString),
    runtimeOverrides: Object.fromEntries(
      Object.entries(runtimeState.careJaiRuntimeMicrosoftConfig ?? {}).map(([key, value]) => [
        key,
        Boolean(value),
      ]),
    ),
  };
}

export function integrationMode(isConfigured: boolean, usedAzure: boolean): IntegrationMode {
  if (usedAzure) {
    return "azure";
  }

  return isConfigured ? "fallback" : "not_configured";
}

export function getIntegrationSnapshot(): Record<string, IntegrationMode> {
  return {
    openAi: configured(env.azureOpenAiEndpoint, env.azureOpenAiDeployment, env.azureOpenAiKey)
      ? "fallback"
      : "not_configured",
    speech: configured(env.speechKey, env.speechRegion) ? "fallback" : "not_configured",
    cosmos: configured(env.cosmosEndpoint, env.cosmosKey) ? "fallback" : "not_configured",
    search: configured(env.searchEndpoint, env.searchKey) ? "fallback" : "not_configured",
    contentSafety: configured(env.contentSafetyEndpoint, env.contentSafetyKey)
      ? "fallback"
      : "not_configured",
    appInsights: configured(env.applicationInsightsConnectionString) ? "fallback" : "not_configured",
  };
}
