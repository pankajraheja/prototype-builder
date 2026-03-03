import { NextRequest, NextResponse } from "next/server";
import { db, cache } from "@/lib/db";
import { projects, screens, elements } from "../../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/projects — list all projects
export async function GET() {
  try {
    const cached = await cache.get<any[]>("projects:list");
    if (cached) return NextResponse.json({ data: cached });

    const rows = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));

    await cache.set("projects:list", rows, 60);
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = body.slug || nanoid(10);

    const [project] = await db
      .insert(projects)
      .values({
        name: body.name || "Untitled Project",
        description: body.description || null,
        slug,
        status: "draft",
        createdBy: body.createdBy || "system",
        settings: body.settings || { theme: "light", primaryColor: "#8b5cf6" },
      })
      .returning();

    // Create a default screen
    const [screen] = await db
      .insert(screens)
      .values({
        projectId: project.id,
        name: "Home",
        slug: "home",
        sortOrder: 0,
        status: "draft",
        settings: { width: 600, backgroundColor: "#ffffff" },
      })
      .returning();

    await cache.del("projects:list");

    return NextResponse.json({
      data: { ...project, screens: [screen] },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
