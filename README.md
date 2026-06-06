# Web Hero RPG

RPG de ação side-scrolling rodando no browser. O herói atravessa um mundo 2D, combatendo inimigos em tempo real com animações baseadas em sprite sheets, tudo renderizado via Canvas HTML5 dentro de uma aplicação Next.js.

---

## Stack

| Camada               | Tecnologia                |
| -------------------- | ------------------------- |
| Frontend / Framework | Next.js 16 (App Router)   |
| Renderização do game | Canvas HTML5 (sem Phaser) |
| Linguagem            | TypeScript                |
| Estilos              | Tailwind CSS v4           |
| Banco de dados       | PostgreSQL 16             |
| ORM                  | Prisma                    |
| Infra local          | Docker Compose            |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (para o banco de dados)

---

## Rodando localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir o banco de dados

```bash
docker-compose up -d
```

Isso sobe:

- **PostgreSQL 16** em `localhost:5432`
- **pgAdmin 4** em `http://localhost:5050` (login: `admin@hero.local` / `admin`)

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
DATABASE_URL="postgresql://hero:hero_secret@localhost:5432/hero_rpg"
```

### 4. Rodar as migrations

```bash
npx prisma migrate deploy
```

### 5. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000/play` para jogar.

---

## Como jogar

| Tecla     | Ação                  |
| --------- | --------------------- |
| `A` / `←` | Mover para a esquerda |
| `D` / `→` | Mover para a direita  |
| `J` / `Z` | Atacar                |

O herói auto-ataca inimigos dentro do alcance. Derrote todos os 10 inimigos para vencer a fase. Se o HP chegar a zero, é game over.

---

## Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx          ← menu principal
│   └── play/page.tsx     ← tela do jogo
├── game/
│   ├── Game.ts           ← loop principal e câmera
│   ├── engine/
│   │   └── input.ts      ← handler de teclado
│   ├── entities/
│   │   ├── Player.ts
│   │   └── Enemy.ts
│   └── renderer/
│       └── sprites.ts    ← carregamento e animação de sprites
├── components/
│   └── GameCanvas.tsx    ← wrapper React para o canvas
└── lib/
    └── db.ts             ← Prisma client singleton
prisma/
└── schema.prisma         ← modelos: User, Character, Item, Inventory, Stage
```

---

## Roadmap

- [x] **Fase 1 — Core Loop**: herói animado, inimigos, combate, câmera, condições de vitória/derrota
- [ ] **Fase 2 — Mapas**: tile map, colisão com terreno, transição entre fases
- [ ] **Fase 3 — Inventário**: itens, baús, equipamentos, persistência no banco
- [ ] **Fase 4 — Progressão**: XP, level up, autenticação, leaderboard

---

## Scripts disponíveis

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run start    # inicia o build de produção
npm run lint     # lint com ESLint
```
