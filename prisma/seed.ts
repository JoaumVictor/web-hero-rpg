import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter, log: ['error'] })

async function main() {
  // Default hero — free, every player starts with this
  await db.hero.upsert({
    where: { id: 'hero-default' },
    update: {},
    create: {
      id:            'hero-default',
      name:          'Guerreiro',
      spriteSet:     'hero',
      heroClass:     'warrior',
      cost:          0,
      hp:            26,
      attack:        4,
      defense:       0,
      attackCooldown: 1.5,
      walkSpeed:     220,
      attackRange:   1,
      isActive:      true,
    },
  })

  // Second hero — costs coins
  await db.hero.upsert({
    where: { id: 'hero-archer' },
    update: {},
    create: {
      id:            'hero-archer',
      name:          'Arqueiro',
      spriteSet:     'hero',
      heroClass:     'archer',
      cost:          150,
      hp:            18,
      attack:        6,
      defense:       0,
      attackCooldown: 2.0,
      walkSpeed:     200,
      attackRange:   3,
      isActive:      true,
    },
  })

  // Default zombie monster
  await db.monster.upsert({
    where: { id: 'monster-zombie' },
    update: {},
    create: {
      id:            'monster-zombie',
      name:          'Zumbi',
      spriteSet:     'zombie',
      monsterType:   'UNDEAD',
      hp:            12,
      attack:        1,
      defense:       0,
      attackCooldown: 2.2,
      walkSpeed:     42,
      attackRange:   1,
      coinDropMin:   1,
      coinDropMax:   2,
      baseXp:        8,
    },
  })

  // ── Items ──────────────────────────────────────────────────────
  const items = [
    {
      id: 'item-sword-rusty',
      name: 'Espada Enferrujada',
      description: 'Uma espada velha coberta de ferrugem. Ainda corta.',
      type: 'WEAPON' as const,
      rarity: 'COMMON' as const,
      equipSlot: 'MAINHAND',
      requiredLevel: 1,
      statBonus: { attack: 2 },
    },
    {
      id: 'item-helm-leather',
      name: 'Elmo de Couro',
      description: 'Proteção básica para a cabeça.',
      type: 'HELMET' as const,
      rarity: 'COMMON' as const,
      equipSlot: 'HEAD',
      requiredLevel: 1,
      statBonus: { hp: 4 },
    },
    {
      id: 'item-boots-worn',
      name: 'Bota Desgastada',
      description: 'Botas velhas mas ainda confortáveis.',
      type: 'BOOTS' as const,
      rarity: 'COMMON' as const,
      equipSlot: 'BOOTS',
      requiredLevel: 1,
      statBonus: { defense: 1 },
    },
    {
      id: 'item-ring-copper',
      name: 'Anel de Cobre',
      description: 'Um simples anel de cobre com leve encantamento.',
      type: 'ACCESSORY' as const,
      rarity: 'UNCOMMON' as const,
      equipSlot: 'RING_LEFT',
      requiredLevel: 2,
      statBonus: { hp: 6, attack: 1 },
    },
    {
      id: 'item-rune-fragment',
      name: 'Fragmento de Runa',
      description: 'Pedaço de uma runa antiga. Pulsa com energia residual.',
      type: 'ACCESSORY' as const,
      rarity: 'RARE' as const,
      equipSlot: 'BRACELET',
      requiredLevel: 4,
      statBonus: { hp: 10, attack: 3, defense: 1 },
    },
  ]

  for (const item of items) {
    await db.item.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    })
  }

  // ── Loot entries (zombie drops) ────────────────────────────────
  const lootEntries = [
    { id: 'loot-zombie-sword',   monsterId: 'monster-zombie', itemId: 'item-sword-rusty',   dropChance: 0.25 },
    { id: 'loot-zombie-helm',    monsterId: 'monster-zombie', itemId: 'item-helm-leather',  dropChance: 0.18 },
    { id: 'loot-zombie-boots',   monsterId: 'monster-zombie', itemId: 'item-boots-worn',    dropChance: 0.15 },
    { id: 'loot-zombie-ring',    monsterId: 'monster-zombie', itemId: 'item-ring-copper',   dropChance: 0.08 },
    { id: 'loot-zombie-rune',    monsterId: 'monster-zombie', itemId: 'item-rune-fragment', dropChance: 0.03 },
  ]

  for (const entry of lootEntries) {
    await db.lootEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    })
  }

  console.log('Seed concluído')
}

main().catch(console.error).finally(() => db.$disconnect())
