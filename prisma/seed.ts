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

  // Third hero — mage (AOE, expensive)
  await db.hero.upsert({
    where: { id: 'hero-mage' },
    update: {},
    create: {
      id:             'hero-mage',
      name:           'Mago',
      spriteSet:      'hero',
      heroClass:      'mage',
      cost:           300,
      hp:             14,
      attack:         7,
      defense:        0,
      attackCooldown: 2.8,
      walkSpeed:      180,
      attackRange:    2,
      isActive:       true,
    },
  })

  // Fourth hero — cleric (healer support)
  await db.hero.upsert({
    where: { id: 'hero-cleric' },
    update: {},
    create: {
      id:             'hero-cleric',
      name:           'Clérigo',
      spriteSet:      'hero',
      heroClass:      'cleric',
      cost:           200,
      hp:             16,
      attack:         5,    // reused as healAmount
      defense:        1,
      attackCooldown: 2.5,
      walkSpeed:      200,
      attackRange:    3,
      isActive:       true,
    },
  })

  // Fifth hero — assassin (finisher mechanic, targets lowest-HP enemy)
  await db.hero.upsert({
    where: { id: 'hero-assassin' },
    update: {},
    create: {
      id:             'hero-assassin',
      name:           'Assassino',
      spriteSet:      'hero',
      heroClass:      'assassin',
      cost:           250,
      hp:             10,
      attack:         5,
      defense:        0,
      attackCooldown: 0.6,
      walkSpeed:      260,
      attackRange:    1,
      isActive:       true,
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

  // Ranged enemy — stops at distance and fires projectiles
  await db.monster.upsert({
    where: { id: 'monster-zombie-archer' },
    update: {},
    create: {
      id:              'monster-zombie-archer',
      name:            'Arqueiro Zumbi',
      spriteSet:       'zombie',
      monsterType:     'UNDEAD',
      hp:              10,
      attack:          2,
      defense:         0,
      attackCooldown:  2.5,
      walkSpeed:       30,
      attackRange:     3,
      attackBehavior:  'RANGED_PROJECTILE',
      coinDropMin:     2,
      coinDropMax:     4,
      baseXp:          10,
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

  // ── Rounds (fixed IDs for map linking) ──────────────────────────
  const rounds = [
    { id: 'round-1', number: 10, name: 'Fase 1 — Floresta Sombria' },
    { id: 'round-2', number: 11, name: 'Fase 2 — Floresta Profunda' },
    { id: 'round-3', number: 12, name: 'Fase 3 — Claro da Morte' },
  ]

  for (const r of rounds) {
    await db.round.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    })
  }

  // ── Waves for round-1 (3 waves, 1-2 zombies each) ────────────────
  const wave1Defs = [
    { id: 'wave-r1-1', roundId: 'round-1', order: 1, triggerX: 640 },
    { id: 'wave-r1-2', roundId: 'round-1', order: 2, triggerX: 1200 },
    { id: 'wave-r1-3', roundId: 'round-1', order: 3, triggerX: 1800 },
  ]
  for (const w of wave1Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }

  // wave monsters for round-1
  const waveMonsters1 = [
    { id: 'wm-r1-1-1', waveId: 'wave-r1-1', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.0 },
    { id: 'wm-r1-2-1', waveId: 'wave-r1-2', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.0 },
    { id: 'wm-r1-2-2', waveId: 'wave-r1-2', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.0 },
    { id: 'wm-r1-3-1', waveId: 'wave-r1-3', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.2 },
    { id: 'wm-r1-3-2', waveId: 'wave-r1-3', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.2 },
    { id: 'wm-r1-3-3', waveId: 'wave-r1-3', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.2 },
  ]
  for (const wm of waveMonsters1) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // ── Waves for round-2 ────────────────────────────────────────────
  const wave2Defs = [
    { id: 'wave-r2-1', roundId: 'round-2', order: 1, triggerX: 640 },
    { id: 'wave-r2-2', roundId: 'round-2', order: 2, triggerX: 1200 },
    { id: 'wave-r2-3', roundId: 'round-2', order: 3, triggerX: 1800 },
    { id: 'wave-r2-4', roundId: 'round-2', order: 4, triggerX: 2400 },
  ]
  for (const w of wave2Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }
  const waveMonsters2 = [
    { id: 'wm-r2-1-1', waveId: 'wave-r2-1', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.2 },
    { id: 'wm-r2-1-2', waveId: 'wave-r2-1', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.2 },
    { id: 'wm-r2-2-1', waveId: 'wave-r2-2', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.3 },
    { id: 'wm-r2-2-2', waveId: 'wave-r2-2', monsterId: 'monster-zombie', offsetX: 200, levelMult: 1.3 },
    { id: 'wm-r2-3-1', waveId: 'wave-r2-3', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.4 },
    { id: 'wm-r2-3-2', waveId: 'wave-r2-3', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.4 },
    { id: 'wm-r2-3-3', waveId: 'wave-r2-3', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.4 },
    { id: 'wm-r2-4-1', waveId: 'wave-r2-4', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.5 },
    { id: 'wm-r2-4-2', waveId: 'wave-r2-4', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.5 },
    { id: 'wm-r2-4-3', waveId: 'wave-r2-4', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.5 },
  ]
  for (const wm of waveMonsters2) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // ── Waves for round-3 ────────────────────────────────────────────
  const wave3Defs = [
    { id: 'wave-r3-1', roundId: 'round-3', order: 1, triggerX: 640 },
    { id: 'wave-r3-2', roundId: 'round-3', order: 2, triggerX: 1200 },
    { id: 'wave-r3-3', roundId: 'round-3', order: 3, triggerX: 1800 },
    { id: 'wave-r3-4', roundId: 'round-3', order: 4, triggerX: 2400 },
    { id: 'wave-r3-5', roundId: 'round-3', order: 5, triggerX: 2900 },
  ]
  for (const w of wave3Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }
  const waveMonsters3 = [
    { id: 'wm-r3-1-1', waveId: 'wave-r3-1', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.5 },
    { id: 'wm-r3-1-2', waveId: 'wave-r3-1', monsterId: 'monster-zombie', offsetX: 200, levelMult: 1.5 },
    { id: 'wm-r3-2-1', waveId: 'wave-r3-2', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.6 },
    { id: 'wm-r3-2-2', waveId: 'wave-r3-2', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.6 },
    { id: 'wm-r3-2-3', waveId: 'wave-r3-2', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.6 },
    { id: 'wm-r3-3-1', waveId: 'wave-r3-3', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.7 },
    { id: 'wm-r3-3-2', waveId: 'wave-r3-3', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.7 },
    { id: 'wm-r3-3-3', waveId: 'wave-r3-3', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.7 },
    { id: 'wm-r3-4-1', waveId: 'wave-r3-4', monsterId: 'monster-zombie',         offsetX: 0,   levelMult: 1.8 },
    { id: 'wm-r3-4-2', waveId: 'wave-r3-4', monsterId: 'monster-zombie',         offsetX: 220, levelMult: 1.8 },
    { id: 'wm-r3-4-3', waveId: 'wave-r3-4', monsterId: 'monster-zombie',         offsetX: 440, levelMult: 1.8 },
    { id: 'wm-r3-4-4', waveId: 'wave-r3-4', monsterId: 'monster-zombie-archer',  offsetX: 300, levelMult: 1.8 },
    { id: 'wm-r3-5-1', waveId: 'wave-r3-5', monsterId: 'monster-zombie',         offsetX: 0,   levelMult: 2.0 },
    { id: 'wm-r3-5-2', waveId: 'wave-r3-5', monsterId: 'monster-zombie',         offsetX: 200, levelMult: 2.0 },
    { id: 'wm-r3-5-3', waveId: 'wave-r3-5', monsterId: 'monster-zombie',         offsetX: 400, levelMult: 2.0 },
    { id: 'wm-r3-5-4', waveId: 'wave-r3-5', monsterId: 'monster-zombie',         offsetX: 600, levelMult: 2.0 },
    { id: 'wm-r3-5-a1', waveId: 'wave-r3-5', monsterId: 'monster-zombie-archer', offsetX: 300, levelMult: 2.0 },
    { id: 'wm-r3-5-a2', waveId: 'wave-r3-5', monsterId: 'monster-zombie-archer', offsetX: 500, levelMult: 2.0 },
  ]
  for (const wm of waveMonsters3) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // ── World > Zone > Levels ────────────────────────────────────────
  await db.world.upsert({
    where: { id: 'world-1' },
    update: {},
    create: { id: 'world-1', name: 'Reino dos Mortos', description: 'Um reino assolado pelos não-mortos.', order: 1 },
  })

  await db.zone.upsert({
    where: { id: 'zone-1' },
    update: {},
    create: { id: 'zone-1', worldId: 'world-1', name: 'Floresta Sombria', description: 'Uma floresta densa infestada de zumbis.', order: 1 },
  })

  const levels = [
    { id: 'level-1', zoneId: 'zone-1', name: 'Fase 1',  number: 1, roundId: 'round-1', recommendedLevel: 1 },
    { id: 'level-2', zoneId: 'zone-1', name: 'Fase 2',  number: 2, roundId: 'round-2', recommendedLevel: 2 },
    { id: 'level-3', zoneId: 'zone-1', name: 'Fase 3',  number: 3, roundId: 'round-3', recommendedLevel: 3 },
  ]

  for (const lvl of levels) {
    await db.level.upsert({ where: { id: lvl.id }, update: {}, create: lvl })
  }

  // ── World 2 > Zone > Levels ──────────────────────────────────────
  await db.world.upsert({
    where: { id: 'world-2' },
    update: {},
    create: { id: 'world-2', name: 'Terras Malditas', description: 'Terras amaldiçoadas onde os mortos nunca descansam.', order: 2 },
  })

  await db.zone.upsert({
    where: { id: 'zone-2' },
    update: {},
    create: { id: 'zone-2', worldId: 'world-2', name: 'Pântano dos Mortos', description: 'Um pântano sombrio repleto de criaturas imundas.', order: 1 },
  })

  // ── Rounds for World 2 ───────────────────────────────────────────
  const roundsW2 = [
    { id: 'round-4', number: 20, name: 'Pântano — Fase 1' },
    { id: 'round-5', number: 21, name: 'Pântano — Fase 2' },
    { id: 'round-6', number: 22, name: 'Pântano — O Pântano' },
    { id: 'round-boss-2', number: 23, name: 'Boss — O Rei Retorna' },
  ]
  for (const r of roundsW2) {
    await db.round.upsert({ where: { id: r.id }, update: {}, create: r })
  }

  // round-4: 3 waves (level 5, mix zombie + archer, levelMult 2.0-2.2)
  const wave4Defs = [
    { id: 'wave-r4-1', roundId: 'round-4', order: 1, triggerX: 640 },
    { id: 'wave-r4-2', roundId: 'round-4', order: 2, triggerX: 1300 },
    { id: 'wave-r4-3', roundId: 'round-4', order: 3, triggerX: 2000 },
  ]
  for (const w of wave4Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }
  const waveMonsters4 = [
    { id: 'wm-r4-1-1', waveId: 'wave-r4-1', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.0 },
    { id: 'wm-r4-1-2', waveId: 'wave-r4-1', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.0 },
    { id: 'wm-r4-2-1', waveId: 'wave-r4-2', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.1 },
    { id: 'wm-r4-2-2', waveId: 'wave-r4-2', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.1 },
    { id: 'wm-r4-2-a', waveId: 'wave-r4-2', monsterId: 'monster-zombie-archer', offsetX: 440, levelMult: 2.1 },
    { id: 'wm-r4-3-1', waveId: 'wave-r4-3', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.2 },
    { id: 'wm-r4-3-2', waveId: 'wave-r4-3', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.2 },
    { id: 'wm-r4-3-3', waveId: 'wave-r4-3', monsterId: 'monster-zombie',        offsetX: 440, levelMult: 2.2 },
    { id: 'wm-r4-3-a', waveId: 'wave-r4-3', monsterId: 'monster-zombie-archer', offsetX: 330, levelMult: 2.2 },
  ]
  for (const wm of waveMonsters4) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // round-5: 4 waves (level 6, more enemies, levelMult 2.2-2.5)
  const wave5Defs = [
    { id: 'wave-r5-1', roundId: 'round-5', order: 1, triggerX: 640 },
    { id: 'wave-r5-2', roundId: 'round-5', order: 2, triggerX: 1200 },
    { id: 'wave-r5-3', roundId: 'round-5', order: 3, triggerX: 1800 },
    { id: 'wave-r5-4', roundId: 'round-5', order: 4, triggerX: 2400 },
  ]
  for (const w of wave5Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }
  const waveMonsters5 = [
    { id: 'wm-r5-1-1', waveId: 'wave-r5-1', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.2 },
    { id: 'wm-r5-1-2', waveId: 'wave-r5-1', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.2 },
    { id: 'wm-r5-1-a', waveId: 'wave-r5-1', monsterId: 'monster-zombie-archer', offsetX: 440, levelMult: 2.2 },
    { id: 'wm-r5-2-1', waveId: 'wave-r5-2', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.3 },
    { id: 'wm-r5-2-2', waveId: 'wave-r5-2', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.3 },
    { id: 'wm-r5-2-3', waveId: 'wave-r5-2', monsterId: 'monster-zombie',        offsetX: 440, levelMult: 2.3 },
    { id: 'wm-r5-2-a', waveId: 'wave-r5-2', monsterId: 'monster-zombie-archer', offsetX: 330, levelMult: 2.3 },
    { id: 'wm-r5-3-1', waveId: 'wave-r5-3', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.4 },
    { id: 'wm-r5-3-2', waveId: 'wave-r5-3', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.4 },
    { id: 'wm-r5-3-a1', waveId: 'wave-r5-3', monsterId: 'monster-zombie-archer', offsetX: 440, levelMult: 2.4 },
    { id: 'wm-r5-3-a2', waveId: 'wave-r5-3', monsterId: 'monster-zombie-archer', offsetX: 660, levelMult: 2.4 },
    { id: 'wm-r5-4-1', waveId: 'wave-r5-4', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.5 },
    { id: 'wm-r5-4-2', waveId: 'wave-r5-4', monsterId: 'monster-zombie',        offsetX: 200, levelMult: 2.5 },
    { id: 'wm-r5-4-3', waveId: 'wave-r5-4', monsterId: 'monster-zombie',        offsetX: 400, levelMult: 2.5 },
    { id: 'wm-r5-4-a1', waveId: 'wave-r5-4', monsterId: 'monster-zombie-archer', offsetX: 300, levelMult: 2.5 },
  ]
  for (const wm of waveMonsters5) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // round-6: 5 waves (level 7, heavy mix, levelMult 2.5-2.8)
  const wave6Defs = [
    { id: 'wave-r6-1', roundId: 'round-6', order: 1, triggerX: 640 },
    { id: 'wave-r6-2', roundId: 'round-6', order: 2, triggerX: 1200 },
    { id: 'wave-r6-3', roundId: 'round-6', order: 3, triggerX: 1800 },
    { id: 'wave-r6-4', roundId: 'round-6', order: 4, triggerX: 2400 },
    { id: 'wave-r6-5', roundId: 'round-6', order: 5, triggerX: 2900 },
  ]
  for (const w of wave6Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }
  const waveMonsters6 = [
    { id: 'wm-r6-1-1', waveId: 'wave-r6-1', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.5 },
    { id: 'wm-r6-1-2', waveId: 'wave-r6-1', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.5 },
    { id: 'wm-r6-1-a', waveId: 'wave-r6-1', monsterId: 'monster-zombie-archer', offsetX: 440, levelMult: 2.5 },
    { id: 'wm-r6-2-1', waveId: 'wave-r6-2', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.6 },
    { id: 'wm-r6-2-2', waveId: 'wave-r6-2', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.6 },
    { id: 'wm-r6-2-3', waveId: 'wave-r6-2', monsterId: 'monster-zombie',        offsetX: 440, levelMult: 2.6 },
    { id: 'wm-r6-2-a', waveId: 'wave-r6-2', monsterId: 'monster-zombie-archer', offsetX: 330, levelMult: 2.6 },
    { id: 'wm-r6-3-1', waveId: 'wave-r6-3', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.7 },
    { id: 'wm-r6-3-2', waveId: 'wave-r6-3', monsterId: 'monster-zombie',        offsetX: 200, levelMult: 2.7 },
    { id: 'wm-r6-3-3', waveId: 'wave-r6-3', monsterId: 'monster-zombie',        offsetX: 400, levelMult: 2.7 },
    { id: 'wm-r6-3-a1', waveId: 'wave-r6-3', monsterId: 'monster-zombie-archer', offsetX: 300, levelMult: 2.7 },
    { id: 'wm-r6-3-a2', waveId: 'wave-r6-3', monsterId: 'monster-zombie-archer', offsetX: 600, levelMult: 2.7 },
    { id: 'wm-r6-4-1', waveId: 'wave-r6-4', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.8 },
    { id: 'wm-r6-4-2', waveId: 'wave-r6-4', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.8 },
    { id: 'wm-r6-4-3', waveId: 'wave-r6-4', monsterId: 'monster-zombie',        offsetX: 440, levelMult: 2.8 },
    { id: 'wm-r6-4-a1', waveId: 'wave-r6-4', monsterId: 'monster-zombie-archer', offsetX: 330, levelMult: 2.8 },
    { id: 'wm-r6-4-a2', waveId: 'wave-r6-4', monsterId: 'monster-zombie-archer', offsetX: 550, levelMult: 2.8 },
    { id: 'wm-r6-5-1', waveId: 'wave-r6-5', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.8 },
    { id: 'wm-r6-5-2', waveId: 'wave-r6-5', monsterId: 'monster-zombie',        offsetX: 200, levelMult: 2.8 },
    { id: 'wm-r6-5-3', waveId: 'wave-r6-5', monsterId: 'monster-zombie',        offsetX: 400, levelMult: 2.8 },
    { id: 'wm-r6-5-4', waveId: 'wave-r6-5', monsterId: 'monster-zombie',        offsetX: 600, levelMult: 2.8 },
    { id: 'wm-r6-5-a1', waveId: 'wave-r6-5', monsterId: 'monster-zombie-archer', offsetX: 300, levelMult: 2.8 },
    { id: 'wm-r6-5-a2', waveId: 'wave-r6-5', monsterId: 'monster-zombie-archer', offsetX: 500, levelMult: 2.8 },
  ]
  for (const wm of waveMonsters6) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // round-boss-2: 3 waves (level 8 — boss final, Rei dos Zumbis + arqueiros)
  const waveBoss2Defs = [
    { id: 'wave-b2-1', roundId: 'round-boss-2', order: 1, triggerX: 640 },
    { id: 'wave-b2-2', roundId: 'round-boss-2', order: 2, triggerX: 1300 },
    { id: 'wave-b2-3', roundId: 'round-boss-2', order: 3, triggerX: 2000 },
  ]
  for (const w of waveBoss2Defs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }
  const boss2WaveMonsters = [
    { id: 'wm-b2-1-1', waveId: 'wave-b2-1', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.5 },
    { id: 'wm-b2-1-2', waveId: 'wave-b2-1', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.5 },
    { id: 'wm-b2-1-a', waveId: 'wave-b2-1', monsterId: 'monster-zombie-archer', offsetX: 440, levelMult: 2.5 },
    { id: 'wm-b2-2-1', waveId: 'wave-b2-2', monsterId: 'monster-zombie',        offsetX: 0,   levelMult: 2.5 },
    { id: 'wm-b2-2-2', waveId: 'wave-b2-2', monsterId: 'monster-zombie',        offsetX: 220, levelMult: 2.5 },
    { id: 'wm-b2-2-a1', waveId: 'wave-b2-2', monsterId: 'monster-zombie-archer', offsetX: 440, levelMult: 2.5 },
    { id: 'wm-b2-2-a2', waveId: 'wave-b2-2', monsterId: 'monster-zombie-archer', offsetX: 660, levelMult: 2.5 },
    { id: 'wm-b2-3-1', waveId: 'wave-b2-3', monsterId: 'monster-zombie-king',   offsetX: 0,   levelMult: 1.0 },
    { id: 'wm-b2-3-a1', waveId: 'wave-b2-3', monsterId: 'monster-zombie-archer', offsetX: 300, levelMult: 2.5 },
    { id: 'wm-b2-3-a2', waveId: 'wave-b2-3', monsterId: 'monster-zombie-archer', offsetX: 500, levelMult: 2.5 },
  ]
  for (const wm of boss2WaveMonsters) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  // Levels 5-8 in zone-2
  const levelsW2 = [
    { id: 'level-5', zoneId: 'zone-2', name: 'Fase 1',              number: 1, roundId: 'round-4',     recommendedLevel: 5 },
    { id: 'level-6', zoneId: 'zone-2', name: 'Fase 2',              number: 2, roundId: 'round-5',     recommendedLevel: 6 },
    { id: 'level-7', zoneId: 'zone-2', name: 'Fase 3 — O Pântano',  number: 3, roundId: 'round-6',     recommendedLevel: 7 },
    { id: 'level-8', zoneId: 'zone-2', name: 'Fase 4 — O Rei Retorna', number: 4, roundId: 'round-boss-2', recommendedLevel: 8 },
  ]
  for (const lvl of levelsW2) {
    await db.level.upsert({ where: { id: lvl.id }, update: {}, create: lvl })
  }

  // ── Skill nodes (global passive upgrades) ───────────────────────
  const skillNodes = [
    { id: 'skill-hp-1',   name: 'Vitalidade I',   description: '+5 HP para todos os heróis.',            costCoins: 50,  statBonus: { allHp: 5 },        order: 1 },
    { id: 'skill-hp-2',   name: 'Vitalidade II',  description: '+12 HP para todos os heróis.',           costCoins: 150, statBonus: { allHp: 12 },       order: 2 },
    { id: 'skill-atk-1',  name: 'Força I',        description: '+1 ATK para todos os heróis.',           costCoins: 75,  statBonus: { allAttack: 1 },    order: 3 },
    { id: 'skill-atk-2',  name: 'Força II',       description: '+3 ATK para todos os heróis.',           costCoins: 200, statBonus: { allAttack: 3 },    order: 4 },
    { id: 'skill-def-1',  name: 'Resiliência I',  description: '+2 DEF para todos os heróis.',           costCoins: 80,  statBonus: { allDefense: 2 },   order: 5 },
    { id: 'skill-coin-1', name: 'Cobiça',         description: '+50% moedas de cada kill.',              costCoins: 120, statBonus: { coinBonus: 0.5 },  order: 6 },
    { id: 'skill-xp-1',   name: 'Sabedoria',      description: '+25% XP de cada kill.',                  costCoins: 100, statBonus: { xpBonus: 0.25 },   order: 7 },
    { id: 'skill-xp-2',   name: 'Iluminação',     description: '+50% XP de cada kill.',                  costCoins: 250, statBonus: { xpBonus: 0.5 },    order: 8 },
  ]

  for (const node of skillNodes) {
    await db.skillNode.upsert({
      where: { id: node.id },
      update: {},
      create: node,
    })
  }

  // ── Boss monster ─────────────────────────────────────────────────
  await db.monster.upsert({
    where: { id: 'monster-zombie-king' },
    update: {},
    create: {
      id:             'monster-zombie-king',
      name:           'Rei dos Zumbis',
      spriteSet:      'zombie',
      monsterType:    'UNDEAD',
      isBoss:         true,
      sizeMultiplier: 2.0,
      hp:             80,
      attack:         3,
      defense:        0,
      attackCooldown: 3.0,
      walkSpeed:      28,
      attackRange:    1,
      coinDropMin:    15,
      coinDropMax:    25,
      baseXp:         60,
    },
  })

  // ── Boss round ────────────────────────────────────────────────────
  await db.round.upsert({
    where: { id: 'round-boss-1' },
    update: {},
    create: { id: 'round-boss-1', number: 13, name: 'Boss — Rei dos Zumbis' },
  })

  const bosWaveDefs = [
    { id: 'wave-b1-1', roundId: 'round-boss-1', order: 1, triggerX: 640 },
    { id: 'wave-b1-2', roundId: 'round-boss-1', order: 2, triggerX: 1300 },
    { id: 'wave-b1-3', roundId: 'round-boss-1', order: 3, triggerX: 2000 },
  ]
  for (const w of bosWaveDefs) {
    await db.wave.upsert({ where: { id: w.id }, update: {}, create: w })
  }

  const bossWaveMonsters = [
    { id: 'wm-b1-1-1', waveId: 'wave-b1-1', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.8 },
    { id: 'wm-b1-1-2', waveId: 'wave-b1-1', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.8 },
    { id: 'wm-b1-2-1', waveId: 'wave-b1-2', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.9 },
    { id: 'wm-b1-2-2', waveId: 'wave-b1-2', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.9 },
    { id: 'wm-b1-2-3', waveId: 'wave-b1-2', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.9 },
    { id: 'wm-b1-3-1', waveId: 'wave-b1-3', monsterId: 'monster-zombie-king', offsetX: 0, levelMult: 1.0 },
  ]
  for (const wm of bossWaveMonsters) {
    await db.waveMonster.upsert({ where: { id: wm.id }, update: {}, create: wm })
  }

  await db.level.upsert({
    where: { id: 'level-4' },
    update: {},
    create: {
      id:               'level-4',
      zoneId:           'zone-1',
      name:             'Fase 4 — O Rei',
      number:           4,
      roundId:          'round-boss-1',
      recommendedLevel: 4,
    },
  })

  // ── Pets ────────────────────────────────────────────────────────
  const pets = [
    {
      id: 'pet-slime',   name: 'Slime Dourado',  rarity: 'UNCOMMON', cost: 200,
      description: 'Um slime brilhante que atrai moedas.',
      buffStats: { coinBonus: 0.25 },
    },
    {
      id: 'pet-wolf',    name: 'Lobo de Guerra', rarity: 'UNCOMMON', cost: 300,
      description: 'Um lobo feroz que fortalece o grupo.',
      buffStats: { allAttack: 2 },
    },
    {
      id: 'pet-crow',    name: 'Corvo Sombrio',  rarity: 'RARE',     cost: 400,
      description: 'Um corvo sábio que acelera o aprendizado.',
      buffStats: { xpBonus: 0.20 },
    },
    {
      id: 'pet-phoenix', name: 'Fênix Menor',    rarity: 'RARE',     cost: 500,
      description: 'Uma ave de fogo que concede vitalidade extra.',
      buffStats: { allHp: 8 },
    },
  ]

  for (const pet of pets) {
    await db.pet.upsert({ where: { id: pet.id }, update: {}, create: pet })
  }

  console.log('Seed concluído')
}

main().catch(console.error).finally(() => db.$disconnect())
