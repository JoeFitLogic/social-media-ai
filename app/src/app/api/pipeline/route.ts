import { auth } from "@trigger.dev/sdk/v3";
import { pipelineTask } from "@/trigger/pipeline";
import type { PipelineParams } from "@/lib/types";

export async function POST(request: Request) {
  const params: PipelineParams = await request.json();

  const handle = await pipelineTask.trigger(params);

  // Public token scoped to this run only — safe to send to the browser
  const publicToken = await auth.createPublicToken({
    scopes: {
      read: { runs: [handle.id] },
    },
  });

  return Response.json({ runId: handle.id, publicToken });
}
