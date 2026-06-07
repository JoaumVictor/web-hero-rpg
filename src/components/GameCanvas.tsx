'use client'

import { useEffect, useRef } from 'react'
import { Game, WaveDefDB, HeroSlot } from '@/game/Game'
import { getPlayerId, getLocalCoins, setLocalCoins, getSelectedLevel } from '@/lib/session'
import { computeStats } from '@/lib/heroStats'

async function loadCoins(playerId: string): Promise<number> {
  const local = getLocalCoins()
  try {
    const res = await fetch(`/api/progress?player=${playerId}`)
    const { coins } = (await res.json()) as { coins: number }
    const best = Math.max(local, typeof coins === 'number' ? coins : 0)
    if (best > local) setLocalCoins(best)
    return best
  } catch {
    return local
  }
}

function persistCoins(playerId: string, coins: number) {
  setLocalCoins(coins)
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: playerId, coins }),
  }).catch(() => {})
}

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#aaa',
  UNCOMMON: '#2ecc71',
  RARE: '#3498db',
  LEGENDARY: '#f39c12',
}

type HeroApiItem = {
  name: string
  spriteSet: string
  heroClass: string
  hp: number; attack: number; defense: number; attackCooldown: number; walkSpeed: number; attackRange: number
  instance: {
    id: string; level: number; xp: number; groupPosition: number | null
    equipment: { slot: string; inventoryItem: { item: { statBonus: Record<string, number> } } }[]
  } | null
}

type LevelInfo = { name: string; zone: { name: string; world: { name: string } } }

type SkillBonus = {
  allAttack?: number
  allHp?: number
  allDefense?: number
  coinBonus?: number
  xpBonus?: number
}

async function loadSelectedLevel(levelId: string): Promise<{ waveDefs: WaveDefDB[] | null; levelInfo: LevelInfo | null }> {
  try {
    const [wavesRes, levelRes] = await Promise.all([
      fetch(`/api/levels/${levelId}/waves`),
      fetch(`/api/levels/${levelId}`),
    ])
    const waveDefs: WaveDefDB[] | null = wavesRes.ok ? await wavesRes.json() : null
    const levelInfo: LevelInfo | null = levelRes.ok ? await levelRes.json() : null
    return { waveDefs, levelInfo }
  } catch {
    return { waveDefs: null, levelInfo: null }
  }
}

async function loadGroupData(playerId: string): Promise<{ slots: HeroSlot[]; bonus: SkillBonus }> {
  try {
    const [heroRes, bonusRes, petsRes] = await Promise.all([
      fetch(`/api/heroes?player=${playerId}`),
      fetch(`/api/skills/bonus?player=${playerId}`),
      fetch(`/api/pets?player=${playerId}`),
    ])
    const heroes: HeroApiItem[] = await heroRes.json()
    const skillBonus: SkillBonus = bonusRes.ok ? await bonusRes.json() : {}
    const pets: { buffStats: Record<string, number>; isActive: boolean; owned: boolean }[] =
      petsRes.ok ? await petsRes.json() : []

    const activePet = pets.find(p => p.owned && p.isActive)
    const petStats: SkillBonus = activePet ? activePet.buffStats : {}

    const bonus: SkillBonus = {
      allHp:      (skillBonus.allHp      ?? 0) + (petStats.allHp      ?? 0),
      allAttack:  (skillBonus.allAttack  ?? 0) + (petStats.allAttack  ?? 0),
      allDefense: (skillBonus.allDefense ?? 0) + (petStats.allDefense ?? 0),
      coinBonus:  (skillBonus.coinBonus  ?? 0) + (petStats.coinBonus  ?? 0),
      xpBonus:    (skillBonus.xpBonus    ?? 0) + (petStats.xpBonus    ?? 0),
    }

    const inGroup = heroes
      .filter(h => h.instance?.groupPosition != null)
      .sort((a, b) => (a.instance!.groupPosition ?? 0) - (b.instance!.groupPosition ?? 0))

    const slots = inGroup.map(h => {
      const equippedItems = h.instance!.equipment.map(e => ({
        statBonus: e.inventoryItem.item.statBonus,
      }))
      const stats = computeStats(
        { hp: h.hp, attack: h.attack, defense: h.defense, attackCooldown: h.attackCooldown, walkSpeed: h.walkSpeed, attackRange: h.attackRange },
        h.instance!.level,
        equippedItems,
      )
      return {
        name: h.name,
        hp: stats.hp + (bonus.allHp ?? 0),
        attack: stats.attack + (bonus.allAttack ?? 0),
        speed: stats.walkSpeed,
        cooldownMs: stats.attackCooldown * 1000,
        attackRange: h.attackRange,   // in grids — not scaled by level or equipment
        spriteSet: h.spriteSet ?? 'hero',
        heroClass: h.heroClass ?? 'warrior',
        level: h.instance!.level,
        xp: h.instance!.xp,
        xpToNext: Math.round(100 * Math.pow(h.instance!.level, 1.5)),
      }
    })

    return { slots, bonus }
  } catch {
    return { slots: [], bonus: {} }
  }
}

