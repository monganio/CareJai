import { NextResponse } from "next/server";
import { getIntegrationSnapshot, integrationMode } from "@/lib/env";
import { summarizeState } from "@/lib/demo-data";
import { loadDemoState, saveDemoState } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { postId?: string };
    const { state, usedCosmos } = await loadDemoState();
    const targetPostId = body.postId ?? state.communityPosts[0]?.id;
    const nextPosts = state.communityPosts.map((post) =>
      post.id === targetPostId
        ? {
            ...post,
            reactions: post.reactions + 1,
          }
        : post,
    );
    const nextState = {
      ...state,
      communityPosts: nextPosts,
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveDemoState(nextState);

    return NextResponse.json({
      communityPosts: nextPosts,
      summary: summarizeState(nextState, {
        ...getIntegrationSnapshot(),
        cosmos: integrationMode(usedCosmos || saved.usedCosmos, usedCosmos || saved.usedCosmos),
      }),
    });
  } catch (error) {
    console.error("POST /api/senior/community/react failed", error);
    return NextResponse.json({ error: "Care-Jai could not send encouragement." }, { status: 500 });
  }
}
