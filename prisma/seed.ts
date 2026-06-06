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

  console.log('Seed concluído')
}

main().catch(console.error).finally(() => db.$disconnect())
