'use client'

import { useState, useCallback } from 'react'
import GameCanvas from '@/components/GameCanvas'
import GameNavbar from '@/components/GameNavbar'
import ChestPanel from '@/components/ChestPanel'
import InventoryPanel from '@/components/InventoryPanel'

const CHEST_W = 224  // reserved left column width (px) — always present to avoid layout shift

export default function PlayPage() {
  const [gameKey, setGameKey] = useState(0)
  const [chestOpen, setChestOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)

  const handleRestart = useCallback(() => setGameKey(k => k + 1), [])
  const toggleChest = useCallback(() => setChestOpen(v => !v), [])
  const toggleInventory = useCallback(() => setInventoryOpen(v => !v), [])

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Fixed grid: [left-panel 224px] [game 800px] — left column always reserved */}
      <div style={{ display: 'grid', gridTemplateColumns: `${CHEST_W}px 800px`, gap: 12 }}>
        {/* Left cell: chest panel (or empty space) */}
        <div className="self-start pt-0">
          {chestOpen && <ChestPanel onClose={() => setChestOpen(false)} />}
        </div>

        {/* Right cell: game + navbar + inventory */}
        <div className="flex flex-col">
          <GameCanvas key={gameKey} onRestart={handleRestart} />
          <GameNavbar
            chestOpen={chestOpen}
            inventoryOpen={inventoryOpen}
            onChestToggle={toggleChest}
            onInventoryToggle={toggleInventory}
          />
          {inventoryOpen && (
            <div className="mt-1">
              <InventoryPanel onClose={() => setInventoryOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
