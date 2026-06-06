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
    { id: 'wm-r3-4-1', waveId: 'wave-r3-4', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 1.8 },
    { id: 'wm-r3-4-2', waveId: 'wave-r3-4', monsterId: 'monster-zombie', offsetX: 220, levelMult: 1.8 },
    { id: 'wm-r3-4-3', waveId: 'wave-r3-4', monsterId: 'monster-zombie', offsetX: 440, levelMult: 1.8 },
    { id: 'wm-r3-5-1', waveId: 'wave-r3-5', monsterId: 'monster-zombie', offsetX: 0,   levelMult: 2.0 },
    { id: 'wm-r3-5-2', waveId: 'wave-r3-5', monsterId: 'monster-zombie', offsetX: 200, levelMult: 2.0 },
    { id: 'wm-r3-5-3', waveId: 'wave-r3-5', monsterId: 'monster-zombie', offsetX: 400, levelMult: 2.0 },
    { id: 'wm-r3-5-4', waveId: 'wave-r3-5', monsterId: 'monster-zombie', offsetX: 600, levelMult: 2.0 },
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

  console.log('Seed concluído')
}

main().catch(console.error).finally(() => db.$disconnect())
