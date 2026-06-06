# Web Hero RPG — Planejamento

Versão web do task-bar-hero. Stack: Next.js (App Router) + PostgreSQL + Docker.

---

## Stack técnica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR/SSG + API Routes no mesmo projeto |
| Renderização do game | Canvas (HTML5 / React Canvas) | Controle total de animação e input |
| Backend/API | Next.js API Routes ou Route Handlers | Sem servidor separado inicialmente |
| Banco de dados | PostgreSQL 16 | Dados relacionais: inventário, stats, progresso |
| ORM | Prisma | Type-safe, migrations limpas |
| Infra local | Docker Compose | Sobe Postgres + pgAdmin com um comando |
| Auth (futuro) | NextAuth.js | Sessão de usuário p/ salvar progresso |

---

## Ordem de implementação recomendada

### Fase 1 — Core Loop (mecanica do bonequinho)
> **Clonar isso primeiro.** Sem o core loop, nada faz sentido.

- [ ] Sprite sheet do personagem (walk, idle, attack, hurt, die)
- [ ] Loop de animação no Canvas (requestAnimationFrame)
- [ ] Input handler (teclado + touch para mobile)
- [ ] Personagem anda, pula (se necessário), ataca
- [ ] Inimigo básico com IA simples (patrol + aggro)
- [ ] Sistema de HP (herói e inimigo)
- [ ] Colisão ataque vs hitbox
- [ ] Condição de fase: todos os inimigos mortos = vitória
- [ ] Condição de derrota: HP zero

**Por que primeiro?** É o diferencial do jogo. Se o combate não der prazer, nada mais importa.

---

### Fase 2 — Mapa / Níveis
> Depois que o bonequinho funciona, você precisa de onde colocá-lo.

- [ ] Tile map simples (array 2D ou Tiled JSON)
- [ ] Renderer de tiles no Canvas
- [ ] Câmera que segue o personagem
- [ ] Colisão com terreno
- [ ] Spawn points de inimigos por fase
- [ ] Transição entre fases (portal / porta)
- [ ] Múltiplos mapas carregados do banco

---

### Fase 3 — Inventário / Baú
> Só faz sentido depois do mapa ter loot.

- [ ] Modelo de item no banco (tipo, raridade, stats)
- [ ] Baú no mapa que dropa itens
- [ ] UI de inventário (grid 2D clássico)
- [ ] Equipar item muda stats do personagem
- [ ] Persistência: inventário salvo no Postgres
- [ ] Sistema de gold / moeda

---

### Fase 4 — Progressão / Meta
- [ ] XP e level up
- [ ] Árvore de habilidades básica
- [ ] Salvar progresso por usuário (auth)
- [ ] Leaderboard

---

## Modelagem do banco (esboço inicial)

```sql
-- Usuário
users (id, email, created_at)

-- Personagem do usuário
characters (id, user_id, name, level, xp, hp_max, attack, defense)

-- Itens do jogo (catálogo)
items (id, name, type, rarity, stat_bonus JSONB, description)

-- Inventário do personagem
inventory (id, character_id, item_id, slot, quantity)

-- Fases / Mapas
stages (id, name, tilemap JSONB, enemy_spawns JSONB, order)

-- Progresso nas fases
stage_progress (id, character_id, stage_id, completed_at, stars)
```

> `JSONB` no Postgres para dados semi-estruturados (tilemap, spawns, stat_bonus) — o melhor dos dois mundos. Não precisa de MongoDB.

---

## Trade-offs discutidos

| Decisão | Escolha | Por quê | Custo |
|---|---|---|---|
| Renderização | Canvas puro | Controle total de animação, sem overhead de DOM | Mais código manual vs Phaser |
| Alternativa canvas | Phaser.js | Pronto com física, câmera, animações | Bundle maior, menos controle |
| Banco | PostgreSQL | Relacional = inventário/progressão limpos | Setup inicial vs Mongo que é plug-and-play |
| ORM | Prisma | Migrations automáticas + types | Overhead de build |
| Infra | Docker Compose | Dev local idêntico ao prod | Precisa ter Docker instalado |

---

## Estrutura de pastas (Next.js)

```
web-hero-rpg/
├── src/
│   ├── app/
│   │   ├── (game)/
│   │   │   └── play/page.tsx       ← tela do jogo
│   │   ├── api/
│   │   │   ├── character/route.ts
│   │   │   ├── inventory/route.ts
│   │   │   └── stages/route.ts
│   │   └── page.tsx                ← home / menu
│   ├── game/                       ← lógica do canvas separada do React
│   │   ├── engine/
│   │   │   ├── loop.ts
│   │   │   ├── input.ts
│   │   │   └── camera.ts
│   │   ├── entities/
│   │   │   ├── Player.ts
│   │   │   └── Enemy.ts
│   │   ├── systems/
│   │   │   ├── combat.ts
│   │   │   └── collision.ts
│   │   └── renderer/
│   │       ├── sprites.ts
│   │       └── tilemap.ts
│   ├── components/
│   │   ├── GameCanvas.tsx          ← wrapper React para o canvas
│   │   └── ui/
│   │       ├── HUD.tsx
│   │       └── Inventory.tsx
│   └── lib/
│       └── db.ts                   ← Prisma client singleton
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
└── .env.local
```

---

## Próximos passos imediatos

1. `npx create-next-app` + configurar TypeScript
2. `docker-compose.yml` com Postgres + pgAdmin
3. Prisma schema inicial (users + characters)
4. Canvas básico renderizando um sprite andando
5. Inimigo parado esperando o herói chegar

---

## Perguntas em aberto

- Usar Phaser.js ou Canvas puro? (Phaser acelera muito a fase 1)
- Mobile é prioridade? (muda o input handler completamente)
- Multiplayer está fora do escopo inicial?
