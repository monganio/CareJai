# Care-Jai Azure AI Wellness Demo

Care-Jai is a Thai-first demo web app for a proactive, empathetic wellness assistant for older adults and caregivers. It is designed for live presentation: the app works in fallback mode out of the box, and uses real Azure AI services when environment variables are configured.

## What the demo shows

- Senior Mode: Thai voice/text check-in, routine reminders, and warm AI responses.
- Caregiver Dashboard: risk timeline, AI summary, alerts, and responsible AI guardrails.
- Demo Control: deterministic scenarios for a normal day, missed medicine, and high-risk escalation.

## Microsoft/Azure integrations

- Azure OpenAI in Microsoft Foundry for agent responses.
- Azure AI Speech for Thai speech-to-text and text-to-speech.
- Azure Cosmos DB for demo state persistence.
- Azure AI Search for grounded care snippets.
- Azure AI Content Safety for prompt safety checks.
- Application Insights ingestion for lightweight demo telemetry.

Every integration has a fallback path so the demo remains presentable when a key or service is unavailable.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Azure App Service deployment notes

1. Create an Azure App Service for Node.js 24 or a compatible current Node LTS.
2. Set the environment variables from `.env.example` in App Service Configuration.
3. Build with `npm run build`.
4. Start with `npm run start`.

## Safety boundary

This demo uses simulated data only. Care-Jai is framed as a wellness and caregiver-support experience, not a medical device or diagnostic system. High-risk flows route to human review and emergency guidance instead of medical diagnosis.
