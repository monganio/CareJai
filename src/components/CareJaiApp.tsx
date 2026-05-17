"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  FluentProvider,
  Input,
  Spinner,
  Text,
  Textarea,
  webLightTheme,
} from "@fluentui/react-components";
import {
  Bot24Regular,
  Mic24Regular,
  PeopleCommunity24Regular,
  PersonHeart24Regular,
  Phone24Regular,
  Play24Regular,
  Send24Regular,
  ShieldCheckmark24Regular,
  TabDesktopArrowClockwise24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import type {
  AgentResponse,
  CareAlert,
  CareEvent,
  CaregiverDashboard,
  CareSummary,
  CommunityPost,
  DemoScenario,
  FamilyReport,
  IntegrationMode,
  RoutineItem,
} from "@/lib/types";

type ActiveView = "senior" | "family" | "caregiver" | "demo";
type PhoneApp = "home" | "ai" | "family" | "routine" | "community" | "safety";
type MicrosoftKeyField =
  | "azureOpenAiEndpoint"
  | "azureOpenAiDeployment"
  | "azureOpenAiKey"
  | "speechKey"
  | "speechRegion"
  | "cosmosEndpoint"
  | "cosmosKey"
  | "searchEndpoint"
  | "searchKey"
  | "contentSafetyEndpoint"
  | "contentSafetyKey"
  | "applicationInsightsConnectionString";

type MicrosoftKeyForm = Record<MicrosoftKeyField, string>;

type MicrosoftKeyStatus = {
  openAi: boolean;
  speech: boolean;
  cosmos: boolean;
  search: boolean;
  contentSafety: boolean;
  appInsights: boolean;
  runtimeOverrides: Partial<Record<MicrosoftKeyField, boolean>>;
};

const emptyMicrosoftKeyForm: MicrosoftKeyForm = {
  azureOpenAiEndpoint: "",
  azureOpenAiDeployment: "",
  azureOpenAiKey: "",
  speechKey: "",
  speechRegion: "",
  cosmosEndpoint: "",
  cosmosKey: "",
  searchEndpoint: "",
  searchKey: "",
  contentSafetyEndpoint: "",
  contentSafetyKey: "",
  applicationInsightsConnectionString: "",
};

const microsoftKeyFields: Array<{
  field: MicrosoftKeyField;
  label: string;
  placeholder: string;
  secret?: boolean;
}> = [
  {
    field: "azureOpenAiEndpoint",
    label: "Azure OpenAI endpoint",
    placeholder: "https://<resource>.openai.azure.com",
  },
  { field: "azureOpenAiDeployment", label: "Azure OpenAI deployment", placeholder: "gpt-4o-mini" },
  { field: "azureOpenAiKey", label: "Azure OpenAI API key", placeholder: "Paste key", secret: true },
  { field: "speechKey", label: "Azure Speech key", placeholder: "Paste key", secret: true },
  { field: "speechRegion", label: "Azure Speech region", placeholder: "southeastasia" },
  { field: "cosmosEndpoint", label: "Cosmos DB endpoint", placeholder: "https://<account>.documents.azure.com:443/" },
  { field: "cosmosKey", label: "Cosmos DB key", placeholder: "Paste key", secret: true },
  { field: "searchEndpoint", label: "Azure AI Search endpoint", placeholder: "https://<service>.search.windows.net" },
  { field: "searchKey", label: "Azure AI Search key", placeholder: "Paste key", secret: true },
  {
    field: "contentSafetyEndpoint",
    label: "Content Safety endpoint",
    placeholder: "https://<resource>.cognitiveservices.azure.com",
  },
  { field: "contentSafetyKey", label: "Content Safety key", placeholder: "Paste key", secret: true },
  {
    field: "applicationInsightsConnectionString",
    label: "Application Insights connection string",
    placeholder: "InstrumentationKey=...",
    secret: true,
  },
];

const samplePrompts = {
  normal: "I feel good today. I took a short walk and I am looking forward to calling May this evening.",
  missed_medicine: "I am not sure whether I took my blood pressure medicine this morning.",
  high_risk: "I feel dizzy and a little tight in my chest. I am home alone.",
  scam_call: "Someone called and said they are my grandchild. They asked for my ID number. What should I do?",
  community_post: "I made vegetable soup today and want to share a small happy story.",
} satisfies Record<DemoScenario, string>;

const checkinPayloads = {
  normal: {
    scenario: "normal",
    mood: "good",
    message: samplePrompts.normal,
    vitals: { systolic: 132, diastolic: 82, heartRate: 76, sleepHours: 6.5 },
  },
  missed_medicine: {
    scenario: "missed_medicine",
    mood: "worried",
    message: samplePrompts.missed_medicine,
    vitals: { systolic: 148, diastolic: 88, heartRate: 86, sleepHours: 4.8 },
  },
  high_risk: {
    scenario: "high_risk",
    mood: "dizzy",
    message: samplePrompts.high_risk,
    vitals: { systolic: 158, diastolic: 92, heartRate: 112, sleepHours: 3.9 },
  },
} as const;

const integrationLabels: Record<string, string> = {
  openAi: "Azure OpenAI",
  speech: "Azure Speech",
  cosmos: "Cosmos DB",
  search: "AI Search",
  contentSafety: "Content Safety",
  appInsights: "App Insights",
};

export function CareJaiApp() {
  const [activeView, setActiveView] = useState<ActiveView>("senior");
  const [phoneApp, setPhoneApp] = useState<PhoneApp>("home");
  const [summary, setSummary] = useState<CareSummary>();
  const [familyReport, setFamilyReport] = useState<FamilyReport>();
  const [dashboard, setDashboard] = useState<CaregiverDashboard>();
  const [agentResponse, setAgentResponse] = useState<AgentResponse>();
  const [message, setMessage] = useState(samplePrompts.missed_medicine);
  const [communityDraft, setCommunityDraft] = useState("My basil plant looks healthy today. I want to share this small happy moment with the community.");
  const [microsoftKeys, setMicrosoftKeys] = useState<MicrosoftKeyForm>(emptyMicrosoftKeyForm);
  const [microsoftKeyStatus, setMicrosoftKeyStatus] = useState<MicrosoftKeyStatus>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Preparing Care-Jai demo");
  const [speechStatus, setSpeechStatus] = useState("Ready for Azure Speech or browser fallback");

  const activeSeverity = summary?.alerts?.[0]?.severity ?? "low";

  async function loadAllData() {
    const [summaryData, reportData, dashboardData] = await Promise.all([
      fetch("/api/caregiver/summary", { cache: "no-store" }).then((item) => item.json() as Promise<CareSummary>),
      fetch("/api/family/report", { cache: "no-store" }).then((item) => item.json() as Promise<FamilyReport>),
      fetch("/api/caregiver/dashboard", { cache: "no-store" }).then((item) => item.json() as Promise<CaregiverDashboard>),
    ]);

    return { summaryData, reportData, dashboardData };
  }

  function applyData(data: Awaited<ReturnType<typeof loadAllData>>) {
    setSummary(data.summaryData);
    setFamilyReport(data.reportData);
    setDashboard(data.dashboardData);
  }

  async function refreshAll() {
    applyData(await loadAllData());
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const [data, statusData] = await Promise.all([
        loadAllData(),
        fetch("/api/demo/microsoft-keys", { cache: "no-store" }).then(
          (item) => item.json() as Promise<MicrosoftKeyStatus>,
        ),
      ]);
      if (!cancelled) {
        setSummary(data.summaryData);
        setFamilyReport(data.reportData);
        setDashboard(data.dashboardData);
        setMicrosoftKeyStatus(statusData);
        setStatus("Ready for demo");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function saveMicrosoftKeys() {
    setLoading(true);
    setStatus("Saving Microsoft runtime keys");
    try {
      const nextStatus = await postJson<MicrosoftKeyStatus>("/api/demo/microsoft-keys", microsoftKeys);
      setMicrosoftKeyStatus(nextStatus);
      setMicrosoftKeys(emptyMicrosoftKeyForm);
      await refreshAll();
      setStatus("Microsoft runtime keys saved");
    } catch (error) {
      console.error(error);
      setStatus("Could not save Microsoft keys");
    } finally {
      setLoading(false);
    }
  }

  async function clearMicrosoftKeys() {
    setLoading(true);
    setStatus("Clearing runtime Microsoft keys");
    try {
      const nextStatus = await postJson<MicrosoftKeyStatus>("/api/demo/microsoft-keys", { clear: true });
      setMicrosoftKeyStatus(nextStatus);
      setMicrosoftKeys(emptyMicrosoftKeyForm);
      await refreshAll();
      setStatus("Runtime Microsoft keys cleared");
    } catch (error) {
      console.error(error);
      setStatus("Could not clear Microsoft keys");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(customMessage = message) {
    setLoading(true);
    setStatus("Care-Jai is processing with the agent workflow");
    try {
      const result = await postJson<{ response: AgentResponse; summary: CareSummary }>("/api/agent/message", {
        message: customMessage,
      });
      setAgentResponse(result.response);
      setSummary(result.summary);
      setMessage(customMessage);
      await refreshAll();
      setStatus(result.response.integrationMode === "azure" ? "Responded with Azure OpenAI" : "Responded with fallback demo mode");
      await speak(result.response.reply);
    } catch (error) {
      console.error(error);
      setStatus("Could not send the message");
    } finally {
      setLoading(false);
    }
  }

  async function runScenario(scenario: DemoScenario) {
    setLoading(true);
    setStatus(`Running scenario: ${scenario}`);
    try {
      if (scenario === "scam_call" || scenario === "community_post") {
        await postJson<{ summary: CareSummary }>("/api/demo/reset", { scenario });
        setMessage(samplePrompts[scenario]);
        setPhoneApp(scenario === "scam_call" ? "safety" : "community");
        await refreshAll();
        setStatus(scenario === "scam_call" ? "Showing scam-call protection" : "Community post scenario is ready");
        return;
      }

      const result = await postJson<{ response: AgentResponse; summary: CareSummary }>(
        "/api/agent/checkin",
        checkinPayloads[scenario],
      );
      setAgentResponse(result.response);
      setSummary(result.summary);
      setMessage(checkinPayloads[scenario].message);
      await refreshAll();
      setStatus(result.response.escalatedAlert ? "Caregiver alert created" : "Check-in complete");
      await speak(result.response.reply);
    } catch (error) {
      console.error(error);
      setStatus("Could not run the scenario");
    } finally {
      setLoading(false);
    }
  }

  async function resetScenario(scenario: DemoScenario) {
    setLoading(true);
    setStatus(`Resetting demo data to ${scenario}`);
    try {
      await postJson<{ summary: CareSummary }>("/api/demo/reset", { scenario });
      setAgentResponse(undefined);
      setMessage(samplePrompts[scenario]);
      await refreshAll();
      setStatus("Demo data reset");
    } catch (error) {
      console.error(error);
      setStatus("Could not reset demo data");
    } finally {
      setLoading(false);
    }
  }

  async function startVerifiedCall(contactId: string) {
    setLoading(true);
    try {
      await postJson("/api/senior/verified-call", { contactId });
      await refreshAll();
      setPhoneApp("family");
      setStatus("Calling from the verified contact list");
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeAlert() {
    setLoading(true);
    try {
      await postJson("/api/family/ack-alert", {});
      await refreshAll();
      setStatus("Family acknowledged the alert");
    } finally {
      setLoading(false);
    }
  }

  async function createCommunityPost() {
    const body = communityDraft.trim();
    if (!body) {
      setStatus("Write a story before posting");
      return;
    }

    setLoading(true);
    setStatus("Posting a community story");
    try {
      await postJson<{ post: CommunityPost; communityPosts: CommunityPost[] }>("/api/senior/community/post", {
        body,
        category: "memory",
      });
      setCommunityDraft("");
      setPhoneApp("community");
      await refreshAll();
      setStatus("Community post created");
    } catch (error) {
      console.error(error);
      setStatus("Could not create the community post");
    } finally {
      setLoading(false);
    }
  }

  async function sendEncouragement(postId: string) {
    setLoading(true);
    setStatus("Sending encouragement");
    try {
      await postJson<{ communityPosts: CommunityPost[] }>("/api/senior/community/react", { postId });
      setPhoneApp("community");
      await refreshAll();
      setStatus("Encouragement sent");
    } catch (error) {
      console.error(error);
      setStatus("Could not send encouragement");
    } finally {
      setLoading(false);
    }
  }

  async function startVoiceCheckin() {
    setLoading(true);
    setSpeechStatus("Opening microphone");
    try {
      const speech = await fetch("/api/speech/token", { method: "POST" }).then((item) => item.json());
      if (speech.token && speech.region) {
        const sdk = await import("microsoft-cognitiveservices-speech-sdk");
        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(speech.token, speech.region);
        speechConfig.speechRecognitionLanguage = "en-US";
        const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizeOnceAsync(
          (result) => {
            recognizer.close();
            const transcript = result.text?.trim() || samplePrompts.normal;
            setSpeechStatus("Transcribed with Azure Speech");
            void sendMessage(transcript);
          },
          () => {
            recognizer.close();
            setSpeechStatus("Using a sample message instead of voice");
            void sendMessage(samplePrompts.normal);
          },
        );
        return;
      }

      setSpeechStatus("Azure Speech is not configured, using a sample message");
      await sendMessage(samplePrompts.normal);
    } catch (error) {
      console.error(error);
      setSpeechStatus("Using browser fallback for demo");
      await sendMessage(samplePrompts.normal);
    } finally {
      setLoading(false);
    }
  }

  async function speak(text: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const speech = await fetch("/api/speech/token", { method: "POST" }).then((item) => item.json());
      if (speech.token && speech.region) {
        const sdk = await import("microsoft-cognitiveservices-speech-sdk");
        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(speech.token, speech.region);
        speechConfig.speechSynthesisLanguage = "en-US";
        speechConfig.speechSynthesisVoiceName = summary?.persona.preferences.voiceName ?? "en-US-JennyNeural";
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
        synthesizer.speakTextAsync(
          text,
          () => {
            synthesizer.close();
            setSpeechStatus("Read aloud with Azure Speech");
          },
          () => {
            synthesizer.close();
            browserSpeak(text);
          },
        );
        return;
      }
    } catch {
      browserSpeak(text);
      return;
    }

    browserSpeak(text);
  }

  function browserSpeak(text: string) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
    setSpeechStatus("Read aloud with browser speech fallback");
  }

  const view = (() => {
    if (!summary || !familyReport || !dashboard) {
      return <LoadingPanel />;
    }

    if (activeView === "family") {
      return (
        <FamilyView
          report={familyReport}
          communityPosts={summary.communityPosts}
          onAck={acknowledgeAlert}
          onCall={startVerifiedCall}
          loading={loading}
        />
      );
    }

    if (activeView === "caregiver") {
      return <CaregiverDashboardView dashboard={dashboard} />;
    }

    if (activeView === "demo") {
      return (
        <DemoPanel
          loading={loading}
          message={message}
          microsoftKeys={microsoftKeys}
          microsoftKeyStatus={microsoftKeyStatus}
          onClearMicrosoftKeys={clearMicrosoftKeys}
          onMicrosoftKeyChange={(field, value) =>
            setMicrosoftKeys((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onMessageChange={setMessage}
          onReset={resetScenario}
          onRun={runScenario}
          onSaveMicrosoftKeys={saveMicrosoftKeys}
          onSend={sendMessage}
        />
      );
    }

    return (
      <SeniorPhoneView
        activeApp={phoneApp}
        response={agentResponse}
        summary={summary}
        message={message}
        communityDraft={communityDraft}
        loading={loading}
        speechStatus={speechStatus}
        onAppChange={setPhoneApp}
        onCall={startVerifiedCall}
        onCommunityDraftChange={setCommunityDraft}
        onCommunityPost={createCommunityPost}
        onEncourage={sendEncouragement}
        onMessageChange={setMessage}
        onSend={sendMessage}
        onVoice={startVoiceCheckin}
      />
    );
  })();

  return (
    <FluentProvider theme={webLightTheme}>
      <main className="app-shell">
        <section className="topbar" aria-label="Care-Jai demo header">
          <div className="brand-lockup">
            <div className="brand-mark">
              <PersonHeart24Regular />
            </div>
            <div>
              <Text className="eyebrow">Microsoft Azure AI Wellness Demo</Text>
              <h1>Care-Jai</h1>
            </div>
          </div>
          <div className="status-strip">
            <SeverityBadge severity={activeSeverity} />
            <Badge appearance="tint" color="brand">
              {status}
            </Badge>
            {loading ? <Spinner size="tiny" /> : null}
          </div>
        </section>

        <nav className="view-tabs" aria-label="Demo views">
          <Button appearance={activeView === "senior" ? "primary" : "secondary"} icon={<Mic24Regular />} onClick={() => setActiveView("senior")}>
            Senior
          </Button>
          <Button appearance={activeView === "family" ? "primary" : "secondary"} icon={<Phone24Regular />} onClick={() => setActiveView("family")}>
            Family
          </Button>
          <Button appearance={activeView === "caregiver" ? "primary" : "secondary"} icon={<PeopleCommunity24Regular />} onClick={() => setActiveView("caregiver")}>
            Caregiver
          </Button>
          <Button appearance={activeView === "demo" ? "primary" : "secondary"} icon={<Play24Regular />} onClick={() => setActiveView("demo")}>
            Demo Control
          </Button>
        </nav>

        <div className="workspace-grid">
          <aside className="side-rail">
            <Card className="profile-card">
              <div className="profile-icon" aria-hidden="true">
                <PersonHeart24Regular />
              </div>
              <div className="profile-copy">
                <Text weight="semibold">Care-Jai Demo Persona</Text>
                <Text size={200}>{summary?.persona.name ?? "Mrs. Somsri Jaidee"}</Text>
                <Text size={200}>Primary caregiver: {summary?.persona.caregiver.name ?? "May"} via Teams</Text>
              </div>
            </Card>
            <IntegrationPanel integrations={summary?.integrations} />
          </aside>
          <section className="main-panel">{view}</section>
        </div>
      </main>
    </FluentProvider>
  );
}

function LoadingPanel() {
  return (
    <Card className="panel-card center-panel">
      <Spinner label="Loading Care-Jai demo" />
    </Card>
  );
}

function IphoneFrame({
  children,
  bottomNav,
  label,
  className,
}: {
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={className ? `iphone-frame ${className}` : "iphone-frame"}>
      <span className="iphone-button volume" aria-hidden="true" />
      <span className="iphone-button power" aria-hidden="true" />
      <div className="iphone-bezel">
        <div className="dynamic-island" aria-hidden="true" />
        <div className="ios-status">
          <span>9:41</span>
          <span>{label}</span>
          <span>5G 92%</span>
        </div>
        <div className="iphone-screen">{children}</div>
        {bottomNav ? <div className="ios-tabbar">{bottomNav}</div> : null}
        <div className="home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
}

function SeniorPhoneView(props: {
  activeApp: PhoneApp;
  summary: CareSummary;
  response?: AgentResponse;
  message: string;
  communityDraft: string;
  loading: boolean;
  speechStatus: string;
  onAppChange: (app: PhoneApp) => void;
  onCall: (contactId: string) => Promise<void>;
  onCommunityDraftChange: (value: string) => void;
  onCommunityPost: () => Promise<void>;
  onEncourage: (postId: string) => Promise<void>;
  onMessageChange: (value: string) => void;
  onSend: (message?: string) => Promise<void>;
  onVoice: () => Promise<void>;
}) {
  return (
    <div className="senior-experience iphone-experience" data-testid="senior-phone-view">
      <IphoneFrame
        label="Care-Jai"
        bottomNav={
          <>
          <button type="button" onClick={() => props.onAppChange("home")}>Home</button>
          <button type="button" onClick={() => props.onAppChange("ai")}>AI</button>
          <button type="button" onClick={() => props.onAppChange("family")}>Family</button>
          </>
        }
      >
        {props.activeApp !== "home" ? (
          <button className="phone-back-home" type="button" onClick={() => props.onAppChange("home")}>
            ← Back home
          </button>
        ) : null}
        {props.activeApp === "home" ? <PhoneHome summary={props.summary} onAppChange={props.onAppChange} /> : null}
        {props.activeApp === "ai" ? (
          <PhoneAi
            response={props.response}
            message={props.message}
            loading={props.loading}
            speechStatus={props.speechStatus}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            onVoice={props.onVoice}
          />
        ) : null}
        {props.activeApp === "family" ? <PhoneFamily summary={props.summary} onCall={props.onCall} loading={props.loading} /> : null}
        {props.activeApp === "routine" ? <PhoneRoutine routines={props.summary.persona.routines} /> : null}
        {props.activeApp === "community" ? (
          <PhoneCommunity
            summary={props.summary}
            draft={props.communityDraft}
            loading={props.loading}
            onDraftChange={props.onCommunityDraftChange}
            onEncourage={props.onEncourage}
            onPost={props.onCommunityPost}
          />
        ) : null}
        {props.activeApp === "safety" ? <PhoneSafety summary={props.summary} onCall={props.onCall} loading={props.loading} /> : null}
      </IphoneFrame>

      <Card className="panel-card senior-side-panel">
        <CardHeader header={<h3>Device Status</h3>} description="What the system can see from the senior app experience" />
        <div className="device-status-grid">
          <Metric label="Wellness score" value={props.summary.dailyScore.toString()} />
          <Metric label="Routines today" value={`${props.summary.persona.routines.filter((item) => item.status === "done").length}/${props.summary.persona.routines.length}`} />
        </div>
        <div className="feature-list">
          <FeatureRow title="Verified contacts" body={`${props.summary.persona.familyContacts.length} trusted contacts for safer callbacks`} />
          <FeatureRow title="Latest call" body={props.summary.latestCallSignal?.guidance ?? "No incoming call needs review"} />
          <FeatureRow title="AI guardrail" body="Wellness-only guidance, no diagnosis, and human escalation for high-risk signals" />
        </div>
      </Card>
    </div>
  );
}

function PhoneHome({ summary, onAppChange }: { summary: CareSummary; onAppChange: (app: PhoneApp) => void }) {
  const completed = summary.persona.routines.filter((item) => item.status === "done").length;
  const primaryAlert = summary.alerts[0];

  return (
    <div className="phone-app">
      <div className="care-home-header">
        <div>
          <Text size={100}>{formatFullDate(new Date())}</Text>
          <h2>Care-Jai</h2>
        </div>
        <div className="mini-avatar">{summary.persona.shortName.slice(0, 1)}</div>
      </div>

      <div className="today-card">
        <div>
          <Text size={100}>Good afternoon, {summary.persona.shortName}</Text>
          <strong>{summary.dailyScore}</strong>
          <Text size={100}>wellness score today</Text>
        </div>
        <div className="ring-score" aria-hidden="true">
          {completed}/{summary.persona.routines.length}
        </div>
      </div>

      <button className="emergency-button" type="button" onClick={() => onAppChange("safety")}>
        Get help
      </button>

      <section className="ios-section">
        <div className="ios-section-title">
          <Text weight="semibold">Latest alert</Text>
          <Badge appearance="tint">{summary.alerts.length}</Badge>
        </div>
        <div className={primaryAlert ? "ios-notification warning" : "ios-notification"}>
          <Text weight="semibold">{primaryAlert?.reason ?? "No urgent issue today"}</Text>
          <Text size={100}>{primaryAlert?.recommendedAction ?? "Care-Jai keeps routines, connection, and safety visible throughout the day."}</Text>
        </div>
      </section>

      <div className="ios-list-card">
        <div className="ios-list-cell">
          <span>Next plan</span>
          <strong>Video call with May 19:00</strong>
        </div>
        <div className="ios-list-cell">
          <span>Latest call</span>
          <strong>{summary.latestCallSignal?.callerName ?? "No incoming call"}</strong>
        </div>
      </div>

      <div className="phone-app-grid">
        <PhoneAppButton label="Talk to Care-Jai" icon={<Bot24Regular />} onClick={() => onAppChange("ai")} />
        <PhoneAppButton label="Call Family" icon={<Phone24Regular />} onClick={() => onAppChange("family")} />
        <PhoneAppButton label="Today Routine" icon={<ShieldCheckmark24Regular />} onClick={() => onAppChange("routine")} />
        <PhoneAppButton label="Community" icon={<PeopleCommunity24Regular />} onClick={() => onAppChange("community")} />
        <PhoneAppButton label="Check Scam Call" icon={<Warning24Regular />} onClick={() => onAppChange("safety")} wide />
      </div>
    </div>
  );
}

function PhoneAppButton(props: { label: string; icon: React.ReactNode; wide?: boolean; onClick: () => void }) {
  return (
    <button className={props.wide ? "phone-app-button wide" : "phone-app-button"} type="button" onClick={props.onClick}>
      <span>{props.icon}</span>
      <strong>{props.label}</strong>
    </button>
  );
}

function PhoneAi(props: {
  response?: AgentResponse;
  message: string;
  loading: boolean;
  speechStatus: string;
  onMessageChange: (value: string) => void;
  onSend: (message?: string) => Promise<void>;
  onVoice: () => Promise<void>;
}) {
  return (
    <div className="phone-app phone-chat">
      <div className="app-title-row">
        <div>
          <Text size={100}>Private check-in</Text>
          <h3>Talk to Care-Jai</h3>
        </div>
        <Badge appearance="tint" color="success">Safe</Badge>
      </div>
      <div className="chat-bubble user">I want to check in today.</div>
      <div className="chat-bubble ai">
        {props.response?.reply ?? "Hi Somsri. What would you like Care-Jai to help with today?"}
      </div>
      <Textarea value={props.message} onChange={(_, data) => props.onMessageChange(data.value)} resize="vertical" />
      <div className="button-row">
        <Button appearance="primary" icon={<Mic24Regular />} disabled={props.loading} onClick={props.onVoice}>Speak</Button>
        <Button icon={<Send24Regular />} disabled={props.loading} onClick={() => props.onSend()}>Send</Button>
      </div>
      <Text size={100}>{props.speechStatus}</Text>
    </div>
  );
}

function PhoneFamily({ summary, onCall, loading }: { summary: CareSummary; loading: boolean; onCall: (contactId: string) => Promise<void> }) {
  return (
    <div className="phone-app">
      <div className="app-title-row">
        <div>
          <Text size={100}>Call only verified contacts</Text>
          <h3>Family</h3>
        </div>
      </div>
      <div className="contact-list">
        {summary.persona.familyContacts.map((contact) => (
          <div className="contact-row" key={contact.id}>
            <div className="avatar">{contact.avatar}</div>
            <div>
              <Text weight="semibold">{contact.name}</Text>
              <Text size={100}>{contact.relationship} · {contact.lastContact}</Text>
              <Badge appearance="tint" color="success">Verified</Badge>
            </div>
            <Button size="small" appearance="primary" disabled={loading} onClick={() => onCall(contact.id)}>Call</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneRoutine({ routines }: { routines: RoutineItem[] }) {
  return (
    <div className="phone-app">
      <div className="app-title-row">
        <div>
          <Text size={100}>Simple routine support</Text>
          <h3>Today Routine</h3>
        </div>
      </div>
      <div className="ios-list-card routine-list">
        {routines.map((routine) => (
          <div className="ios-list-cell routine-cell" key={routine.id}>
            <Badge appearance="filled" color={routine.status === "done" ? "success" : routine.status === "missed" ? "danger" : "informative"}>
              {routine.status === "done" ? "Done" : routine.status === "missed" ? "Missed" : "Soon"}
            </Badge>
            <div>
              <Text weight="semibold">{routine.title}</Text>
              <Text size={100}>{routine.time}</Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneCommunity({
  summary,
  draft,
  loading,
  onDraftChange,
  onEncourage,
  onPost,
}: {
  summary: CareSummary;
  draft: string;
  loading: boolean;
  onDraftChange: (value: string) => void;
  onEncourage: (postId: string) => Promise<void>;
  onPost: () => Promise<void>;
}) {
  return (
    <div className="phone-app">
      <div className="app-title-row">
        <div>
          <Text size={100}>Stories from peers</Text>
          <h3>Warm Community</h3>
        </div>
      </div>
      <div className="community-composer">
        <div>
          <Text weight="semibold">Share a good moment</Text>
          <Text size={100}>Post a simple story and receive encouragement from peers.</Text>
        </div>
        <Textarea
          aria-label="Community post message"
          resize="vertical"
          value={draft}
          onChange={(_, data) => onDraftChange(data.value)}
        />
        <Button appearance="primary" icon={<Send24Regular />} disabled={loading || !draft.trim()} onClick={onPost}>
          Post
        </Button>
      </div>
      <div className="community-feed">
        {summary.communityPosts.map((post) => (
          <div className="community-post" key={post.id}>
            <Text weight="semibold">{post.title}</Text>
            <Text size={100}>By {post.author} · {formatTime(post.timestamp)}</Text>
            <p>{post.body}</p>
            <div className="community-actions">
              <Badge appearance="tint">{post.reactions} encouragements</Badge>
              <Button
                appearance="secondary"
                icon={<PersonHeart24Regular />}
                size="small"
                disabled={loading}
                onClick={() => onEncourage(post.id)}
              >
                Encourage
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneSafety({ summary, onCall, loading }: { summary: CareSummary; loading: boolean; onCall: (contactId: string) => Promise<void> }) {
  const signal = summary.latestCallSignal;
  return (
    <div className="phone-app">
      <div className="app-title-row">
        <div>
          <Text size={100}>Protect against family impersonation</Text>
          <h3>Check Incoming Call</h3>
        </div>
      </div>
      <div className={signal?.verified ? "call-signal safe" : "call-signal suspicious"}>
        <Text size={100}>Latest call</Text>
        <strong>{signal?.callerName ?? "No incoming call"}</strong>
        <Text>{signal?.phone}</Text>
        <p>{signal?.guidance ?? "Care-Jai compares callers with the verified family contact list."}</p>
      </div>
      {!signal?.verified ? (
        <Button appearance="primary" icon={<Phone24Regular />} disabled={loading} onClick={() => onCall("may")}>
          Call May from trusted contacts
        </Button>
      ) : null}
    </div>
  );
}

function FamilyView(props: {
  report: FamilyReport;
  communityPosts: CareSummary["communityPosts"];
  loading: boolean;
  onAck: () => Promise<void>;
  onCall: (contactId: string) => Promise<void>;
}) {
  const primaryAlert = props.report.alerts[0];
  const callSignal = props.report.latestCallSignal;

  return (
    <div className="family-experience iphone-experience" data-testid="family-view">
      <IphoneFrame
        label="Family"
        className="family-iphone"
        bottomNav={
          <>
            <button type="button">Today</button>
            <button type="button">Alerts</button>
            <button type="button">Call</button>
          </>
        }
      >
        <div className="family-phone-app">
          <div className="family-app-header">
            <Text size={100}>{formatFullDate(new Date(props.report.updatedAt))}</Text>
            <h2>Today</h2>
            <Badge appearance="filled" color={primaryAlert ? "warning" : "success"}>
              {primaryAlert ? "Follow up" : "Stable"}
            </Badge>
          </div>

          <div className="family-score-card">
            <div>
              <Text size={100}>Today score</Text>
              <strong>{props.report.dailyScore}</strong>
            </div>
            <p>{props.report.reassurance}</p>
          </div>

          <section className="ios-section">
            <div className="ios-section-title">
              <Text weight="semibold">Summary report</Text>
              <Text size={100}>{formatTime(props.report.updatedAt)}</Text>
            </div>
            <div className="ios-list-card">
              <p>{props.report.headline}</p>
              <div className="ios-list-cell">
                <span>Senior</span>
                <strong>{props.report.persona.name}</strong>
              </div>
              <div className="ios-list-cell">
                <span>Primary caregiver</span>
                <strong>{props.report.persona.caregiver.name}</strong>
              </div>
              <div className="next-action-list">
                {props.report.nextActions.map((action) => (
                  <span key={action}>{action}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="ios-section">
            <div className="ios-section-title">
              <Text weight="semibold">Alerts</Text>
              <Badge appearance="tint">{props.report.alerts.length}</Badge>
            </div>
            {primaryAlert ? (
              <div className="ios-notification warning">
                <Text weight="semibold">{primaryAlert.reason}</Text>
                <Text size={100}>{primaryAlert.recommendedAction}</Text>
                <div className="button-row">
                  <Button size="small" appearance="primary" disabled={props.loading} onClick={props.onAck}>Acknowledge</Button>
                  <Button size="small" icon={<Phone24Regular />} disabled={props.loading} onClick={() => props.onCall("may")}>Call</Button>
                </div>
              </div>
            ) : (
              <div className="ios-notification">
                <Text weight="semibold">No urgent issue</Text>
                <Text size={100}>Care-Jai continues to monitor routines and connection.</Text>
              </div>
            )}
          </section>

          <section className="ios-section">
            <div className="ios-section-title">
              <Text weight="semibold">Trusted call</Text>
              <SeverityBadge severity={callSignal?.verified ? "low" : "medium"} />
            </div>
            <div className={callSignal?.verified ? "ios-call-card safe" : "ios-call-card suspicious"}>
              <Text weight="semibold">{callSignal?.callerName ?? "No incoming call"}</Text>
              <Text size={100}>{callSignal?.guidance}</Text>
            </div>
          </section>
        </div>
      </IphoneFrame>

      <div className="family-side-stack">
        <Card className="panel-card">
          <CardHeader image={<Phone24Regular />} header={<h3>Family View</h3>} description="A quick iPhone-style report for family members who need a simple, reassuring view." />
          <div className="metric-row">
            <Metric label="Today score" value={props.report.dailyScore.toString()} />
            <Metric label="Alerts" value={props.report.alerts.length.toString()} />
            <Metric label="Trusted contacts" value={props.report.persona.familyContacts.length.toString()} />
          </div>
        </Card>

        <Card className="panel-card">
          <CardHeader image={<PeopleCommunity24Regular />} header={<h3>Good Moments Shared</h3>} />
          <div className="community-row compact-community-row">
            {props.communityPosts.slice(0, 2).map((post) => (
              <div className="community-post" key={post.id}>
                <Text weight="semibold">{post.title}</Text>
                <p>{post.body}</p>
                <Badge appearance="tint">{post.reactions} encouragements</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function FamilyAlert({ alert }: { alert: CareAlert }) {
  return (
    <div className="alert-item">
      <SeverityBadge severity={alert.severity} />
      <Text weight="semibold">{alert.reason}</Text>
      <Text size={200}>{alert.recommendedAction}</Text>
      <Text size={100}>Status: {alert.humanReviewStatus === "acknowledged" ? "Acknowledged" : "Waiting for review"}</Text>
    </div>
  );
}

function CaregiverDashboardView({ dashboard }: { dashboard: CaregiverDashboard }) {
  return (
    <div className="caregiver-grid" data-testid="caregiver-dashboard">
      <Card className="panel-card span-2">
        <CardHeader image={<Bot24Regular />} header={<h3>Real-Time Caregiver Dashboard</h3>} description="A deeper operational view with evidence, care plan, and safety guardrails." />
        <p>{dashboard.summary.aiSummary}</p>
        <div className="vital-grid">
          {dashboard.vitals.map((vital) => (
            <div className={`vital-card ${vital.trend}`} key={vital.label}>
              <Text size={200}>{vital.label}</Text>
              <strong>{vital.value}</strong>
              <Text size={100}>{vital.detail}</Text>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel-card">
        <CardHeader image={<Warning24Regular />} header={<h3>Alert Queue</h3>} />
        <div className="stack">
          {dashboard.summary.alerts.length ? dashboard.summary.alerts.map((alert) => <FamilyAlert alert={alert} key={alert.id} />) : <p className="muted">No active alerts</p>}
        </div>
      </Card>

      <Card className="panel-card">
        <CardHeader image={<ShieldCheckmark24Regular />} header={<h3>AI Safety Checks</h3>} />
        <ul className="guardrail-list">
          {dashboard.safetyChecks.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Card>

      <Card className="panel-card">
        <CardHeader header={<h3>Risk Analysis</h3>} />
        <div className="stack">
          {dashboard.riskAnalysis.map((risk) => (
            <div className="risk-row" key={`${risk.factor}-${risk.evidence}`}>
              <SeverityDot severity={risk.severity} />
              <div>
                <Text weight="semibold">{risk.factor}</Text>
                <Text size={200}>{risk.evidence}</Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel-card">
        <CardHeader header={<h3>Care Plan</h3>} />
        <ol className="care-plan">
          {dashboard.carePlan.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </Card>

      <Timeline events={dashboard.summary.events} />
    </div>
  );
}

function DemoPanel(props: {
  loading: boolean;
  message: string;
  microsoftKeys: MicrosoftKeyForm;
  microsoftKeyStatus?: MicrosoftKeyStatus;
  onClearMicrosoftKeys: () => Promise<void>;
  onMicrosoftKeyChange: (field: MicrosoftKeyField, value: string) => void;
  onMessageChange: (value: string) => void;
  onReset: (scenario: DemoScenario) => Promise<void>;
  onRun: (scenario: DemoScenario) => Promise<void>;
  onSaveMicrosoftKeys: () => Promise<void>;
  onSend: (message?: string) => Promise<void>;
}) {
  const scenarios: DemoScenario[] = ["normal", "missed_medicine", "high_risk", "scam_call", "community_post"];
  const hasKeyInput = Object.values(props.microsoftKeys).some((value) => value.trim().length > 0);
  return (
    <div className="demo-grid" data-testid="demo-panel">
      <Card className="panel-card span-3">
        <CardHeader
          image={<ShieldCheckmark24Regular />}
          header={<h3>Microsoft Runtime Keys</h3>}
          description="Paste Azure keys for this local demo session. Values are kept in server memory only and are not written to .env files."
        />
        <div className="key-status-grid">
          <KeyStatus label="Azure OpenAI" ready={props.microsoftKeyStatus?.openAi} />
          <KeyStatus label="Azure Speech" ready={props.microsoftKeyStatus?.speech} />
          <KeyStatus label="Cosmos DB" ready={props.microsoftKeyStatus?.cosmos} />
          <KeyStatus label="AI Search" ready={props.microsoftKeyStatus?.search} />
          <KeyStatus label="Content Safety" ready={props.microsoftKeyStatus?.contentSafety} />
          <KeyStatus label="App Insights" ready={props.microsoftKeyStatus?.appInsights} />
        </div>
        <div className="key-form-grid">
          {microsoftKeyFields.map((item) => (
            <label className={item.field === "applicationInsightsConnectionString" ? "key-field wide" : "key-field"} key={item.field}>
              <span>
                {item.label}
                {props.microsoftKeyStatus?.runtimeOverrides?.[item.field] ? <Badge appearance="tint" color="success">Runtime set</Badge> : null}
              </span>
              <Input
                type={item.secret ? "password" : "text"}
                value={props.microsoftKeys[item.field]}
                placeholder={item.placeholder}
                onChange={(_, data) => props.onMicrosoftKeyChange(item.field, data.value)}
              />
            </label>
          ))}
        </div>
        <div className="button-row">
          <Button appearance="primary" disabled={props.loading || !hasKeyInput} onClick={props.onSaveMicrosoftKeys}>
            Save runtime keys
          </Button>
          <Button disabled={props.loading} onClick={props.onClearMicrosoftKeys}>
            Clear runtime keys
          </Button>
        </div>
      </Card>

      {scenarios.map((scenario) => (
        <Card className="scenario-card" key={scenario}>
          <CardHeader image={scenario === "high_risk" || scenario === "scam_call" ? <Warning24Regular /> : <Play24Regular />} header={<h3>{scenarioLabel(scenario)}</h3>} description={scenarioDescription(scenario)} />
          <div className="button-row">
            <Button icon={<TabDesktopArrowClockwise24Regular />} data-testid={`reset-${scenario}`} disabled={props.loading} onClick={() => props.onReset(scenario)}>Reset</Button>
            <Button appearance="primary" icon={<Play24Regular />} data-testid={`run-${scenario}`} disabled={props.loading} onClick={() => props.onRun(scenario)}>Run</Button>
          </div>
        </Card>
      ))}

      <Card className="panel-card span-3">
        <CardHeader header={<h3>Live Prompt Override</h3>} description="Use this for a controlled live prompt while fallback mode remains reliable." />
        <Textarea value={props.message} resize="vertical" size="large" onChange={(_, data) => props.onMessageChange(data.value)} />
        <div className="button-row">
          {scenarios.map((scenario) => (
            <Button key={scenario} disabled={props.loading} onClick={() => props.onMessageChange(samplePrompts[scenario])}>
              {scenarioLabel(scenario)}
            </Button>
          ))}
          <Button appearance="primary" icon={<Send24Regular />} disabled={props.loading} onClick={() => props.onSend()}>
            Send to Agent
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FeatureRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="feature-row">
      <ShieldCheckmark24Regular />
      <div>
        <Text weight="semibold">{title}</Text>
        <Text size={200}>{body}</Text>
      </div>
    </div>
  );
}

function KeyStatus({ label, ready }: { label: string; ready?: boolean }) {
  return (
    <div className="key-status-item">
      <Text size={100}>{label}</Text>
      <Badge appearance="tint" color={ready ? "success" : "subtle"}>
        {ready ? "Configured" : "Not set"}
      </Badge>
    </div>
  );
}

function Timeline({ events }: { events: CareEvent[] }) {
  return (
    <Card className="panel-card span-2">
      <CardHeader header={<h3>Risk Timeline</h3>} description="Latest simulated data from routines, mood, vitals, and the agent" />
      <div className="timeline">
        {events.map((event) => (
          <div className="timeline-item" key={event.id}>
            <SeverityDot severity={event.severity} />
            <div>
              <Text weight="semibold">{event.label}</Text>
              <Text size={200}>{event.note}</Text>
              <Text size={100}>{formatTime(event.timestamp)}</Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IntegrationPanel({ integrations }: { integrations?: Record<string, IntegrationMode> }) {
  return (
    <Card className="panel-card integration-card">
      <CardHeader image={<ShieldCheckmark24Regular />} header={<h3>Microsoft AI Stack</h3>} />
      <div className="stack">
        {Object.entries(integrationLabels).map(([key, label]) => (
          <div className="integration-row" key={key}>
            <Text size={200}>{label}</Text>
            <IntegrationBadge mode={integrations?.[key] ?? "not_configured"} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <Text size={200}>{label}</Text>
      <strong>{value}</strong>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  return (
    <Badge appearance="filled" color={severity === "high" ? "danger" : severity === "medium" ? "warning" : "success"}>
      {severity === "high" ? "Urgent" : severity === "medium" ? "Watch" : "Stable"}
    </Badge>
  );
}

function SeverityDot({ severity }: { severity: "low" | "medium" | "high" }) {
  return <span className={`severity-dot ${severity}`} aria-hidden="true" />;
}

function IntegrationBadge({ mode }: { mode: IntegrationMode }) {
  return (
    <Badge appearance="tint" color={mode === "azure" ? "success" : mode === "fallback" ? "warning" : "subtle"}>
      {mode === "azure" ? "Azure" : mode === "fallback" ? "Fallback" : "Not set"}
    </Badge>
  );
}

function scenarioLabel(scenario: DemoScenario) {
  if (scenario === "missed_medicine") return "Missed Medicine";
  if (scenario === "high_risk") return "High-Risk Check";
  if (scenario === "scam_call") return "Scam Call";
  if (scenario === "community_post") return "Community Post";
  return "Normal Day";
}

function scenarioDescription(scenario: DemoScenario) {
  if (scenario === "missed_medicine") return "Create a medium alert from a missed routine and simulated blood pressure.";
  if (scenario === "high_risk") return "Test guardrails and human-in-the-loop escalation.";
  if (scenario === "scam_call") return "Show protection against family impersonation calls.";
  if (scenario === "community_post") return "Show social wellness through a senior community story.";
  return "Show a calm daily check-in and supportive AI response.";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatFullDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
}
