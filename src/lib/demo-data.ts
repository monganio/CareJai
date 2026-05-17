import type {
  CareAlert,
  CareEvent,
  CareSummary,
  CommunityPost,
  DemoScenario,
  DemoState,
  Persona,
  RiskSeverity,
  ScamCallSignal,
} from "./types";

const persona: Persona = {
  id: "somsri",
  name: "Mrs. Somsri Jaidee",
  shortName: "Somsri",
  age: 72,
  location: "Bang Na, Bangkok",
  caregiver: {
    name: "May",
    relationship: "granddaughter",
    phone: "080-000-2424",
    notificationChannel: "Teams",
  },
  familyContacts: [
    {
      id: "may",
      name: "May",
      relationship: "granddaughter",
      phone: "080-000-2424",
      avatar: "M",
      verified: true,
      preferredChannel: "Teams",
      lastContact: "Today 08:20",
    },
    {
      id: "ton",
      name: "Ton",
      relationship: "son",
      phone: "081-111-5656",
      avatar: "T",
      verified: true,
      preferredChannel: "Phone",
      lastContact: "Yesterday 19:10",
    },
    {
      id: "nida",
      name: "Nida",
      relationship: "trusted neighbor",
      phone: "082-222-9090",
      avatar: "N",
      verified: true,
      preferredChannel: "Line",
      lastContact: "2 days ago",
    },
  ],
  conditions: ["high blood pressure", "light sleep", "occasionally forgets morning medicine"],
  preferences: {
    language: "en-US",
    voiceName: "en-US-JennyNeural",
    tone: "warm",
  },
  routines: [
    {
      id: "med-morning",
      title: "Morning blood pressure medicine",
      time: "08:00",
      status: "done",
      importance: "high",
    },
    {
      id: "walk",
      title: "Gentle walk around the house",
      time: "10:00",
      status: "done",
      importance: "medium",
    },
    {
      id: "water",
      title: "Drink one glass of water",
      time: "13:30",
      status: "upcoming",
      importance: "medium",
    },
    {
      id: "call",
      title: "Video call with May",
      time: "19:00",
      status: "upcoming",
      importance: "low",
    },
  ],
};

const nowMinus = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const event = (
  id: string,
  kind: CareEvent["kind"],
  label: string,
  note: string,
  severity: RiskSeverity,
  minutesAgo: number,
  value?: string | number,
  unit?: string,
): CareEvent => ({
  id,
  personaId: persona.id,
  kind,
  label,
  value,
  unit,
  note,
  severity,
  timestamp: nowMinus(minutesAgo),
  source: "simulated",
});

const alert = (
  id: string,
  severity: RiskSeverity,
  reason: string,
  evidence: string[],
  recommendedAction: string,
  minutesAgo: number,
): CareAlert => ({
  id,
  personaId: persona.id,
  severity,
  reason,
  evidence,
  recommendedAction,
  humanReviewStatus: severity === "low" ? "not_needed" : "pending",
  timestamp: nowMinus(minutesAgo),
});

