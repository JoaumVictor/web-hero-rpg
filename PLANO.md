# PLANO DE ARQUITETURA — HERO RPG WEB

> Documento vivo. Atualizar sempre que uma decisão for tomada.

---

## 1. VISÃO GERAL

Um idle RPG automático rodando no navegador, inspirado em task-bar-hero.  
O jogador monta um grupo de heróis, escolhe um mapa, e assiste (e gerencia) a batalha.  
Toda a progressão persiste no banco — upgrades, equipamentos, Xp, pets.

```
┌─────────────────────────────────────────────────────┐
│                    CAMADAS DO SISTEMA                │
├────────────────┬───────────────┬────────────────────┤
│  PRESENTATION  │    DOMAIN     │      DATA          │
│                │               │                    │
│  Canvas Engine │  Game Loop    │  PostgreSQL        │
│  React UI      │  Combat Calc  │  Prisma ORM        │
│  Admin Panel   │  AI Behavior  │  LocalStorage      │
│  Map Screen    │  Drop System  │  /public/assets/   │
└────────────────┴───────────────┴────────────────────┘
```

---

## 2. ARMAZENAMENTO DE IMAGENS

**Pergunta recorrente: "Consigo colocar imagens no PostgreSQL?"**

Sim, via coluna `bytea`. Mas NÃO faça isso. Motivos:
- Queries ficam lentas (banco trafega binário em vez de só metadados)
- Backup do banco fica gigante
- Sem cache HTTP nativo (imagem re-baixada a cada render)
- Sem CDN possível no futuro

**Abordagem correta:**

```
Dev:        /public/assets/[tipo]/[nome]/[animação]/frame-N.png
Produção:   Cloudflare R2 / AWS S3 (mesmo conceito, URL externa)
```

O banco armazena apenas o **path relativo** como string.  
O admin faz upload via `multipart/form-data` → Next.js API salva em `/public/assets/` → salva path no DB.

---

## 3. SISTEMA DE SPRITES E ANIMAÇÕES

### 3.1 Estados de animação (por entidade)

| Estado       | Herói | Monstro | Boss | Pet |
|--------------|:-----:|:-------:|:----:|:---:|
| `idle`       | ✓     | ✓       | ✓    | ✓   |
| `walk`       | ✓     | ✓       | ✓    | ✓   |
| `run`        | ✓     | -       | -    | -   |
| `attack`     | ✓     | ✓       | ✓    | -   |
| `hurt`       | ✓     | ✓       | ✓    | -   |
| `death`      | ✓     | ✓       | ✓    | -   |
| `fly`        | -     | ✓       | ✓    | ✓   |
| `special`    | ✓     | -       | ✓    | -   |
| `buff`       | -     | -       | ✓    | ✓   |

### 3.2 Schema de sprites no admin

```
EntitySprite
  - entityType: "hero" | "monster" | "pet"
  - entityId: FK
  - animState: "idle" | "walk" | "attack" | "death" | ...
  - frames: SpriteFrame[]

SpriteFrame
  - spriteId: FK
  - order: Int
  - imagePath: String   ← caminho em /public/assets/
  - duration: Int       ← ms por frame (padrão 120ms)
```

### 3.3 Admin de sprites (UX pensada)

```
┌─────────────────────────────────────────────────────┐
│  MONSTRO: Zumbi Guerreiro                           │
├──────────────┬──────────────────────────────────────┤
│  ANIMAÇÕES   │  walk  [+frame] [preview ▶]          │
│              │  ┌──┐ ┌──┐ ┌──┐ ┌──┐                │
│  idle    ●   │  │f1│ │f2│ │f3│ │  │ ← drag aqui    │
│  walk    ●   │  └──┘ └──┘ └──┘ └──┘                │
│  attack  ●   │  Velocidade: [120ms/frame]           │
│  death   ○   │                                      │
│  hurt    ○   │  attack [+frame] [preview ▶]         │
└──────────────┴──────────────────────────────────────┘
```

---

## 4. SISTEMA DE MONSTROS

### 4.1 Tipos base (enum, define fraquezas e resistências)

```
UNDEAD      fraco: Fogo, Luz       resist: Veneno, Frio
ELEMENTAL   fraco: tipo oposto     resist: próprio tipo
BEAST       fraco: Trovão          resist: Veneno
DEMON       fraco: Luz, Sagrado    resist: Fogo, Trevas
HUMAN       sem fraqueza especial  resist: -
CONSTRUCT   fraco: Trovão          resist: Corte, Perfuração
```

