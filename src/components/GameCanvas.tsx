'use client'

import { useEffect, useRef } from 'react'
import { Game } from '@/game/Game'
import { getPlayerId, getLocalCoins, setLocalCoins } from '@/lib/session'

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
  instance: { id: string; level: number; xp: number; groupPosition: number | null } | null
}

async function loadGroupHeroes(playerId: string) {
  try {
    const res = await fetch(`/api/heroes?player=${playerId}`)
    const heroes: HeroApiItem[] = await res.json()
    return heroes
      .filter(h => h.instance?.groupPosition != null)
      .map(h => ({
        name: h.name,
        level: h.instance!.level,
        xp: h.instance!.xp,
        xpToNext: Math.round(100 * Math.pow(h.instance!.level, 1.5)),
      }))
  } catch {
    return []
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
      const [initialCoins, groupHeroes] = await Promise.all([
        playerId ? loadCoins(playerId) : Promise.resolve(getLocalCoins()),
        playerId ? loadGroupHeroes(playerId) : Promise.resolve([]),
      ])
      if (destroyed) return

      game = new Game(canvas, initialCoins)
      game.setHeroInfo(groupHeroes)

      game.onRestart = onRestart
      game.onCoinsChange = (total) => {
        if (playerId) persistCoins(playerId, total)
        else setLocalCoins(total)
      }

      if (playerId) {
        game.onKill = ({ x, y, baseXp, monsterId }) => {
          fetch('/api/combat/kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, baseXp, monsterId }),
          })
            .then(r => r.json())
            .then((data: {
              xpGained: number
              heroes: { name: string; level: number; xp: number; xpToNext: number }[]
              levelUps: { heroName: string; newLevel: number }[]
              drops: { itemName: string; rarity: string; qty: number }[]
            }) => {
              if (!game || game['destroyed']) return

              // +XP float
              if (data.xpGained > 0) {
                game.addFloat(x, y, `+${data.xpGained} XP`, '#a8e6cf', 13)
              }

              // level up floats
              for (const lu of data.levelUps) {
                game.addFloat(x, y - 30, `${lu.heroName} LV.${lu.newLevel}!`, '#ffe066', 14)
              }

              // item drop floats
              for (let i = 0; i < data.drops.length; i++) {
                const drop = data.drops[i]
                const color = RARITY_COLORS[drop.rarity] ?? '#aaa'
                game.addFloat(x, y - 50 - i * 18, `⬟ ${drop.itemName}`, color, 12)
              }

              // update HUD badges
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
