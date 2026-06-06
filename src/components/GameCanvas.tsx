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
      const initialCoins = playerId ? await loadCoins(playerId) : getLocalCoins()
      if (destroyed) return

      game = new Game(canvas, initialCoins)
      game.onRestart = onRestart
      game.onCoinsChange = (total) => {
        if (playerId) persistCoins(playerId, total)
        else setLocalCoins(total)
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
