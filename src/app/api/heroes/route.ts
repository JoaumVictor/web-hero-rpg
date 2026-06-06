import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')

  const heroes = await db.hero.findMany({ orderBy: { cost: 'asc' } })

  if (!playerId) return NextResponse.json(heroes.map(h => ({ ...h, owned: false, instance: null })))

  const instances = await db.heroInstance.findMany({
    where: { playerId },
    include: {
      equipment: {
        include: {
          inventoryItem: {
            include: { item: { select: { id: true, name: true, rarity: true, type: true, statBonus: true, equipSlot: true } } },
          },
        },
      },
    },
  })

  const ownedIds = new Set(instances.map(i => i.heroId))

  return NextResponse.json(
    heroes.map(h => ({
      ...h,
      owned: ownedIds.has(h.id),
      instance: instances.find(i => i.heroId === h.id) ?? null,
    }))
  )
}
