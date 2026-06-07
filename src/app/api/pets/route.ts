import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')

  const pets = await db.pet.findMany({
    where: { isActive: true },
    include: {
      playerPets: {
        where: { playerId: playerId ?? '__none__' },
        select: { id: true, isActive: true },
      },
    },
  })

  return NextResponse.json(
    pets.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      rarity: p.rarity,
      buffStats: p.buffStats,
      cost: p.cost,
      owned: p.playerPets.length > 0,
      isActive: p.playerPets[0]?.isActive ?? false,
    }))
  )
}
