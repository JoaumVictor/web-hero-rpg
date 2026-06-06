import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')
  if (!playerId) return NextResponse.json([], { status: 400 })

  const items = await db.inventoryItem.findMany({
    where: { playerId },
    include: {
      item: {
        select: {
          id: true, name: true, description: true,
          type: true, rarity: true, statBonus: true,
          equipSlot: true, requiredLevel: true,
        },
      },
    },
    orderBy: [
      { item: { rarity: 'desc' } },
      { obtainedAt: 'desc' },
    ],
  })

  return NextResponse.json(items)
}
