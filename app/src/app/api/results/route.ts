import { NextRequest, NextResponse } from 'next/server'
import { getVideos } from '@/lib/db'
import { CORS_HEADERS, handleOptions } from '../cors'

export async function OPTIONS() { return handleOptions() }

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-api-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: CORS_HEADERS })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const videos = await getVideos()
    const recent = videos
      .filter(v => v.analysis)
      .sort((a, b) =>
        new Date(b.dateAdded || 0).getTime() -
        new Date(a.dateAdded || 0).getTime()
      )
      .slice(0, limit)

    return NextResponse.json({
      videos: recent,
      total: videos.length,
      returned: recent.length
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('Results API error:', error)
    return NextResponse.json(
      { error: 'Failed to read results' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
