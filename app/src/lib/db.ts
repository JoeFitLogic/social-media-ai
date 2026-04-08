import { createClient } from "@supabase/supabase-js";
import type { Config, Creator, Video } from "./types";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  return createClient(url, key);
}

// ── Configs ──────────────────────────────────────────────────────────────────

export async function getConfigs(): Promise<Config[]> {
  const { data, error } = await getSupabase().from("configs").select("*");
  if (error) throw error;
  return data as Config[];
}

export async function insertConfig(config: Config): Promise<Config> {
  const { data, error } = await getSupabase().from("configs").insert(config).select().single();
  if (error) throw error;
  return data as Config;
}

export async function updateConfig(config: Config): Promise<Config> {
  const { data, error } = await getSupabase()
    .from("configs")
    .update(config)
    .eq("id", config.id)
    .select()
    .single();
  if (error) throw error;
  return data as Config;
}

export async function deleteConfig(id: string): Promise<void> {
  const { error } = await getSupabase().from("configs").delete().eq("id", id);
  if (error) throw error;
}

// ── Creators ─────────────────────────────────────────────────────────────────

export async function getCreators(category?: string): Promise<Creator[]> {
  let query = getSupabase().from("creators").select("*");
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return data as Creator[];
}

export async function insertCreator(creator: Creator): Promise<Creator> {
  const { data, error } = await getSupabase().from("creators").insert(creator).select().single();
  if (error) throw error;
  return data as Creator;
}

export async function updateCreator(creator: Creator): Promise<Creator> {
  const { data, error } = await getSupabase()
    .from("creators")
    .update(creator)
    .eq("id", creator.id)
    .select()
    .single();
  if (error) throw error;
  return data as Creator;
}

export async function deleteCreator(id: string): Promise<void> {
  const { error } = await getSupabase().from("creators").delete().eq("id", id);
  if (error) throw error;
}

// ── Videos ───────────────────────────────────────────────────────────────────

export async function getVideos(filters?: { configName?: string; creator?: string }): Promise<Video[]> {
  let query = getSupabase().from("videos").select("*");
  if (filters?.configName) query = query.eq("configName", filters.configName);
  if (filters?.creator) query = query.eq("creator", filters.creator);
  const { data, error } = await query.order("dateAdded", { ascending: false });
  if (error) throw error;
  return data as Video[];
}

export async function insertVideos(videos: Video[]): Promise<void> {
  if (videos.length === 0) return;
  const { error } = await getSupabase().from("videos").insert(videos);
  if (error) throw error;
}

export async function updateVideoStarred(id: string, starred: boolean): Promise<Video> {
  const { data, error } = await getSupabase()
    .from("videos")
    .update({ starred })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Video;
}
