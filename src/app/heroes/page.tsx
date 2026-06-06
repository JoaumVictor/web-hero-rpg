'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPlayerId, getLocalCoins, setLocalCoins } from '@/lib/session'
import { computeStats } from '@/lib/heroStats'

// ── Types ──────────────────────────────────────────────────────────
type EquipmentEntry = {
  slot: string
  inventoryItem: {
    id: string
    item: { id: string; name: string; rarity: string; type: string; statBonus: Record<string, number>; equipSlot: string | null }
  }
}

type HeroTemplate = {
  id: string; name: string; heroClass: string; spriteSet: string; cost: number
  hp: number; attack: number; defense: number; attackCooldown: number; walkSpeed: number; attackRange: number
  owned: boolean
  instance: {
    id: string; level: number; xp: number; groupPosition: number | null
    equipment: EquipmentEntry[]
  } | null
}

type InventoryEntry = {
  id: string; quantity: number
  item: { id: string; name: string; rarity: string; type: string; statBonus: Record<string, number>; equipSlot: string | null }
}

// ── Constants ──────────────────────────────────────────────────────
function xpToNext(level: number): number { return Math.round(100 * Math.pow(level, 1.5)) }

const POSITION_LABELS: Record<number, string> = { 0: 'Frente', 1: 'Meio', 2: 'Fundo' }
const POSITION_COLORS: Record<number, string> = {
  0: 'text-red-400 border-red-800/50',
  1: 'text-yellow-400 border-yellow-800/50',
  2: 'text-blue-400 border-blue-800/50',
}

const EQUIP_SLOTS = [
  { key: 'HEAD',      icon: '⛑', label: 'Cabeça'  },
  { key: 'MAINHAND',  icon: '⚔', label: 'Mão Prim.' },
  { key: 'ARMOR',     icon: '🛡', label: 'Peitoral' },
  { key: 'BOOTS',     icon: '👢', label: 'Botas'   },
  { key: 'RING_LEFT', icon: '💍', label: 'Anel'    },
  { key: 'OFFHAND',   icon: '🗡', label: 'Mão Sec.' },
]

const RARITY_TEXT: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400', RARE: 'text-blue-400', LEGENDARY: 'text-yellow-400',
}
const RARITY_BORDER: Record<string, string> = {
  COMMON: 'border-gray-700', UNCOMMON: 'border-green-800/60', RARE: 'border-blue-700/60', LEGENDARY: 'border-yellow-600/60',
}