### 4.2 Comportamentos de ataque (presets em código TypeScript)

Estes NÃO ficam no banco como lógica — ficam como nomes selecionáveis no admin:

| Preset              | Comportamento                                      |
|---------------------|----------------------------------------------------|
| `MELEE`             | Caminha até o range, ataca corpo-a-corpo           |
| `RANGED_PROJECTILE` | Para no range, lança projétil que some no 1º hit   |
| `PIERCING_SHOT`     | Projétil atravessa todos os heróis                 |
| `AOE_FRONTAL`       | Dano em cone à frente (ex: bafo de dragão)         |
| `AOE_CIRCLE`        | Dano em círculo ao redor (ex: explosão de boss)    |
| `CHARGE`            | Dashes para frente causando dano em linha          |
| `SUMMON`            | Invoca N monstros do tipo especificado             |
| `DEBUFF_SLOW`       | Projétil que aplica slow por X segundos            |
| `DEBUFF_POISON`     | Ataque que aplica dano por tempo (veneno)          |
| `LEECH`             | Ataque corpo-a-corpo rouba HP                      |

O admin expõe um **select** com esses nomes. Novos comportamentos = novo código + novo item no select.

### 4.3 Bosses vs monstros comuns

```
Monster
  - isBoss: Boolean
  - sizeMultiplier: Float  ← 1.0 normal, 2.5 boss grande, 4.0 boss enorme
  - attackBehavior: String ← nome do preset
  - secondaryBehavior: String? ← boss pode ter 2 padrões
  - behaviorSwitchHpPct: Float? ← muda comportamento em X% de HP
```

Exemplo: boss muda de `MELEE` para `AOE_CIRCLE` quando chega a 30% de HP.

---

## 5. SISTEMA DE HERÓIS

### 5.1 Classes de herói (exemplos iniciais)

| Classe    | Role       | Posição preferida | Ataque base |
|-----------|------------|-------------------|-------------|
| Guerreiro | Tank/DPS   | Frente            | MELEE       |
| Arqueiro  | DPS ranged | Meio              | RANGED      |
| Mago      | AoE DPS    | Fundo             | AOE         |
| Clérigo   | Heal/supp  | Fundo             | BUFF_HEAL   |
| Assassino | DPS burst  | Frente/Meio       | MELEE_FAST  |

### 5.2 Schema de herói

```
Hero (template — fica no código/admin)
  - name, class, spritePath
  - baseHp, baseAttack, baseDefense
  - baseAttackCooldown, baseWalkSpeed
  - attackBehavior

HeroInstance (por conta de jogador)
  - playerId FK
  - heroId FK
  - level: Int, xp: Int, xpToNext: Int
  - groupPosition: Int (0=frente, 1=meio, 2=fundo)
  - isInGroup: Boolean
  - equipment: Equipment[]
  - skillUnlocks: HeroSkillUnlock[]
```

### 5.3 Sistema de XP

```
Monstro morto → XP distribuído entre heróis no grupo
XP por monstro = baseXp * levelMult * rarity_bonus
Level up → recalcula stats com curva de crescimento
Curva sugerida: xpToNext = 100 * (level ^ 1.5)
```

---

## 6. SISTEMA DE ÁRVORE DE HABILIDADES

### 6.1 Árvore Global (compartilhada entre todos os heróis)

Inspiração: Path of Exile passive tree, mas menor.

```
SkillNode (nó da árvore)
  - id, name, description
  - type: "passive_stat" | "active_buff" | "unlock_mechanic"
  - statBonus: Json  ← { "allAttack": 5, "allHp": 10 }
  - costCoins: Int
  - prerequisites: SkillNode[]  ← DAG (directed acyclic graph)
  - position: { x, y }  ← posição visual na árvore

PlayerSkillUnlock
  - playerId FK
  - nodeId FK
  - unlockedAt
```

Exemplos de nós globais:
- "Fúria dos Guerreiros" → +5% ATK para todos
- "Escudo Eterno" → +10% DEF para todos
- "Ganância" → +1 moeda por kill
- "Ressurreição" → herói morto revive após 30s (desbloqueia mecânica)

