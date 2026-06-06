import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: waveId } = await params
  const { monsterId, offsetX = 0, levelMult = 1 } = await req.json()
  const entry = await db.waveMonster.create({
    data: { waveId, monsterId, offsetX, levelMult },
    include: { monster: true },
  })
  return NextResponse.json(entry, { status: 201 })
}
