'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPlayerId, getLocalCoins, setLocalCoins } from '@/lib/session'

type HeroTemplate = {
  id: string; name: string; heroClass: string; spriteSet: string; cost: number
  hp: number; attack: number; defense: number; attackCooldown: number; walkSpeed: number; attackRange: number
  owned: boolean
  instance: { id: string; level: number; xp: number; groupPosition: number | null } | null
}

function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

const POSITION_LABELS: Record<number, string> = { 0: 'Frente', 1: 'Meio', 2: 'Fundo' }
const POSITION_COLORS: Record<number, string> = {
  0: 'text-red-400 border-red-800/50',
  1: 'text-yellow-400 border-yellow-800/50',
  2: 'text-blue-400 border-blue-800/50',
}

export default function HeroesPage() {
  const router = useRouter()
  const [heroes, setHeroes] = useState<HeroTemplate[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const playerId = getPlayerId()

  const load = useCallback(async () => {
    if (!playerId) { router.replace('/'); return }
    const res = await fetch(`/api/heroes?player=${playerId}`)
    setHeroes(await res.json())
    setCoins(getLocalCoins())
    setLoading(false)
  }, [playerId, router])

  useEffect(() => { load() }, [load])

  async function buy(heroId: string) {
    if (!playerId) return
    setBuying(heroId)
    const res = await fetch('/api/heroes/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, heroId }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.error); setBuying(null); return }
    setLocalCoins(data.coinsLeft)
    setCoins(data.coinsLeft)
    setMsg('')
    setBuying(null)
    load()
  }

  async function setGroupPosition(instanceId: string, pos: number | null) {
    if (!playerId) return
    const res = await fetch('/api/heroes/group', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, heroInstanceId: instanceId, groupPosition: pos }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.error); return }
    setMsg('')
    load()
  }

  if (loading) return <Loading />

  const inGroup = heroes.filter(h => h.instance?.groupPosition != null)
  const owned = heroes.filter(h => h.owned)
  const available = heroes.filter(h => !h.owned)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-mono">
      <header className="flex items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-800">
        <button onClick={() => router.push('/play')} className="text-gray-500 hover:text-gray-300 text-xs">← jogo</button>
        <span className="text-yellow-400 font-bold tracking-widest text-sm">HERÓIS</span>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => router.push('/play')} className="text-blue-400/70 hover:text-blue-400 text-xs transition-colors">mochila →</button>
          <span className="text-yellow-400 text-sm font-bold">⬟ {coins} moedas</span>
        </div>
      </header>

      {msg && <div className="px-6 py-2 bg-red-900/30 border-b border-red-800/50 text-red-400 text-xs">{msg}</div>}

      <main className="p-6 max-w-4xl mx-auto flex flex-col gap-8">

        {/* Group formation */}
        <section>
          <h2 className="text-xs font-bold tracking-wider text-gray-400 mb-3 uppercase">Formação do Grupo</h2>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(pos => {
              const hero = inGroup.find(h => h.instance?.groupPosition === pos)
              return (
                <div key={pos} className={`border rounded p-3 min-h-20 flex flex-col gap-1 ${hero ? 'border-gray-700 bg-gray-900/60' : 'border-gray-800/40 bg-gray-900/20'}`}>
                  <span className={`text-xs border rounded px-1.5 py-0.5 self-start ${POSITION_COLORS[pos]}`}>
                    {POSITION_LABELS[pos]}
                  </span>
                  {hero ? (
                    <>
                      <span className="text-white text-sm mt-1">{hero.name}</span>
                      <span className="text-gray-500 text-xs">Lv.{hero.instance!.level}</span>
                      <button
                        onClick={() => setGroupPosition(hero.instance!.id, null)}
                        className="text-xs text-red-500 hover:text-red-400 mt-1 self-start"
                      >
                        remover
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-700 text-xs mt-2">Vazio</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Owned heroes */}
        {owned.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-wider text-gray-400 mb-3 uppercase">Seus Heróis</h2>
            <div className="flex flex-col gap-2">
              {owned.map(h => (
                <div key={h.id} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded p-3">
                  <div className="w-10 h-10 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-lg">
                    ⚔
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{h.name}</span>
                      <span className="text-gray-600 text-xs">{h.heroClass}</span>
                      {h.instance && (
                        <span className="text-green-400 text-xs font-bold">Lv.{h.instance.level}</span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      {h.instance ? (() => {
                        const lv = h.instance.level - 1
                        return <>
                          <span>HP:{h.hp + lv * 2}</span>
                          <span className="text-red-400">ATK:{Math.round((h.attack + lv * 0.5) * 10) / 10}</span>
                          <span className="text-blue-400">DEF:{h.defense + Math.floor(lv * 0.3)}</span>
                          <span>Rng:{h.attackRange ?? 1}g</span>
                        </>
                      })() : <>
                        <span>HP:{h.hp}</span>
                        <span className="text-red-400">ATK:{h.attack}</span>
                        <span className="text-blue-400">DEF:{h.defense}</span>
                        <span>Rng:{h.attackRange ?? 1}g</span>
                      </>}
                    </div>
                    {h.instance && (() => {
                      const needed = xpToNext(h.instance.level)
                      const pct = Math.min(1, h.instance.xp / needed)
                      return (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                            <span>XP</span>
                            <span>{h.instance.xp} / {needed}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500/70 rounded-full transition-all"
                              style={{ width: `${pct * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  {h.instance && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map(pos => {
                        const current = h.instance!.groupPosition === pos
                        const occupied = inGroup.some(other => other.id !== h.id && other.instance?.groupPosition === pos)
                        return (
                          <button
                            key={pos}
                            disabled={occupied && !current}
                            onClick={() => setGroupPosition(h.instance!.id, current ? null : pos)}
                            className={`text-xs border rounded px-2 py-1 transition-colors ${
                              current
                                ? POSITION_COLORS[pos] + ' bg-gray-800'
                                : occupied
                                  ? 'border-gray-800 text-gray-700 cursor-not-allowed'
                                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {POSITION_LABELS[pos]}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available to buy */}
        {available.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-wider text-gray-400 mb-3 uppercase">Disponíveis para comprar</h2>
            <div className="flex flex-col gap-2">
              {available.map(h => (
                <div key={h.id} className="flex items-center gap-4 bg-gray-900/50 border border-gray-800/50 rounded p-3">
                  <div className="w-10 h-10 bg-gray-800/50 rounded border border-gray-700/50 flex items-center justify-center text-lg opacity-60">
                    ⚔
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-bold text-sm">{h.name}</span>
                      <span className="text-gray-600 text-xs">{h.heroClass}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600 mt-0.5">
                      <span>HP:{h.hp}</span>
                      <span>ATK:{h.attack}</span>
                      <span>DEF:{h.defense}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => buy(h.id)}
                    disabled={buying === h.id || coins < h.cost}
                    className={`flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 font-bold transition-colors ${
                      coins >= h.cost
                        ? 'border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10'
                        : 'border-gray-700 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {buying === h.id ? '...' : <>⬟ {h.cost}</>}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <span className="text-gray-600 font-mono text-sm">carregando...</span>
    </div>
  )
}
