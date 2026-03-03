import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assetSubmissions,
  sdlcPipeline,
  auditTrail,
  screenVersions,
} from "../../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/submissions — list submissions, optionally filtered
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const origin = searchParams.get("origin");
    const sourceId = searchParams.get("sourceId");

    let query = db.select().from(assetSubmissions);

    // Apply filters
    if (stage) {
      query = query.where(eq(assetSubmissions.currentStage, stage as any));
    }
    if (origin) {
      query = query.where(eq(assetSubmissions.origin, origin as any));
    }
    if (sourceId) {
      query = query.where(eq(assetSubmissions.sourceId, sourceId));
    }

    const rows = await query.orderBy(desc(assetSubmissions.submittedAt));
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/submissions — create a new submission (the bridge)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. Pin a version snapshot if sourceScreenId provided ──
    let pinnedVersionId: string | undefined;
    if (body.sourceScreenId) {
      try {
        const existing = await db
          .select()
          .from(screenVersions)
          .where(eq(screenVersions.screenId, body.sourceScreenId))
          .orderBy(desc(screenVersions.versionNumber))
          .limit(1);
        if (existing[0]) {
          pinnedVersionId = existing[0].id;
        }
      } catch {
        // Non-critical
      }
    }

    // ── 2. Insert the submission ──
    const [submission] = await db
      .insert(assetSubmissions)
      .values({
        name: body.name,
        description: body.description || null,
        assetType: body.assetType || "template",
        origin: body.origin || "prototype_builder",

        sourceId: body.sourceId || null,
        sourceScreenId: body.sourceScreenId || null,
        sourceVersionId: pinnedVersionId || body.sourceVersionId || null,
        sourceUrl: body.sourceUrl || null,

        projectName: body.projectName,
        dataClassification: body.dataClassification,
        serviceGroup: body.serviceGroup,
        country: body.country || "GLOBAL",
        usesPii: body.usesPii ?? false,
        piiDetails: body.piiDetails || null,
        usesClientData: body.usesClientData ?? false,
        externalDependencies: body.externalDependencies || null,
        estimatedUsers: body.estimatedUsers || "< 50",
        targetEnvironment: body.targetEnvironment || "development",
        complianceAnswers: body.complianceAnswers || null,

        submittedBy: body.submittedBy || "system",
        currentStage: "submitted",
        priority: body.priority || "medium",
        tags: body.tags || [],
      })
      .returning();

    // ── 3. Create initial pipeline entry (stage: submitted) ──
    const [pipelineEntry] = await db
      .insert(sdlcPipeline)
      .values({
        submissionId: submission.id,
        stage: "submitted",
      })
      .returning();

    // ── 4. Write audit trail ──
    await db.insert(auditTrail).values({
      entityType: "submission",
      entityId: submission.id,
      action: "created",
      actorName: body.submittedBy || "system",
      actorRole: body.submittedByRole || null,
      newValues: {
        name: submission.name,
        origin: submission.origin,
        dataClassification: submission.dataClassification,
        serviceGroup: submission.serviceGroup,
        usesPii: submission.usesPii,
      },
      metadata: {
        sourceId: submission.sourceId,
        pipelineEntryId: pipelineEntry.id,
      },
    });

    return NextResponse.json({
      data: {
        submission,
        pipelineEntry,
      },
      message: `Submission "${submission.name}" created and entered SDLC pipeline.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
