import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { playerId, petId } = await req.json()
  if (!playerId || !petId) {
    return NextResponse.json({ error: 'playerId e petId obrigatórios' }, { status: 400 })
  }

  const [player, pet, existing] = await Promise.all([
    db.player.findUnique({ where: { id: playerId }, select: { coins: true } }),
    db.pet.findUnique({ where: { id: petId }, select: { cost: true } }),
    db.playerPet.findUnique({ where: { playerId_petId: { playerId, petId } } }),
  ])

  if (!player) return NextResponse.json({ error: 'Player não encontrado' }, { status: 404 })
  if (!pet)    return NextResponse.json({ error: 'Pet não encontrado' }, { status: 404 })
  if (existing) return NextResponse.json({ error: 'Pet já adquirido' }, { status: 409 })
  if (player.coins < pet.cost) {
    return NextResponse.json({ error: 'Moedas insuficientes' }, { status: 402 })
  }

  await db.$transaction([
    db.player.update({ where: { id: playerId }, data: { coins: { decrement: pet.cost } } }),
    db.playerPet.create({ data: { playerId, petId, isActive: false } }),
  ])

  const updated = await db.player.findUnique({ where: { id: playerId }, select: { coins: true } })
  return NextResponse.json({ ok: true, remainingCoins: updated?.coins ?? 0 })
}
