import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const heroes = await db.hero.findMany({ orderBy: { groupPosition: 'asc' } })
  return NextResponse.json(heroes)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const hero = await db.hero.create({ data })
  return NextResponse.json(hero, { status: 201 })
}
