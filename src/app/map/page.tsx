'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlayerId, setSelectedLevel } from '@/lib/session'
import Link from 'next/link'

type LevelProgress = { stars: number; completedAt: string | null }

type LevelData = {
  id: string
  name: string
  number: number
  recommendedLevel: number
  progress: LevelProgress[]
}

type ZoneData = {
  id: string
  name: string
  description: string | null
  levels: LevelData[]
}

type WorldData = {
  id: string
  name: string
  description: string | null
  zones: ZoneData[]
}

function StarDisplay({ count }: { count: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= count ? 'text-yellow-400' : 'text-gray-700'}>★</span>
      ))}
    </span>
  )
}

function LevelCard({
  level,
  index,
  prevCompleted,
  onPlay,
}: {
  level: LevelData
  index: number
  prevCompleted: boolean
  onPlay: (id: string) => void
}) {
  const stars = level.progress[0]?.stars ?? 0
  const completed = stars > 0
  const locked = index > 0 && !prevCompleted

  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded border transition-all
        ${locked
          ? 'border-gray-800 bg-gray-900/30 opacity-50'
          : completed
            ? 'border-green-800/60 bg-green-950/30'
            : 'border-gray-700 bg-gray-900/60 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border ${
          locked ? 'border-gray-700 text-gray-600' :
          completed ? 'border-green-700 text-green-400' :
          'border-gray-600 text-gray-300'
        }`}>
          {locked ? '🔒' : level.number}
        </div>
        <div>
          <div className="text-sm font-mono text-gray-200">{level.name}</div>
          <div className="text-xs text-gray-500 font-mono">
            Nível recomendado: {level.recommendedLevel}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <StarDisplay count={stars} />
        {!locked && (
          <button
            onClick={() => onPlay(level.id)}
            className={`px-4 py-1.5 text-xs font-mono font-bold rounded border transition-all ${
              completed
                ? 'border-green-700 text-green-400 hover:bg-green-900/30'
                : 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20'
            }`}
          >
            {completed ? 'REJOG.' : 'JOGAR'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  const router = useRouter()
  const [worlds, setWorlds] = useState<WorldData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const playerId = getPlayerId()
    const url = playerId ? `/api/map?player=${playerId}` : '/api/map'
    fetch(url)
      .then(r => r.json())
      .then(setWorlds)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handlePlay(levelId: string) {
    setSelectedLevel(levelId)
    router.push('/play')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 font-mono text-sm">Carregando mapa...</span>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/play"
            className="text-gray-500 hover:text-gray-300 font-mono text-sm border border-gray-700 px-3 py-1 rounded transition-colors"
          >
            ← Jogar
          </Link>
          <h1 className="text-lg font-mono font-bold text-gray-100 tracking-wide">MAPA</h1>
        </div>

        {/* Worlds */}
        {worlds.map(world => (
          <div key={world.id} className="mb-8">
            <div className="mb-1">
              <h2 className="font-mono font-bold text-yellow-400 text-base">{world.name}</h2>
              {world.description && (
                <p className="text-xs text-gray-500 font-mono mt-0.5">{world.description}</p>
              )}
            </div>

            {world.zones.map(zone => {
              // compute completed levels list for lock logic
              const completedBefore = zone.levels.map((_, i) => {
                if (i === 0) return true
                return (zone.levels[i - 1].progress[0]?.stars ?? 0) > 0
              })

              return (
                <div key={zone.id} className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-800" />
                    <span className="text-xs font-mono text-gray-400 px-2">{zone.name}</span>
                    <div className="h-px flex-1 bg-gray-800" />
                  </div>

                  <div className="flex flex-col gap-2">
                    {zone.levels.map((level, i) => (
                      <LevelCard
                        key={level.id}
                        level={level}
                        index={i}
                        prevCompleted={completedBefore[i]}
                        onPlay={handlePlay}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {worlds.length === 0 && (
          <div className="text-center text-gray-600 font-mono text-sm mt-20">
            Nenhum mundo disponível ainda.
          </div>
        )}
      </div>
    </main>
  )
}
