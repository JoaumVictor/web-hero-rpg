import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const monster = await db.monster.update({ where: { id }, data })
  return NextResponse.json(monster)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.monster.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
