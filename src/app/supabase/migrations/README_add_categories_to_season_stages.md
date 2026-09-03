# 📋 Migration: Adicionar Categorias às Etapas de Temporada

## 🎯 Objetivo

Esta migration adiciona a coluna `categories` na tabela `season_stages` para permitir que cada etapa tenha suas próprias categorias participantes (Carrera, Challenge, Trophy, etc).

## 📂 Arquivo da Migration

```
/supabase/migrations/add_categories_to_season_stages.sql
```

## 🚀 Como Executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor** (ícone de banco de dados na sidebar)
3. Clique em **+ New Query**
4. Copie todo o conteúdo do arquivo `add_categories_to_season_stages.sql`
5. Cole no editor
6. Clique em **RUN** ou pressione `Ctrl+Enter`
7. ✅ Aguarde a confirmação: "Success. No rows returned"

### Opção 2: Via Supabase CLI

```bash
# Certifique-se de estar na raiz do projeto
supabase db push
```

## 📊 Estrutura Criada

```sql
ALTER TABLE season_stages
ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;
```

### Campos Adicionados:

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `categories` | JSONB | `[]` | Array de categorias que participam da etapa |

### Exemplo de Dados:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "season_id": "abc123...",
  "name": "Etapa 1",
  "track": "Interlagos",
  "start_date": "2025-03-15",
  "end_date": "2025-03-17",
  "main_championship": "sprint",
  "include_trophy": false,
  "categories": ["Carrera", "Challenge"]  // ← NOVO CAMPO
}
```

## 🔍 Verificação

Após executar a migration, rode esta query para verificar:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'season_stages' AND column_name = 'categories';
```

Resultado esperado:
```
column_name | data_type | column_default
categories  | jsonb     | '[]'::jsonb
```

## 📝 Consultas de Exemplo

### Buscar etapas de uma categoria específica:

```sql
SELECT * FROM season_stages
WHERE categories @> '["Carrera"]'::jsonb;
```

### Buscar etapas que têm pelo menos uma de múltiplas categorias:

```sql
SELECT * FROM season_stages
WHERE categories ?| array['Carrera', 'Challenge'];
```

### Contar quantas etapas cada categoria tem:

```sql
SELECT 
  jsonb_array_elements_text(categories) as categoria,
  COUNT(*) as total_etapas
FROM season_stages
GROUP BY categoria;
```

## ⚠️ Notas Importantes

1. **Compatibilidade**: Esta migration é retrocompatível. Etapas existentes receberão um array vazio `[]` por padrão.

2. **Performance**: Um índice GIN foi criado na coluna `categories` para otimizar consultas de filtro.

3. **Validação**: A aplicação TypeScript já está preparada para trabalhar com este campo.

4. **Formato**: O campo aceita arrays de strings JSON:
   - ✅ `["Carrera"]`
   - ✅ `["Carrera", "Challenge", "Trophy"]`
   - ✅ `[]` (array vazio)
   - ❌ `null` (não permitido pelo default)

## 🔄 Rollback (Reverter)

Caso precise reverter esta migration:

```sql
-- Remove a coluna categories
ALTER TABLE season_stages DROP COLUMN IF EXISTS categories;

-- Remove o índice
DROP INDEX IF EXISTS idx_season_stages_categories;
```

## ✅ Status

- [ ] Migration criada
- [ ] Migration executada no Supabase
- [ ] Estrutura verificada
- [ ] Aplicação testada

---

**Data de Criação**: 2025-01-28  
**Versão da Aplicação**: Conecta Cup SaaS v2.0  
**Impacto**: Baixo (apenas adiciona coluna, não altera dados existentes)
