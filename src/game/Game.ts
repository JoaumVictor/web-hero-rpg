import { Player } from './entities/Player'
import { Enemy } from './entities/Enemy'

// ── Canvas / World ────────────────────────────────────────────────
const W = 800
const H = 420
const GROUND_Y = 295
const WORLD_WIDTH = 4000

// ── Balance ───────────────────────────────────────────────────────
const WALK_DX = 0.65      // 0.65 × 220 ≈ 143 px/s
const INTRO_DX = 0.30     // slow walk during title card
const AUTO_RANGE = 115    // center-to-center distance to auto-attack
const PLAYER_DAMAGE = 4
const PLAYER_HP = 26
const ENEMY_HP = 12

// ── Waves ─────────────────────────────────────────────────────────
// triggerX: hero must reach this world-x to spawn the wave
// offsets:  each entry = one enemy, offset from the right-edge spawn point
interface WaveDef { triggerX: number; offsets: number[] }

const WAVE_DEFS: WaveDef[] = [
  { triggerX: 640,  offsets: [0] },          // wave 1 – 1 zombie
  { triggerX: 1100, offsets: [0] },          // wave 2 – 1 zombie
  { triggerX: 1560, offsets: [0, 220] },     // wave 3 – 2 zombies
  { triggerX: 2020, offsets: [0] },          // wave 4 – 1 zombie
  { triggerX: 2480, offsets: [0, 240] },     // wave 5 – 2 zombies
]

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
  size?: number       // font size px, default 16
  life: number        // 1 → 0
}

interface HeroInfo {
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

  private player: Player
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

  private rafId = 0
  private lastTime = 0

  onRestart?: () => void
  onCoinsChange?: (total: number) => void
  onKill?: (info: { x: number; y: number; baseXp: number }) => void

  private heroInfo: HeroInfo[] = []

  setHeroInfo(heroes: HeroInfo[]) {
    this.heroInfo = heroes
  }

  addFloat(wx: number, wy: number, text: string, color: string, size = 16) {
    if (this.destroyed) return
    this.floats.push({ wx, wy, text, color, size, life: 1 })
  }

  private destroyed = false
  private restartCalled = false

  constructor(canvas: HTMLCanvasElement, initialCoins = 0) {
    this.canvas = canvas
    canvas.width = W
    canvas.height = H
    this.ctx = canvas.getContext('2d')!

    this.player = new Player(60, GROUND_Y - 100, PLAYER_HP)
    this.totalCoins = initialCoins

    // enemies created with placeholder x=0 — real position set on wave trigger
    this.waves = WAVE_DEFS.map(def => ({
      def,
      enemies: def.offsets.map(() => new Enemy(0, GROUND_Y - 100, ENEMY_HP)),
      triggered: false,
      cleared: false,
    }))
  }

  async start() {
    await Promise.all([
      this.player.load(),
      ...this.waves.flatMap(w => w.enemies.map(e => e.load())),
    ])
    if (this.destroyed) return   // destroyed while loading — do not start RAF
    this.phase = 'intro'
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  // ── Loop ────────────────────────────────────────────────────────

  private loop = (now: number) => {
    if (this.destroyed) return   // safeguard against orphaned RAFs
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
        this.player.update(dt, INTRO_DX)
        this.clampPlayer()
        this.cameraX = this.calcCamera()
        if (this.introElapsed >= 2600) this.phase = 'playing'
        break

      case 'playing':
        this.triggerWaves()
        this.autoMove(dt)
        this.resolveCombat()
        this.tickEnemies(dt)
        this.dropCoins()
        this.tickFloats(dt)
        this.tickAnnouncement(dt)
        this.cameraX = this.calcCamera()
        if (this.player.isDead) {
          this.phase = 'dead'
          this.deadElapsed = 0
        }
        if (this.waves.every(w => w.cleared)) {
          this.phase = 'victory'
          this.victoryElapsed = 0
        }
        break

      // ── dead: freeze everything, show stats overlay ──
      case 'dead':
        this.deadElapsed += dt * 1000
        if (this.deadElapsed >= 5000 && !this.restartCalled) {
          this.restartCalled = true
          this.onRestart?.()
        }
        break

      // ── victory: hero keeps running behind stats overlay ──
      case 'victory':
        this.victoryElapsed += dt * 1000
        if (this.victoryElapsed >= 6000 && !this.restartCalled) {
          this.restartCalled = true
          this.onRestart?.()
        }
        this.player.update(dt, WALK_DX)
        this.clampPlayer()
        this.cameraX = this.calcCamera()
        break
    }
  }

  // ── Playing sub-steps ───────────────────────────────────────────

