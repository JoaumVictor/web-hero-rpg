export class InputHandler {
  private held = new Set<string>()
  private pressed = new Set<string>()
  private onDown: (e: KeyboardEvent) => void
  private onUp: (e: KeyboardEvent) => void

  constructor() {
    this.onDown = (e) => {
      if (!this.held.has(e.code)) this.pressed.add(e.code)
      this.held.add(e.code)
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code))
        e.preventDefault()
    }
    this.onUp = (e) => this.held.delete(e.code)
    window.addEventListener('keydown', this.onDown)
    window.addEventListener('keyup', this.onUp)
  }

  isDown(code: string) { return this.held.has(code) }
  wasPressed(code: string) { return this.pressed.has(code) }

  flush() { this.pressed.clear() }

  destroy() {
    window.removeEventListener('keydown', this.onDown)
    window.removeEventListener('keyup', this.onUp)
  }
}