interface Props {
  onRestart: () => void
}

export default function GameCanvas({ onRestart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let game: Game | null = null
    let destroyed = false

    const playerId = getPlayerId()

    const init = async () => {
      const selectedLevelId = getSelectedLevel()

      const [initialCoins, groupData, levelData] = await Promise.all([
        playerId ? loadCoins(playerId) : Promise.resolve(getLocalCoins()),
        playerId ? loadGroupData(playerId) : Promise.resolve({ slots: [] as HeroSlot[], bonus: {} as SkillBonus }),
        selectedLevelId ? loadSelectedLevel(selectedLevelId) : Promise.resolve({ waveDefs: null, levelInfo: null }),
      ])
      if (destroyed) return

      const { slots: heroSlots, bonus: skillBonus } = groupData
      game = new Game(
        canvas,
        initialCoins,
        levelData.waveDefs,
        heroSlots.length > 0 ? heroSlots : undefined,
        skillBonus.coinBonus ?? 0,
      )

      if (levelData.levelInfo) {
        const { name, zone } = levelData.levelInfo
        game.setLevelName(`${zone.world.name}  ·  ${zone.name}  ·  ${name}`)
      }

      game.onRestart = onRestart
      game.onCoinsChange = (total) => {
        if (playerId) persistCoins(playerId, total)
        else setLocalCoins(total)
      }

      if (playerId && selectedLevelId) {
        game.onLevelComplete = ({ monstersKilled, heroSurvived, timeMs }) => {
          let stars = 1
          if (heroSurvived) stars = 2
          if (heroSurvived && timeMs < 90_000) stars = 3

          fetch(`/api/levels/${selectedLevelId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, stars }),
          }).catch(() => {})

          if (game) {
            game.addFloat(400, 180, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} FASE COMPLETA!`, '#f1c40f', 18)
          }
        }
      }

      if (playerId) {
        game.onKill = ({ x, y, baseXp, monsterId }) => {
          fetch('/api/combat/kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, baseXp, monsterId, xpBonus: skillBonus.xpBonus ?? 0 }),
          })
            .then(r => r.json())
            .then((data: {
              xpGained: number
              heroes: { name: string; level: number; xp: number; xpToNext: number }[]
              levelUps: { heroName: string; newLevel: number }[]
              drops: { itemName: string; rarity: string; qty: number }[]
            }) => {
              if (!game || game['destroyed']) return

              if (data.xpGained > 0) {
                game.addFloat(x, y, `+${data.xpGained} XP`, '#a8e6cf', 13)
              }

              for (const lu of data.levelUps) {
                game.addFloat(x, y - 30, `${lu.heroName} LV.${lu.newLevel}!`, '#ffe066', 14)
              }

              for (let i = 0; i < data.drops.length; i++) {
                const drop = data.drops[i]
                const color = RARITY_COLORS[drop.rarity] ?? '#aaa'
                game.addFloat(x, y - 50 - i * 18, `⬟ ${drop.itemName}`, color, 12)
              }

              if (data.heroes.length > 0) {
                game.setHeroInfo(data.heroes)
              }
            })
            .catch(() => {})
        }
      }

      game.start()
    }

    init()

    return () => {
      destroyed = true
      game?.destroy()
    }
  }, [onRestart])

  return (
    <canvas
      ref={canvasRef}
      className="block rounded border border-gray-800"
      style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
    />
  )
}
