import { NextResponse } from "next/server";
import { getVideos, updateVideoStarred } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const configName = searchParams.get("configName") ?? undefined;
  const creator = searchParams.get("creator") ?? undefined;

  const videos = await getVideos({ configName, creator });
  return NextResponse.json(videos);
}

export async function PATCH(request: Request) {
  const { id, starred } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const video = await updateVideoStarred(id, starred);
    return NextResponse.json(video);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
