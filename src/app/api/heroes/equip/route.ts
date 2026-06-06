import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { playerId, heroInstanceId, slot, inventoryItemId } = await req.json()
  if (!playerId || !heroInstanceId || !slot || !inventoryItemId) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // verify player owns this hero instance
  const instance = await db.heroInstance.findFirst({ where: { id: heroInstanceId, playerId } })
  if (!instance) return NextResponse.json({ error: 'Herói não encontrado' }, { status: 404 })

  // verify player owns this inventory item
  const invItem = await db.inventoryItem.findFirst({
    where: { id: inventoryItemId, playerId },
    include: { item: { select: { equipSlot: true, name: true } } },
  })
  if (!invItem) return NextResponse.json({ error: 'Item não encontrado no inventário' }, { status: 404 })

  // validate slot compatibility
  if (invItem.item.equipSlot && invItem.item.equipSlot !== slot) {
    return NextResponse.json(
      { error: `${invItem.item.name} não pode ser equipado em ${slot}` },
      { status: 400 }
    )
  }

  // upsert — replace whatever was in this slot
  const equipment = await db.equipment.upsert({
    where: { heroInstanceId_slot: { heroInstanceId, slot } },
    update: { inventoryItemId },
    create: { heroInstanceId, slot, inventoryItemId },
    include: { inventoryItem: { include: { item: true } } },
  })

  return NextResponse.json(equipment)
}

export async function DELETE(req: NextRequest) {
  const { playerId, heroInstanceId, slot } = await req.json()
  if (!playerId || !heroInstanceId || !slot) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // verify ownership
  const instance = await db.heroInstance.findFirst({ where: { id: heroInstanceId, playerId } })
  if (!instance) return NextResponse.json({ error: 'Herói não encontrado' }, { status: 404 })

  await db.equipment.deleteMany({ where: { heroInstanceId, slot } })

  return NextResponse.json({ ok: true })
}
