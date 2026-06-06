import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest) {
  const { playerId, heroInstanceId, groupPosition } = await req.json()
  if (!playerId || !heroInstanceId) return NextResponse.json({ error: 'Faltam dados' }, { status: 400 })

  const pos = groupPosition ?? null

  // if assigning a position (0,1,2), clear that slot from any other hero first
  if (pos !== null) {
    await db.heroInstance.updateMany({
      where: { playerId, groupPosition: pos, id: { not: heroInstanceId } },
      data: { groupPosition: null },
    })

    // also enforce max 3 in group
    const inGroup = await db.heroInstance.count({ where: { playerId, groupPosition: { not: null }, id: { not: heroInstanceId } } })
    if (inGroup >= 3) return NextResponse.json({ error: 'Grupo já tem 3 heróis' }, { status: 400 })
  }

  const instance = await db.heroInstance.update({
    where: { id: heroInstanceId },
    data: { groupPosition: pos },
    include: { hero: true },
  })

  return NextResponse.json(instance)
}
