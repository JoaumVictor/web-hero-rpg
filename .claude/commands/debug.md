Investiga e resolve erros de forma estruturada, sem perder contexto.

1. **Capture o contexto completo:**
   - Qual é a mensagem de erro exata? (stack trace completo, não resumido)
   - Em qual ambiente acontece? (local, staging, produção)
   - O erro é determinístico (sempre acontece) ou intermitente?
   - Rode `git log --oneline -10` para ver o que mudou recentemente.

2. **Leia o histórico:** Consulte `.claude/history/` para verificar se o arquivo ou módulo com erro foi tocado recentemente e o que foi feito.

3. **Formule hipóteses** — liste de 2 a 4 causas prováveis em ordem de probabilidade. Não edite código antes disso.

4. **Teste uma hipótese por vez:**
   - Valide a mais provável primeiro.
   - Use logs temporários para confirmar ou descartar — prefira isso a debuggers quando possível.
   - Confirme a causa raiz antes de avançar para a próxima hipótese.

5. **Aplique o fix** somente após confirmar a causa raiz:
   - O fix deve ser cirúrgico — mínimo de mudança para resolver o problema.
   - Não aproveite para refatorar agora. Se precisar de refactor, crie um `CURRENT_TASK.md` separado depois.

6. **Registre no histórico** em `.claude/history/{{data}}_resumo.md`:

   ```
   ## [claude - {nome_do_dev}] DD/MM/YYYY — HH:MM
   **Comando:** /debug
   **Erro:** Descrição curta do erro
   **Causa raiz:** O que realmente estava causando o problema
   **Hipóteses testadas:** (1) hipótese → ✅ confirmada / ❌ descartada
   **Arquivos tocados:**
   - caminho/arquivo.ext (modificado)
   **Fix aplicado:** Descrição do que foi feito
   **Status:** ✅ Resolvido | ⚠️ Mitigado | ❌ Bloqueado
   ```

7. Sugira um commit do tipo `fix:` e pergunte se deve executar o `/commit`.
