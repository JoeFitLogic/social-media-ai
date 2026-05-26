import { NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getCreators, insertCreator, deleteCreator } from '@/lib/db'
import type { Creator } from '@/lib/types'
import { CORS_HEADERS, handleOptions } from '../cors'

export async function OPTIONS() { return handleOptions() }

export async function GET() {
  try {
    const creators = await getCreators()
    return NextResponse.json(creators, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('GET creators error:', error)
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const creator: Creator = {
      id: uuid(),
      username: body.username,
      category: body.category || '',
      profilePicUrl: '',
      followers: 0,
      reelsCount30d: 0,
      avgViews30d: 0,
      lastScrapedAt: '',
    }
    const created = await insertCreator(creator)
    return NextResponse.json(created, { status: 201, headers: CORS_HEADERS })
  } catch (error) {
    console.error('POST creator error:', error)
    return NextResponse.json({ error: 'Failed to create creator' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: CORS_HEADERS })
    await deleteCreator(id)
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('DELETE creator error:', error)
    return NextResponse.json({ error: 'Failed to delete creator' }, { status: 500, headers: CORS_HEADERS })
  }
}
