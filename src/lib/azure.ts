import { configured, env, integrationMode } from "./env";
import type { AgentResponse, CareAlert, DemoState, IntegrationMode } from "./types";

const fallbackKnowledge = [
  "Care-Jai is a wellness companion, not a diagnostic medical device. It should recommend human review for concerning symptoms.",
  "When a senior may have missed medicine, respond gently, ask them to check the pillbox, and avoid telling them to take another dose without confirmation.",
  "Signals such as chest tightness, trouble breathing, fainting, or worsening symptoms should trigger caregiver or emergency escalation.",
  "Senior-facing responses should be short, warm, respectful, and immediately actionable.",
];

function stripCodeFence(content: string) {
  return content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

function safeJsonParse<T>(content: string): T | undefined {
  try {
    return JSON.parse(stripCodeFence(content)) as T;
  } catch {
    return undefined;
  }
}

export async function searchCareKnowledge(query: string): Promise<{
  mode: IntegrationMode;
  snippets: string[];
}> {
  const isConfigured = configured(env.searchEndpoint, env.searchKey);
  if (!isConfigured) {
    return { mode: "not_configured", snippets: fallbackKnowledge };
  }

  try {
    const url = `${env.searchEndpoint!.replace(/\/$/, "")}/indexes/${encodeURIComponent(
      env.searchIndex,
    )}/docs/search?api-version=${env.searchApiVersion}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": env.searchKey!,
      },
      body: JSON.stringify({
        search: query,
        top: 3,
        select: "title,content,summary,text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure AI Search returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      value?: Array<Record<string, unknown>>;
    };
    const snippets =
      payload.value
        ?.map((doc) =>
          [doc.title, doc.summary, doc.content, doc.text].filter(Boolean).join(" - "),
        )
        .filter(Boolean)
        .slice(0, 3) ?? [];

    return {
      mode: integrationMode(isConfigured, snippets.length > 0),
      snippets: snippets.length ? snippets : fallbackKnowledge,
    };
  } catch (error) {
    console.warn("Azure AI Search fallback.", error);
    return { mode: "fallback", snippets: fallbackKnowledge };
  }
}

export async function analyzeContentSafety(text: string): Promise<{
  mode: IntegrationMode;
  flags: string[];
}> {
  const isConfigured = configured(env.contentSafetyEndpoint, env.contentSafetyKey);
  if (!isConfigured) {
    return { mode: "not_configured", flags: [] };
  }

  try {
    const url = `${env.contentSafetyEndpoint!.replace(
      /\/$/,
      "",
    )}/contentsafety/text:analyze?api-version=${env.contentSafetyApiVersion}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Ocp-Apim-Subscription-Key": env.contentSafetyKey!,
      },
      body: JSON.stringify({
        text,
        categories: ["Hate", "Sexual", "Violence", "SelfHarm"],
        outputType: "FourSeverityLevels",
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure AI Content Safety returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      categoriesAnalysis?: Array<{ category: string; severity?: number }>;
    };
    const flags =
      payload.categoriesAnalysis
        ?.filter((item) => Number(item.severity ?? 0) >= 4)
        .map((item) => `${item.category}:${item.severity}`) ?? [];

    return { mode: "azure", flags };
  } catch (error) {
    console.warn("Azure AI Content Safety fallback.", error);
    return { mode: "fallback", flags: ["content-safety-check-unavailable"] };
  }
}

export async function askAzureOpenAi(input: {
  userMessage: string;
  state: DemoState;
  knowledge: string[];
  safetyFlags: string[];
  fallbackAlert?: CareAlert;
}): Promise<AgentResponse | undefined> {
  const isConfigured = configured(env.azureOpenAiEndpoint, env.azureOpenAiDeployment, env.azureOpenAiKey);
  if (!isConfigured) {
    return undefined;
  }

  const systemPrompt = `
You are Care-Jai, a warm AI wellness companion for older adults.
Important constraints:
- Respond in clear English with a warm, calm, respectful tone.
- Keep senior-facing replies short and easy to act on.
- Do not diagnose disease. Do not tell the user to start, stop, increase, reduce, or repeat medication.
- For high-risk signals, recommend contacting a caregiver, a nearby trusted person, or emergency services.
- Return JSON only in this shape:
{
  "reply": "string",
  "confidence": 0.0,
  "evidence": ["string"],
  "actionCards": [{"id":"string","title":"string","description":"string","type":"comfort|reminder|caregiver|safety"}],
  "safetyFlags": ["string"]
}
`;

  const userPrompt = {
    userMessage: input.userMessage,
    persona: input.state.persona,
    latestEvents: input.state.events.slice(0, 8),
    activeAlerts: input.state.alerts.slice(0, 3),
    retrievedCareGuidance: input.knowledge,
    precomputedSafetyFlags: input.safetyFlags,
    suggestedEscalation: input.fallbackAlert,
  };

  try {
    const url = `${env.azureOpenAiEndpoint!.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(
      env.azureOpenAiDeployment!,
    )}/chat/completions?api-version=${env.azureOpenAiApiVersion}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": env.azureOpenAiKey!,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPrompt) },
        ],
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return undefined;
    }

    const parsed = safeJsonParse<Omit<AgentResponse, "integrationMode" | "escalatedAlert">>(content);
    if (!parsed?.reply) {
      return undefined;
    }

    return {
      reply: parsed.reply,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.72))),
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 5) : input.knowledge.slice(0, 2),
      actionCards: Array.isArray(parsed.actionCards) ? parsed.actionCards.slice(0, 4) : [],
      safetyFlags: [...new Set([...(parsed.safetyFlags ?? []), ...input.safetyFlags])],
      escalatedAlert: input.fallbackAlert,
      integrationMode: "azure",
    };
  } catch (error) {
    console.warn("Azure OpenAI fallback.", error);
    return undefined;
  }
}
