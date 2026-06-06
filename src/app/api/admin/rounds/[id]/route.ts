import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const round = await db.round.findUnique({
    where: { id },
    include: {
      waves: {
        orderBy: { order: 'asc' },
        include: { monsters: { include: { monster: true } } },
      },
    },
  })
  if (!round) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(round)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { waves: _waves, ...roundData } = await req.json()
  const round = await db.round.update({
    where: { id },
    data: roundData,
    include: {
      waves: { orderBy: { order: 'asc' }, include: { monsters: { include: { monster: true } } } },
    },
  })
  return NextResponse.json(round)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.round.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
