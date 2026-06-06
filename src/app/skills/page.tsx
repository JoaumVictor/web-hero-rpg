'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPlayerId, getLocalCoins, setLocalCoins } from '@/lib/session'

type SkillNode = {
  id: string
  name: string
  description: string
  costCoins: number
  statBonus: Record<string, number>
  order: number
  unlocked: boolean
}

function formatBonus(bonus: Record<string, number>): string {
  const parts: string[] = []
  if (bonus.allHp)      parts.push(`+${bonus.allHp} HP`)
  if (bonus.allAttack)  parts.push(`+${bonus.allAttack} ATK`)
  if (bonus.allDefense) parts.push(`+${bonus.allDefense} DEF`)
  if (bonus.coinBonus)  parts.push(`+${Math.round(bonus.coinBonus * 100)}% moedas`)
  if (bonus.xpBonus)    parts.push(`+${Math.round(bonus.xpBonus * 100)}% XP`)
  return parts.join(' · ')
}

export default function SkillsPage() {
  const [nodes, setNodes] = useState<SkillNode[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const playerId = typeof window !== 'undefined' ? getPlayerId() : null

  const fetchNodes = useCallback(async () => {
    try {
      const url = playerId ? `/api/skills?player=${playerId}` : '/api/skills'
      const res = await fetch(url)
      const data: SkillNode[] = await res.json()
      setNodes(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    setCoins(getLocalCoins())
    fetchNodes()
  }, [fetchNodes])

  async function handleBuy(nodeId: string, cost: number) {
    if (!playerId || buying) return
    setBuying(nodeId)
    setError(null)
    try {
      const res = await fetch('/api/skills/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, nodeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao comprar')
        return
      }
      setLocalCoins(data.remainingCoins)
      setCoins(data.remainingCoins)
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, unlocked: true } : n))
    } catch {
      setError('Erro de conexão')
    } finally {
      setBuying(null)
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
            <h1 className="text-lg font-bold tracking-wide">⚡ HABILIDADES</h1>
            <p className="text-xs text-gray-500 mt-0.5">Upgrades passivos para todo o grupo</p>
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
            Faça login para comprar habilidades.
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Skill grid */}
        <div className="grid grid-cols-2 gap-3">
          {nodes.map(node => {
            const canAfford = coins >= node.costCoins
            const isOwned = node.unlocked

            return (
              <div
                key={node.id}
                className={`p-3 rounded border transition-all ${
                  isOwned
                    ? 'border-emerald-700/50 bg-emerald-900/10'
                    : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-sm font-bold ${isOwned ? 'text-emerald-400' : 'text-gray-200'}`}>
                    {node.name}
                  </span>
                  {isOwned && (
                    <span className="text-xs text-emerald-500 shrink-0">✓</span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-2 leading-relaxed">{node.description}</p>

                <p className="text-xs text-purple-400 mb-3">{formatBonus(node.statBonus)}</p>

                {isOwned ? (
                  <div className="text-xs text-emerald-600 text-center py-1 rounded border border-emerald-800/30">
                    DESBLOQUEADO
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(node.id, node.costCoins)}
                    disabled={!playerId || !canAfford || buying === node.id}
                    className={`w-full py-1.5 rounded border text-xs transition-all ${
                      !playerId || !canAfford
                        ? 'border-gray-800 text-gray-700 cursor-not-allowed'
                        : buying === node.id
                        ? 'border-yellow-700/40 text-yellow-600 cursor-wait'
                        : 'border-yellow-700/60 text-yellow-500 hover:border-yellow-600 hover:text-yellow-400 hover:bg-yellow-500/5'
                    }`}
                  >
                    {buying === node.id ? '...' : `🪙 ${node.costCoins}`}
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
