Mapeia a arquitetura atual do projeto e gera um diagnóstico de saúde da base de código.

1. Varra o diretório raiz e identifique as tecnologias presentes (frameworks, bancos, mensageria, etc.).
2. Analise a estrutura de pastas e os padrões de nomenclatura adotados.
3. Atualize o arquivo `.claude/PROJECT_MAP.md` com:
   - Stack Tecnológica atualizada
   - Estrutura de Pastas
   - Onde ficam componentes, rotas e lógica de negócio
4. **Diagnóstico de saúde** — além do mapa, identifique e reporte:
   - 🔥 **Hot files:** arquivos com múltiplas responsabilidades ou que concentram muita lógica
   - 🔗 **Acoplamento alto:** módulos que importam muitos outros ou são importados por todo o projeto
   - 🧪 **Gaps de teste:** áreas críticas (autenticação, pagamento, lógica de negócio) sem cobertura aparente
   - 💀 **Código morto:** exports, funções ou arquivos que parecem não ser usados em lugar nenhum
   - ⚠️ **Riscos:** padrões que podem virar problema (ex: lógica de negócio no frontend, chamadas diretas ao banco sem abstração)
5. Resuma para o usuário o que entendeu do projeto, destaque mudanças em relação ao mapa anterior e apresente o diagnóstico em ordem de prioridade.
