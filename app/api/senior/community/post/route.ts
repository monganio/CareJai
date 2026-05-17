import { NextResponse } from "next/server";
import { getIntegrationSnapshot, integrationMode } from "@/lib/env";
import { summarizeState } from "@/lib/demo-data";
import { loadDemoState, saveDemoState } from "@/lib/store";
import type { CareEvent, CommunityPost } from "@/lib/types";

export const runtime = "nodejs";

const categories = new Set<CommunityPost["category"]>(["memory", "food", "garden", "music", "health"]);

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 280) : fallback;
}

function createTitle(body: string) {
  const firstLine = body.split(/\r?\n/)[0]?.trim() || "A good moment today";
  return firstLine.length > 32 ? `${firstLine.slice(0, 32)}...` : firstLine;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      category?: CommunityPost["category"];
    };
    const { state, usedCosmos } = await loadDemoState();
    const postBody = cleanText(body.body, "I have a small good moment to share with the community today.");
    const now = new Date().toISOString();
    const post: CommunityPost = {
      id: `post-${Date.now()}`,
      author: state.persona.shortName,
      title: cleanText(body.title, createTitle(postBody)).slice(0, 72),
      body: postBody,
      category: categories.has(body.category ?? "memory") ? body.category ?? "memory" : "memory",
      reactions: 0,
      timestamp: now,
    };
    const event: CareEvent = {
      id: `community-post-${Date.now()}`,
      personaId: state.persona.id,
      kind: "message",
      label: "Community story shared",
      note: `${state.persona.shortName} posted in the warm community: ${post.title}`,
      severity: "low",
      timestamp: now,
      source: "senior",
    };
    const nextState = {
      ...state,
      scenario: "community_post" as const,
      communityPosts: [post, ...state.communityPosts].slice(0, 12),
      events: [event, ...state.events].slice(0, 30),
      updatedAt: now,
    };
    const saved = await saveDemoState(nextState);

    return NextResponse.json({
      post,
      communityPosts: nextState.communityPosts,
      summary: summarizeState(nextState, {
        ...getIntegrationSnapshot(),
        cosmos: integrationMode(usedCosmos || saved.usedCosmos, usedCosmos || saved.usedCosmos),
      }),
    });
  } catch (error) {
    console.error("POST /api/senior/community/post failed", error);
    return NextResponse.json({ error: "Care-Jai could not create the community post." }, { status: 500 });
  }
}
