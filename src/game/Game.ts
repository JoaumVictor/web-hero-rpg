import { Player } from './entities/Player'
import { Enemy } from './entities/Enemy'

// ── Canvas / World ────────────────────────────────────────────────
const W = 800
const H = 420
const GROUND_Y = 295
const WORLD_WIDTH = 4000

// ── Balance ───────────────────────────────────────────────────────
const WALK_DX = 0.65      // 0.65 × 220 ≈ 143 px/s
const INTRO_DX = 0.30
const AUTO_RANGE = 115    // center-to-center distance to auto-attack
const HERO_GAP = 80       // px between heroes in formation
const ENEMY_HP = 12

const DEFAULT_HP = 26
const DEFAULT_ATTACK = 4
const DEFAULT_SPEED = 220
const DEFAULT_COOLDOWN_MS = 1500

// ── Waves ─────────────────────────────────────────────────────────
interface WaveDef { triggerX: number; offsets: number[] }

const WAVE_DEFS: WaveDef[] = [
  { triggerX: 640,  offsets: [0] },
  { triggerX: 1100, offsets: [0] },
  { triggerX: 1560, offsets: [0, 220] },
  { triggerX: 2020, offsets: [0] },
  { triggerX: 2480, offsets: [0, 240] },
]

export interface WaveMonsterDB {
  offsetX: number
  levelMult: number
  monster: {
    id: string
    hp: number
    attack: number
    defense: number
    attackCooldown: number
    walkSpeed: number
    attackRange: number
    spriteSet: string
    baseXp: number
    coinDropMin: number
    coinDropMax: number
  }
}

export interface WaveDefDB {
  id: string
  triggerX: number
  order: number
  monsters: WaveMonsterDB[]
}

// ── Hero slot — used to create Player instances ───────────────────
export interface HeroSlot {
  name: string
  hp: number
  attack: number
  speed: number
  cooldownMs: number
  spriteSet: string
  level: number
  xp: number
  xpToNext: number
}

// ── Internal types ────────────────────────────────────────────────
interface Wave {
  def: WaveDef
  enemies: Enemy[]
  triggered: boolean
  cleared: boolean
}

interface FloatingText {
  wx: number; wy: number
  text: string; color: string
  size?: number
  life: number
}

interface HeroDisplayInfo {
  name: string
  level: number
  xp: number
  xpToNext: number
}

interface Announcement {
  text: string; sub: string
  elapsed: number; duration: number
}

type Phase = 'intro' | 'playing' | 'dead' | 'victory'

// ── Deterministic star positions ──────────────────────────────────
const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 137 + 43) % 800,
  y: (i * 89 + 17) % (GROUND_Y - 50),
  size: i % 3 === 0 ? 2 : 1,
}))

