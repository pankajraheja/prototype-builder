import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sdlcReviews, auditTrail } from "../../../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/sdlc/reviews?submissionId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");
    if (!submissionId)
      return NextResponse.json({ error: "submissionId required" }, { status: 400 });

    const rows = await db
      .select()
      .from(sdlcReviews)
      .where(eq(sdlcReviews.submissionId, submissionId))
      .orderBy(desc(sdlcReviews.createdAt));

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/sdlc/reviews — record a review decision
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const [review] = await db
      .insert(sdlcReviews)
      .values({
        submissionId: body.submissionId,
        pipelineEntryId: body.pipelineEntryId,
        reviewerName: body.reviewerName,
        reviewerRole: body.reviewerRole || null,
        decision: body.decision,
        comments: body.comments || null,
        checklist: body.checklist || null,
        attachments: body.attachments || null,
      })
      .returning();

    // Audit
    await db.insert(auditTrail).values({
      entityType: "review",
      entityId: review.id,
      action: "reviewed",
      actorName: body.reviewerName,
      actorRole: body.reviewerRole || null,
      newValues: { decision: body.decision, submissionId: body.submissionId },
    });

    return NextResponse.json({ data: review });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
