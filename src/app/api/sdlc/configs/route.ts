import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sdlcStageConfigs } from "../../../../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/sdlc/configs?serviceGroup=advisory&country=GLOBAL
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceGroup = searchParams.get("serviceGroup");
    const country = searchParams.get("country") || "GLOBAL";

    if (!serviceGroup) {
      // Return all configs
      const rows = await db
        .select()
        .from(sdlcStageConfigs)
        .orderBy(sdlcStageConfigs.serviceGroup, asc(sdlcStageConfigs.sortOrder));
      return NextResponse.json({ data: rows });
    }

    const rows = await db
      .select()
      .from(sdlcStageConfigs)
      .where(
        and(
          eq(sdlcStageConfigs.serviceGroup, serviceGroup as any),
          eq(sdlcStageConfigs.country, country)
        )
      )
      .orderBy(asc(sdlcStageConfigs.sortOrder));

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
