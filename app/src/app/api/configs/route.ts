import { NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getConfigs, insertConfig, updateConfig, deleteConfig } from '@/lib/db'
import type { Config } from '@/lib/types'
import { CORS_HEADERS, handleOptions } from '../cors'

export async function OPTIONS() { return handleOptions() }

export async function GET() {
  const configs = await getConfigs()
  return NextResponse.json(configs, { headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const body = await request.json()
  const newConfig: Config = {
    id: uuid(),
    configName: body.configName,
    creatorsCategory: body.creatorsCategory,
    analysisInstruction: body.analysisInstruction,
    newConceptsInstruction: body.newConceptsInstruction,
  }
  const created = await insertConfig(newConfig)
  return NextResponse.json(created, { status: 201, headers: CORS_HEADERS })
}

export async function PUT(request: Request) {
  const body = await request.json()
  try {
    const updated = await updateConfig(body)
    return NextResponse.json(updated, { headers: CORS_HEADERS })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: CORS_HEADERS })
  await deleteConfig(id)
  return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
}
