import { CosmosClient, type Container } from "@azure/cosmos";
import { buildDemoState } from "./demo-data";
import { configured, env } from "./env";
import type { DemoScenario, DemoState } from "./types";

interface DemoStateDocument extends DemoState {
  id: string;
  type: "state";
}

interface GlobalState {
  memoryState?: DemoState;
  cosmosUnavailable?: boolean;
}

const globalState = globalThis as typeof globalThis & { careJaiDemo?: GlobalState };
globalState.careJaiDemo ??= {};

function getMemoryState(): DemoState {
  const currentState = globalState.careJaiDemo?.memoryState;
  if (currentState) {
    const normalizedState = normalizeState(currentState);
    if (normalizedState !== currentState) {
      setMemoryState(normalizedState);
    }
    return normalizedState;
  }

  const nextState = buildDemoState("normal");
  setMemoryState(nextState);
  return nextState;
}

function setMemoryState(state: DemoState) {
  globalState.careJaiDemo = {
    ...globalState.careJaiDemo,
    memoryState: state,
  };
}

function normalizeState(state: DemoState): DemoState {
  const legacyText = JSON.stringify({
    persona: state.persona,
    events: state.events,
    alerts: state.alerts,
    lastAgentResponse: state.lastAgentResponse,
  }).toLowerCase();

  if (
    legacyText.includes("blood pressure") ||
    legacyText.includes("mmhg") ||
    legacyText.includes("wellness check-in signals")
  ) {
    return buildDemoState(state.scenario);
  }

  return state;
}

async function getCosmosContainer(): Promise<Container | undefined> {
  if (!configured(env.cosmosEndpoint, env.cosmosKey) || globalState.careJaiDemo?.cosmosUnavailable) {
    return undefined;
  }

  try {
    const client = new CosmosClient({
      endpoint: env.cosmosEndpoint!,
      key: env.cosmosKey!,
    });
    const { database } = await client.databases.createIfNotExists({ id: env.cosmosDatabase });
    const { container } = await database.containers.createIfNotExists({
      id: env.cosmosContainer,
      partitionKey: {
        paths: ["/type"],
      },
    });

    return container;
  } catch (error) {
    console.warn("Cosmos DB unavailable, using in-memory demo state.", error);
    globalState.careJaiDemo = {
      ...globalState.careJaiDemo,
      cosmosUnavailable: true,
    };
    return undefined;
  }
}

export async function loadDemoState(): Promise<{ state: DemoState; usedCosmos: boolean }> {
  const container = await getCosmosContainer();

  if (!container) {
    return { state: getMemoryState(), usedCosmos: false };
  }

  try {
    const { resource } = await container.item("demo-state", "state").read<DemoStateDocument>();
    if (resource) {
      const state = normalizeState({
        scenario: resource.scenario,
        persona: resource.persona,
        events: resource.events,
        alerts: resource.alerts,
        communityPosts: resource.communityPosts ?? [],
        latestCallSignal: resource.latestCallSignal,
        lastAgentResponse: resource.lastAgentResponse,
        updatedAt: resource.updatedAt,
      });

      if (state.updatedAt !== resource.updatedAt) {
        await saveDemoState(state);
      }

      return { state, usedCosmos: true };
    }
  } catch {
    // A missing document is expected on first run.
  }

  const state = getMemoryState();
  await saveDemoState(state);
  return { state, usedCosmos: true };
}

export async function saveDemoState(state: DemoState): Promise<{ usedCosmos: boolean }> {
  const nextState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  setMemoryState(nextState);

  const container = await getCosmosContainer();
  if (!container) {
    return { usedCosmos: false };
  }

  try {
    const document: DemoStateDocument = {
      ...nextState,
      id: "demo-state",
      type: "state",
    };
    await container.items.upsert(document);
    return { usedCosmos: true };
  } catch (error) {
    console.warn("Could not persist demo state to Cosmos DB.", error);
    globalState.careJaiDemo = {
      ...globalState.careJaiDemo,
      cosmosUnavailable: true,
    };
    return { usedCosmos: false };
  }
}

export async function resetDemoState(scenario: DemoScenario = "normal") {
  const state = buildDemoState(scenario);
  const { usedCosmos } = await saveDemoState(state);

  return { state, usedCosmos };
}

export function resetCosmosAvailability() {
  globalState.careJaiDemo = {
    ...globalState.careJaiDemo,
    cosmosUnavailable: false,
  };
}
