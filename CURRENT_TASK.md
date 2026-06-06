# CURRENT TASK — FASE 2: Sistema de XP e Level Up

**Complexidade:** 🔴 Grande
**Origem:** PLANO.md § 5.3, § 14 (FASE 2 — Progressão básica)

---

## Contexto

O schema `HeroInstance` já existe com campos `level` e `xp`.
Os monstros já têm `id`, `hp`, `attack` etc., mas **não têm `baseXp`** ainda.
O `Game.ts` já emite evento de morte de inimigo — precisa usar para chamar a API de XP.

---

## Checklist

### Checkpoint 1 — Schema e API de XP
- [ ] Adicionar `baseXp Int @default(10)` ao model `Monster` no schema.prisma
- [ ] Rodar `npx prisma db push` para aplicar
- [ ] Atualizar seed: Zumbi com `baseXp: 8`
- [ ] Criar `POST /api/combat/kill` que recebe `{ playerId, monsterId, levelMult? }` e:
  - Busca heroes do grupo do player (`groupPosition != null`)
  - Calcula `xpGained = monster.baseXp * (levelMult ?? 1)`
  - Distribui XP igualmente entre os heróis do grupo
  - Sobe de nível se `xp >= xpToNext` (fórmula: `Math.round(100 * level ** 1.5)`)
  - No level up: incrementa `level`, zera `xp`, retorna `{ levelUps: [{ heroName, newLevel }] }`
  - Retorna `{ xpGained, heroes: [{ id, name, level, xp, xpToNext }] }`

### Checkpoint 2 — Integração no motor de jogo
- [ ] `Enemy.ts`: no callback `onDeath`, chamar `POST /api/combat/kill` (fire-and-forget, sem bloquear o loop)
- [ ] Criar `src/game/renderer/FloatingText.ts` — texto animado que sobe e some ("+8 XP", "LEVEL UP!")
- [ ] `Game.ts`: integrar lista de `FloatingText[]`, renderizar no `draw()`
- [ ] Na resposta da API: se houver `levelUps`, spawnar FloatingText "LEVEL UP!" em cima do herói

### Checkpoint 3 — HUD e UI
- [ ] `GameCanvas.tsx` ou overlay React: mostrar nível atual de cada herói do grupo (badge pequeno sob o sprite)
- [ ] `/heroes/page.tsx`: mostrar barra de XP (xp atual / xpToNext) em cada herói owned
- [ ] Escala de stats por nível: `hp = base.hp + (level-1)*2`, `attack = base.attack + (level-1)*0.5` (arredondado) — aplicar na exibição e passar para a entidade `Player.ts` no momento de criar o herói no canvas

---

## Arquivos que serão afetados

- `prisma/schema.prisma` (modificar Monster)
- `prisma/seed.ts` (atualizar Zumbi com baseXp)
- `src/app/api/combat/kill/route.ts` (criar)
- `src/game/entities/Enemy.ts` (chamar API no onDeath)
- `src/game/renderer/FloatingText.ts` (criar)
- `src/game/Game.ts` (integrar FloatingText)
- `src/components/GameCanvas.tsx` (HUD de nível)
- `src/app/heroes/page.tsx` (barra de XP)
- `src/game/entities/Player.ts` (receber stats escalados por nível)

---

## Critério de aceite

1. Monstro morre no canvas → hero do grupo recebe XP → banco atualiza `HeroInstance.xp`
2. XP suficiente → level up acontece → `HeroInstance.level` incrementa no banco
3. Texto `+X XP` flutua no canvas no ponto de morte do monstro
4. Texto `LEVEL UP!` aparece sobre o herói que subiu de nível
5. Página `/heroes` mostra barra de XP e nível atual de cada herói
6. `npx tsc --noEmit` passa sem erros

---

## Variáveis de ambiente

Nenhuma nova — usa `DATABASE_URL` já configurada.
