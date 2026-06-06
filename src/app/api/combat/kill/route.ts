import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

export async function POST(req: NextRequest) {
  const { playerId, monsterId, baseXp: baseXpParam, levelMult = 1 } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'playerId obrigatório' }, { status: 400 })

  // resolve baseXp — from DB if monsterId given, else from body, else default
  let baseXp = typeof baseXpParam === 'number' ? baseXpParam : 8
  if (monsterId) {
    const monster = await db.monster.findUnique({ where: { id: monsterId }, select: { baseXp: true } })
    if (monster) baseXp = monster.baseXp
  }

  const xpGained = Math.round(baseXp * levelMult)

  // get all heroes in the group
  const group = await db.heroInstance.findMany({
    where: { playerId, groupPosition: { not: null } },
    include: { hero: { select: { name: true } } },
  })

  if (group.length === 0) {
    return NextResponse.json({ xpGained: 0, heroes: [], levelUps: [] })
  }

  const share = Math.max(1, Math.round(xpGained / group.length))
  const levelUps: { heroName: string; newLevel: number }[] = []

  const updates = group.map(async (instance) => {
    let { level, xp } = instance
    xp += share

    // handle multiple level-ups in one kill (edge case for low-level heroes)
    while (xp >= xpToNext(level)) {
      xp -= xpToNext(level)
      level++
      levelUps.push({ heroName: instance.hero.name, newLevel: level })
    }

    await db.heroInstance.update({
      where: { id: instance.id },
      data: { xp, level },
    })

    return { id: instance.id, name: instance.hero.name, level, xp, xpToNext: xpToNext(level) }
  })

  const heroes = await Promise.all(updates)

  return NextResponse.json({ xpGained, heroes, levelUps })
}
