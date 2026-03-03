import { NextRequest, NextResponse } from "next/server";
import { db, cache } from "@/lib/db";
import {
  screens,
  elements,
  screenVersions,
} from "../../../../drizzle/schema";
import { eq, asc, desc, and } from "drizzle-orm";

// GET /api/screens?projectId=xxx — get screens for a project
// GET /api/screens?screenId=xxx — get single screen with elements
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const screenId = searchParams.get("screenId");

    if (screenId) {
      const cacheKey = `screen:${screenId}`;
      const cached = await cache.get<any>(cacheKey);
      if (cached) return NextResponse.json({ data: cached });

      const [screen] = await db
        .select()
        .from(screens)
        .where(eq(screens.id, screenId));

      if (!screen)
        return NextResponse.json({ error: "Screen not found" }, { status: 404 });

      const elems = await db
        .select()
        .from(elements)
        .where(eq(elements.screenId, screenId))
        .orderBy(asc(elements.sortOrder));

      const result = { ...screen, elements: elems };
      await cache.set(cacheKey, result, 30);
      return NextResponse.json({ data: result });
    }

    if (projectId) {
      const rows = await db
        .select()
        .from(screens)
        .where(eq(screens.projectId, projectId))
        .orderBy(asc(screens.sortOrder));
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: "Provide projectId or screenId" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/screens — create screen or save elements
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Save elements (bulk upsert) ──
    if (body.action === "save-elements" && body.screenId) {
      const screenId = body.screenId;
      const newElements: any[] = body.elements || [];

      // Delete existing and re-insert (simple approach)
      await db.delete(elements).where(eq(elements.screenId, screenId));

      if (newElements.length > 0) {
        await db.insert(elements).values(
          newElements.map((el: any, i: number) => ({
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

      return NextResponse.json({ data: { saved: newElements.length } });
    }

    // ── Create version snapshot ──
    if (body.action === "snapshot" && body.screenId) {
      // Get current max version number
      const existing = await db
        .select()
        .from(screenVersions)
        .where(eq(screenVersions.screenId, body.screenId))
        .orderBy(desc(screenVersions.versionNumber))
        .limit(1);

      const nextVersion = (existing[0]?.versionNumber || 0) + 1;

      const [version] = await db
        .insert(screenVersions)
        .values({
          screenId: body.screenId,
          versionNumber: nextVersion,
          label: body.label || `Version ${nextVersion}`,
          snapshot: body.snapshot,
          createdBy: body.createdBy || "system",
        })
        .returning();

      return NextResponse.json({ data: version });
    }

    // ── Create new screen ──
    const [screen] = await db
      .insert(screens)
      .values({
        projectId: body.projectId,
        name: body.name || "New Screen",
        slug: body.slug || `screen-${Date.now()}`,
        sortOrder: body.sortOrder || 0,
        status: "draft",
        settings: body.settings || { width: 600 },
      })
      .returning();

    return NextResponse.json({ data: screen });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
