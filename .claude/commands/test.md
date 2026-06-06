Garante que o código funciona através de testes antes de qualquer commit.

1. **Identifique o setup de testes do projeto:**
   - Qual framework está sendo usado? (Jest, Vitest, Pytest, etc.)
   - Existe script de teste no `package.json` / `Makefile` / similar?

2. **Execute os testes existentes primeiro:**
   - Rode a suíte completa e relate: quantos passaram, falharam ou foram pulados.
   - Se algum falhar, **pare** — chame `/debug` para resolver antes de adicionar novos testes.

3. **Identifique o que precisa de teste:**
   - Analise o `CURRENT_TASK.md` (se existir) ou o código recém alterado.
   - Priorize: (1) lógica de negócio crítica, (2) funções puras, (3) integrações, (4) edge cases conhecidos.
   - Não escreva teste para código trivial (getters simples, configurações estáticas).

4. **Escreva os testes** seguindo o padrão AAA:
   - **Arrange** — prepara o estado inicial
   - **Act** — executa a ação sendo testada
   - **Assert** — verifica o resultado esperado
   - Um teste verifica uma única coisa.
   - Nomes descritivos: `deve retornar erro quando o email for inválido`.
   - Mock apenas dependências externas (banco, API, email) — nunca a lógica que está sendo testada.

5. **Rode os novos testes** e confirme que todos passam.

6. **Registre no histórico** em `.claude/history/{{data}}_resumo.md`:

   ```
   ## [claude - {nome_do_dev}] DD/MM/YYYY — HH:MM
   **Comando:** /test
   **Arquivos de teste criados/modificados:**
   - caminho/arquivo.test.ext
   **Cobertura:** antes X% → depois Y% (se disponível)
   **Status:** ✅ Todos passando
   ```

7. Sugira um commit do tipo `test:` e pergunte se deve executar o `/commit`.
