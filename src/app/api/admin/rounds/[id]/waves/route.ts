import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params
  const { order, triggerX } = await req.json()
  const wave = await db.wave.create({
    data: { roundId, order, triggerX },
    include: { monsters: { include: { monster: true } } },
  })
  return NextResponse.json(wave, { status: 201 })
}
