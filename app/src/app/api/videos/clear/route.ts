import { NextResponse } from 'next/server'
import { CORS_HEADERS, handleOptions } from '../../cors'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  return createClient(url, key)
}

export async function OPTIONS() { return handleOptions() }

export async function DELETE() {
  try {
    const { error } = await getSupabase().from('videos').delete().neq('id', '')
    if (error) throw error
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('DELETE all videos error:', error)
    return NextResponse.json({ error: 'Failed to clear videos' }, { status: 500, headers: CORS_HEADERS })
  }
}
