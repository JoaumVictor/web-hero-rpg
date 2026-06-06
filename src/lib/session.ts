const PLAYER_ID_KEY = 'hero-rpg-player-id'
const EMAIL_KEY = 'hero-rpg-email'
const COINS_KEY = 'hero-rpg-coins'

export function getPlayerId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(PLAYER_ID_KEY)
}

export function getPlayerEmail(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(EMAIL_KEY)
}

export function getLocalCoins(): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(COINS_KEY) ?? '0', 10) || 0
}

export function setLocalCoins(coins: number) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(COINS_KEY, String(coins))
}

export function saveSession(playerId: string, email: string, coins: number) {
  localStorage.setItem(PLAYER_ID_KEY, playerId)
  localStorage.setItem(EMAIL_KEY, email)
  localStorage.setItem(COINS_KEY, String(coins))
}

export function clearSession() {
  localStorage.removeItem(PLAYER_ID_KEY)
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(COINS_KEY)
}
