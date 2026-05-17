export type CareEventKind = "vital" | "routine" | "mood" | "message" | "alert";

export type RiskSeverity = "low" | "medium" | "high";

export type HumanReviewStatus = "not_needed" | "pending" | "acknowledged";

export type DemoScenario = "normal" | "missed_medicine" | "high_risk" | "scam_call" | "community_post";

export type IntegrationMode = "azure" | "fallback" | "not_configured";

export interface Caregiver {
  name: string;
  relationship: string;
  phone: string;
  notificationChannel: "Teams" | "SMS" | "Outlook";
}

export interface FamilyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  avatar: string;
  verified: boolean;
  preferredChannel: "Teams" | "Line" | "Phone";
  lastContact: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  title: string;
  body: string;
  category: "memory" | "food" | "garden" | "music" | "health";
  reactions: number;
  timestamp: string;
}

export interface ScamCallSignal {
  callerName: string;
  phone: string;
  claimedRelationship: string;
  verified: boolean;
  riskLabel: "safe" | "suspicious";
  guidance: string;
  timestamp: string;
}

export interface RoutineItem {
  id: string;
  title: string;
  time: string;
  status: "done" | "upcoming" | "missed";
  importance: "low" | "medium" | "high";
}

export interface Persona {
  id: string;
  name: string;
  shortName: string;
  age: number;
  location: string;
  caregiver: Caregiver;
  familyContacts: FamilyContact[];
  conditions: string[];
  preferences: {
    language: "en-US" | "th-TH";
    voiceName: string;
    tone: "warm" | "calm" | "encouraging";
  };
  routines: RoutineItem[];
}

export interface CareEvent {
  id: string;
  personaId: string;
  kind: CareEventKind;
  label: string;
  value?: string | number;
  unit?: string;
  note: string;
  severity: RiskSeverity;
  timestamp: string;
  source: "simulated" | "senior" | "agent" | "azure";
}

export interface CareAlert {
  id: string;
  personaId: string;
  severity: RiskSeverity;
  reason: string;
  evidence: string[];
  recommendedAction: string;
  humanReviewStatus: HumanReviewStatus;
  timestamp: string;
}

export interface ActionCard {
  id: string;
  title: string;
  description: string;
  type: "comfort" | "reminder" | "caregiver" | "safety";
}

export interface AgentResponse {
  reply: string;
  confidence: number;
  evidence: string[];
  actionCards: ActionCard[];
  safetyFlags: string[];
  escalatedAlert?: CareAlert;
  integrationMode: IntegrationMode;
}

export interface CheckinPayload {
  scenario?: DemoScenario;
  mood?: "good" | "neutral" | "worried" | "tired" | "dizzy";
  message?: string;
  vitals?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    sleepHours?: number;
  };
}

export interface DemoState {
  scenario: DemoScenario;
  persona: Persona;
  events: CareEvent[];
  alerts: CareAlert[];
  communityPosts: CommunityPost[];
  latestCallSignal?: ScamCallSignal;
  lastAgentResponse?: AgentResponse;
  updatedAt: string;
}

export interface CareSummary {
  persona: Persona;
  events: CareEvent[];
  alerts: CareAlert[];
  communityPosts: CommunityPost[];
  latestCallSignal?: ScamCallSignal;
  dailyScore: number;
  aiSummary: string;
  riskFactors: string[];
  updatedAt: string;
  integrations: Record<string, IntegrationMode>;
}

export interface FamilyReport {
  persona: Persona;
  headline: string;
  dailyScore: number;
  reassurance: string;
  nextActions: string[];
  alerts: CareAlert[];
  latestCallSignal?: ScamCallSignal;
  updatedAt: string;
}

export interface CaregiverDashboard {
  summary: CareSummary;
  vitals: Array<{
    label: string;
    value: string;
    trend: "stable" | "watch" | "urgent";
    detail: string;
  }>;
  riskAnalysis: Array<{
    factor: string;
    severity: RiskSeverity;
    evidence: string;
  }>;
  carePlan: string[];
  safetyChecks: string[];
}