// ── Page ───────────────────────────────────────────────────────────
export default function HeroesPage() {
  const router = useRouter()
  const [heroes, setHeroes] = useState<HeroTemplate[]>([])
  const [inventory, setInventory] = useState<InventoryEntry[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [equipPicker, setEquipPicker] = useState<{ heroInstanceId: string; slot: string } | null>(null)

  const playerId = getPlayerId()

  const load = useCallback(async () => {
    if (!playerId) { router.replace('/'); return }
    const [heroRes, invRes] = await Promise.all([
      fetch(`/api/heroes?player=${playerId}`),
      fetch(`/api/inventory?player=${playerId}`),
    ])
    setHeroes(await heroRes.json())
    setInventory(await invRes.json())
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

  async function equip(heroInstanceId: string, slot: string, inventoryItemId: string) {
    if (!playerId) return
    await fetch('/api/heroes/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, heroInstanceId, slot, inventoryItemId }),
    })
    setEquipPicker(null)
    load()
  }

  async function unequip(heroInstanceId: string, slot: string) {
    if (!playerId) return
    await fetch('/api/heroes/equip', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, heroInstanceId, slot }),
    })
    load()
  }

  if (loading) return <Loading />

  const inGroup = heroes.filter(h => h.instance?.groupPosition != null)
  const owned = heroes.filter(h => h.owned)
  const available = heroes.filter(h => !h.owned)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-mono" onClick={() => setEquipPicker(null)}>
      <header className="flex items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-800">
        <button onClick={() => router.push('/play')} className="text-gray-500 hover:text-gray-300 text-xs">← jogo</button>
        <span className="text-yellow-400 font-bold tracking-widest text-sm">HERÓIS</span>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => router.push('/play')} className="text-blue-400/70 hover:text-blue-400 text-xs transition-colors">mochila →</button>
          <span className="text-yellow-400 text-sm font-bold">⬟ {coins} moedas</span>
        </div>
      </header>

      {msg && <div className="px-6 py-2 bg-red-900/30 border-b border-red-800/50 text-red-400 text-xs">{msg}</div>}

      <main className="p-6 max-w-5xl mx-auto flex flex-col gap-8">

        {/* Group formation */}
        <section>
          <h2 className="text-xs font-bold tracking-wider text-gray-400 mb-3 uppercase">Formação do Grupo</h2>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(pos => {
              const hero = inGroup.find(h => h.instance?.groupPosition === pos)
              return (
                <div key={pos} className={`border rounded p-3 min-h-20 flex flex-col gap-1 ${hero ? 'border-gray-700 bg-gray-900/60' : 'border-gray-800/40 bg-gray-900/20'}`}>
                  <span className={`text-xs border rounded px-1.5 py-0.5 self-start ${POSITION_COLORS[pos]}`}>{POSITION_LABELS[pos]}</span>
                  {hero ? (
                    <>
                      <span className="text-white text-sm mt-1">{hero.name}</span>
                      <span className="text-gray-500 text-xs">Lv.{hero.instance!.level}</span>
                      <button onClick={() => setGroupPosition(hero.instance!.id, null)} className="text-xs text-red-500 hover:text-red-400 mt-1 self-start">remover</button>
                    </>
                  ) : <span className="text-gray-700 text-xs mt-2">Vazio</span>}
                </div>
              )
            })}
          </div>
        </section>

        {/* Owned heroes */}
        {owned.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-wider text-gray-400 mb-3 uppercase">Seus Heróis</h2>
            <div className="flex flex-col gap-4">
              {owned.map(h => {
                const inst = h.instance
                const equippedItems = inst?.equipment.map(e => ({
                  statBonus: e.inventoryItem.item.statBonus,
                })) ?? []
                const stats = inst
                  ? computeStats({ hp: h.hp, attack: h.attack, defense: h.defense, attackCooldown: h.attackCooldown, walkSpeed: h.walkSpeed, attackRange: h.attackRange }, inst.level, equippedItems)
                  : null

                return (
                  <div key={h.id} className="bg-gray-900 border border-gray-800 rounded p-4 flex flex-col gap-3">
                    {/* Hero header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-xl">⚔</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{h.name}</span>
                          <span className="text-gray-600 text-xs">{h.heroClass}</span>
                          {inst && <span className="text-green-400 text-xs font-bold">Lv.{inst.level}</span>}
                        </div>
                        {stats && (
                          <div className="flex gap-3 text-xs mt-0.5">
                            <span className="text-gray-400">HP:<span className="text-white ml-0.5">{stats.hp}</span></span>
                            <span className="text-red-400">ATK:<span className="text-white ml-0.5">{stats.attack}</span></span>
                            <span className="text-blue-400">DEF:<span className="text-white ml-0.5">{stats.defense}</span></span>
                            <span className="text-gray-500">Rng:{stats.attackRange}g</span>
                          </div>
                        )}
                      </div>
                      {inst && (
                        <div className="flex gap-1">
                          {[0, 1, 2].map(pos => {
                            const current = inst.groupPosition === pos
                            const occupied = inGroup.some(other => other.id !== h.id && other.instance?.groupPosition === pos)
                            return (
                              <button
                                key={pos}
                                disabled={occupied && !current}
                                onClick={() => setGroupPosition(inst.id, current ? null : pos)}
                                className={`text-xs border rounded px-2 py-1 transition-colors ${current ? POSITION_COLORS[pos] + ' bg-gray-800' : occupied ? 'border-gray-800 text-gray-700 cursor-not-allowed' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                              >
                                {POSITION_LABELS[pos]}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* XP bar */}
                    {inst && (() => {
                      const needed = xpToNext(inst.level)
                      return (
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                            <span>XP</span><span>{inst.xp} / {needed}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500/70 rounded-full transition-all" style={{ width: `${Math.min(1, inst.xp / needed) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })()}

                    {/* Equipment slots */}
                    {inst && (
                      <div>
                        <div className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Equipamentos</div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {EQUIP_SLOTS.map(({ key, icon, label }) => {
                            const equipped = inst.equipment.find(e => e.slot === key)
                            const isOpen = equipPicker?.heroInstanceId === inst.id && equipPicker.slot === key
                            const compatibleItems = inventory.filter(inv => inv.item.equipSlot === key)

                            return (
                              <div key={key} className="relative" onClick={e => e.stopPropagation()}>
                                <button
                                  title={equipped ? equipped.inventoryItem.item.name : label}
                                  onClick={() => {
                                    if (equipped) {
                                      unequip(inst.id, key)
                                    } else {
                                      setEquipPicker(isOpen ? null : { heroInstanceId: inst.id, slot: key })
                                    }
                                  }}
                                  className={`w-full aspect-square rounded border text-base flex flex-col items-center justify-center gap-0 transition-all ${
                                    equipped
                                      ? `${RARITY_BORDER[equipped.inventoryItem.item.rarity] ?? 'border-gray-700'} bg-gray-800 hover:brightness-90`
                                      : isOpen
                                        ? 'border-yellow-600/50 bg-yellow-900/10'
                                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/60'
                                  }`}
                                >
                                  <span>{equipped ? icon : <span className="opacity-20">{icon}</span>}</span>
                                  {equipped && (
                                    <span className={`text-[8px] leading-none ${RARITY_TEXT[equipped.inventoryItem.item.rarity] ?? 'text-gray-400'} truncate max-w-full px-0.5`}>
                                      {equipped.inventoryItem.item.name.split(' ')[0]}
                                    </span>
                                  )}
                                </button>

                                {/* Item picker dropdown */}
                                {isOpen && (
                                  <div className="absolute top-full left-0 mt-1 z-10 bg-gray-900 border border-gray-700 rounded shadow-xl min-w-48">
                                    <div className="px-2 py-1 text-xs text-gray-500 border-b border-gray-800">{label}</div>
                                    {compatibleItems.length === 0 ? (
                                      <div className="px-3 py-2 text-xs text-gray-600">Sem itens compatíveis</div>
                                    ) : (
                                      compatibleItems.map(inv => (
                                        <button
                                          key={inv.id}
                                          onClick={() => equip(inst.id, key, inv.id)}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        >
                                          <span className={`text-xs font-bold ${RARITY_TEXT[inv.item.rarity] ?? 'text-gray-400'}`}>{inv.item.name}</span>
                                          {Object.entries(inv.item.statBonus as Record<string, number>).slice(0, 2).map(([k, v]) => (
                                            <span key={k} className="text-xs text-gray-500">+{v} {k}</span>
                                          ))}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
                  <div className="w-10 h-10 bg-gray-800/50 rounded border border-gray-700/50 flex items-center justify-center text-lg opacity-60">⚔</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-bold text-sm">{h.name}</span>
                      <span className="text-gray-600 text-xs">{h.heroClass}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600 mt-0.5">
                      <span>HP:{h.hp}</span><span>ATK:{h.attack}</span><span>DEF:{h.defense}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => buy(h.id)}
                    disabled={buying === h.id || coins < h.cost}
                    className={`flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 font-bold transition-colors ${coins >= h.cost ? 'border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10' : 'border-gray-700 text-gray-600 cursor-not-allowed'}`}
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
