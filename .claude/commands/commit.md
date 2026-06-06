Finaliza a tarefa com segurança e padronização antes de commitar.

1. **Mensagem fornecida?** Se o comando veio com uma mensagem (ex: `/commit feat: ajusta padding do card`), use-a como fonte da verdade e pule a geração automática.

2. **Sem mensagem:** Rode `git diff --staged` (e `git diff` se nada estiver staged), analise o contexto das mudanças e crie uma mensagem cirúrgica no padrão Conventional Commits: `<tipo>(escopo): descrição curta`.

3. **Filtro anti-vazamento:** Independente de quem escreveu a mensagem, faça um raio-x rápido nas mudanças para garantir que nenhum dado sensível (`.env`, chaves, tokens) está indo para o stage por engano.

4. **Execução:** Passou na verificação? Execute o commit direto e entregue a confirmação de sucesso.
