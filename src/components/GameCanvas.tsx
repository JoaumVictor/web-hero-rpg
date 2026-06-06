'use client'

import { useEffect, useRef } from 'react'
import { Game } from '@/game/Game'

interface Props {
  onRestart: () => void
}

// ── Session ID ─────────────────────────────────────────────────────
function getSessionId(): string {
  const KEY = 'hero-rpg-session'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

// ── Coin persistence ───────────────────────────────────────────────
// localStorage is the primary store (synchronous, instant, never fails).
// DB is an async secondary mirror (survives device clears, shareable later).

const COINS_KEY = (session: string) => `hero-rpg-coins-${session}`

function getLocalCoins(session: string): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(COINS_KEY(session)) ?? '0', 10) || 0
}

function setLocalCoins(session: string, coins: number) {
  localStorage.setItem(COINS_KEY(session), String(coins))
}

async function loadCoins(session: string): Promise<number> {
  // always start with localStorage (instant)
  const local = getLocalCoins(session)
  try {
    const res = await fetch(`/api/progress?session=${session}`)
    const { coins } = (await res.json()) as { coins: number }
    // trust whichever is higher (guards against DB lag / stale reads)
    const best = Math.max(local, typeof coins === 'number' ? coins : 0)
    if (best > local) setLocalCoins(session, best)   // sync localStorage if DB had more
    return best
  } catch {
    return local
  }
}

function persistCoins(session: string, coins: number) {
  // 1. localStorage — synchronous, survives any restart timing
  setLocalCoins(session, coins)
  // 2. DB — fire-and-forget, does NOT use a debounce so it always fires
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, coins }),
  }).catch(() => {})
}

// ── Component ─────────────────────────────────────────────────────
export default function GameCanvas({ onRestart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let game: Game | null = null
    let destroyed = false
    const session = getSessionId()

    loadCoins(session).then(initialCoins => {
      if (destroyed) return

      game = new Game(canvas, initialCoins)
      game.onRestart = onRestart
      game.onCoinsChange = (total) => persistCoins(session, total)
      game.start()
    })

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
