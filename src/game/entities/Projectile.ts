const SPEED = 520

export class Projectile {
  x: number
  y: number
  readonly vx: number
  readonly vy: number
  readonly damage: number
  active = true
  private readonly maxX: number
  private readonly minX: number

  constructor(x: number, y: number, targetX: number, targetY: number, damage: number, speed = SPEED) {
    this.x = x
    this.y = y
    this.damage = damage
    const dx = targetX - x
    const dy = targetY - y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    this.vx = (dx / dist) * speed
    this.vy = (dy / dist) * speed
    this.maxX = x + 900
    this.minX = x - 100
  }

  update(dt: number) {
    this.x += this.vx * dt
    this.y += this.vy * dt
  }

  get isOffScreen(): boolean {
    return this.x > this.maxX || this.x < this.minX
  }

  draw(ctx: CanvasRenderingContext2D) {
    const tailX = this.x - this.vx * 0.05
    const tailY = this.y - this.vy * 0.05

    // trail
    ctx.save()
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = '#f39c12'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()
    ctx.globalAlpha = 1

    // orb
    ctx.beginPath()
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#e67e22'
    ctx.fill()
    ctx.strokeStyle = '#f8c471'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }
}
