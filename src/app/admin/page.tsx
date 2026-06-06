'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────
type Hero = {
  id: string; name: string; spriteSet: string; heroClass: string; cost: number; level: number
  hp: number; attack: number; defense: number
  attackCooldown: number; walkSpeed: number; attackRange: number; groupPosition: number; isActive: boolean
}
type Monster = {
  id: string; name: string; spriteSet: string; monsterType: string
  isBoss: boolean; sizeMultiplier: number; attackBehavior: string
  hp: number; attack: number; defense: number
  attackCooldown: number; walkSpeed: number; attackRange: number; coinDropMin: number; coinDropMax: number; baseXp: number
}
type WaveMonster = { id: string; offsetX: number; levelMult: number; monster: Monster }
type Wave = { id: string; order: number; triggerX: number; monsters: WaveMonster[] }
type Round = {
  id: string; number: number; name: string
  chestCommonChance: number; chestUncommonChance: number
  chestRareChance: number; chestLegendaryChance: number
  waves: Wave[]
}

type Tab = 'heroes' | 'monsters' | 'rounds'

// ── Helpers ───────────────────────────────────────────────────────
const api = (path: string, opts?: RequestInit) => fetch(`/api/admin${path}`, {
  headers: { 'Content-Type': 'application/json' },
  ...opts,
})

function pct(v: number) { return `${Math.round(v * 100)}%` }

function useSpritesets(type: 'heroes' | 'creatures') {
  const [sets, setSets] = useState<string[]>([])
  useEffect(() => {
    fetch(`/api/admin/sprite-sets?type=${type}`).then(r => r.json()).then(setSets)
  }, [type])
  return sets
}

const ATTACK_BEHAVIORS = ['MELEE','RANGED_PROJECTILE','PIERCING_SHOT','AOE_FRONTAL','AOE_CIRCLE','CHARGE','SUMMON','DEBUFF_SLOW','DEBUFF_POISON','LEECH']
const MONSTER_TYPES = ['UNDEAD','ELEMENTAL','BEAST','DEMON','HUMAN','CONSTRUCT']

