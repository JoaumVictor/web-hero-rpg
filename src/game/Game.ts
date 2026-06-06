import { InputHandler } from './engine/input'
import { Player } from './entities/Player'
import { Enemy } from './entities/Enemy'

const W = 800
const H = 420
const GROUND_Y = 290     // top of the ground line
const PLAYER_DAMAGE = 30

type Phase = 'loading' | 'playing' | 'won' | 'lost'

export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private input: InputHandler
  private player: Player
  private enemy: Enemy
  private phase: Phase = 'loading'
  private rafId = 0
  private lastTime = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    canvas.width = W
    canvas.height = H
    this.ctx = canvas.getContext('2d')!
    this.input = new InputHandler()
    // y position: ground minus character height
    this.player = new Player(60, GROUND_Y - 100, 100)
    this.enemy = new Enemy(610, GROUND_Y - 100, 80)
  }

  async start() {
    await Promise.all([this.player.load(), this.enemy.load()])
    this.phase = 'playing'
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private loop = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.update(dt)
    this.render()
    this.input.flush()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    if (this.phase !== 'playing') return

    let dx = 0
    if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) dx -= 1
    if (this.input.isDown('ArrowRight') || this.input.isDown('KeyD')) dx += 1

    if (this.input.wasPressed('Space') || this.input.wasPressed('KeyZ')) {
      this.player.startAttack()
    }

    this.player.update(dt, dx)

    // clamp player inside canvas
    this.player.x = Math.max(0, Math.min(W - this.player.width, this.player.x))

    // player hits enemy
    if (this.player.attackActive) {
      const pc = this.player.x + this.player.width / 2
      const ec = this.enemy.x + this.enemy.width / 2
      const dist = Math.abs(pc - ec)
      const facingEnemy = this.player.facingRight ? ec > pc : ec < pc
      if (dist <= this.player.attackRange && facingEnemy) {
        this.enemy.takeDamage(PLAYER_DAMAGE)
        this.player.markHitDealt()
      }
    }

    // enemy AI
    const dmg = this.enemy.update(dt, this.player.x, this.player.width)
    if (dmg > 0) this.player.takeDamage(dmg)

    if (this.enemy.isDead) this.phase = 'won'
    if (this.player.isDead) this.phase = 'lost'
  }

  private render() {
    const ctx = this.ctx

    // sky
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    // ground
    ctx.fillStyle = '#0f3460'
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y)
    ctx.fillStyle = '#533483'
    ctx.fillRect(0, GROUND_Y - 3, W, 6)

    this.player.draw(ctx)
    this.enemy.draw(ctx)

    this.renderHUD(ctx)

    if (this.phase === 'won') this.renderOverlay(ctx, 'VITÓRIA!', '#2ecc71')
    if (this.phase === 'lost') this.renderOverlay(ctx, 'DERROTA', '#e74c3c')
  }

  private renderHUD(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, H - 32, W, 32)
    ctx.fillStyle = '#aaa'
    ctx.font = '12px monospace'
    ctx.fillText('← → / A D  mover     ESPAÇO / Z  atacar', 16, H - 11)
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, text: string, color: string) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = color
    ctx.font = 'bold 56px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(text, W / 2, H / 2 - 10)
    ctx.fillStyle = '#888'
    ctx.font = '17px monospace'
    ctx.fillText('pressione F5 para reiniciar', W / 2, H / 2 + 36)
    ctx.textAlign = 'left'
  }

  destroy() {
    cancelAnimationFrame(this.rafId)
    this.input.destroy()
  }
}
