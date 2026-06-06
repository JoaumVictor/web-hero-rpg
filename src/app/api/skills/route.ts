import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')

  const nodes = await db.skillNode.findMany({
    orderBy: { order: 'asc' },
    include: {
      unlocks: {
        where: { playerId: playerId ?? '__none__' },
        select: { id: true },
      },
    },
  })

  return NextResponse.json(
    nodes.map(n => ({
      id: n.id,
      name: n.name,
      description: n.description,
      costCoins: n.costCoins,
      statBonus: n.statBonus,
      order: n.order,
      unlocked: n.unlocks.length > 0,
    }))
  )
}
