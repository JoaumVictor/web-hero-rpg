import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { playerId, heroId } = await req.json()
  if (!playerId || !heroId) return NextResponse.json({ error: 'Faltam dados' }, { status: 400 })

  const [player, hero] = await Promise.all([
    db.player.findUnique({ where: { id: playerId } }),
    db.hero.findUnique({ where: { id: heroId } }),
  ])

  if (!player) return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
  if (!hero)   return NextResponse.json({ error: 'Herói não encontrado' }, { status: 404 })
  if (player.coins < hero.cost) return NextResponse.json({ error: 'Moedas insuficientes' }, { status: 400 })

  const existing = await db.heroInstance.findUnique({ where: { playerId_heroId: { playerId, heroId } } })
  if (existing) return NextResponse.json({ error: 'Herói já adquirido' }, { status: 400 })

  const [instance] = await db.$transaction([
    db.heroInstance.create({ data: { playerId, heroId } }),
    db.player.update({ where: { id: playerId }, data: { coins: player.coins - hero.cost } }),
  ])

  return NextResponse.json({ instance, coinsLeft: player.coins - hero.cost }, { status: 201 })
}