### 6.2 Árvore Individual (por HeroInstance)

```
HeroSkillTree (template por classe)
  - heroClass: String
  - nodes: HeroSkillNode[]

HeroSkillNode
  - name, description
  - requiredLevel: Int  ← precisa de nível X no herói
  - costXp: Int
  - statBonus: Json   ← { "attack": 3 } (só para este herói)
  - prerequisites: HeroSkillNode[]

HeroSkillUnlock (o que o jogador desbloqueou)
  - heroInstanceId FK
  - nodeId FK
```

---

## 7. SISTEMA DE ITENS E EQUIPAMENTOS

### 7.1 Slots de equipamento por herói

```
HEAD        → Elmo
CHEST       → Peitoral
PANTS       → Calça
BOOTS       → Botas
GLOVES      → Luvas
MAINHAND    → Espada / Cajado / Arco
OFFHAND     → Escudo / Adaga / Focus
CAPE        → Capa
RING_LEFT   → Anel esquerdo
RING_RIGHT  → Anel direito
BRACELET    → Bracelete
```

### 7.2 Schema de items

```
Item (template)
  - name, description
  - type: ItemType (WEAPON, ARMOR, etc.)
  - equipSlot: EquipSlot
  - rarity: COMMON | UNCOMMON | RARE | LEGENDARY
  - baseStats: Json   ← { "attack": 5, "defense": 2 }
  - socketCount: Int  ← quantas joias cabem (0-4)
  - requiredLevel: Int
  - requiredClass: String? ← null = qualquer herói
  - iconPath: String

InventoryItem (instância no inventário do jogador)
  - playerId FK
  - itemId FK
  - sockets: SocketedGem[]  ← joias encravadas

SocketedGem
  - inventoryItemId FK
  - gemId FK
  - slotIndex: Int  ← posição do socket (0,1,2,3)

Equipment (o que está equipado no herói)
  - heroInstanceId FK
  - slot: EquipSlot
  - inventoryItemId FK (nullable = slot vazio)
```

### 7.3 Sistema de joias

```
Gem (template)
  - name, iconPath
  - gemType: FIRE | ICE | LIGHTNING | POISON | HOLY | DARK | NEUTRAL
  - rarity: COMMON | UNCOMMON | RARE | LEGENDARY
  - bonusStats: Json  ← { "fireResistance": 15, "attackSpeed": 5 }
  - description: String  ← "Joia de Rubi: +15% resist. fogo, +5% vel. ataque"
```

Exemplo de combo:
- Peitoral + 3 joias de rubi → "Peitoral Flamejante" (efeito visual no sprite)
- Cajado + joia sagrada → causa dano extra em Undead

### 7.4 Loot tables (drops por monstro/boss)

```
LootTable
  - monsterId FK (ou null = global)
  - entries: LootEntry[]

LootEntry
  - itemId FK
  - dropChance: Float   ← 0.0 a 1.0
  - minQuantity, maxQuantity
  - requiredRoundMin: Int?  ← só dropa a partir do round X
```

---

## 8. SISTEMA DE BÁUS

### 8.1 Tipos de drop por raridade

| Raridade  | Cor    | Itens possíveis             | Visual          |
|-----------|--------|-----------------------------|-----------------|
| COMMON    | Cinza  | Equipamentos C, moedas      | Baú de madeira  |
| UNCOMMON  | Verde  | Equipamentos C/I, joias C   | Baú de ferro    |
| RARE      | Azul   | Equipamentos I/R, joias I   | Baú de ouro     |
| LEGENDARY | Dourado| Equipamentos R/L, joias R/L | Baú reluzente   |

### 8.2 Fluxo de drop de báu

```
Fim de onda → rola dado para cada raridade (do mais raro ao mais comum)
→ se rolar → spawna báu no mundo (entidade clicável no canvas)
→ herói chega perto → animação de abrir
→ mostra modal com o item recebido
→ item vai para o inventário do jogador
```

Configurado no admin por round: `chestCommonChance`, `chestRareChance`, etc. (já temos no schema).

---

## 9. SISTEMA DE MAPA

### 9.1 Estrutura hierárquica

```
World (ex: "Reino dos Mortos")
  └── Zone (ex: "Floresta Sombria")
        └── Level (ex: "Caverna dos Zumbis — Nível 3")
              └── Round (ondas de monstros)
```

