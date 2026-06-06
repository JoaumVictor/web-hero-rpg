Melhora a qualidade do código sem alterar a lógica ou o comportamento.

1. **Mapeie dependências** do código a ser refatorado:
   - Quais arquivos importam ou chamam as funções/componentes que serão alterados?
   - Liste essas dependências e confirme que as mudanças não vão quebrar nenhuma delas.
   - Se a alteração puder causar breaking change, avise explicitamente antes de prosseguir.

2. Analise o código indicado (seleção, arquivo ou módulo) em busca de:
   - Complexidade desnecessária
   - Nomes de variáveis/funções pouco semânticos
   - Duplicação de lógica (DRY)
   - Violações de SOLID

3. Proponha melhorias aplicando princípios de Clean Code.

4. **Não encha de comentários JSDoc** a menos que seja explicitamente solicitado.

5. Apresente o "Antes" e o "Depois" lado a lado para o usuário revisar.

6. Aguarde aprovação antes de aplicar.

7. Se aprovado, aplique as mudanças e sugira um commit do tipo `refactor:`.
