import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { playerId, petId } = await req.json()
  if (!playerId || !petId) {
    return NextResponse.json({ error: 'playerId e petId obrigatórios' }, { status: 400 })
  }

  const owned = await db.playerPet.findUnique({
    where: { playerId_petId: { playerId, petId } },
  })
  if (!owned) return NextResponse.json({ error: 'Pet não adquirido' }, { status: 403 })

  await db.$transaction([
    db.playerPet.updateMany({ where: { playerId }, data: { isActive: false } }),
    db.playerPet.update({ where: { playerId_petId: { playerId, petId } }, data: { isActive: true } }),
  ])

  return NextResponse.json({ ok: true })
}
