export type HeroBase = {
  hp: number
  attack: number
  defense: number
  attackCooldown: number
  walkSpeed: number
  attackRange: number
}

export type EquippedItem = {
  statBonus: Record<string, number>
}

export type HeroStats = HeroBase

export function computeStats(base: HeroBase, level: number, equipment: EquippedItem[]): HeroStats {
  const lv = level - 1
  let hp = base.hp + lv * 2
  let attack = base.attack + lv * 0.5
  let defense = base.defense + Math.floor(lv * 0.3)
  const { attackCooldown, walkSpeed, attackRange } = base

  for (const equip of equipment) {
    const bonus = equip.statBonus
    if (bonus.hp)      hp      += bonus.hp
    if (bonus.attack)  attack  += bonus.attack
    if (bonus.defense) defense += bonus.defense
  }

  return {
    hp:             Math.round(hp),
    attack:         Math.round(attack * 10) / 10,
    defense:        Math.round(defense),
    attackCooldown,
    walkSpeed,
    attackRange,
  }
}
