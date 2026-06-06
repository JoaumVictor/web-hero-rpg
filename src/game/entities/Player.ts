import { loadFrames } from '../renderer/sprites'

const WALK_PATHS = Array.from({ length: 6 }, (_, i) => `/assets/characters/hero/hero-walk-${i + 1}.png`)
const ATTACK_PATHS = Array.from({ length: 3 }, (_, i) => `/assets/characters/hero/hero-attack-${i + 1}.png`)

const SPEED = 220          // px/s
const FRAME_MS = 100       // ms per animation frame
const ATTACK_COOLDOWN = 1500 // ms between attacks
const DRAW_SIZE = 100      // render at 100x100 (source is 200x200)

type State = 'idle' | 'walk' | 'attack'

export class Player {
  x: number
  y: number
  readonly width = DRAW_SIZE
  readonly height = DRAW_SIZE
  hp: number
  readonly maxHp: number
  facingRight = true

  private walkFrames: HTMLImageElement[] = []
  private attackFrames: HTMLImageElement[] = []
  private state: State = 'idle'
  private frameIndex = 0
  private frameTimer = 0
  private cooldown = 0
  private hitDealt = false
  private _attackActive = false

  constructor(x: number, y: number, hp = 100) {
    this.x = x
    this.y = y
    this.hp = hp
    this.maxHp = hp
  }

  async load() {
    [this.walkFrames, this.attackFrames] = await Promise.all([
      loadFrames(WALK_PATHS),
      loadFrames(ATTACK_PATHS),
    ])
  }

  get isDead() { return this.hp <= 0 }
  get attackActive() { return this._attackActive }
  get attackRange() { return 110 }

  startAttack() {
    if (this.cooldown > 0 || this.state === 'attack') return
    this.state = 'attack'
    this.frameIndex = 0
    this.frameTimer = 0
    this._attackActive = false
    this.hitDealt = false
  }

  markHitDealt() {
    this.hitDealt = true
    this._attackActive = false  // cut the hitbox immediately — prevents multi-hit in same frame window
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount)
  }

  update(dt: number, dx: number) {
    const ms = dt * 1000
    this.cooldown = Math.max(0, this.cooldown - ms)

    if (this.state === 'attack') {
      this.frameTimer += ms
      if (this.frameTimer >= FRAME_MS) {
        this.frameTimer = 0
        this.frameIndex++

        // hitbox active only on frame 1 and only once per swing
        this._attackActive = this.frameIndex === 1 && !this.hitDealt

        if (this.frameIndex >= this.attackFrames.length) {
          this.state = 'idle'
          this.frameIndex = 0
          this._attackActive = false
          this.cooldown = ATTACK_COOLDOWN
        }
      }
      return
    }

    this._attackActive = false

    if (dx !== 0) {
      this.x += dx * SPEED * dt
      this.facingRight = dx > 0
      this.state = 'walk'
      this.frameTimer += ms
      if (this.frameTimer >= FRAME_MS) {
        this.frameTimer = 0
        this.frameIndex = (this.frameIndex + 1) % this.walkFrames.length
      }
    } else {
      this.state = 'idle'
      this.frameIndex = 0
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const frames = this.state === 'attack' ? this.attackFrames : this.walkFrames
    const frame = frames[Math.min(this.frameIndex, frames.length - 1)]
    if (!frame) return

    ctx.save()
    if (!this.facingRight) {
      ctx.translate(this.x + this.width, this.y)
      ctx.scale(-1, 1)
      ctx.drawImage(frame, 0, 0, this.width, this.height)
    } else {
      ctx.drawImage(frame, this.x, this.y, this.width, this.height)
    }
    ctx.restore()

    drawHpBar(ctx, this.x, this.y - 14, this.width, this.hp / this.maxHp, '#2ecc71')
  }
}

function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  ratio: number, color: string,
) {
  ctx.fillStyle = '#222'
  ctx.fillRect(x, y, w, 7)
  ctx.fillStyle = color
  ctx.fillRect(x, y, w * Math.max(0, ratio), 7)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, 7)
}
