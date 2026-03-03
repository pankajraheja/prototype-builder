import { NextRequest, NextResponse } from "next/server";
import { db, cache } from "@/lib/db";
import {
  elements as elementsTable,
  screens,
  chatMessages,
  auditTrail,
} from "../../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateScreen } from "@/lib/ai-engine";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidDbId(id?: string): id is string {
  return !!id && UUID_RE.test(id);
}

// POST /api/ai/generate — generate a full screen from a prompt
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prompt, fileContent, fileName, mimeType, screenId } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  try {
    // Build file context if provided
    const fileContext =
      fileContent && fileName
        ? { fileName, content: fileContent, mimeType: mimeType || "text/plain" }
        : undefined;

    // Generate screen via AI engine
    const { elements: newElements, explanation } = await generateScreen(
      prompt,
      fileContext
    );

    const latencyMs = Date.now() - startTime;

    // ── Persist to DB if screenId provided ──
    if (isValidDbId(screenId)) {
      // Save elements (same pattern as screens API: delete + re-insert)
      await db
        .delete(elementsTable)
        .where(eq(elementsTable.screenId, screenId));

      if (newElements.length > 0) {
        await db.insert(elementsTable).values(
          newElements.map((el, i) => ({
            id: el.id,
            screenId,
            type: el.type,
            label: el.label,
            sortOrder: i,
            visible: el.visible ?? true,
            locked: el.locked ?? false,
            props: el.props,
          }))
        );
      }

      // Update screen timestamp
      await db
        .update(screens)
        .set({ updatedAt: new Date() })
        .where(eq(screens.id, screenId));

      await cache.del(`screen:${screenId}`);

      // Persist chat message pair
      const summary = `${explanation}\n\nGenerated ${newElements.length} components`;
      db.insert(chatMessages)
        .values([
          { screenId, role: "user", content: prompt, metadata: {} },
          {
            screenId,
            role: "assistant",
            content: summary,
            metadata: {
              action: "generate_screen",
              latencyMs,
              changes: { elementCount: newElements.length },
            },
          },
        ])
        .catch((e) => console.warn("Failed to persist chat:", e));

      // Write audit trail entry
      db.insert(auditTrail)
        .values({
          entityType: "screen",
          entityId: screenId,
          action: "screen_generated",
          actorName: "ai",
          actorRole: "system",
          newValues: {
            prompt,
            elementCount: newElements.length,
            elementTypes: newElements.map((el) => el.type),
            hasFileContext: !!fileContext,
          },
          metadata: {
            latencyMs,
            fileName: fileContext?.fileName,
          },
        })
        .catch((e) => console.warn("Failed to write audit trail:", e));
    }

    return NextResponse.json({
      data: {
        elements: newElements,
        explanation,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
