import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getCreators, insertCreator, updateCreator, deleteCreator } from "@/lib/db";
import { scrapeCreatorStats } from "@/lib/apify";
import type { Creator } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const creators = await getCreators(category);
  return NextResponse.json(creators);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newCreator: Creator = {
    id: uuid(),
    username: body.username,
    category: body.category,
    profilePicUrl: "",
    followers: 0,
    reelsCount30d: 0,
    avgViews30d: 0,
    lastScrapedAt: "",
  };

  await insertCreator(newCreator);

  try {
    const stats = await scrapeCreatorStats(body.username);
    const updated = await updateCreator({
      ...newCreator,
      profilePicUrl: stats.profilePicUrl,
      followers: stats.followers,
      reelsCount30d: stats.reelsCount30d,
      avgViews30d: stats.avgViews30d,
      lastScrapedAt: new Date().toISOString(),
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error(`Failed to scrape stats for @${body.username}:`, err);
  }

  return NextResponse.json(newCreator, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  try {
    const updated = await updateCreator(body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteCreator(id);
  return NextResponse.json({ success: true });
}
