import { probeFrames } from '@/game/renderer/sprites'

export type SpriteType = 'heroes' | 'creatures'
export type AnimState = 'idle' | 'walk' | 'attack' | 'death' | 'hurt' | 'special' | 'stunned' | 'run' | 'fly'

export type SpriteSet = Record<AnimState, HTMLImageElement[]>

const FALLBACKS: Partial<Record<AnimState, AnimState>> = {
  hurt:    'idle',
  special: 'attack',
  stunned: 'idle',
  run:     'walk',
  fly:     'walk',
}

const ALL_STATES: AnimState[] = ['idle', 'walk', 'attack', 'death', 'hurt', 'special', 'stunned', 'run', 'fly']

const setCache = new Map<string, SpriteSet>()

async function loadState(type: SpriteType, name: string, state: AnimState): Promise<HTMLImageElement[]> {
  const base = `/assets/${type}/${name}/${state}`
  const frames = await probeFrames(base)
  if (frames.length > 0) return frames

  const fallback = FALLBACKS[state]
  if (fallback) return loadState(type, name, fallback)
  return []
}

export async function loadSpriteSet(type: SpriteType, name: string): Promise<SpriteSet> {
  const key = `${type}/${name}`
  if (setCache.has(key)) return setCache.get(key)!

  const entries = await Promise.all(
    ALL_STATES.map(async (state) => [state, await loadState(type, name, state)] as const)
  )

  const set = Object.fromEntries(entries) as SpriteSet
  setCache.set(key, set)
  return set
}
