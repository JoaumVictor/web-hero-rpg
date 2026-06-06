import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const monsters = await db.monster.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(monsters)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const monster = await db.monster.create({ data })
  return NextResponse.json(monster, { status: 201 })
}
