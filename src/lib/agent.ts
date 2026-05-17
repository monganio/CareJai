import { analyzeContentSafety, askAzureOpenAi, searchCareKnowledge } from "./azure";
import { getIntegrationSnapshot, integrationMode } from "./env";
import { summarizeState } from "./demo-data";
import { assessCheckin } from "./risk";
import { loadDemoState, saveDemoState } from "./store";
import { trackEvent } from "./telemetry";
import type {
  AgentResponse,
  CaregiverDashboard,
  CareEvent,
  CareSummary,
  CheckinPayload,
  DemoScenario,
  DemoState,
  FamilyReport,
  IntegrationMode,
} from "./types";

function createMessageEvent(state: DemoState, message: string): CareEvent {
  return {
    id: `msg-${Date.now()}`,
    personaId: state.persona.id,
    kind: "message",
    label: "Senior message",
    note: message,
    severity: "low",
    timestamp: new Date().toISOString(),
    source: "senior",
  };
}

function createCheckinEvents(state: DemoState, payload: CheckinPayload, severity: CareEvent["severity"]): CareEvent[] {
  const events: CareEvent[] = [];
  if (payload.message || payload.mood) {
    events.push({
      id: `checkin-message-${Date.now()}`,
      personaId: state.persona.id,
      kind: payload.mood ? "mood" : "message",
      label: payload.mood ? "Mood check-in" : "Check-in message",
      value: payload.mood,
      note: payload.message ?? `Today feels ${payload.mood}`,
      severity,
      timestamp: new Date().toISOString(),
      source: "senior",
    });
  }

  if (payload.vitals?.systolic || payload.vitals?.heartRate || payload.vitals?.sleepHours) {
    events.push({
      id: `checkin-vital-${Date.now()}`,
      personaId: state.persona.id,
      kind: "vital",
      label: "Wellness check-in signals",
      value: [
        payload.vitals.systolic ? `${payload.vitals.systolic}/${payload.vitals.diastolic ?? "?"} mmHg` : undefined,
        payload.vitals.heartRate ? `${payload.vitals.heartRate} bpm` : undefined,
        payload.vitals.sleepHours ? `${payload.vitals.sleepHours} hrs` : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      note: "Simulated wellness data from the demo control panel",
      severity,
      timestamp: new Date().toISOString(),
      source: "simulated",
    });
  }

  return events;
}

function fallbackResponse(input: {
  state: DemoState;
  risk: ReturnType<typeof assessCheckin>;
  safetyFlags: string[];
  integrationMode: IntegrationMode;
}): AgentResponse {
  const name = input.state.persona.shortName;

  if (input.risk.severity === "high") {
    return {
      reply: `${name}, please pause and sit somewhere safe. I will alert May right away. If chest tightness, trouble breathing, or dizziness gets worse, please call emergency services or ask someone nearby for help now.`,
      confidence: 0.84,
      evidence: input.risk.evidence,
      actionCards: input.risk.actionCards,
      safetyFlags: ["non-diagnostic", "human-in-the-loop", ...input.safetyFlags],
      escalatedAlert: input.risk.fallbackAlert,
      integrationMode: input.integrationMode,
    };
  }

  if (input.risk.severity === "medium") {
    return {
      reply: `${name}, I noticed a small change today. Let us check it calmly. Please look at your pillbox first, and wait for May to confirm before making any medicine decision.`,
      confidence: 0.78,
      evidence: input.risk.evidence,
      actionCards: input.risk.actionCards,
      safetyFlags: ["non-diagnostic", "medication-double-dose-guard", ...input.safetyFlags],
      escalatedAlert: input.risk.fallbackAlert,
      integrationMode: input.integrationMode,
    };
  }

  return {
    reply: `${name}, everything looks steady today. Thank you for checking in. Please drink a glass of water and rest comfortably before your evening call with May.`,
    confidence: 0.74,
    evidence: input.risk.evidence,
    actionCards: input.risk.actionCards,
    safetyFlags: ["wellness-only", ...input.safetyFlags],
    integrationMode: input.integrationMode,
  };
}

export async function handleSeniorMessage(message: string) {
  const { state, usedCosmos } = await loadDemoState();
  const safety = await analyzeContentSafety(message);
  const knowledge = await searchCareKnowledge(message);
  const risk = assessCheckin({ message }, state);
  const azureResponse = await askAzureOpenAi({
    userMessage: message,
    state,
    knowledge: knowledge.snippets,
    safetyFlags: safety.flags,
    fallbackAlert: risk.fallbackAlert,
  });
  const response =
    azureResponse ??
    fallbackResponse({
      state,
      risk,
      safetyFlags: safety.flags,
      integrationMode: getIntegrationSnapshot().openAi,
    });

  const nextState: DemoState = {
    ...state,
    events: [createMessageEvent(state, message), ...state.events].slice(0, 30),
    alerts: response.escalatedAlert
      ? [response.escalatedAlert, ...state.alerts.filter((item) => item.id !== response.escalatedAlert?.id)]
      : state.alerts,
    lastAgentResponse: response,
    updatedAt: new Date().toISOString(),
  };
  const saved = await saveDemoState(nextState);
  const appInsightsMode = await trackEvent("carejai.agent.message", {
    severity: risk.severity,
    azureOpenAi: response.integrationMode,
  });

  return {
    response,
    summary: summarizeState(nextState, {
      ...getIntegrationSnapshot(),
      openAi: response.integrationMode,
      contentSafety: safety.mode,
      search: knowledge.mode,
      cosmos: integrationMode(usedCosmos || saved.usedCosmos, usedCosmos || saved.usedCosmos),
      appInsights: appInsightsMode,
    }),
  };
}

export async function handleCheckin(payload: CheckinPayload) {
  const { state, usedCosmos } = await loadDemoState();
  const message = payload.message ?? `Check in for scenario ${payload.scenario ?? state.scenario}`;
  const safety = await analyzeContentSafety(message);
  const knowledge = await searchCareKnowledge(message);
  const risk = assessCheckin(payload, state);
  const azureResponse = await askAzureOpenAi({
    userMessage: message,
    state,
    knowledge: knowledge.snippets,
    safetyFlags: safety.flags,
    fallbackAlert: risk.fallbackAlert,
  });
  const response =
    azureResponse ??
    fallbackResponse({
      state,
      risk,
      safetyFlags: safety.flags,
      integrationMode: getIntegrationSnapshot().openAi,
    });

  const nextState: DemoState = {
    ...state,
    scenario: payload.scenario ?? state.scenario,
    events: [...createCheckinEvents(state, payload, risk.severity), ...state.events].slice(0, 30),
    alerts: response.escalatedAlert
      ? [response.escalatedAlert, ...state.alerts.filter((item) => item.id !== response.escalatedAlert?.id)]
      : state.alerts,
    lastAgentResponse: response,
    updatedAt: new Date().toISOString(),
  };
  const saved = await saveDemoState(nextState);
  const appInsightsMode = await trackEvent("carejai.agent.checkin", {
    severity: risk.severity,
    scenario: payload.scenario,
    azureOpenAi: response.integrationMode,
  });

  return {
    response,
    summary: summarizeState(nextState, {
      ...getIntegrationSnapshot(),
      openAi: response.integrationMode,
      contentSafety: safety.mode,
      search: knowledge.mode,
      cosmos: integrationMode(usedCosmos || saved.usedCosmos, usedCosmos || saved.usedCosmos),
      appInsights: appInsightsMode,
    }),
  };
}

export async function getCaregiverSummary(): Promise<CareSummary> {
  const { state, usedCosmos } = await loadDemoState();
  return summarizeState(state, {
    ...getIntegrationSnapshot(),
    cosmos: integrationMode(usedCosmos, usedCosmos),
  });
}

export async function getFamilyReport(): Promise<FamilyReport> {
  const summary = await getCaregiverSummary();
  const latestAlert = summary.alerts[0];

  return {
    persona: summary.persona,
    headline: latestAlert
      ? `${summary.persona.shortName} has something to follow up: ${latestAlert.reason}`
      : `${summary.persona.shortName} completed the main routines today`,
    dailyScore: summary.dailyScore,
    reassurance: latestAlert
      ? "Care-Jai prepared the evidence and suggested next steps. You can call from the verified contact list and acknowledge the alert."
      : "No concerning signal is active right now. Care-Jai is still monitoring routines, safety, and connection.",
    nextActions: latestAlert
      ? ["Call gently", "Acknowledge alert", "Escalate if symptoms worsen"]
      : ["Send encouragement", "Confirm tonight's video call", "View the latest community story"],
    alerts: summary.alerts.slice(0, 3),
    latestCallSignal: summary.latestCallSignal,
    updatedAt: summary.updatedAt,
  };
}

export async function getCaregiverDashboard(): Promise<CaregiverDashboard> {
  const summary = await getCaregiverSummary();
  const latestAlert = summary.alerts[0];
  const highOrMediumEvents = summary.events.filter((event) => event.severity !== "low");

  return {
    summary,
    vitals: [
      {
        label: "Blood pressure",
        value: latestAlert?.severity === "high" ? "158/92" : latestAlert ? "148/88" : "132/82",
        trend: latestAlert?.severity === "high" ? "urgent" : latestAlert ? "watch" : "stable",
        detail: "mmHg from latest simulated reading",
      },
      {
        label: "Heart rate",
        value: latestAlert?.severity === "high" ? "112" : "76",
        trend: latestAlert?.severity === "high" ? "urgent" : "stable",
        detail: "bpm",
      },
      {
        label: "Sleep",
        value: latestAlert ? "4.8 hrs" : "6.5 hrs",
        trend: latestAlert ? "watch" : "stable",
        detail: "Compared with the 7-day baseline",
      },
      {
        label: "Mood",
        value: latestAlert?.severity === "high" ? "Very worried" : latestAlert ? "Worried" : "Calm",
        trend: latestAlert?.severity === "high" ? "urgent" : latestAlert ? "watch" : "stable",
        detail: "From check-in message",
      },
    ],
    riskAnalysis: highOrMediumEvents.length
      ? highOrMediumEvents.slice(0, 5).map((event) => ({
          factor: event.label,
          severity: event.severity,
          evidence: event.note,
        }))
      : [
          {
            factor: "Daily routine",
            severity: "low",
            evidence: "No notable risk signal from the latest simulated data",
          },
        ],
    carePlan: latestAlert
      ? [
          "Call with a calm tone and avoid alarming the senior.",
          "Verify data from the pillbox or device before making decisions.",
          "Escalate to emergency services or a clinician if symptoms are severe or worsening.",
        ]
      : ["Continue normal routine monitoring.", "Encourage hydration and family connection.", "Review new data every 4 hours."],
    safetyChecks: [
      "No medical diagnosis",
      "No medication start, stop, increase, reduce, or repeat instruction",
      "Human-in-the-loop escalation for high-risk signals",
      "Scam-call protection through verified family contacts",
    ],
  };
}

export async function resetScenario(scenario: DemoScenario) {
  const { state, usedCosmos } = await import("./store").then((mod) => mod.resetDemoState(scenario));
  const appInsightsMode = await trackEvent("carejai.demo.reset", { scenario });
  return summarizeState(state, {
    ...getIntegrationSnapshot(),
    cosmos: integrationMode(usedCosmos, usedCosmos),
    appInsights: appInsightsMode,
  });
}