export function buildDemoState(scenario: DemoScenario = "normal"): DemoState {
  const routines = persona.routines.map((routine) => ({ ...routine }));
  const events: CareEvent[] = [
    event("sleep", "vital", "Sleep", "Slept for 6.5 continuous hours", "low", 360, 6.5, "hrs"),
    event("bp", "vital", "Blood pressure", "Morning blood pressure is in the monitored range", "low", 240, "132/82", "mmHg"),
    event("mood", "mood", "Mood", "Checked in as calm and looking forward to talking with May", "low", 160, "calm"),
    event("med", "routine", "Morning medicine", "Confirmed morning blood pressure medicine", "low", 130),
  ];
  const alerts: CareAlert[] = [];
  const communityPosts: CommunityPost[] = [
    {
      id: "post-orchid",
      author: "Lamoon",
      title: "My orchid bloomed today",
      body: "Sharing a small happy moment from my balcony garden. It made the morning feel brighter.",
      category: "garden",
      reactions: 18,
      timestamp: nowMinus(80),
    },
    {
      id: "post-song",
      author: "Wichai",
      title: "A favorite old song",
      body: "I listened to an old wedding song today. It brought back kind memories and a very light heart.",
      category: "music",
      reactions: 12,
      timestamp: nowMinus(125),
    },
  ];
  let latestCallSignal: ScamCallSignal = {
    callerName: "May",
    phone: "080-000-2424",
    claimedRelationship: "granddaughter",
    verified: true,
    riskLabel: "safe",
    guidance: "This caller matches a verified family contact.",
    timestamp: nowMinus(35),
  };

  if (scenario === "missed_medicine") {
    routines[0].status = "missed";
    events.push(
      event("missed-med", "routine", "Morning medicine", "No confirmation was found after 09:30", "medium", 45),
      event("bp-up", "vital", "Blood pressure", "Blood pressure is slightly above the 7-day demo baseline", "medium", 35, "148/88", "mmHg"),
    );
    alerts.push(
      alert(
        "alert-med",
        "medium",
        "Possible missed medicine pattern with elevated blood pressure",
        ["Morning medicine has not been confirmed", "Blood pressure is 148/88 mmHg", "Sleep was shorter than usual last night"],
        "Ask the caregiver to call gently and verify the pillbox before making any medication decision.",
        25,
      ),
    );
  }

  if (scenario === "high_risk") {
    routines[0].status = "missed";
    events.push(
      event("dizzy", "message", "Senior message", "Reported dizziness, mild chest tightness, and being alone at home", "high", 15),
      event("hr", "vital", "Heart rate", "Heart rate is high in the simulated reading", "high", 12, 112, "bpm"),
    );
    alerts.push(
      alert(
        "alert-high",
        "high",
        "Signals require immediate human review",
        ["Senior reported chest tightness", "Heart rate is 112 bpm", "Senior is alone at home"],
        "Contact the caregiver immediately. If symptoms are severe or worsening, contact local emergency services.",
        10,
      ),
    );
  }

  if (scenario === "scam_call") {
    latestCallSignal = {
      callerName: "Unknown caller claiming to be family",
      phone: "099-777-4455",
      claimedRelationship: "granddaughter",
      verified: false,
      riskLabel: "suspicious",
      guidance: "This number is not in the verified family list. Hang up and call May from the trusted Care-Jai contact button.",
      timestamp: nowMinus(5),
    };
    events.push(
      event(
        "scam-call",
        "alert",
        "Unverified family claim",
        "A caller claimed to be a granddaughter and asked for personal information",
        "medium",
        5,
      ),
    );
    alerts.push(
      alert(
        "alert-scam",
        "medium",
        "Caller claimed to be family but did not match verified contacts",
        ["Phone number 099-777-4455 is not in the verified family list", "Caller claimed to be a granddaughter", "Possible social engineering risk"],
        "Guide the senior to end the call and use Care-Jai to call May from the trusted contact list.",
        4,
      ),
    );
  }

  if (scenario === "community_post") {
    communityPosts.unshift({
      id: "post-somsri",
      author: "Somsri",
      title: "Made clear soup for lunch",
      body: "I made a simple vegetable soup today. It was light, warm, and not too salty.",
      category: "food",
      reactions: 24,
      timestamp: nowMinus(3),
    });
    events.push(
      event("community-share", "message", "Community share", "Somsri shared a food story in the warm community", "low", 3),
    );
  }

  return {
    scenario,
    persona: { ...persona, routines },
    events: events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    alerts: alerts.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    communityPosts,
    latestCallSignal,
    updatedAt: new Date().toISOString(),
  };
}

export function summarizeState(state: DemoState, integrations: CareSummary["integrations"]): CareSummary {
  const migratedState = {
    ...buildDemoState(state.scenario),
    ...state,
    events: state.events ?? [],
    alerts: state.alerts ?? [],
    communityPosts: state.communityPosts ?? buildDemoState(state.scenario).communityPosts,
    latestCallSignal: state.latestCallSignal ?? buildDemoState(state.scenario).latestCallSignal,
  };
  const latestAlert = migratedState.alerts[0];
  const highEvents = migratedState.events.filter((item) => item.severity === "high").length;
  const mediumEvents = migratedState.events.filter((item) => item.severity === "medium").length;
  const dailyScore = Math.max(42, 92 - highEvents * 24 - mediumEvents * 12 - migratedState.alerts.length * 10);
  const riskFactors = [
    ...new Set(
      migratedState.events
        .filter((item) => item.severity !== "low")
        .map((item) => item.note)
        .slice(0, 4),
    ),
  ];

  return {
    persona: migratedState.persona,
    events: migratedState.events.slice(0, 12),
    alerts: migratedState.alerts.slice(0, 6),
    communityPosts: migratedState.communityPosts.slice(0, 6),
    latestCallSignal: migratedState.latestCallSignal,
    dailyScore,
    aiSummary:
      latestAlert?.severity === "high"
        ? "Today includes signals that should be reviewed by a real caregiver immediately. Care-Jai highlights safety confirmation and human escalation."
        : latestAlert
          ? "Today shows a small change that should be followed up gently. Care-Jai recommends a calm caregiver check-in with evidence."
          : "Today looks stable. The senior completed key routines and remains connected with trusted family support.",
    riskFactors: riskFactors.length ? riskFactors : ["No notable risk signal in the latest simulated data"],
    updatedAt: migratedState.updatedAt,
    integrations,
  };
}
