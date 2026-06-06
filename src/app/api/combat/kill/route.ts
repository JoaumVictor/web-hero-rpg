import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

export async function POST(req: NextRequest) {
  const { playerId, monsterId, baseXp: baseXpParam, levelMult = 1, xpBonus = 0 } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'playerId obrigatório' }, { status: 400 })

  // resolve monster data — baseXp and loot entries
  let baseXp = typeof baseXpParam === 'number' ? baseXpParam : 8
  let lootEntries: { id: string; dropChance: number; minQty: number; maxQty: number; item: { id: string; name: string; rarity: string } }[] = []

  if (monsterId) {
    const monster = await db.monster.findUnique({
      where: { id: monsterId },
      select: {
        baseXp: true,
        lootEntries: {
          select: {
            id: true, dropChance: true, minQty: true, maxQty: true,
            item: { select: { id: true, name: true, rarity: true } },
          },
        },
      },
    })
    if (monster) {
      baseXp = monster.baseXp
      lootEntries = monster.lootEntries
    }
  }

  const xpGained = Math.round(baseXp * levelMult * (1 + xpBonus))

  // ── XP distribution ───────────────────────────────────────────
  const group = await db.heroInstance.findMany({
    where: { playerId, groupPosition: { not: null } },
    include: { hero: { select: { name: true } } },
  })

  const levelUps: { heroName: string; newLevel: number }[] = []

  let heroes: { id: string; name: string; level: number; xp: number; xpToNext: number }[] = []

  if (group.length > 0) {
    const share = Math.max(1, Math.round(xpGained / group.length))
    heroes = await Promise.all(
      group.map(async (instance) => {
        let { level, xp } = instance
        xp += share
        while (xp >= xpToNext(level)) {
          xp -= xpToNext(level)
          level++
          levelUps.push({ heroName: instance.hero.name, newLevel: level })
        }
        await db.heroInstance.update({ where: { id: instance.id }, data: { xp, level } })
        return { id: instance.id, name: instance.hero.name, level, xp, xpToNext: xpToNext(level) }
      })
    )
  }

  // ── Loot drops ────────────────────────────────────────────────
  const drops: { itemName: string; rarity: string; qty: number }[] = []

  for (const entry of lootEntries) {
    if (Math.random() >= entry.dropChance) continue
    const qty = entry.minQty + Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1))

    // upsert: increment quantity if player already has this item
    const existing = await db.inventoryItem.findFirst({
      where: { playerId, itemId: entry.item.id },
    })
    if (existing) {
      await db.inventoryItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + qty } })
    } else {
      await db.inventoryItem.create({ data: { playerId, itemId: entry.item.id, quantity: qty } })
    }

    drops.push({ itemName: entry.item.name, rarity: entry.item.rarity, qty })
  }

  return NextResponse.json({ xpGained, heroes, levelUps, drops })
}
