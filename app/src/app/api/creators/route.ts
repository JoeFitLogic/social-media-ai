import { getCreators, updateCreator } from '@/lib/db'
import { scrapeCreatorStats } from '@/lib/apify'
import { CORS_HEADERS, handleOptions } from '../cors'

export const maxDuration = 300

export async function OPTIONS() { return handleOptions() }

export async function POST(request: Request) {
  const body = await request.json()
  const ids: string[] = body.ids || []
  const allCreators = await getCreators()
  const toRefresh = ids.length > 0
    ? allCreators.filter(c => ids.includes(c.id))
    : allCreators

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const creator of toRefresh) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'progress', username: creator.username, status: 'scraping' })}\n\n`)
          )
          const stats = await scrapeCreatorStats(creator.username)
          await updateCreator({
            ...creator,
            profilePicUrl: stats.profilePicUrl,
            followers: stats.followers,
            reelsCount30d: stats.reelsCount30d,
            avgViews30d: stats.avgViews30d,
            lastScrapedAt: new Date().toISOString(),
          })
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'progress', username: creator.username, status: 'done', stats })}\n\n`)
          )
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', username: creator.username, error: err instanceof Error ? err.message : 'Unknown' })}\n\n`)
          )
        }
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
