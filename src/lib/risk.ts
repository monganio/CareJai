import type { ActionCard, CareAlert, CheckinPayload, DemoState, RiskSeverity } from "./types";

const includesAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

export function assessCheckin(payload: CheckinPayload, state: DemoState) {
  const message = `${payload.message ?? ""} ${payload.mood ?? ""}`.toLowerCase();
  const systolic = payload.vitals?.systolic;
  const heartRate = payload.vitals?.heartRate;
  const sleepHours = payload.vitals?.sleepHours;

  let severity: RiskSeverity = "low";
  const evidence: string[] = [];

  if (payload.scenario === "missed_medicine") {
    severity = "medium";
    evidence.push("Morning medicine has not been confirmed", "Blood pressure is slightly above the demo baseline");
  }

  if (payload.scenario === "high_risk") {
    severity = "high";
    evidence.push("Senior reported chest tightness or dizziness", "Senior is alone at home in the demo scenario");
  }

  if (includesAny(message, ["chest pain", "chest tightness", "cannot breathe", "short of breath", "faint"])) {
    severity = "high";
    evidence.push("Message includes symptoms that should be reviewed by a real person immediately");
  }

  if (includesAny(message, ["forgot medicine", "missed medicine", "did not take medicine", "not sure about medicine"])) {
    severity = severity === "high" ? "high" : "medium";
    evidence.push("Senior mentioned uncertainty about medicine");
  }

  if (typeof systolic === "number" && systolic >= 145) {
    severity = severity === "high" ? "high" : "medium";
    evidence.push(`Systolic blood pressure ${systolic} mmHg is above the demo watch threshold`);
  }

  if (typeof heartRate === "number" && heartRate >= 110) {
    severity = "high";
    evidence.push(`Heart rate ${heartRate} bpm is high in the simulated reading`);
  }

  if (typeof sleepHours === "number" && sleepHours < 5) {
    severity = severity === "high" ? "high" : "medium";
    evidence.push(`Sleep was only ${sleepHours} hours`);
  }

  const fallbackAlert =
    severity === "low"
      ? undefined
      : buildAlert(state, severity, evidence.length ? evidence : ["Latest data changed from the normal demo pattern"]);

  return {
    severity,
    evidence: evidence.length ? evidence : ["Latest routine and simulated readings are within the monitored range"],
    fallbackAlert,
    actionCards: buildActionCards(severity),
  };
}

function buildAlert(state: DemoState, severity: Exclude<RiskSeverity, "low">, evidence: string[]): CareAlert {
  return {
    id: `alert-${Date.now()}`,
    personaId: state.persona.id,
    severity,
    reason:
      severity === "high"
        ? "Signals require caregiver or emergency review"
        : "Possible mild risk pattern from routine and simulated wellness signals",
    evidence,
    recommendedAction:
      severity === "high"
        ? "Contact the caregiver immediately. If symptoms are severe or worsening, contact local emergency services."
        : "Ask the caregiver to call gently, verify the routine, and avoid medication decisions without confirmation.",
    humanReviewStatus: "pending",
    timestamp: new Date().toISOString(),
  };
}

function buildActionCards(severity: RiskSeverity): ActionCard[] {
  if (severity === "high") {
    return [
      {
        id: "stay-safe",
        title: "Stay in a safe place",
        description: "Sit down near the phone and keep the door accessible if help may need to enter.",
        type: "safety",
      },
      {
        id: "call-caregiver",
        title: "Notify caregiver",
        description: "Send the symptom summary and evidence to May for immediate review.",
        type: "caregiver",
      },
    ];
  }

  if (severity === "medium") {
    return [
      {
        id: "check-pillbox",
        title: "Check the pillbox",
        description: "Look at today's morning slot before making any decision, and ask a caregiver to confirm.",
        type: "reminder",
      },
      {
        id: "gentle-call",
        title: "Gentle check-in",
        description: "Ask May to call briefly and confirm comfort, routine, and next steps.",
        type: "caregiver",
      },
    ];
  }

  return [
    {
      id: "hydrate",
      title: "Drink some water",
      description: "Drink one glass of water and rest your eyes for five minutes.",
      type: "comfort",
    },
    {
      id: "connect",
      title: "Stay connected",
      description: "Keep the evening video call with May as planned.",
      type: "comfort",
    },
  ];
}
