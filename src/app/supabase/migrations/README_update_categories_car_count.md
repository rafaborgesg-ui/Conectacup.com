# Atualização da Estrutura de Categorias em season_stages

## 📋 Visão Geral

Esta migration documenta a mudança na estrutura da coluna `categories` na tabela `season_stages` para incluir a **quantidade de carros por categoria em cada etapa**.

## 🔄 Mudança de Estrutura

### ❌ Estrutura Antiga (Array Simples)
```json
["Carrera", "Challenge", "Trophy"]
```

### ✅ Nova Estrutura (Array de Objetos)
```json
[
  { "name": "Carrera", "car_count": 32 },
  { "name": "Challenge", "car_count": 28 },
  { "name": "Trophy", "car_count": 20 }
]
```

## 💡 Justificativa

A quantidade de carros **varia de acordo com o campeonato/etapa**, não é fixa para toda a temporada. Com esta estrutura:

1. ✅ Cada etapa pode ter quantidades diferentes de carros por categoria
2. ✅ Flexibilidade para ajustar por tipo de corrida (Sprint, Endurance, etc.)
3. ✅ Dados mais precisos para cálculo de demanda de pneus
4. ✅ Melhor rastreabilidade histórica

## 🚀 Como Aplicar

Execute a migration no Supabase SQL Editor:

```sql
-- Execute o arquivo:
-- /supabase/migrations/update_categories_structure_with_car_count.sql
```

## 📝 Exemplo de Uso

### Inserir nova etapa com categorias e quantidade de carros:
```sql
INSERT INTO season_stages (season_id, name, location, categories)
VALUES (
  'uuid-da-temporada',
  'Etapa 1',
  'Interlagos',
  '[
    {"name": "Carrera", "car_count": 32},
    {"name": "Challenge", "car_count": 28}
  ]'::jsonb
);
```

### Consultar etapas de uma categoria específica:
```sql
SELECT name, location, categories
FROM season_stages
WHERE categories @> '[{"name": "Carrera"}]';
```

### Atualizar quantidade de carros de uma categoria em uma etapa:
```sql
UPDATE season_stages
SET categories = jsonb_set(
  categories,
  '{0,car_count}',
  '35'::jsonb
)
WHERE id = 'uuid-da-etapa';
```

## 🔗 Integração

### Frontend (TypeScript)
```typescript
interface StageCategory {
  name: string;
  car_count: number;
}

interface SeasonStage {
  id: string;
  name: string;
  location: string;
  categories: StageCategory[];
}
```

### Componente StageModal
O modal de edição de etapas agora permite configurar:
- ✅ Categorias que participam
- ✅ Quantidade de carros por categoria

## 📊 Impacto

### Componentes Afetados:
- ✅ `/components/StageModal.tsx` - Adiciona input de quantidade de carros
- ✅ `/pages/SeasonConfiguration.tsx` - Lê nova estrutura
- ✅ `/pages/Demanda.tsx` - Usa quantidade de carros das etapas
- ✅ `/utils/seasonStorage.ts` - Tipagem atualizada

### Benefícios:
- 📈 Cálculo de demanda mais preciso
- 🎯 Dados específicos por campeonato
- 🔄 Fácil ajuste de premissas
- 📊 Relatórios mais detalhados

## ⚠️ Notas Importantes

1. **Retrocompatibilidade**: Dados antigos no formato array simples devem ser migrados manualmente se necessário
2. **Validação**: O frontend valida que `car_count` seja maior que 0
3. **Default**: Se uma etapa antiga não tiver `car_count`, o sistema pode assumir um valor padrão
4. **Índice**: O índice GIN existente continua funcionando perfeitamente com a nova estrutura

## 🧪 Testes

Após aplicar a migration, verifique:

```sql
-- 1. Verificar estrutura da coluna
SELECT 
  column_name, 
  data_type,
  col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as description
FROM information_schema.columns 
WHERE table_name = 'season_stages' AND column_name = 'categories';

-- 2. Testar inserção
INSERT INTO season_stages (season_id, name, location, categories)
VALUES (
  'test-season-id',
  'Teste Etapa',
  'Teste Pista',
  '[{"name": "Carrera", "car_count": 30}]'::jsonb
);

-- 3. Testar consulta
SELECT * FROM season_stages WHERE id = 'id-inserido-acima';
```

## 📅 Histórico

- **2025-01-29**: Criação da nova estrutura com `car_count`
- **2025-01-28**: Estrutura original (array simples)
