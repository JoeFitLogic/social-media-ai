import { NextResponse } from 'next/server'
import { getVideos, updateVideoStarred } from '@/lib/db'
import { CORS_HEADERS, handleOptions } from '../cors'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  return createClient(url, key)
}

export async function OPTIONS() { return handleOptions() }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const configName = searchParams.get('configName') ?? undefined
  const creator = searchParams.get('creator') ?? undefined
  const videos = await getVideos({ configName, creator })
  return NextResponse.json(videos, { headers: CORS_HEADERS })
}

export async function PATCH(request: Request) {
  const { id, starred } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: CORS_HEADERS })
  try {
    const video = await updateVideoStarred(id, starred)
    return NextResponse.json(video, { headers: CORS_HEADERS })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: CORS_HEADERS })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: CORS_HEADERS })
  try {
    const { error } = await getSupabase().from('videos').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('DELETE video error:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500, headers: CORS_HEADERS })
  }
}