### 9.2 Schema

```
World
  - name, description
  - backgroundPath
  - order: Int

Zone
  - worldId FK
  - name, description
  - order: Int
  - unlockRequirement: Json?  ← { "level": 5, "completedZone": "id" }

Level
  - zoneId FK
  - name, number
  - roundId FK  ← reutiliza o sistema de Round existente
  - recommendedLevel: Int
  - backgroundPath  ← parallax específico do nível
  - musicPath?
  - isUnlocked: Boolean (calculado por progresso)

PlayerLevelProgress
  - playerId FK
  - levelId FK
  - stars: 0-3   ← 3 estrelas se passou sem morrer, etc.
  - bestTime: Int
  - completedAt
```

### 9.3 Tela de mapa (UI)

```
┌────────────────────────────────────────────────────┐
│  MUNDO 1: REINO DOS MORTOS                         │
│                                                    │
│  [Zona 1: Floresta] → [Zona 2: Pântano] → [BOSS]  │
│       ●●●●○                ●●○○○          🔒       │
│                                                    │
│  Zona 1 - Floresta Sombria                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│  │ 1★★│ │ 2★★│ │ 3★○│ │ 4🔒│ │ 5🔒│              │
│  └────┘ └────┘ └────┘ └────┘ └────┘              │
│                                                    │
│  [JOGAR NÍVEL 3]  Rec. Nível 8                     │
└────────────────────────────────────────────────────┘
```

---

## 10. SISTEMA DE GRUPO (FORMAÇÃO)

### 10.1 Fileira de batalha

```
FRENTE (posição 0-1):  Recebe 100% do dano de monstros melee
                       +10% DEF aplicado
MEIO   (posição 2-3):  Recebe 60% do dano (bloqueado pela frente)
                       Balanceado
FUNDO  (posição 4-5):  Recebe 30% do dano
                       +20% bonus de ataque a distância
```

### 10.2 Schema

```
PlayerGroup
  - playerId FK
  - name: String (pode ter múltiplos grupos salvos)
  - slots: GroupSlot[]

GroupSlot
  - groupId FK
  - position: Int  (0-5)
  - heroInstanceId FK?  ← null = posição vazia
```

---

## 11. SISTEMA DE PETS

```
Pet (template)
  - name, description
  - rarity: COMMON | RARE | LEGENDARY
  - spritePath
  - buffType: "PASSIVE_STAT" | "AURA" | "ACTIVE_SKILL"
  - buffStats: Json  ← { "allAttack": 8, "coinBonus": 0.1 }
  - description: String

PlayerPet
  - playerId FK
  - petId FK
  - isActive: Boolean  ← só 1 ativo por vez (ou configurável)
  - level: Int, xp: Int  ← pets também sobem de nível
```

Exemplos de pets:
- **Corvo Sombrio** (Raro): +10% XP ganho pelo grupo
- **Dragãozinho** (Lendário): aura de fogo que causa 5 dano/s em todos os inimigos
- **Slime Dourado** (Incomum): +15% de moedas dropadas

---

## 12. SISTEMA DE CONTA DO JOGADOR

Hoje usamos `sessionId` no localStorage. Precisamos evoluir.

### 12.1 Fluxo sugerido (sem complicar)

```
Dev agora:    sessionId anônimo (já existe, funciona)
Próximo passo: auth simples com Google OAuth (NextAuth.js)
               → associa sessionId ao userId automaticamente
               → progresso migra sem perder nada
```

### 12.2 Schema de Player (evolução do PlayerProgress)

```
Player
  - id FK (session ou userId)
  - coins: Int
  - heroInstances: HeroInstance[]
  - inventory: InventoryItem[]
  - pets: PlayerPet[]
  - groups: PlayerGroup[]
  - skillUnlocks: PlayerSkillUnlock[]
  - levelProgress: PlayerLevelProgress[]
```

---

## 13. BANCO DE DADOS — RESUMO DO SCHEMA COMPLETO

### Tabelas a criar (o que ainda não existe)

