Executa o plano do CURRENT_TASK.md e registra o histórico da alteração.

1. **Pré-voo:** Antes de escrever qualquer código, verifique:
   - O `git status` está limpo (sem arquivos esquecidos no stage)?
   - Existe algum teste quebrando? (rode o comando de test do projeto se disponível)
   - As dependências estão instaladas? (verifica se `node_modules`, `venv` ou equivalente existe)
   - Se qualquer item falhar, **pare e informe** ao dev antes de continuar.

2. **Leitura e checklist em tempo real:** Abra o `CURRENT_TASK.md`, leia cada item e, ao concluir uma subtarefa, marque-a com `[x]` imediatamente. Se algo falhar no meio, o usuário saberá exatamente onde parou.

3. **Figma:** Se houver qualquer link do Figma no `CURRENT_TASK.md`, chame o MCP do Figma para verificar estilos, tokens e layout antes de gerar o código.

4. **Segurança e padrões:** Antes de qualquer `git add` ou geração de código, confira as `rules.md` para garantir padrões (nomes, estrutura, escopo de permissão) e nunca inclua chaves de API ou variáveis sensíveis.

5. **Validação do critério de aceite:** Antes de considerar a tarefa concluída, confirme que o comportamento descrito no campo "Critério de aceite" do `CURRENT_TASK.md` está de fato funcionando.

6. **Histórico e Limpeza:** Terminou tudo? Antes de registrar, rode `git config user.name` para identificar o dev atual. Registre o log em `.claude/history/{{data}}_resumo.md` usando o formato estruturado abaixo. **Regra:** se já existe arquivo do dia de hoje, **acrescente** ao final com seção separada — nunca crie arquivo novo. Depois disso, delete o `CURRENT_TASK.md`. 🧹

   **Formato obrigatório de cada entrada no histórico:**

   ```
   ## [claude - {nome_do_dev}] DD/MM/YYYY — HH:MM
   **Comando:** /dev
   **Complexidade:** 🟢 Pequena / 🟡 Média / 🔴 Grande
   **Arquivos tocados:**
   - caminho/arquivo.ext (criado | modificado | deletado)
   **O que foi feito:** Resumo em 2-3 linhas do que foi implementado.
   **Critério de aceite:** ✅ [descrição do que foi validado]
   **Status:** ✅ Concluído | ⚠️ Parcial | ❌ Bloqueado
   ```

7. **Commit:** Sugira a mensagem de commit no padrão Conventional Commits e pergunte: _"O commit está pronto com a mensagem: '[mensagem]'. Quer que eu execute o /commit agora?"_
