import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type StatBonus = {
  allAttack?: number
  allHp?: number
  allDefense?: number
  coinBonus?: number
  xpBonus?: number
}

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')
  if (!playerId) {
    return NextResponse.json({} as StatBonus)
  }

  const unlocks = await db.playerSkillUnlock.findMany({
    where: { playerId },
    include: { node: { select: { statBonus: true } } },
  })

  const total: StatBonus = {}
  for (const u of unlocks) {
    const bonus = u.node.statBonus as StatBonus
    if (bonus.allAttack)  total.allAttack  = (total.allAttack  ?? 0) + bonus.allAttack
    if (bonus.allHp)      total.allHp      = (total.allHp      ?? 0) + bonus.allHp
    if (bonus.allDefense) total.allDefense = (total.allDefense ?? 0) + bonus.allDefense
    if (bonus.coinBonus)  total.coinBonus  = (total.coinBonus  ?? 0) + bonus.coinBonus
    if (bonus.xpBonus)    total.xpBonus    = (total.xpBonus    ?? 0) + bonus.xpBonus
  }

  return NextResponse.json(total)
}