```
Novas:
  SpriteFrame          ← frames de animação por entidade
  World, Zone, Level   ← hierarquia de mapa
  PlayerLevelProgress  ← progresso por nível
  HeroInstance         ← herói do jogador (com XP, equip)
  Equipment            ← o que está equipado em cada slot
  InventoryItem        ← itens no inventário (já existe parcialmente)
  Gem                  ← joias
  SocketedGem          ← joia encravada em item
  LootTable            ← tabela de drops por monstro
  LootEntry            ← entrada individual de drop
  SkillNode            ← nó da árvore global
  PlayerSkillUnlock    ← nó desbloqueado pelo jogador
  HeroSkillNode        ← nó individual por classe
  HeroSkillUnlock      ← nó individual desbloqueado
  Pet                  ← template de pet
  PlayerPet            ← pet do jogador
  PlayerGroup          ← grupo salvo
  GroupSlot            ← posição no grupo

Modificar:
  Monster              ← adicionar: sizeMultiplier, monsterType, attackBehavior,
                          secondaryBehavior, behaviorSwitchHpPct, isBoss
  Hero                 ← virar template, criar HeroInstance separado
  Round                ← adicionar: levelId FK (associar a um nível do mapa)
  PlayerProgress       ← virar Player (expandir campos)
  Item                 ← adicionar: equipSlot, socketCount, requiredLevel, requiredClass
```

---

## 14. ORDEM DE IMPLEMENTAÇÃO SUGERIDA

```
FASE 1 — Engine sólida (agora)
  [✓] Canvas game loop
  [✓] Herói caminhando + animações
  [✓] Ondas de monstros
  [✓] Moedas persistidas
  [✓] Inventário/báu (UI)
  [ ] Upload de sprites no admin
  [ ] Comportamentos de ataque (presets de código)

FASE 2 — Progressão básica
  [ ] Sistema de conta (Player expandido)
  [ ] HeroInstance com XP e level up
  [ ] Equipamentos e slots
  [ ] Drops de itens por monstro morto
  [ ] Báu abrível no canvas

FASE 3 — Mapa e mundo
  [ ] Tela de seleção de mapa
  [ ] Hierarquia World > Zone > Level
  [ ] Estrelas por nível
  [ ] Unlock de níveis

FASE 4 — Profundidade
  [ ] Árvore de habilidades global
  [ ] Árvore individual por herói
  [ ] Sistema de joias/sockets
  [ ] Tipos de monstros e resistências
  [ ] Pets

FASE 5 — Conteúdo e polish
  [ ] Bosses com múltiplos comportamentos
  [ ] Múltiplos mundos
  [ ] Auth (Google OAuth)
  [ ] Sistema de grupo (formação)
```

---

## 15. SISTEMA DE GRID DE COMBATE ← DECISÃO ARQUITETURAL CENTRAL

### 15.1 Conceito

A janela do jogo (800px) é dividida em **8 colunas de 100px** — usadas como unidade de medida.

```
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ G0 │ G1 │ G2 │ G3 │ G4 │ G5 │ G6 │ G7 │
└────┴────┴────┴────┴────┴────┴────┴────┘
 100px cada coluna = 800px total
```

**O grid NÃO é um sistema de tile/slot exclusivo.**
- Múltiplas entidades podem estar no mesmo grid ao mesmo tempo
- O movimento continua sendo pixel contínuo (sem snapping)
- `gridX` é calculado em tempo real: `Math.floor(entity.x / 100)`
- O grid é usado **apenas** para calcular alcance de habilidades e efeitos de área

**O que usa pixel distance (comportamento padrão):**
- Ataque normal do herói → bate no inimigo mais próximo por distância real
- Pathfinding de aproximação → entidades se movem em pixels

**O que usa grid (habilidades e efeitos):**
- Alcance de magia: "acerta tudo nos próximos 2 grids"
- Knockback: "empurra todos no mesmo grid 1 coluna pra trás"
- Teleporte: "move para o grid 0"
- Buff de aura: "afeta aliados dentro de 1 grid de distância"

### 15.2 Zonas do grid

```
G0      → reserva / overflow (entidades saindo de cena)
G1–G3   → zona dos heróis (formação de até 3 heróis)
G4      → zona neutra / buffer
G5–G7   → zona dos inimigos (chegam pela direita)
```

Formação padrão com 3 heróis:
```
G1 = herói tanque (frente)     recebe 100% dano inimigo
G2 = herói meio                recebe 60% dano
G3 = herói fundo (mago/arq.)   recebe 30% dano, +20% ATK ranged
```

### 15.3 Alcance de ataque em grids

