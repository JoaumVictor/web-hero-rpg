'use client'

import { useState, useEffect } from 'react'
import { getPlayerId } from '@/lib/session'

type InventoryEntry = {
  id: string
  quantity: number
  item: {
    id: string
    name: string
    description: string | null
    type: string
    rarity: string
    statBonus: Record<string, number>
    equipSlot: string | null
    requiredLevel: number
  }
}

const RARITY_STYLE: Record<string, { border: string; text: string; bg: string; label: string }> = {
  COMMON:    { border: 'border-gray-700',     text: 'text-gray-400',   bg: 'bg-gray-800/60',      label: 'C' },
  UNCOMMON:  { border: 'border-green-800/60', text: 'text-green-400',  bg: 'bg-green-900/20',     label: 'I' },
  RARE:      { border: 'border-blue-700/60',  text: 'text-blue-400',   bg: 'bg-blue-900/20',      label: 'R' },
  LEGENDARY: { border: 'border-yellow-600/60',text: 'text-yellow-400', bg: 'bg-yellow-900/20',    label: 'L' },
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', attack: 'ATK', defense: 'DEF', attackSpeed: 'Vel.Atk',
  critChance: 'Crit%', fireResistance: 'Res.Fogo',
}

interface Props {
  onClose: () => void
}

export default function InventoryPanel({ onClose }: Props) {
  const [items, setItems] = useState<InventoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InventoryEntry | null>(null)

  useEffect(() => {
    const playerId = getPlayerId()
    if (!playerId) { setLoading(false); return }
    fetch(`/api/inventory?player=${playerId}`)
      .then(r => r.json())
      .then((data: InventoryEntry[]) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col bg-gray-900 border border-blue-900/40 rounded-b font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <BackpackIcon className="text-blue-400/70" />
          <span className="text-blue-400/80 text-sm font-bold tracking-wider">MOCHILA</span>
          {!loading && (
            <span className="text-gray-600 text-xs">({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 text-xs px-1 py-0.5 rounded hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex" style={{ minHeight: 120 }}>
        {/* Item grid */}
        <div className="flex-1 p-3">
          {loading ? (
            <span className="text-gray-600 text-xs">carregando...</span>
          ) : items.length === 0 ? (
            <span className="text-gray-700 text-xs">Seu inventário está vazio. Vá lutar!</span>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))' }}>
              {items.map(entry => {
                const style = RARITY_STYLE[entry.item.rarity] ?? RARITY_STYLE.COMMON
                const isSelected = selected?.id === entry.id
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelected(isSelected ? null : entry)}
                    title={entry.item.name}
                    className={`relative aspect-square rounded border text-xs flex flex-col items-center justify-center transition-all ${style.border} ${style.bg} ${
                      isSelected ? 'ring-1 ring-white/30 scale-95' : 'hover:brightness-125'
                    }`}
                  >
                    <span className={`font-bold text-sm leading-none ${style.text}`}>
                      {ITEM_ICON[entry.item.type] ?? '?'}
                    </span>
                    <span className={`text-[9px] leading-none mt-0.5 opacity-60 ${style.text}`}>
                      {style.label}
                    </span>
                    {entry.quantity > 1 && (
                      <span className="absolute bottom-0 right-0.5 text-[9px] text-gray-400">
                        ×{entry.quantity}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const style = RARITY_STYLE[selected.item.rarity] ?? RARITY_STYLE.COMMON
          const stats = selected.item.statBonus as Record<string, number>
          return (
            <div className={`w-44 shrink-0 border-l border-gray-800 p-3 flex flex-col gap-1.5 ${style.bg}`}>
              <div className={`text-xs font-bold ${style.text}`}>{selected.item.name}</div>
              <div className="flex gap-1 flex-wrap">
                <span className={`text-[10px] border rounded px-1 ${style.border} ${style.text} opacity-70`}>
                  {selected.item.rarity}
                </span>
                <span className="text-[10px] text-gray-600 border border-gray-800 rounded px-1">
                  {selected.item.type}
                </span>
              </div>
              {selected.item.description && (
                <p className="text-[10px] text-gray-500 leading-tight">{selected.item.description}</p>
              )}
              {Object.keys(stats).length > 0 && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {Object.entries(stats).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px]">
                      <span className="text-gray-500">{STAT_LABELS[k] ?? k}</span>
                      <span className="text-white">+{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.item.requiredLevel > 1 && (
                <div className="text-[10px] text-gray-600 mt-1">
                  Nível mín: {selected.item.requiredLevel}
                </div>
              )}
              {selected.quantity > 1 && (
                <div className="text-[10px] text-gray-500 mt-auto">
                  Quantidade: {selected.quantity}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

const ITEM_ICON: Record<string, string> = {
  WEAPON: '⚔',
  ARMOR:  '🛡',
  HELMET: '⛑',
  BOOTS:  '👢',
  ACCESSORY: '💍',
  CONSUMABLE: '⚗',
}

function BackpackIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" className={className}>
      <rect x="1" y="5" width="12" height="10" rx="2" />
      <path d="M4 5 Q7 2 10 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="5" y="9" width="4" height="2.5" rx="1" fill="#1f2937" />
    </svg>
  )
}
