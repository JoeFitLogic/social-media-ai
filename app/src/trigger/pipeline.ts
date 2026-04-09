import { task, metadata } from "@trigger.dev/sdk/v3";
import { v4 as uuid } from "uuid";
import { getConfigs, getCreators, insertVideos } from "@/lib/db";
import { scrapeReels } from "@/lib/apify";
import { uploadVideo, analyzeVideo } from "@/lib/gemini";
import { generateNewConcepts } from "@/lib/claude";
import type { PipelineParams, PipelineProgress, Video } from "@/lib/types";

// ── Child task: analyze a single video ───────────────────────────────────────

interface AnalyzeVideoPayload {
  videoUrl: string;
  postUrl: string;
  views: number;
  likes: number;
  comments: number;
  username: string;
  thumbnail: string;
  datePosted: string;
  analysisInstruction: string;
  newConceptsInstruction: string;
  configName: string;
}

export const analyzeVideoTask = task({
  id: "analyze-video",
  maxDuration: 540, // 9 minutes — one video well within free tier limit
  run: async (payload: AnalyzeVideoPayload): Promise<Video | null> => {
    const videoResponse = await fetch(payload.videoUrl);
    if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";

    const fileData = await uploadVideo(videoBuffer, contentType);
    const analysis = await analyzeVideo(fileData.uri, fileData.mimeType, payload.analysisInstruction);
    const newConcepts = await generateNewConcepts(analysis, payload.newConceptsInstruction);

    return {
      id: uuid(),
      link: payload.postUrl,
      thumbnail: payload.thumbnail,
      creator: payload.username,
      views: payload.views,
      likes: payload.likes,
      comments: payload.comments,
      analysis,
      newConcepts,
      datePosted: payload.datePosted,
      dateAdded: new Date().toISOString().slice(0, 10),
      configName: payload.configName,
      starred: false,
    };
  },
});

// ── Parent task: scrape + orchestrate child tasks ─────────────────────────────

export const pipelineTask = task({
  id: "run-pipeline",
  maxDuration: 540, // 9 minutes for scraping + orchestration
  run: async (payload: PipelineParams) => {
    const progress: PipelineProgress = {
      status: "running",
      phase: "scraping",
      activeTasks: [],
      creatorsCompleted: 0,
      creatorsTotal: 0,
      creatorsScraped: 0,
      videosAnalyzed: 0,
      videosTotal: 0,
      errors: [],
      log: [],
    };

    const emit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata.set("progress", JSON.parse(JSON.stringify(progress)) as any);
    };

    const log = (msg: string) => {
      progress.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      emit();
    };

    try {
      // Load config
      const configs = await getConfigs();
      const config = configs.find((c) => c.configName === payload.configName);
      if (!config) throw new Error(`Config "${payload.configName}" not found`);
      log(`Loaded config: ${config.configName}`);

      // Load creators
      const creators = await getCreators(config.creatorsCategory);
      if (creators.length === 0) throw new Error(`No creators found for category "${config.creatorsCategory}"`);
      progress.creatorsTotal = creators.length;
      log(`Found ${creators.length} creators — scraping all in parallel`);
      emit();

      // Phase 1: Scrape all creators in parallel
      const cutoffDate = new Date(Date.now() - payload.nDays * 24 * 60 * 60 * 1000);
      const allTopVideos: AnalyzeVideoPayload[] = [];

      const scrapeResults = await Promise.allSettled(
        creators.map(async (creator) => {
          const reels = await scrapeReels(creator.username, payload.maxVideos, payload.nDays);

          const videos = reels
            .filter((r) => r.videoUrl && r.timestamp)
            .map((r) => ({
              videoUrl: r.videoUrl,
              postUrl: r.url,
              views: r.videoPlayCount || 0,
              likes: r.likesCount || 0,
              comments: r.commentsCount || 0,
              username: r.ownerUsername || creator.username,
              thumbnail: r.images?.[0] || "",
              datePosted: r.timestamp?.split("T")[0] || "",
              timestamp: new Date(r.timestamp),
              analysisInstruction: config.analysisInstruction,
              newConceptsInstruction: config.newConceptsInstruction,
              configName: payload.configName,
            }))
            .filter((v) => v.timestamp >= cutoffDate);

          videos.sort((a, b) => b.views - a.views);
          const topVideos = videos.slice(0, payload.topK);

          log(`@${creator.username}: ${reels.length} reels → top ${topVideos.length} selected`);
          progress.creatorsScraped++;
          emit();

          return topVideos;
        })
      );

      for (const result of scrapeResults) {
        if (result.status === "fulfilled") {
          allTopVideos.push(...result.value);
          progress.creatorsCompleted++;
        } else {
          const msg = `Scraping error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`;
          progress.errors.push(msg);
          log(msg);
          progress.creatorsCompleted++;
        }
      }

      progress.videosTotal = allTopVideos.length;
      log(`Scraping done. ${allTopVideos.length} videos queued for analysis`);
      progress.phase = "analyzing";
      emit();

      // Phase 2: Trigger one child task per video and wait for all
      const childRuns = await analyzeVideoTask.batchTriggerAndWait(
        allTopVideos.map((v) => ({ payload: v }))
      );

      const newVideos: Video[] = [];

      for (const result of childRuns.runs) {
        if (result.ok && result.output) {
          newVideos.push(result.output);
          progress.videosAnalyzed++;
          log(`@${result.output.creator} (${result.output.views.toLocaleString()} views): done`);
        } else {
          const msg = `Video analysis failed: ${result.ok === false ? JSON.stringify(result.error) : "no output"}`;
          progress.errors.push(msg);
          log(`Error — ${msg}`);
        }
        emit();
      }

      // Save all results
      if (newVideos.length > 0) {
        await insertVideos(newVideos);
      }

      progress.phase = "done";
      progress.status = "completed";
      log(`Pipeline complete! ${progress.videosAnalyzed}/${progress.videosTotal} videos analyzed, ${progress.errors.length} errors.`);
      emit();
    } catch (err) {
      progress.status = "error";
      const msg = `Pipeline error: ${err instanceof Error ? err.message : typeof err === "object" ? JSON.stringify(err) : String(err)}`;
      progress.errors.push(msg);
      log(msg);
      emit();
    }
  },
});
