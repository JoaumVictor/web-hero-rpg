import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { playerId, nodeId } = await req.json()
  if (!playerId || !nodeId) {
    return NextResponse.json({ error: 'playerId e nodeId obrigatórios' }, { status: 400 })
  }

  const [player, node, existing] = await Promise.all([
    db.player.findUnique({ where: { id: playerId }, select: { coins: true } }),
    db.skillNode.findUnique({ where: { id: nodeId }, select: { costCoins: true } }),
    db.playerSkillUnlock.findUnique({ where: { playerId_nodeId: { playerId, nodeId } } }),
  ])

  if (!player) return NextResponse.json({ error: 'Player não encontrado' }, { status: 404 })
  if (!node)   return NextResponse.json({ error: 'Nó não encontrado' }, { status: 404 })
  if (existing) return NextResponse.json({ error: 'Habilidade já desbloqueada' }, { status: 409 })
  if (player.coins < node.costCoins) {
    return NextResponse.json({ error: 'Moedas insuficientes' }, { status: 402 })
  }

  await db.$transaction([
    db.player.update({ where: { id: playerId }, data: { coins: { decrement: node.costCoins } } }),
    db.playerSkillUnlock.create({ data: { playerId, nodeId } }),
  ])

  const updated = await db.player.findUnique({ where: { id: playerId }, select: { coins: true } })
  return NextResponse.json({ ok: true, remainingCoins: updated?.coins ?? 0 })
}
