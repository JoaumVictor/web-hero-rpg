import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { playerId, stars } = (await req.json()) as { playerId: string; stars: number }

  if (!playerId || typeof stars !== 'number') {
    return NextResponse.json({ error: 'playerId and stars required' }, { status: 400 })
  }

  const result = await db.playerLevelProgress.upsert({
    where: { playerId_levelId: { playerId, levelId: id } },
    update: {
      stars: { set: stars },
      completedAt: new Date(),
    },
    create: {
      playerId,
      levelId: id,
      stars,
      completedAt: new Date(),
    },
  })

  return NextResponse.json(result)
}
