import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')

  const worlds = await db.world.findMany({
    orderBy: { order: 'asc' },
    include: {
      zones: {
        orderBy: { order: 'asc' },
        include: {
          levels: {
            orderBy: { number: 'asc' },
            include: {
              progress: {
                where: { playerId: playerId ?? '__none__' },
                select: { stars: true, completedAt: true },
              },
            },
          },
        },
      },
    },
  })

  return NextResponse.json(worlds)
}
