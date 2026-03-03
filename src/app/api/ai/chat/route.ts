import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages } from "../../../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  streamChatWithLLM,
  parseChatLocally,
  applyCommand,
  hasLLMKey,
  generateScreen,
  ChatHistoryMessage,
} from "@/lib/ai-engine";
import { AIEditCommand, ScreenElement } from "@/types";

// ── Fetch recent conversation history from DB ───────────
async function fetchConversationHistory(
  screenId: string,
  limit = 10
): Promise<ChatHistoryMessage[]> {
  try {
    const rows = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.screenId, screenId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    // Rows come newest-first, reverse to chronological order
    return rows
      .reverse()
      .filter((r) => r.role === "user" || r.role === "assistant")
      .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
  } catch (e) {
    console.warn("Failed to fetch chat history:", e);
    return [];
  }
}

export const dynamic = "force-dynamic";

// Screen IDs from the local fallback are like "local-1234567890" — not valid UUIDs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidDbId(id?: string): id is string {
  return !!id && UUID_RE.test(id);
}

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function persistChat(
  screenId: string,
  message: string,
  explanation: string,
  commands: AIEditCommand[],
  latencyMs: number
) {
  db.insert(chatMessages)
    .values([
      { screenId, role: "user", content: message, metadata: {} },
      {
        screenId,
        role: "assistant",
        content: explanation,
        metadata: {
          action: commands[0]?.action,
          targetElementId: commands[0]?.targetId,
          targetElementType: commands[0]?.elementType,
          changes: commands[0]?.properties,
          latencyMs,
        },
      },
    ])
    .catch((e) => console.warn("Failed to persist chat:", e));
}

// POST /api/ai/chat — SSE streaming chat endpoint
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    message,
    elements,
    selectedId,
    screenId,
    mode,
    fileContent,
    fileName,
    mimeType,
  }: {
    message: string;
    elements: ScreenElement[];
    selectedId: string | null;
    screenId?: string;
    mode?: string;
    fileContent?: string;
    fileName?: string;
    mimeType?: string;
  } = body;

  // If file context is provided, append it to the message for the LLM
  const enrichedMessage = fileContent && fileName
    ? `${message}\n\n[Attached file: "${fileName}" (${mimeType || "unknown"})]\n${fileContent.slice(0, 4000)}`
    : message;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Fetch conversation history from DB (before opening SSE stream)
  // Only query DB if screenId is a valid UUID (not a local fallback like "local-123")
  const conversationHistory: ChatHistoryMessage[] = isValidDbId(screenId)
    ? await fetchConversationHistory(screenId)
    : [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          // Client disconnected
        }
      };

      try {
        // ── Generate Screen Mode ──
        if (mode === "generate_screen") {
          send("token", { index: 0 });

          const { elements: newElements, explanation } = await generateScreen(enrichedMessage);

          const latencyMs = Date.now() - startTime;

          // Stream explanation word-by-word
          const words = explanation.split(/(\s+)/);
          for (const word of words) {
            if (word) send("delta", { text: word });
          }

          // Build commands array for the done event
          const commands: AIEditCommand[] = newElements.map((el) => ({
            action: "add" as const,
            elementType: el.type,
            explanation: `Added ${el.label}`,
          }));

          send("done", { commands, elements: newElements, latencyMs });

          if (isValidDbId(screenId)) {
            persistChat(screenId, message, explanation, commands, latencyMs);
          }
        } else {
          // ── Normal Chat Edit Mode ──
          let commands: AIEditCommand[];

          if (hasLLMKey()) {
            commands = await streamChatWithLLM(
              enrichedMessage,
              elements,
              selectedId,
              (_token, index) => {
                send("token", { index });
              },
              conversationHistory
            );
          } else {
            commands = parseChatLocally(enrichedMessage, elements, selectedId);
          }

          const latencyMs = Date.now() - startTime;
          const hasActions = commands.some((c) => c.action !== "noop");
          const newElements = hasActions
            ? applyCommand(commands, elements)
            : elements;
          const explanation = commands.map((c) => c.explanation).join("\n");

          // Stream explanation word-by-word
          const words = explanation.split(/(\s+)/);
          for (const word of words) {
            if (word) {
              send("delta", { text: word });
            }
          }

          // Send final result
          send("done", { commands, elements: newElements, latencyMs });

          // Persist to DB (fire-and-forget)
          if (isValidDbId(screenId)) {
            persistChat(screenId, message, explanation, commands, latencyMs);
          }
        }
      } catch (e: any) {
        send("error", { message: e.message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
