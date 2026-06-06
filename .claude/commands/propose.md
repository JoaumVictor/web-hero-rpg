Planeja a próxima tarefa e cria um checklist antes de qualquer execução.

**Importante:** Não use a interface de "Implementation Plan" da IDE. Escreva tudo obrigatoriamente no arquivo `CURRENT_TASK.md` na raiz do projeto.

1. **Verifique tarefa ativa:** Se já existe um `CURRENT_TASK.md`, pergunte se deve pausar ou concluir antes de seguir.

2. **Leia o histórico:** Consulte `.claude/history/` — leia a entrada mais recente para entender o estado atual do projeto.

3. **Classifique a complexidade** do pedido antes de montar o plano:
   - 🟢 **Pequena** — mudança isolada em 1-2 arquivos, sem impacto em outros módulos (ex: ajuste de estilo, texto)
   - 🟡 **Média** — afeta 3-5 arquivos ou requer integração entre módulos
   - 🔴 **Grande** — afeta fluxos críticos, múltiplos módulos, banco de dados ou segurança. Divida em subtarefas com checkpoints separados.

4. **Monte o plano** com base na complexidade. Se houver link do Figma na instrução, anote-o claramente no `CURRENT_TASK.md`.

5. **Crie o `CURRENT_TASK.md`** com:
   - **Complexidade:** 🟢 Pequena / 🟡 Média / 🔴 Grande
   - **Checklist** de implementação (itens marcáveis com `[ ]`)
   - **Arquivos que serão afetados**
   - **Critério de aceite:** descrição objetiva de quando a tarefa estará 100% pronta (comportamento esperado, não apenas "código escrito")
   - **Variáveis de ambiente** necessárias (se houver)
   - **Link do Figma** (se houver)

6. **Apresente o plano** ao usuário e peça autorização para iniciar com `/dev`.