| Tipo de ataque     | Alcance | Descrição                             |
|--------------------|---------|---------------------------------------|
| Melee              | 1 grid  | Apenas o grid adjacente               |
| Lança / Espeto     | 2 grids | Dois grids à frente                   |
| Projétil normal    | até G7  | Viaja até o primeiro alvo e some      |
| Piercing           | até G7  | Atravessa todos os alvos              |
| AOE frontal (cone) | 2 grids | G_atual+1 e G_atual+2                 |
| AOE círculo        | raio 1  | Grid atual ±1                         |
| AOE tela inteira   | G0–G7   | Boss rage: atinge tudo                |

### 15.4 Habilidades reativas — exemplos reais

```ts
// Arqueiro recua 1 grid quando herói chega no grid adjacente (1 vez por combate)
if (hero.gridX === archer.gridX - 1 && !archer.backstepUsed) {
  archer.moveToGrid(archer.gridX + 1)
  archer.triggerBackstabCrit()
  archer.backstepUsed = true
}

// Boss empurra todos os heróis 1 grid para trás (habilidade de choque)
heroes.forEach(h => h.moveToGrid(Math.max(0, h.gridX - 1)))

// Mago teleporta para o fundo se inimigo entrar no grid dele
if (enemy.gridX <= mage.gridX) {
  mage.teleportToGrid(0)
}

// AOE de dragão atinge grids 2 a 4
const targets = entities.filter(e => e.gridX >= 2 && e.gridX <= 4)
targets.forEach(e => e.takeDamage(dragonBreathDmg))
```

### 15.5 Como gridX funciona na prática

```ts
// NÃO é armazenado na entidade — é calculado on the fly
get gridX(): number {
  return Math.floor(this.x / GRID_SIZE)  // GRID_SIZE = 100
}

// Ataque padrão: alvo mais próximo por pixel (ignora grid)
const target = enemies
  .filter(e => e.x > hero.x)
  .sort((a, b) => a.x - b.x)[0]

// Habilidade AoE: usa grid para definir a área
const aoeTargets = enemies.filter(e =>
  e.gridX >= caster.gridX + 1 &&
  e.gridX <= caster.gridX + aoeRange  // aoeRange em grids, ex: 2
)

// Knockback: todos no mesmo grid recuam 100px
const inSameGrid = entities.filter(e => e.gridX === attacker.gridX)
inSameGrid.forEach(e => e.x -= GRID_SIZE)
```

### 15.6 Impacto no schema

```
Monster:  attackRange    Int   (em grids, default 1)
          aoeRange       Int?  (raio em grids, null = sem AoE)
          knockback      Int?  (grids de recuo ao ser atingido)
Hero:     attackRange    Int   (definido pela classe)
Item:     rangeBonus     Int?  (equipamentos podem aumentar alcance)
```

---

## 16. DECISÕES TÉCNICAS

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Imagens no DB? | NÃO — filesystem `/public/assets/` | Performance, cache HTTP |
| Scripting de comportamento? | NÃO — presets TypeScript nomeados | Manutenível, type-safe |
| Auth agora? | NÃO — sessionId anônimo | Não bloquear dev |
| Phaser? | NÃO — Canvas puro | Controle total, bundle menor |
| State global client? | Zustand (quando necessário) | Simples, sem boilerplate |
| Upload de sprites | multipart → `/public/assets/` | Simples para dev local |
| Posicionamento | **Grid screen-space 8×100px** | Habilidades em grids, não pixels |
| Heróis desbloqueáveis | SIM — comprados com moedas | Progressão econômica |
| Limite grupo | **3 heróis** | Encaixa nas zonas G1–G3 |
| Pets no grupo | **2 máximo** — desbloqueados por moedas (late game) | |
| PvP | NÃO — PvE sempre | |
| Itens ao morrer | **Permanentes** | |
| Craft | **Futuro** — desmanchar + combinar + vender | |

---

## 17. PERGUNTAS RESOLVIDAS

- [x] Heróis comprados com moedas
- [x] Grupo máximo: 3 heróis (G1, G2, G3)
- [x] Pets: 2 no grupo, desbloqueados por moedas (late game)
- [x] PvP: não existe
- [x] Itens: permanentes
- [x] Craft: haverá no futuro (desmanchar, combinar, vender)
- [x] Posicionamento: grid 8×100px screen-space
