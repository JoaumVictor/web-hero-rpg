'use client'

import { useEffect, useRef } from 'react'
import { Game } from '@/game/Game'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas)
    game.start()
    return () => game.destroy()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block rounded border border-gray-700"
      style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
    />
  )
}
