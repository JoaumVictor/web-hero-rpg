import { loadImage } from '../renderer/sprites'

const SPRITE = '/assets/characters/zombie/zombie-walk-1.png'
const SPEED = 65
const MELEE_RANGE = 90    // center-to-center to attack player
const ATTACK_COOLDOWN = 1400
const ATTACK_DAMAGE = 18
const DRAW_SIZE = 100

export class Enemy {
  x: number
  y: number
  readonly width = DRAW_SIZE
  readonly height = DRAW_SIZE
  hp: number
  readonly maxHp: number
  facingRight = false
  active = false           // starts inactive, activates when player approaches

  private sprite: HTMLImageElement | null = null
  private cooldown = 0

  constructor(x: number, y: number, hp = 80) {
    this.x = x
    this.y = y
    this.hp = hp
    this.maxHp = hp
  }

  async load() {
    this.sprite = await loadImage(SPRITE)
  }

  get isDead() { return this.hp <= 0 }

  activate() { this.active = true }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount)
  }

  // returns damage dealt to player this tick (0 if none)
  update(dt: number, playerX: number, playerW: number): number {
    if (this.isDead || !this.active) return 0

    const ms = dt * 1000
    const pc = playerX + playerW / 2
    const mc = this.x + this.width / 2
    const dist = Math.abs(mc - pc)

    if (dist > MELEE_RANGE) {
      const dir = pc < mc ? -1 : 1
      this.x += dir * SPEED * dt
      this.facingRight = dir > 0
    }

    this.cooldown = Math.max(0, this.cooldown - ms)
    if (dist <= MELEE_RANGE && this.cooldown === 0) {
      this.cooldown = ATTACK_COOLDOWN
      return ATTACK_DAMAGE
    }
    return 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.sprite || this.isDead) return

    ctx.save()
    if (this.facingRight) {
      ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height)
    } else {
      ctx.translate(this.x + this.width, this.y)
      ctx.scale(-1, 1)
      ctx.drawImage(this.sprite, 0, 0, this.width, this.height)
    }
    ctx.restore()

    drawHpBar(ctx, this.x, this.y - 14, this.width, this.hp / this.maxHp, '#e74c3c')
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