  private triggerWaves() {
    for (const wave of this.waves) {
      if (wave.triggered || this.player.x < wave.def.triggerX) continue
      wave.triggered = true
      // spawn enemies just off the right edge of the camera
      const spawnBase = this.cameraX + W + 50
      wave.enemies.forEach((e, i) => {
        e.x = spawnBase + wave.def.offsets[i]
        e.activate()
      })
    }
  }

  private autoMove(dt: number) {
    const hc = this.player.x + this.player.width / 2
    const target = this.waves
      .flatMap(w => w.enemies)
      .filter(e => !e.isDead && e.active)
      .map(e => ({ e, d: Math.abs(e.x + e.width / 2 - hc) }))
      .filter(({ e, d }) => e.x + e.width / 2 > hc && d <= AUTO_RANGE)
      .sort((a, b) => a.d - b.d)[0]?.e

    if (target) {
      this.player.startAttack()
      this.player.update(dt, 0)
    } else {
      this.player.update(dt, WALK_DX)
    }
    this.clampPlayer()
  }

  private resolveCombat() {
    if (!this.player.attackActive) return
    const hc = this.player.x + this.player.width / 2
    for (const wave of this.waves) {
      for (const e of wave.enemies) {
        if (e.isDead) continue
        const ec = e.x + e.width / 2
        const facing = this.player.facingRight ? ec > hc : ec < hc
        if (facing && Math.abs(hc - ec) <= this.player.attackRange) {
          e.takeDamage(PLAYER_DAMAGE)
          this.player.markHitDealt()
          return
        }
      }
    }
  }

  private tickEnemies(dt: number) {
    let dmg = 0
    for (const wave of this.waves) {
      for (const e of wave.enemies) {
        dmg += e.update(dt, this.player.x, this.player.width)
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
    if (dmg > 0) this.player.takeDamage(dmg)
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
        this.onKill?.({ x: e.x + e.width / 2, y: e.y - 20, baseXp: e.baseXp })
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

  private clampPlayer() {
    this.player.x = Math.max(0, Math.min(WORLD_WIDTH - this.player.width, this.player.x))
  }

  private calcCamera() {
    return Math.max(0, Math.min(this.player.x - 200, WORLD_WIDTH - W))
  }

  // ── Render ──────────────────────────────────────────────────────

  private render() {
    this.renderBg()

    const ctx = this.ctx
    ctx.save()
    ctx.translate(-this.cameraX, 0)

    // ground
    ctx.fillStyle = '#0f3460'
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, H - GROUND_Y)
    ctx.fillStyle = '#533483'
    ctx.fillRect(0, GROUND_Y - 3, WORLD_WIDTH, 6)

    this.player.draw(ctx)

    for (const wave of this.waves) {
      if (!wave.triggered) continue
      for (const e of wave.enemies) e.draw(ctx)
    }

    // floating texts (world space)
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

    // stars – parallax 0.1×
    const starShift = (this.cameraX * 0.1) % W
    ctx.save()
    ctx.translate(-starShift, 0)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    for (let rep = 0; rep < 3; rep++) {
      for (const s of STARS) ctx.fillRect(s.x + rep * W, s.y, s.size, s.size)
    }
    ctx.restore()

    // mountains – parallax 0.25×
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

    // dead trees – parallax 0.55×
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

    // thin top bar
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, 30)

    // level label (center)
    ctx.fillStyle = '#555'
    ctx.font = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('MUNDO 0  ·  FASE 1', W / 2, 19)

    // coin icon + count (right)
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

    // hero level badges (left side)
    if (this.heroInfo.length > 0) {
      let bx = 8
      for (const h of this.heroInfo) {
        const label = `Lv.${h.level}`
        ctx.font = 'bold 10px monospace'
        const lw = ctx.measureText(label).width
        const bw = lw + 10

        // badge bg
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(bx, 5, bw, 20)

        // xp progress fill
        const pct = h.xpToNext > 0 ? h.xp / h.xpToNext : 0
        ctx.fillStyle = 'rgba(46,204,113,0.35)'
        ctx.fillRect(bx, 5, bw * pct, 20)

        // label
        ctx.fillStyle = '#a8e6cf'
        ctx.textAlign = 'left'
        ctx.fillText(label, bx + 5, 18)

        bx += bw + 4
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
    ctx.fillText('MUNDO 0  —  FASE 1', W / 2, H / 2 - 4)
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

  // shared stat box — semi-transparent so hero is visible behind it
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

    // coins row with icon
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
    this.renderStatsBox('SEU HERÓI CAIU', '#e74c3c')
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
