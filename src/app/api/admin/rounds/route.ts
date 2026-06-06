import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const rounds = await db.round.findMany({
    orderBy: { number: 'asc' },
    include: {
      waves: {
        orderBy: { order: 'asc' },
        include: {
          monsters: { include: { monster: true } },
        },
      },
    },
  })
  return NextResponse.json(rounds)
}

export async function POST(req: NextRequest) {
  const { waves, ...roundData } = await req.json()
  const round = await db.round.create({
    data: {
      ...roundData,
      waves: waves
        ? {
            create: waves.map((w: { order: number; triggerX: number; monsters?: { monsterId: string; offsetX: number; levelMult: number }[] }) => ({
              order: w.order,
              triggerX: w.triggerX,
              monsters: w.monsters
                ? { create: w.monsters.map((m: { monsterId: string; offsetX: number; levelMult: number }) => ({
                    monsterId: m.monsterId,
                    offsetX: m.offsetX ?? 0,
                    levelMult: m.levelMult ?? 1,
                  })) }
                : undefined,
            })),
          }
        : undefined,
    },
    include: {
      waves: { include: { monsters: { include: { monster: true } } } },
    },
  })
  return NextResponse.json(round, { status: 201 })
}
