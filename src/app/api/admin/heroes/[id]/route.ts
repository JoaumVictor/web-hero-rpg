import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const hero = await db.hero.update({ where: { id }, data })
  return NextResponse.json(hero)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.hero.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
