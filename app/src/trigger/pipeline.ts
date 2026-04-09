import { task, metadata } from "@trigger.dev/sdk/v3";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineParams } from "@/lib/types";

export const pipelineTask = task({
  id: "run-pipeline",
  maxDuration: 1800, // 30 minutes — no Vercel timeout
  run: async (payload: PipelineParams) => {
    await runPipeline(payload, (progress) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata.set("progress", JSON.parse(JSON.stringify(progress)) as any);
    });
  },
});
