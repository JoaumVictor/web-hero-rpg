# 🤖 Agentes de IA do Projeto (Antigravity)

Bem-vindo ao workflow inteligente deste projeto! Para manter a consistência, segurança e produtividade, utilizamos um conjunto de agentes customizados.

## 🚀 Como usar os comandos

Digite os comandos abaixo no chat da sua IDE para acionar os agentes:

| Comando         | O que ele faz?                                            | Quando usar?                                                    |
| :-------------- | :-------------------------------------------------------- | :-------------------------------------------------------------- |
| **`/analyze`**  | Mapeia a arquitetura e tecnologias do projeto.            | Na primeira vez que abrir o projeto ou após grandes mudanças.   |
| **`/propose`**  | Cria um plano de ação (checklist) em `CURRENT_TASK.md`.   | Antes de começar qualquer nova funcionalidade ou correção.      |
| **`/dev`**      | Executa o código baseado no plano e gera logs de memória. | Após o `/propose` ter sido aprovado por você.                   |
| **`/refactor`** | Melhora a legibilidade e performance sem mudar a lógica.  | Quando o código estiver funcionando, mas precisar de um "tapa". |
| **`/commit`**   | Revisa a segurança (.envs) e sugere a mensagem de commit. | Sempre antes de dar um `git commit`.                            |

## 🛡️ Regras de Ouro (Segurança & Padrão)

- **Zero Secrets:** Nunca suba arquivos `.env` ou chaves de API hardcoded.
- **Memória:** Os agentes consultam a pasta `.claude/history/` para economizar tokens e entender o contexto das últimas tarefas.
- **Idiomas:** Os agentes sempre respondem em **Português (BR)**.
- **Commits:** Seguimos estritamente o padrão **Conventional Commits**.

## 🧠 Memória de Longo Prazo

Este projeto utiliza um sistema de "Git Interno" na pasta `.agent/history/`. Isso permite que a IA saiba exatamente onde mexeu há semanas, sem precisar reler todos os arquivos do projeto, economizando tempo e processamento.

---

_Configurado por Victor Fausto - Full Stack Developer_ 🚀
