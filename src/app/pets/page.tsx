'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPlayerId, getLocalCoins, setLocalCoins } from '@/lib/session'

type Pet = {
  id: string
  name: string
  description: string
  rarity: string
  buffStats: Record<string, number>
  cost: number
  owned: boolean
  isActive: boolean
}

const RARITY_COLORS: Record<string, string> = {
  COMMON:    'text-gray-400 border-gray-700',
  UNCOMMON:  'text-green-400 border-green-800/50',
  RARE:      'text-blue-400 border-blue-800/50',
  LEGENDARY: 'text-yellow-400 border-yellow-700/50',
}

const RARITY_BG: Record<string, string> = {
  COMMON:    'bg-gray-900/50',
  UNCOMMON:  'bg-green-900/10',
  RARE:      'bg-blue-900/10',
  LEGENDARY: 'bg-yellow-900/10',
}

function formatBuff(stats: Record<string, number>): string {
  const parts: string[] = []
  if (stats.allHp)     parts.push(`+${stats.allHp} HP`)
  if (stats.allAttack) parts.push(`+${stats.allAttack} ATK`)
  if (stats.coinBonus) parts.push(`+${Math.round(stats.coinBonus * 100)}% moedas`)
  if (stats.xpBonus)   parts.push(`+${Math.round(stats.xpBonus * 100)}% XP`)
  return parts.join(' · ')
}

const PET_EMOJIS: Record<string, string> = {
  'pet-slime':   '🟡',
  'pet-wolf':    '🐺',
  'pet-crow':    '🐦‍⬛',
  'pet-phoenix': '🔥',
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const playerId = typeof window !== 'undefined' ? getPlayerId() : null

  const fetchPets = useCallback(async () => {
    try {
      const url = playerId ? `/api/pets?player=${playerId}` : '/api/pets'
      const res = await fetch(url)
      const data: Pet[] = await res.json()
      setPets(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    setCoins(getLocalCoins())
    fetchPets()
  }, [fetchPets])

  async function handleBuy(petId: string, cost: number) {
    if (!playerId || busy) return
    setBusy(petId)
    setError(null)
    try {
      const res = await fetch('/api/pets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, petId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao comprar'); return }
      setLocalCoins(data.remainingCoins)
      setCoins(data.remainingCoins)
      setPets(prev => prev.map(p => p.id === petId ? { ...p, owned: true } : p))
    } catch {
      setError('Erro de conexão')
    } finally {
      setBusy(null)
    }
  }

  async function handleActivate(petId: string) {
    if (!playerId || busy) return
    setBusy(petId)
    setError(null)
    try {
      const res = await fetch('/api/pets/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, petId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao ativar'); return }
      setPets(prev => prev.map(p => ({ ...p, isActive: p.id === petId })))
    } catch {
      setError('Erro de conexão')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 font-mono text-sm">carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold tracking-wide">🐾 PETS</h1>
            <p className="text-xs text-gray-500 mt-0.5">Companheiros com bônus passivos (1 ativo por vez)</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-yellow-400 text-sm">
              <span className="text-base">🪙</span>
              <span className="font-bold">{coins}</span>
            </div>
            <Link
              href="/play"
              className="px-3 py-1.5 rounded border border-gray-700 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-all"
            >
              ← JOGAR
            </Link>
          </div>
        </div>

        {!playerId && (
          <div className="mb-4 px-3 py-2 bg-yellow-900/20 border border-yellow-800/40 rounded text-xs text-yellow-400">
            Faça login para adquirir pets.
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Pet grid */}
        <div className="grid grid-cols-2 gap-3">
          {pets.map(pet => {
            const rarityClass = RARITY_COLORS[pet.rarity] ?? RARITY_COLORS.COMMON
            const bgClass     = RARITY_BG[pet.rarity] ?? RARITY_BG.COMMON
            const canAfford   = coins >= pet.cost
            const emoji       = PET_EMOJIS[pet.id] ?? '🐾'
            const isBusy      = busy === pet.id

            return (
              <div
                key={pet.id}
                className={`p-3 rounded border transition-all ${bgClass} ${
                  pet.isActive
                    ? 'border-emerald-700/60 ring-1 ring-emerald-700/30'
                    : `border-${rarityClass.split(' ')[1] ?? 'gray-800'}`
                }`}
                style={pet.isActive ? { borderColor: 'rgb(52 211 153 / 0.4)' } : undefined}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{emoji}</span>
                    <span className={`text-sm font-bold ${pet.isActive ? 'text-emerald-300' : 'text-gray-200'}`}>
                      {pet.name}
                    </span>
                  </div>
                  {pet.isActive && (
                    <span className="text-xs text-emerald-400 shrink-0 font-bold">ATIVO</span>
                  )}
                </div>

                {/* Rarity tag */}
                <span className={`inline-block text-[10px] font-bold tracking-widest mb-2 ${rarityClass.split(' ')[0]}`}>
                  {pet.rarity}
                </span>

                <p className="text-xs text-gray-500 mb-2 leading-relaxed">{pet.description}</p>

                <p className="text-xs text-purple-400 mb-3">{formatBuff(pet.buffStats)}</p>

                {/* Action button */}
                {pet.isActive ? (
                  <div className="text-xs text-emerald-600 text-center py-1 rounded border border-emerald-800/30">
                    ✓ ATIVO
                  </div>
                ) : pet.owned ? (
                  <button
                    onClick={() => handleActivate(pet.id)}
                    disabled={!playerId || isBusy}
                    className={`w-full py-1.5 rounded border text-xs transition-all ${
                      isBusy
                        ? 'border-emerald-800/30 text-emerald-700 cursor-wait'
                        : 'border-emerald-700/50 text-emerald-500 hover:border-emerald-600 hover:text-emerald-400 hover:bg-emerald-500/5'
                    }`}
                  >
                    {isBusy ? '...' : 'ATIVAR'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(pet.id, pet.cost)}
                    disabled={!playerId || !canAfford || isBusy}
                    className={`w-full py-1.5 rounded border text-xs transition-all ${
                      !playerId || !canAfford
                        ? 'border-gray-800 text-gray-700 cursor-not-allowed'
                        : isBusy
                        ? 'border-yellow-700/40 text-yellow-600 cursor-wait'
                        : 'border-yellow-700/60 text-yellow-500 hover:border-yellow-600 hover:text-yellow-400 hover:bg-yellow-500/5'
                    }`}
                  >
                    {isBusy ? '...' : `🪙 ${pet.cost}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
