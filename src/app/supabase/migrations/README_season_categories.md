# 🏁 Season Categories - Documentação da Migration

## 📋 Resumo

Esta migration cria a tabela `season_categories` no Supabase para armazenar configurações de categorias de temporada com modelos de carro e pneus associados.

## ✅ Segurança

**Esta migration é 100% isolada e NÃO afeta nenhuma tabela existente:**
- ✅ Não modifica `master_data`
- ✅ Não modifica `tire_models`
- ✅ Não modifica `containers`
- ✅ Não modifica `stock_entries`
- ✅ Não modifica tabelas do Protheus (`setor`, `projeto`, `conta_contabil`)
- ✅ Usa `CREATE TABLE IF NOT EXISTS` para evitar erros se já existir

## 🗂️ Estrutura da Tabela

### Tabela: `season_categories`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único (gerado automaticamente) |
| `category_name` | TEXT | Nome da categoria (Ex: "GT3", "Stock Car") |
| `car_model` | TEXT | Modelo do carro (Ex: "Porsche 992 GT3 Cup") |
| `slick_tires` | TEXT[] | Array com 2 IDs de pneus SLICK |
| `wet_tires` | TEXT[] | Array com 2 IDs de pneus WET |
| `created_at` | TIMESTAMPTZ | Data/hora de criação |
| `updated_at` | TIMESTAMPTZ | Data/hora da última atualização |

### Índices

- `idx_season_categories_category_name` - Busca rápida por nome de categoria
- `idx_season_categories_created_at` - Ordenação por data de criação

### Triggers

- `trigger_update_season_categories_updated_at` - Atualiza `updated_at` automaticamente em cada UPDATE

## 🔒 Row Level Security (RLS)

Policies configuradas:

| Operação | Permissão | Descrição |
|----------|-----------|-----------|
| SELECT | `authenticated` | Usuários autenticados podem ler |
| INSERT | `authenticated` | Usuários autenticados podem criar |
| UPDATE | `authenticated` | Usuários autenticados podem atualizar |
| DELETE | `authenticated` | Usuários autenticados podem excluir |

## 📦 Como Executar a Migration

### Opção 1: Supabase Dashboard (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **+ New query**
4. Copie todo o conteúdo do arquivo `/supabase/migrations/create_season_categories.sql`
5. Cole no editor SQL
6. Clique em **Run** (ou pressione `Ctrl/Cmd + Enter`)
7. Verifique se aparece a mensagem "Success. No rows returned"

### Opção 2: Supabase CLI

```bash
# Se você tiver o Supabase CLI instalado
supabase migration up
```

## 🧪 Como Verificar se Funcionou

Execute este SQL no SQL Editor do Supabase:

```sql
-- Verifica se a tabela foi criada
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'season_categories';

-- Verifica as colunas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'season_categories';

-- Verifica as policies RLS
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'season_categories';
```

Resultado esperado:
- ✅ Tabela `season_categories` aparece
- ✅ 7 colunas (id, category_name, car_model, slick_tires, wet_tires, created_at, updated_at)
- ✅ 4 policies (SELECT, INSERT, UPDATE, DELETE)

## 💻 Integração com TypeScript

### Utilitário: `/utils/seasonCategories.ts`

Funções disponíveis:

```typescript
// Buscar todas as categorias
const categories = await fetchSeasonCategories();

// Buscar categoria específica
const category = await fetchSeasonCategoryById(id);

// Criar nova categoria
const newCategory = await createSeasonCategory({
  category_name: 'GT3',
  car_model: 'Porsche 992 GT3 Cup',
  slick_tires: ['tire-id-1', 'tire-id-2'],
  wet_tires: ['tire-id-3', 'tire-id-4']
});

// Atualizar categoria
const updated = await updateSeasonCategory(id, data);

// Excluir categoria
await deleteSeasonCategory(id);

// Verificar duplicatas
const hasDuplicate = await checkDuplicateCategory(categoryName, carModel);
```

### Página: `/pages/SeasonConfiguration.tsx`

A página já está 100% integrada com o Supabase:

- ✅ Carrega categorias automaticamente ao abrir
- ✅ Cria novas categorias direto no banco
- ✅ Edita categorias existentes
- ✅ Exclui categorias com confirmação
- ✅ Valida duplicatas antes de salvar
- ✅ Mostra toasts de sucesso/erro
- ✅ Recarrega lista após qualquer operação

## 📊 Exemplo de Dados

```sql
INSERT INTO season_categories (
  category_name,
  car_model,
  slick_tires,
  wet_tires
) VALUES (
  'GT3',
  'Porsche 992 GT3 Cup',
  ARRAY['tire-slick-1', 'tire-slick-2'],
  ARRAY['tire-wet-1', 'tire-wet-2']
);
```

## 🔗 Relacionamentos

Esta tabela **não tem** foreign keys diretas, mas se relaciona logicamente com:

- **Master Data** (`categoria` e `geracao`) - Fonte dos nomes de categorias e modelos
- **Tire Models** (`tire_models`) - IDs dos pneus armazenados em arrays

## 🚨 Troubleshooting

### Erro: "relation already exists"

**Causa:** A tabela já foi criada anteriormente.

**Solução:** Não é um erro! A migration usa `CREATE TABLE IF NOT EXISTS`, então é seguro executar múltiplas vezes.

### Erro: "permission denied for schema public"

**Causa:** Falta de permissões no Supabase.

**Solução:** Certifique-se de estar executando como admin no Supabase Dashboard.

### Dados não aparecem no frontend

**Verificar:**

1. **Autenticação:** Usuário está logado?
2. **RLS:** As policies estão habilitadas?
3. **Console:** Verifique erros no console do navegador
4. **Supabase:** Verifique se os dados estão no banco

```sql
SELECT * FROM season_categories;
```

## 📝 Changelog

### v1.0.0 (2025-01-28)

- ✅ Criação inicial da tabela `season_categories`
- ✅ Implementação de RLS
- ✅ Criação de índices para performance
- ✅ Trigger automático de `updated_at`
- ✅ Integração completa com TypeScript
- ✅ Documentação completa

## 👥 Autoria

Desenvolvido para o sistema Conecta Cup - Gestão de Pneus

---

**Última atualização:** 28/01/2025
