import { loadSpriteSet, SpriteSet } from '@/lib/spriteLoader'

const DEFAULT_WALK_SPEED = 42
const DEFAULT_ATTACK_COOLDOWN_MS = 2200
const DEFAULT_ATTACK_RANGE = 1      // in grids
const GRID_SIZE = 100
const ATTACK_DAMAGE = 1
const DRAW_SIZE = 100

export class Enemy {
  x: number
  y: number
  readonly width: number
  readonly height: number
  hp: number
  readonly maxHp: number
  facingRight = false
  active = false

  private sprites: SpriteSet | null = null
  private cooldown = 0
  private frameIndex = 0
  private frameTimer = 0

  readonly spriteSet: string
  readonly baseXp: number
  readonly monsterId: string | undefined
  readonly isBoss: boolean
  readonly sizeMultiplier: number
  readonly name: string
  private readonly walkSpeed: number
  private readonly attackCooldownMs: number
  private readonly attackRangePx: number

  constructor(
    x: number,
    y: number,
    hp = 80,
    spriteSet = 'zombie',
    baseXp = 8,
    monsterId: string | undefined = undefined,
    walkSpeed = DEFAULT_WALK_SPEED,
    attackCooldownMs = DEFAULT_ATTACK_COOLDOWN_MS,
    attackRange = DEFAULT_ATTACK_RANGE,
    isBoss = false,
    sizeMultiplier = 1.0,
    name = '',
  ) {
    this.x = x
    this.y = y
    this.hp = hp
    this.maxHp = hp
    this.spriteSet = spriteSet
    this.baseXp = baseXp
    this.monsterId = monsterId
    this.isBoss = isBoss
    this.sizeMultiplier = sizeMultiplier
    this.name = name
    this.walkSpeed = walkSpeed
    this.attackCooldownMs = attackCooldownMs
    this.attackRangePx = attackRange * GRID_SIZE
    this.width = Math.round(DRAW_SIZE * sizeMultiplier)
    this.height = Math.round(DRAW_SIZE * sizeMultiplier)
  }

  async load() {
    this.sprites = await loadSpriteSet('creatures', this.spriteSet)
  }

  get isDead() { return this.hp <= 0 }
  activate() { this.active = true }
  takeDamage(amount: number) { this.hp = Math.max(0, this.hp - amount) }

  update(dt: number, playerX: number, playerW: number): number {
    if (this.isDead || !this.active) return 0

    const ms = dt * 1000
    const pc = playerX + playerW / 2
    const mc = this.x + this.width / 2
    const dist = Math.abs(mc - pc)

    if (dist > this.attackRangePx) {
      const dir = pc < mc ? -1 : 1
      this.x += dir * this.walkSpeed * dt
      this.facingRight = dir > 0

      this.frameTimer += ms
      if (this.frameTimer >= 120) {
        this.frameTimer = 0
        const walkFrames = this.sprites?.walk ?? []
        this.frameIndex = walkFrames.length > 0
          ? (this.frameIndex + 1) % walkFrames.length
          : 0
      }
    }

    this.cooldown = Math.max(0, this.cooldown - ms)
    if (dist <= this.attackRangePx && this.cooldown === 0) {
      this.cooldown = this.attackCooldownMs
      return ATTACK_DAMAGE
    }
    return 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.sprites || this.isDead) return

    const frames = this.sprites.walk
    const frame = frames[Math.min(this.frameIndex, frames.length - 1)]
    if (!frame) return

    // Boss sprites grow upward from ground; shift y so base stays at ground
    const drawY = this.y - (this.height - DRAW_SIZE)

    ctx.save()
    if (this.facingRight) {
      ctx.drawImage(frame, this.x, drawY, this.width, this.height)
    } else {
      ctx.translate(this.x + this.width, drawY)
      ctx.scale(-1, 1)
      ctx.drawImage(frame, 0, 0, this.width, this.height)
    }
    ctx.restore()

    drawHpBar(ctx, this.x, drawY - 14, this.width, this.hp / this.maxHp, this.isBoss ? '#c0392b' : '#e74c3c')
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
