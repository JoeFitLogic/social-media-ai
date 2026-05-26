import { NextRequest, NextResponse } from 'next/server'
import { readVideos } from '@/lib/csv'

export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('x-api-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Optional query params
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const videos = await readVideos()

    // Sort by most recent first, take top N
    const recent = videos
      .filter(v => v.concept) // only include fully analysed videos
      .sort((a, b) => 
        new Date(b.scrapedAt || 0).getTime() - 
        new Date(a.scrapedAt || 0).getTime()
      )
      .slice(0, limit)

    return NextResponse.json({ 
      videos: recent,
      total: videos.length,
      returned: recent.length
    })

  } catch (error) {
    console.error('Results API error:', error)
    return NextResponse.json(
      { error: 'Failed to read results' }, 
      { status: 500 }
    )
  }
}
