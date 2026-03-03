import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sdlcPipeline,
  assetSubmissions,
  auditTrail,
} from "../../../../../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// GET /api/sdlc/pipeline?submissionId=xxx — get pipeline entries
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      // Return all active (non-exited) pipeline entries across all submissions
      const rows = await db
        .select()
        .from(sdlcPipeline)
        .where(isNull(sdlcPipeline.exitedAt))
        .orderBy(desc(sdlcPipeline.enteredAt));
      return NextResponse.json({ data: rows });
    }

    const rows = await db
      .select()
      .from(sdlcPipeline)
      .where(eq(sdlcPipeline.submissionId, submissionId))
      .orderBy(sdlcPipeline.enteredAt);

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/sdlc/pipeline — advance stage, assign reviewer, or record result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── Advance to next stage ──
    if (action === "advance") {
      const { submissionId, nextStage, actorName, actorRole, notes } = body;

      // Close current active stage
      const [currentEntry] = await db
        .select()
        .from(sdlcPipeline)
        .where(
          and(
            eq(sdlcPipeline.submissionId, submissionId),
            isNull(sdlcPipeline.exitedAt)
          )
        )
        .limit(1);

      if (currentEntry) {
        const now = new Date();
        const entered = new Date(currentEntry.enteredAt);
        const durationSeconds = Math.floor((now.getTime() - entered.getTime()) / 1000);

        await db
          .update(sdlcPipeline)
          .set({
            exitedAt: now,
            durationSeconds,
            outcome: "approved",
            notes: notes || null,
          })
          .where(eq(sdlcPipeline.id, currentEntry.id));
      }

      // Create new stage entry
      const [newEntry] = await db
        .insert(sdlcPipeline)
        .values({
          submissionId,
          stage: nextStage,
        })
        .returning();

      // Update submission's current stage
      await db
        .update(assetSubmissions)
        .set({ currentStage: nextStage, updatedAt: new Date() })
        .where(eq(assetSubmissions.id, submissionId));

      // Audit
      await db.insert(auditTrail).values({
        entityType: "submission",
        entityId: submissionId,
        action: "stage_changed",
        actorName: actorName || "system",
        actorRole: actorRole || null,
        previousValues: { stage: currentEntry?.stage },
        newValues: { stage: nextStage },
      });

      return NextResponse.json({ data: newEntry });
    }

    // ── Assign reviewer ──
    if (action === "assign") {
      const { pipelineEntryId, assignedTo, assignedRole } = body;

      await db
        .update(sdlcPipeline)
        .set({
          assignedTo,
          assignedRole: assignedRole || null,
          assignedAt: new Date(),
        })
        .where(eq(sdlcPipeline.id, pipelineEntryId));

      return NextResponse.json({ message: `Assigned to ${assignedTo}` });
    }

    // ── Record automated results ──
    if (action === "automated-results") {
      const { pipelineEntryId, results } = body;

      await db
        .update(sdlcPipeline)
        .set({ automatedResults: results })
        .where(eq(sdlcPipeline.id, pipelineEntryId));

      return NextResponse.json({ message: "Results recorded" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
