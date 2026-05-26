import { auth } from '@trigger.dev/sdk/v3'
import { pipelineTask } from '@/trigger/pipeline'
import type { PipelineParams } from '@/lib/types'
import { CORS_HEADERS, handleOptions } from '../cors'

export async function OPTIONS() { return handleOptions() }

export async function POST(request: Request) {
  const params: PipelineParams = await request.json()
  const handle = await pipelineTask.trigger(params)
  const publicToken = await auth.createPublicToken({
    scopes: {
      read: { runs: [handle.id] },
    },
  })
  return Response.json(
    { runId: handle.id, publicToken },
    { headers: CORS_HEADERS }
  )
}