// ── Main page ─────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('heroes')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-mono">
      <header className="flex items-center gap-6 px-6 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-yellow-400 font-bold tracking-widest text-sm">HERO RPG — ADMIN</span>
        <nav className="flex gap-1">
          {(['heroes', 'monsters', 'rounds'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs rounded tracking-wider uppercase transition-all ${
                tab === t
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-600/40'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        <a href="/play" className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← voltar ao jogo
        </a>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {tab === 'heroes'   && <HeroesTab />}
        {tab === 'monsters' && <MonstersTab />}
        {tab === 'rounds'   && <RoundsTab />}
      </main>
    </div>
  )
}

// ── Heroes Tab ────────────────────────────────────────────────────
const HERO_DEFAULTS: Omit<Hero, 'id'> = {
  name: '', spriteSet: 'hero', heroClass: 'warrior', cost: 0, level: 1,
  hp: 26, attack: 4, defense: 0, attackCooldown: 1.5, walkSpeed: 220,
  attackRange: 1, groupPosition: 0, isActive: false,
}

function HeroesTab() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [editing, setEditing] = useState<Partial<Hero> | null>(null)
  const [saving, setSaving] = useState(false)
  const heroSets = useSpritesets('heroes')

  const load = useCallback(async () => {
    const r = await api('/heroes'); setHeroes(await r.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    if (editing?.id) {
      await api(`/heroes/${editing.id}`, { method: 'PUT', body: JSON.stringify(editing) })
    } else {
      await api('/heroes', { method: 'POST', body: JSON.stringify(editing) })
    }
    setSaving(false); setEditing(null); load()
  }

  async function del(id: string) {
    if (!confirm('Deletar herói?')) return
    await api(`/heroes/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <SectionHeader title="Heróis" onNew={() => setEditing({ ...HERO_DEFAULTS })} />
        <table className="w-full text-xs mt-3">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              {['Nome','Classe','Sprite Set','Custo','HP','ATK','DEF','Cooldown','Alcance',''].map(h => (
                <th key={h} className="text-left py-2 pr-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heroes.map(h => (
              <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                <td className="py-2 pr-3 text-white">{h.name}</td>
                <td className="pr-3 text-gray-400">{h.heroClass}</td>
                <td className="pr-3 text-blue-400/70 font-mono">{h.spriteSet}</td>
                <td className="pr-3 text-yellow-400">{h.cost === 0 ? 'grátis' : `⬟${h.cost}`}</td>
                <td className="pr-3">{h.hp}</td>
                <td className="pr-3 text-red-400">{h.attack}</td>
                <td className="pr-3 text-blue-400">{h.defense}</td>
                <td className="pr-3">{h.attackCooldown}s</td>
                <td className="pr-3">{h.attackRange}g</td>
                <td className="flex gap-1 py-1.5">
                  <Btn onClick={() => setEditing(h)}>editar</Btn>
                  <Btn red onClick={() => del(h.id)}>×</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {heroes.length === 0 && <Empty />}
      </div>

      {editing && (
        <div className="w-72 shrink-0">
          <FormCard title={editing.id ? 'Editar Herói' : 'Novo Herói'} onCancel={() => setEditing(null)}>
            <Field label="Nome"><Input v={editing.name ?? ''} onChange={v => setEditing(e => ({ ...e!, name: v }))} /></Field>
            <Row>
              <Field label="Sprite Set">
                <SelectInput v={editing.spriteSet ?? 'hero'} options={heroSets.length ? heroSets : ['hero']} onChange={v => setEditing(e => ({ ...e!, spriteSet: v }))} />
              </Field>
              <Field label="Classe"><Input v={editing.heroClass ?? 'warrior'} onChange={v => setEditing(e => ({ ...e!, heroClass: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Custo (moedas)"><NumInput v={editing.cost ?? 0} onChange={v => setEditing(e => ({ ...e!, cost: v }))} /></Field>
              <Field label="HP"><NumInput v={editing.hp ?? 26} onChange={v => setEditing(e => ({ ...e!, hp: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Ataque"><NumInput v={editing.attack ?? 4} onChange={v => setEditing(e => ({ ...e!, attack: v }))} /></Field>
              <Field label="Defesa"><NumInput v={editing.defense ?? 0} onChange={v => setEditing(e => ({ ...e!, defense: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Cooldown ATK (s)"><NumInput v={editing.attackCooldown ?? 1.5} step={0.1} onChange={v => setEditing(e => ({ ...e!, attackCooldown: v }))} /></Field>
              <Field label="Velocidade"><NumInput v={editing.walkSpeed ?? 220} onChange={v => setEditing(e => ({ ...e!, walkSpeed: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Alcance (grids)"><NumInput v={editing.attackRange ?? 1} onChange={v => setEditing(e => ({ ...e!, attackRange: v }))} /></Field>
              <Field label="Ativo">
                <select value={editing.isActive ? '1' : '0'} onChange={e => setEditing(prev => ({ ...prev!, isActive: e.target.value === '1' }))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                  <option value="0">Não</option><option value="1">Sim</option>
                </select>
              </Field>
            </Row>
            <SaveBtn saving={saving} onClick={save} />
          </FormCard>
        </div>
      )}
    </div>
  )
}

// ── Monsters Tab ──────────────────────────────────────────────────
const MONSTER_DEFAULTS: Omit<Monster, 'id'> = {
  name: '', spriteSet: 'zombie', monsterType: 'UNDEAD',
  isBoss: false, sizeMultiplier: 1, attackBehavior: 'MELEE',
  hp: 12, attack: 1, defense: 0, attackCooldown: 2.2,
  walkSpeed: 42, attackRange: 1, coinDropMin: 1, coinDropMax: 2, baseXp: 8,
}

function MonstersTab() {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [editing, setEditing] = useState<Partial<Monster> | null>(null)
  const [saving, setSaving] = useState(false)
  const creatureSets = useSpritesets('creatures')

  const load = useCallback(async () => {
    const r = await api('/monsters'); setMonsters(await r.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    if (editing?.id) {
      await api(`/monsters/${editing.id}`, { method: 'PUT', body: JSON.stringify(editing) })
    } else {
      await api('/monsters', { method: 'POST', body: JSON.stringify(editing) })
    }
    setSaving(false); setEditing(null); load()
  }

  async function del(id: string) {
    if (!confirm('Deletar monstro?')) return
    await api(`/monsters/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <SectionHeader title="Monstros" onNew={() => setEditing({ ...MONSTER_DEFAULTS })} />
        <table className="w-full text-xs mt-3">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              {['Nome','Tipo','Sprite','Boss','Comport.','HP','ATK','DEF','Cooldown','Moedas',''].map(h => (
                <th key={h} className="text-left py-2 pr-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monsters.map(m => (
              <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                <td className="py-2 pr-3 text-white">{m.name}</td>
                <td className="pr-3 text-gray-500">{m.monsterType}</td>
                <td className="pr-3 text-blue-400/70 font-mono">{m.spriteSet}</td>
                <td className="pr-3">{m.isBoss ? <Pill color="yellow">boss</Pill> : ''}</td>
                <td className="pr-3 text-gray-400">{m.attackBehavior}</td>
                <td className="pr-3">{m.hp}</td>
                <td className="pr-3 text-red-400">{m.attack}</td>
                <td className="pr-3 text-blue-400">{m.defense}</td>
                <td className="pr-3">{m.attackCooldown}s</td>
                <td className="pr-3 text-yellow-400">{m.coinDropMin}–{m.coinDropMax}</td>
                <td className="flex gap-1 py-1.5">
                  <Btn onClick={() => setEditing(m)}>editar</Btn>
                  <Btn red onClick={() => del(m.id)}>×</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {monsters.length === 0 && <Empty />}
      </div>

      {editing && (
        <div className="w-72 shrink-0">
          <FormCard title={editing.id ? 'Editar Monstro' : 'Novo Monstro'} onCancel={() => setEditing(null)}>
            <Field label="Nome"><Input v={editing.name ?? ''} onChange={v => setEditing(e => ({ ...e!, name: v }))} /></Field>
            <Row>
              <Field label="Sprite Set">
                <SelectInput v={editing.spriteSet ?? 'zombie'} options={creatureSets.length ? creatureSets : ['zombie']} onChange={v => setEditing(e => ({ ...e!, spriteSet: v }))} />
              </Field>
              <Field label="Tipo">
                <SelectInput v={editing.monsterType ?? 'UNDEAD'} options={MONSTER_TYPES} onChange={v => setEditing(e => ({ ...e!, monsterType: v }))} />
              </Field>
            </Row>
            <Field label="Comportamento">
              <SelectInput v={editing.attackBehavior ?? 'MELEE'} options={ATTACK_BEHAVIORS} onChange={v => setEditing(e => ({ ...e!, attackBehavior: v }))} />
            </Field>
            <Row>
              <Field label="HP"><NumInput v={editing.hp ?? 12} onChange={v => setEditing(e => ({ ...e!, hp: v }))} /></Field>
              <Field label="Ataque"><NumInput v={editing.attack ?? 1} onChange={v => setEditing(e => ({ ...e!, attack: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Defesa"><NumInput v={editing.defense ?? 0} onChange={v => setEditing(e => ({ ...e!, defense: v }))} /></Field>
              <Field label="Cooldown ATK (s)"><NumInput v={editing.attackCooldown ?? 2.2} step={0.1} onChange={v => setEditing(e => ({ ...e!, attackCooldown: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Velocidade"><NumInput v={editing.walkSpeed ?? 42} onChange={v => setEditing(e => ({ ...e!, walkSpeed: v }))} /></Field>
              <Field label="Alcance (grids)"><NumInput v={editing.attackRange ?? 1} onChange={v => setEditing(e => ({ ...e!, attackRange: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Moedas (min)"><NumInput v={editing.coinDropMin ?? 1} onChange={v => setEditing(e => ({ ...e!, coinDropMin: v }))} /></Field>
              <Field label="Moedas (max)"><NumInput v={editing.coinDropMax ?? 2} onChange={v => setEditing(e => ({ ...e!, coinDropMax: v }))} /></Field>
            </Row>
            <Field label="XP base (por kill)"><NumInput v={editing.baseXp ?? 8} onChange={v => setEditing(e => ({ ...e!, baseXp: v }))} /></Field>
            <Row>
              <Field label="Boss">
                <select value={editing.isBoss ? '1' : '0'} onChange={e => setEditing(prev => ({ ...prev!, isBoss: e.target.value === '1' }))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                  <option value="0">Não</option><option value="1">Sim</option>
                </select>
              </Field>
              <Field label="Tamanho (x)"><NumInput v={editing.sizeMultiplier ?? 1} step={0.5} onChange={v => setEditing(e => ({ ...e!, sizeMultiplier: v }))} /></Field>
            </Row>
            <SaveBtn saving={saving} onClick={save} />
          </FormCard>
        </div>
      )}
    </div>
  )
}

// ── Rounds Tab ────────────────────────────────────────────────────
const ROUND_DEFAULTS: Omit<Round, 'id' | 'waves'> = {
  number: 1, name: 'Fase 1',
  chestCommonChance: 0.5, chestUncommonChance: 0.25,
  chestRareChance: 0.1, chestLegendaryChance: 0.02,
}

function RoundsTab() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [editing, setEditing] = useState<Partial<Round> | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [rr, mr] = await Promise.all([api('/rounds'), api('/monsters')])
    setRounds(await rr.json()); setMonsters(await mr.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    const { waves, ...data } = editing as Round
    if (editing?.id) {
      await api(`/rounds/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) })
    } else {
      await api('/rounds', { method: 'POST', body: JSON.stringify(data) })
    }
    setSaving(false); setEditing(null); load()
  }

  async function del(id: string) {
    if (!confirm('Deletar round?')) return
    await api(`/rounds/${id}`, { method: 'DELETE' }); load()
  }

  async function addWave(roundId: string, waves: Wave[]) {
    const order = waves.length + 1
    const triggerX = 300 + (order - 1) * 460
    await api(`/rounds/${roundId}/waves`, { method: 'POST', body: JSON.stringify({ order, triggerX }) })
    load()
  }

  async function deleteWave(waveId: string) {
    await api(`/waves/${waveId}`, { method: 'DELETE' }); load()
  }

  async function updateWave(waveId: string, data: Partial<Wave>) {
    await api(`/waves/${waveId}`, { method: 'PUT', body: JSON.stringify(data) }); load()
  }

  async function addMonsterToWave(waveId: string, monsterId: string, offsetX: number) {
    await api(`/waves/${waveId}/monsters`, { method: 'POST', body: JSON.stringify({ monsterId, offsetX }) })
    load()
  }

  async function removeWaveMonster(wmId: string) {
    await api(`/wave-monsters/${wmId}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <SectionHeader title="Rounds" onNew={() => setEditing({ ...ROUND_DEFAULTS, waves: [] })} />

        <div className="mt-3 flex flex-col gap-3">
          {rounds.map(r => (
            <div key={r.id} className="border border-gray-800 rounded">
              {/* Round header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-900/60">
                <span className="text-yellow-400 font-bold text-sm">#{r.number}</span>
                <span className="text-white text-sm flex-1">{r.name}</span>
                <span className="text-xs text-gray-500">{r.waves.length} onda(s)</span>
                <div className="flex gap-1 text-xs">
                  <span className="text-gray-400">Báu:</span>
                  <ChestChip rarity="C" color="gray">{pct(r.chestCommonChance)}</ChestChip>
                  <ChestChip rarity="I" color="green">{pct(r.chestUncommonChance)}</ChestChip>
                  <ChestChip rarity="R" color="blue">{pct(r.chestRareChance)}</ChestChip>
                  <ChestChip rarity="L" color="yellow">{pct(r.chestLegendaryChance)}</ChestChip>
                </div>
                <Btn onClick={() => setEditing(r)}>editar</Btn>
                <Btn onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  {expanded === r.id ? 'fechar ondas' : 'ondas'}
                </Btn>
                <Btn red onClick={() => del(r.id)}>×</Btn>
              </div>

              {/* Waves */}
              {expanded === r.id && (
                <div className="p-3 flex flex-col gap-2 bg-gray-950/40">
                  {r.waves.map(w => (
                    <WaveRow
                      key={w.id}
                      wave={w}
                      monsters={monsters}
                      onUpdateWave={(data) => updateWave(w.id, data)}
                      onDeleteWave={() => deleteWave(w.id)}
                      onAddMonster={(mId, off) => addMonsterToWave(w.id, mId, off)}
                      onRemoveMonster={removeWaveMonster}
                    />
                  ))}
                  <button
                    onClick={() => addWave(r.id, r.waves)}
                    className="text-xs text-green-400 border border-green-900/40 rounded px-3 py-1.5 hover:bg-green-900/10 transition-colors self-start"
                  >
                    + Adicionar onda
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {rounds.length === 0 && <Empty />}
      </div>

      {editing && (
        <div className="w-72 shrink-0">
          <FormCard title={editing.id ? 'Editar Round' : 'Novo Round'} onCancel={() => setEditing(null)}>
            <Row>
              <Field label="Número"><NumInput v={editing.number ?? 1} onChange={v => setEditing(e => ({ ...e!, number: v }))} /></Field>
              <Field label="Nome" style={{ flex: 2 }}><Input v={editing.name ?? ''} onChange={v => setEditing(e => ({ ...e!, name: v }))} /></Field>
            </Row>
            <div className="text-xs text-gray-500 mt-1 mb-0.5">Chance de báu (0 = nunca, 1 = sempre)</div>
            <Row>
              <Field label="Comum (C)"><NumInput v={editing.chestCommonChance ?? 0.5} step={0.05} min={0} max={1} onChange={v => setEditing(e => ({ ...e!, chestCommonChance: v }))} /></Field>
              <Field label="Incomum (I)"><NumInput v={editing.chestUncommonChance ?? 0.25} step={0.05} min={0} max={1} onChange={v => setEditing(e => ({ ...e!, chestUncommonChance: v }))} /></Field>
            </Row>
            <Row>
              <Field label="Raro (R)"><NumInput v={editing.chestRareChance ?? 0.1} step={0.05} min={0} max={1} onChange={v => setEditing(e => ({ ...e!, chestRareChance: v }))} /></Field>
              <Field label="Lendário (L)"><NumInput v={editing.chestLegendaryChance ?? 0.02} step={0.01} min={0} max={1} onChange={v => setEditing(e => ({ ...e!, chestLegendaryChance: v }))} /></Field>
            </Row>
            <SaveBtn saving={saving} onClick={save} />
          </FormCard>
        </div>
      )}
    </div>
  )
}

// ── Wave row (inline wave editor) ─────────────────────────────────
function WaveRow({
  wave, monsters, onUpdateWave, onDeleteWave, onAddMonster, onRemoveMonster,
}: {
  wave: Wave; monsters: Monster[]
  onUpdateWave: (d: Partial<Wave>) => void
  onDeleteWave: () => void
  onAddMonster: (mId: string, off: number) => void
  onRemoveMonster: (wmId: string) => void
}) {
  const [triggerX, setTriggerX] = useState(wave.triggerX)
  const [addMonsterId, setAddMonsterId] = useState(monsters[0]?.id ?? '')
  const [addOffset, setAddOffset] = useState(0)

  return (
    <div className="border border-gray-800/70 rounded p-2.5 flex flex-col gap-2 bg-gray-900/40">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-400 font-bold">Onda {wave.order}</span>
        <label className="flex items-center gap-1 text-gray-500">
          Trigger X
          <input
            type="number"
            value={triggerX}
            onChange={e => setTriggerX(Number(e.target.value))}
            onBlur={() => onUpdateWave({ triggerX })}
            className="w-16 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white text-xs"
          />
        </label>
        <Btn red onClick={onDeleteWave}>× onda</Btn>
      </div>

      {/* Monsters in wave */}
      <div className="flex flex-wrap gap-1.5">
        {wave.monsters.map(wm => (
          <div key={wm.id} className="flex items-center gap-1 bg-gray-800 border border-gray-700/60 rounded px-2 py-1 text-xs">
            <span className="text-red-400">{wm.monster.name}</span>
            <span className="text-gray-500">offset:{wm.offsetX}</span>
            <button onClick={() => onRemoveMonster(wm.id)} className="text-gray-600 hover:text-red-400 ml-1">×</button>
          </div>
        ))}
      </div>

      {/* Add monster to wave */}
      <div className="flex items-center gap-1.5 text-xs">
        <select
          value={addMonsterId}
          onChange={e => setAddMonsterId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-white flex-1"
        >
          {monsters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <label className="text-gray-500 flex items-center gap-1">
          offset
          <input
            type="number"
            value={addOffset}
            onChange={e => setAddOffset(Number(e.target.value))}
            className="w-14 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white"
          />
        </label>
        <button
          onClick={() => { onAddMonster(addMonsterId, addOffset) }}
          disabled={!addMonsterId}
          className="text-green-400 border border-green-900/50 rounded px-2 py-0.5 hover:bg-green-900/10 transition-colors disabled:opacity-30"
        >
          + monstro
        </button>
      </div>
    </div>
  )
}

// ── Shared UI primitives ──────────────────────────────────────────
function SectionHeader({ title, onNew }: { title: string; onNew: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
      <h2 className="text-sm font-bold tracking-wider text-gray-300">{title}</h2>
      <button
        onClick={onNew}
        className="text-xs text-green-400 border border-green-900/50 rounded px-3 py-1 hover:bg-green-900/10 transition-colors"
      >
        + Novo
      </button>
    </div>
  )
}

function FormCard({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-gray-300 tracking-wider">{title}</span>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-300 text-xs px-1">✕</button>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-0.5 flex-1" style={style}>
      <span className="text-gray-500 text-xs">{label}</span>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>
}

function Input({ v, onChange }: { v: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={v}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-600/50"
    />
  )
}

function NumInput({ v, onChange, step = 1, min, max }: {
  v: number; onChange: (v: number) => void; step?: number; min?: number; max?: number
}) {
  return (
    <input
      type="number"
      value={v}
      step={step}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-600/50"
    />
  )
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mt-1 w-full py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/40 text-yellow-400 text-xs rounded font-bold tracking-wider transition-colors disabled:opacity-50"
    >
      {saving ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

function Btn({ children, onClick, red }: { children: React.ReactNode; onClick: () => void; red?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
        red
          ? 'border-red-900/50 text-red-500 hover:bg-red-900/10'
          : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
      }`}
    >
      {children}
    </button>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    green:  'bg-green-900/30 text-green-400 border-green-800/50',
    gray:   'bg-gray-800 text-gray-500 border-gray-700',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
    red:    'bg-red-900/30 text-red-400 border-red-800/50',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[color] ?? colors.gray}`}>{children}</span>
  )
}

function ChestChip({ children, rarity, color }: { children: React.ReactNode; rarity: string; color: string }) {
  const colors: Record<string, string> = {
    gray:   'text-gray-400 border-gray-700',
    green:  'text-green-400 border-green-800/50',
    blue:   'text-blue-400 border-blue-800/50',
    yellow: 'text-yellow-400 border-yellow-800/50',
  }
  return (
    <span className={`flex items-center gap-0.5 text-xs border rounded px-1 py-0.5 ${colors[color] ?? colors.gray}`}>
      <span className="opacity-60">{rarity}</span>{children}
    </span>
  )
}

function SelectInput({ v, options, onChange }: { v: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={v}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-600/50"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Empty() {
  return <p className="text-gray-600 text-xs mt-6 text-center">Nenhum registro. Clique em + Novo para começar.</p>
}
