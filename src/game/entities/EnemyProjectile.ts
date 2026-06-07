export class EnemyProjectile {
  x: number
  y: number
  readonly vx: number
  readonly vy: number
  readonly damage: number
  active = true

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    speed = 380,
  ) {
    this.x = x
    this.y = y
    this.damage = damage
    const dx = targetX - x
    const dy = targetY - y
    const dist = Math.hypot(dx, dy) || 1
    this.vx = (dx / dist) * speed
    this.vy = (dy / dist) * speed
  }

  update(dt: number): void {
    this.x += this.vx * dt
    this.y += this.vy * dt
  }

  get isOffScreen(): boolean {
    return this.x < -200
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return

    // trail
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = '#0d2b0d'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.x - this.vx * 0.06, this.y - this.vy * 0.06)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()
    ctx.restore()

    // orb
    ctx.save()
    ctx.beginPath()
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#1a5c1a'
    ctx.fill()
    ctx.strokeStyle = '#27ae60'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }
}
