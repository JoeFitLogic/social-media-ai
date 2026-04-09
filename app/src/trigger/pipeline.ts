import { task, metadata } from "@trigger.dev/sdk/v3";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineParams } from "@/lib/types";

export const pipelineTask = task({
  id: "run-pipeline",
  maxDuration: 1800, // 30 minutes — no Vercel timeout
  run: async (payload: PipelineParams) => {
    await runPipeline(payload, (progress) => {
      metadata.set("progress", progress as unknown as Record<string, unknown>);
    });
  },
});
