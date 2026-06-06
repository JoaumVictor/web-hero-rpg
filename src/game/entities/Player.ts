import { loadSpriteSet, SpriteSet } from '@/lib/spriteLoader'

const DEFAULT_SPEED = 220
const FRAME_MS = 100
const DEFAULT_ATTACK_COOLDOWN = 1500
const DRAW_SIZE = 100

type State = 'idle' | 'walk' | 'attack'

export class Player {
  x: number
  y: number
  readonly width = DRAW_SIZE
  readonly height = DRAW_SIZE
  hp: number
  readonly maxHp: number
  facingRight = true

  private sprites: SpriteSet | null = null
  private state: State = 'idle'
  private frameIndex = 0
  private frameTimer = 0
  private cooldown = 0
  private hitDealt = false
  private _attackActive = false

  readonly spriteSet: string
  readonly attackDamage: number
  private readonly speed: number
  private readonly attackCooldownMs: number

  constructor(x: number, y: number, hp = 100, spriteSet = 'hero', attackDamage = 4, speed = DEFAULT_SPEED, attackCooldownMs = DEFAULT_ATTACK_COOLDOWN) {
    this.x = x
    this.y = y
    this.hp = hp
    this.maxHp = hp
    this.spriteSet = spriteSet
    this.attackDamage = attackDamage
    this.speed = speed
    this.attackCooldownMs = attackCooldownMs
  }

  async load() {
    this.sprites = await loadSpriteSet('heroes', this.spriteSet)
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
    this._attackActive = false
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
        const attackFrames = this.sprites?.attack ?? []
        this._attackActive = this.frameIndex === 1 && !this.hitDealt
        if (this.frameIndex >= attackFrames.length) {
          this.state = 'idle'
          this.frameIndex = 0
          this._attackActive = false
          this.cooldown = this.attackCooldownMs
        }
      }
      return
    }

    this._attackActive = false

    if (dx !== 0) {
      this.x += dx * this.speed * dt
      this.facingRight = dx > 0
      this.state = 'walk'
      this.frameTimer += ms
      if (this.frameTimer >= FRAME_MS) {
        this.frameTimer = 0
        const walkFrames = this.sprites?.walk ?? []
        this.frameIndex = walkFrames.length > 0
          ? (this.frameIndex + 1) % walkFrames.length
          : 0
      }
    } else {
      this.state = 'idle'
      this.frameIndex = 0
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.sprites) return
    const frames = this.state === 'attack' ? this.sprites.attack : this.sprites.walk
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