// ── Game ──────────────────────────────────────────────────────────
export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private players: Player[]
  private heroDisplay: HeroDisplayInfo[]
  private waves: Wave[]

  private phase: Phase = 'intro'
  private cameraX = 0
  private introElapsed = 0
  private deadElapsed = 0
  private victoryElapsed = 0

  private announcement: Announcement | null = null
  private floats: FloatingText[] = []

  private droppedCoins = new Set<Enemy>()
  totalCoins = 0
  monstersKilled = 0
  wavesCleared = 0
  private playTimeMs = 0
  private levelName: string | null = null

  private rafId = 0
  private lastTime = 0

  onRestart?: () => void
  onCoinsChange?: (total: number) => void
  onKill?: (info: { x: number; y: number; baseXp: number; monsterId?: string }) => void
  onLevelComplete?: (stats: { monstersKilled: number; heroSurvived: boolean; timeMs: number }) => void

  private destroyed = false
  private restartCalled = false

  setLevelName(name: string) {
    this.levelName = name
  }

  // Called after kills to sync XP/level data for HUD
  setHeroInfo(heroes: { name: string; level: number; xp: number; xpToNext: number }[]) {
    heroes.forEach((h, i) => {
      if (this.heroDisplay[i]) {
        this.heroDisplay[i] = { name: h.name, level: h.level, xp: h.xp, xpToNext: h.xpToNext }
      }
    })
  }

  addFloat(wx: number, wy: number, text: string, color: string, size = 16) {
    if (this.destroyed) return
    this.floats.push({ wx, wy, text, color, size, life: 1 })
  }

  constructor(
    canvas: HTMLCanvasElement,
    initialCoins = 0,
    waveDefs?: WaveDefDB[] | null,
    heroSlots?: HeroSlot[],
  ) {
    this.canvas = canvas
    canvas.width = W
    canvas.height = H
    this.ctx = canvas.getContext('2d')!

    this.totalCoins = initialCoins

    // ── Build player roster ──────────────────────────────────────
    const slots: HeroSlot[] = heroSlots && heroSlots.length > 0 ? heroSlots : [{
      name: 'Herói',
      hp: DEFAULT_HP,
      attack: DEFAULT_ATTACK,
      speed: DEFAULT_SPEED,
      cooldownMs: DEFAULT_COOLDOWN_MS,
      spriteSet: 'hero',
      level: 1,
      xp: 0,
      xpToNext: 100,
    }]

    // Front hero (i=0) is furthest right (x=200); each subsequent hero is 80px behind
    this.players = slots.map((s, i) => new Player(
      200 - i * HERO_GAP,
      GROUND_Y - 100,
      s.hp,
      s.spriteSet,
      s.attack,
      s.speed,
      s.cooldownMs,
    ))

    this.heroDisplay = slots.map(s => ({
      name: s.name,
      level: s.level,
      xp: s.xp,
      xpToNext: s.xpToNext,
    }))

    // ── Build waves ──────────────────────────────────────────────
    if (waveDefs && waveDefs.length > 0) {
      this.waves = waveDefs.map(wd => ({
        def: { triggerX: wd.triggerX, offsets: wd.monsters.map(m => m.offsetX) },
        enemies: wd.monsters.map(m => new Enemy(
          0,
          GROUND_Y - 100,
          Math.round(m.monster.hp * m.levelMult),
          m.monster.spriteSet,
          m.monster.baseXp,
          m.monster.id,
          m.monster.walkSpeed,
        )),
        triggered: false,
        cleared: false,
      }))
    } else {
      this.waves = WAVE_DEFS.map(def => ({
        def,
        enemies: def.offsets.map(() => new Enemy(0, GROUND_Y - 100, ENEMY_HP, 'zombie', 8, 'monster-zombie')),
        triggered: false,
        cleared: false,
      }))
    }
  }

  async start() {
    await Promise.all([
      ...this.players.map(p => p.load()),
      ...this.waves.flatMap(w => w.enemies.map(e => e.load())),
    ])
    if (this.destroyed) return
    this.phase = 'intro'
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  // ── Loop ────────────────────────────────────────────────────────

  private loop = (now: number) => {
    if (this.destroyed) return
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.update(dt)
    this.render()
    this.rafId = requestAnimationFrame(this.loop)
  }

  // ── Update ──────────────────────────────────────────────────────

  private update(dt: number) {
    switch (this.phase) {
      case 'intro':
        this.introElapsed += dt * 1000
        for (const p of this.players) p.update(dt, INTRO_DX)
        this.clampPlayers()
        this.cameraX = this.calcCamera()
        if (this.introElapsed >= 2600) this.phase = 'playing'
        break

      case 'playing':
        this.playTimeMs += dt * 1000
        this.triggerWaves()
        this.autoMove(dt)
        this.resolveCombat()
        this.tickEnemies(dt)
        this.dropCoins()
        this.tickFloats(dt)
        this.tickAnnouncement(dt)
        this.cameraX = this.calcCamera()
        if (this.players.every(p => p.isDead)) {
          this.phase = 'dead'
          this.deadElapsed = 0
        }
        if (this.waves.every(w => w.cleared)) {
          this.phase = 'victory'
          this.victoryElapsed = 0
          const anyAlive = this.players.some(p => !p.isDead)
          this.onLevelComplete?.({
            monstersKilled: this.monstersKilled,
            heroSurvived: anyAlive,
            timeMs: this.playTimeMs,
          })
        }
        break

      case 'dead':
        this.deadElapsed += dt * 1000
        if (this.deadElapsed >= 5000 && !this.restartCalled) {
          this.restartCalled = true
          this.onRestart?.()
        }
        break

      case 'victory':
        this.victoryElapsed += dt * 1000
        if (this.victoryElapsed >= 6000 && !this.restartCalled) {
          this.restartCalled = true
          this.onRestart?.()
        }
        for (const p of this.players) {
          if (!p.isDead) p.update(dt, WALK_DX)
        }
        this.clampPlayers()
        this.cameraX = this.calcCamera()
        break
    }
  }

  // ── Playing sub-steps ───────────────────────────────────────────

  private triggerWaves() {
    const front = this.frontPlayer()
    if (!front) return
    for (const wave of this.waves) {
      if (wave.triggered || front.x < wave.def.triggerX) continue
      wave.triggered = true
      const spawnBase = this.cameraX + W + 50
      wave.enemies.forEach((e, i) => {
        e.x = spawnBase + wave.def.offsets[i]
        e.activate()
      })
    }
  }

  private autoMove(dt: number) {
    const activeEnemies = this.waves
      .flatMap(w => w.enemies)
      .filter(e => !e.isDead && e.active)

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]
      if (p.isDead) continue

      const pc = p.x + p.width / 2
      const nearbyEnemy = activeEnemies
        .filter(e => e.x + e.width / 2 > pc)
        .map(e => ({ e, d: Math.abs(e.x + e.width / 2 - pc) }))
        .filter(({ d }) => d <= AUTO_RANGE)
        .sort((a, b) => a.d - b.d)[0]?.e

      if (nearbyEnemy) {
        p.startAttack()
        p.update(dt, 0)
      } else if (i === 0) {
        // front hero advances freely
        p.update(dt, WALK_DX)
      } else {
        // follow hero ahead with a gap
        const ahead = this.players[i - 1]
        const gap = ahead.x - (p.x + p.width)
        if (gap > 10) {
          p.update(dt, WALK_DX)
        } else {
          p.update(dt, 0)
        }
      }
    }
    this.clampPlayers()
  }

  private resolveCombat() {
    for (const p of this.players) {
      if (p.isDead || !p.attackActive) continue
      const hc = p.x + p.width / 2
      for (const wave of this.waves) {
        for (const e of wave.enemies) {
          if (e.isDead) continue
          const ec = e.x + e.width / 2
          const facing = p.facingRight ? ec > hc : ec < hc
          if (facing && Math.abs(hc - ec) <= p.attackRange) {
            e.takeDamage(p.attackDamage)
            p.markHitDealt()
            break
          }
        }
      }
    }
  }

  private tickEnemies(dt: number) {
    const target = this.frontPlayer()
    if (!target) return

    for (const wave of this.waves) {
      for (const e of wave.enemies) {
        const dmg = e.update(dt, target.x, target.width)
        if (dmg > 0) target.takeDamage(dmg)
      }
      if (wave.triggered && !wave.cleared && wave.enemies.every(e => e.isDead)) {
        wave.cleared = true
        this.wavesCleared++
        if (this.wavesCleared < this.waves.length) {
          this.announcement = {
            text: `ONDA ${this.wavesCleared} VENCIDA`,
            sub: 'Continue avançando...',
            elapsed: 0,
            duration: 1800,
          }
        }
      }
    }
  }

  private dropCoins() {
    for (const wave of this.waves) {
      for (const e of wave.enemies) {
        if (!e.isDead || this.droppedCoins.has(e)) continue
        this.droppedCoins.add(e)
        this.monstersKilled++
        const coins = (Math.floor(e.x) % 3 === 0) ? 2 : 1
        this.totalCoins += coins
        this.onCoinsChange?.(this.totalCoins)
        this.floats.push({ wx: e.x + e.width / 2, wy: e.y, text: `+${coins}`, color: '#f1c40f', life: 1 })
        this.onKill?.({ x: e.x + e.width / 2, y: e.y - 20, baseXp: e.baseXp, monsterId: e.monsterId })
      }
    }
  }

  private tickFloats(dt: number) {
    for (const f of this.floats) f.life -= dt / 1.5
    if (this.floats.length > 40) this.floats = this.floats.filter(f => f.life > 0)
  }

  private tickAnnouncement(dt: number) {
    if (!this.announcement) return
    this.announcement.elapsed += dt * 1000
    if (this.announcement.elapsed >= this.announcement.duration) this.announcement = null
  }

  // ── Helpers ─────────────────────────────────────────────────────

  // Frontmost alive player = highest x (closest to enemies)
  private frontPlayer(): Player | undefined {
    return this.players
      .filter(p => !p.isDead)
      .sort((a, b) => b.x - a.x)[0]
  }

  private clampPlayers() {
    for (const p of this.players) {
      p.x = Math.max(0, Math.min(WORLD_WIDTH - p.width, p.x))
    }
  }

  private calcCamera() {
    const front = this.frontPlayer() ?? this.players[0]
    return Math.max(0, Math.min((front?.x ?? 0) - 200, WORLD_WIDTH - W))
  }

  // ── Render ──────────────────────────────────────────────────────

  private render() {
    this.renderBg()

    const ctx = this.ctx
    ctx.save()
    ctx.translate(-this.cameraX, 0)

    ctx.fillStyle = '#0f3460'
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, H - GROUND_Y)
    ctx.fillStyle = '#533483'
    ctx.fillRect(0, GROUND_Y - 3, WORLD_WIDTH, 6)

    for (const p of this.players) p.draw(ctx)

    for (const wave of this.waves) {
      if (!wave.triggered) continue
      for (const e of wave.enemies) e.draw(ctx)
    }

    for (const f of this.floats) {
      if (f.life <= 0) continue
      const fy = f.wy - (1 - f.life) * 55
      ctx.globalAlpha = Math.min(1, f.life * 1.8)
      ctx.fillStyle = f.color
      ctx.font = `bold ${f.size ?? 16}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.wx, fy)
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
    }

    ctx.restore()

    this.renderHUD()

    if (this.phase === 'intro')   this.renderIntro()
    if (this.announcement)        this.renderAnnouncement()
    if (this.phase === 'dead')    this.renderDead()
    if (this.phase === 'victory') this.renderVictory()
  }

  private renderBg() {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
    sky.addColorStop(0, '#090918')
    sky.addColorStop(1, '#141430')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, GROUND_Y)

    const starShift = (this.cameraX * 0.1) % W
    ctx.save()
    ctx.translate(-starShift, 0)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    for (let rep = 0; rep < 3; rep++) {
      for (const s of STARS) ctx.fillRect(s.x + rep * W, s.y, s.size, s.size)
    }
    ctx.restore()

    const mtnShift = (this.cameraX * 0.25) % (W * 2)
    ctx.save()
    ctx.translate(-mtnShift, 0)
    ctx.fillStyle = '#14213d'
    for (let rep = 0; rep < 4; rep++) {
      for (const [px, ph] of [
        [60,90],[200,130],[360,100],[520,140],[680,110],
        [860,125],[1050,95],[1250,135],[1430,105],[1600,120],
      ] as [number,number][]) {
        ctx.beginPath()
        ctx.moveTo(rep * W * 2 + px - 85, GROUND_Y - 2)
        ctx.lineTo(rep * W * 2 + px, GROUND_Y - 2 - ph)
        ctx.lineTo(rep * W * 2 + px + 85, GROUND_Y - 2)
        ctx.fill()
      }
    }
    ctx.restore()

    const treeShift = (this.cameraX * 0.55) % (W * 1.6)
    ctx.save()
    ctx.translate(-treeShift, 0)
    ctx.fillStyle = '#0d1b2a'
    for (let rep = 0; rep < 4; rep++) {
      for (const [tx, th] of [
        [50,45],[160,60],[290,38],[420,55],[540,42],
        [670,58],[800,40],[930,50],[1060,44],[1190,62],
      ] as [number,number][]) {
        const bx = rep * W * 1.6 + tx
        ctx.fillRect(bx, GROUND_Y - th - 4, 7, th)
        ctx.fillRect(bx - 12, GROUND_Y - th + 8, 31, 5)
      }
    }
    ctx.restore()
  }

  private renderHUD() {
    const ctx = this.ctx

    // top bar background
    const hudH = 36
    ctx.fillStyle = 'rgba(0,0,0,0.60)'
    ctx.fillRect(0, 0, W, hudH)

    // level label (center)
    ctx.fillStyle = '#555'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.levelName ?? 'MODO LIVRE', W / 2, 13)

    // coin counter (right)
    const numStr = String(this.totalCoins)
    ctx.font = 'bold 12px monospace'
    const numW = ctx.measureText(numStr).width
    const circleX = W - 14 - numW - 10
    ctx.beginPath()
    ctx.arc(circleX, 15, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#f1c40f'
    ctx.fill()
    ctx.strokeStyle = '#9a6c00'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#f1c40f'
    ctx.textAlign = 'left'
    ctx.fillText(numStr, circleX + 10, 19)

    // per-hero badges (left side)
    const BADGE_W = 78
    const BADGE_H = 30
    const BADGE_PAD = 4

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]
      const d = this.heroDisplay[i]
      if (!d) continue

      const bx = BADGE_PAD + i * (BADGE_W + BADGE_PAD)
      const by = 3
      const dead = p.isDead

      // badge background
      ctx.fillStyle = dead ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.07)'
      ctx.fillRect(bx, by, BADGE_W, BADGE_H)

      if (!dead) {
        // HP fill
        const hpPct = Math.max(0, p.hp / p.maxHp)
        const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#e67e22' : '#e74c3c'
        ctx.fillStyle = hpColor + '55'
        ctx.fillRect(bx, by, BADGE_W * hpPct, BADGE_H)

        // XP fill (very subtle, bottom strip)
        const xpPct = d.xpToNext > 0 ? Math.min(1, d.xp / d.xpToNext) : 0
        ctx.fillStyle = 'rgba(46,204,113,0.25)'
        ctx.fillRect(bx, by + BADGE_H - 4, BADGE_W * xpPct, 4)
      }

      // hero name (truncated) + level
      const nameShort = d.name.length > 6 ? d.name.slice(0, 6) : d.name
      ctx.font = 'bold 9px monospace'
      ctx.fillStyle = dead ? '#444' : '#ccc'
      ctx.textAlign = 'left'
      ctx.fillText(nameShort, bx + 4, by + 11)

      ctx.font = 'bold 9px monospace'
      ctx.fillStyle = dead ? '#333' : '#a8e6cf'
      ctx.textAlign = 'right'
      ctx.fillText(`Lv.${d.level}`, bx + BADGE_W - 3, by + 11)

      if (!dead) {
        // HP text
        ctx.font = '8px monospace'
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.textAlign = 'left'
        ctx.fillText(`${p.hp}/${p.maxHp}`, bx + 4, by + 23)
      } else {
        ctx.font = '8px monospace'
        ctx.fillStyle = '#555'
        ctx.textAlign = 'center'
        ctx.fillText('MORTO', bx + BADGE_W / 2, by + 23)
      }
    }

    ctx.textAlign = 'left'
  }

  private renderIntro() {
    const ms = this.introElapsed
    const alpha = ms < 500 ? ms / 500 : ms < 1800 ? 1 : Math.max(0, 1 - (ms - 1800) / 600)
    if (alpha <= 0) return
    const ctx = this.ctx
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, H / 2 - 55, W, 110)
    ctx.fillStyle = '#e8c050'
    ctx.font = 'bold 34px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.levelName ?? 'MODO LIVRE', W / 2, H / 2 - 4)
    ctx.fillStyle = '#666'
    ctx.font = '15px monospace'
    ctx.fillText('Prepare-se para a batalha...', W / 2, H / 2 + 30)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }

  private renderAnnouncement() {
    const ann = this.announcement!
    const t = ann.elapsed / ann.duration
    const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1
    const ctx = this.ctx
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#2ecc71'
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(ann.text, W / 2, H / 2 - 8)
    ctx.fillStyle = '#777'
    ctx.font = '14px monospace'
    ctx.fillText(ann.sub, W / 2, H / 2 + 22)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }

  private renderStatsBox(title: string, titleColor: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.fillStyle = titleColor
    ctx.font = 'bold 44px monospace'
    ctx.fillText(title, W / 2, H / 2 - 90)

    ctx.font = '18px monospace'
    const rows: [string, string][] = [
      ['Monstros derrotados', String(this.monstersKilled)],
      ['Ondas completadas',   `${this.wavesCleared} / ${this.waves.length}`],
    ]
    rows.forEach(([label, val], i) => {
      ctx.fillStyle = '#aaa'
      ctx.fillText(`${label}:`, W / 2 - 30, H / 2 - 15 + i * 36)
      ctx.fillStyle = '#fff'
      ctx.fillText(val, W / 2 + 130, H / 2 - 15 + i * 36)
    })

    ctx.fillStyle = '#aaa'
    ctx.fillText('Moedas coletadas:', W / 2 - 30, H / 2 + 57)
    ctx.beginPath()
    ctx.arc(W / 2 + 105, H / 2 + 51, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#f1c40f'
    ctx.fill()
    ctx.strokeStyle = '#b8860b'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#f1c40f'
    ctx.font = 'bold 18px monospace'
    ctx.fillText(`${this.totalCoins}`, W / 2 + 122, H / 2 + 58)

    ctx.textAlign = 'left'
  }

  private renderDead() {
    this.renderStatsBox('GRUPO DERROTADO', '#e74c3c')
    const timeLeft = Math.max(0, Math.ceil((5000 - this.deadElapsed) / 1000))
    const ctx = this.ctx
    ctx.fillStyle = '#555'
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`Reiniciando em ${timeLeft}s...`, W / 2, H / 2 + 108)
    ctx.textAlign = 'left'
  }

  private renderVictory() {
    this.renderStatsBox('FASE COMPLETA!', '#2ecc71')
    const timeLeft = Math.max(0, Math.ceil((6000 - this.victoryElapsed) / 1000))
    const ctx = this.ctx
    ctx.fillStyle = '#555'
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`Próxima rodada em ${timeLeft}s...`, W / 2, H / 2 + 108)
    ctx.textAlign = 'left'
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.rafId)
  }
}
