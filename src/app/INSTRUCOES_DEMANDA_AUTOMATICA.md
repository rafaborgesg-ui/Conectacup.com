# 📊 Salvamento Automático de Cálculos de Demanda

## ✅ O que foi implementado

### 1. **Salvamento Automático dos Valores Padrão**
- ✨ **NOVO**: Ao selecionar uma temporada, os valores padrão são salvos automaticamente
- Se já existirem cálculos salvos, eles são carregados automaticamente
- Não precisa fazer nenhuma edição para os dados serem salvos

### 2. **Salvamento Automático de Edições com Debounce**
- Qualquer alteração é salva automaticamente após 1 segundo
- Monitora mudanças em:
  - Quantidade de carros editada por etapa/categoria
  - Checkbox "Incluir coringas" marcado/desmarcado
  - Seleção de temporada
  - Mudanças nas etapas

### 3. **Carregamento de Valores Salvos**
- Ao selecionar uma temporada, busca cálculos salvos anteriormente
- Restaura:
  - Quantidades de carros editadas
  - Estado dos checkboxes "Incluir coringas"
  - Todos os cálculos por modelo e categoria
- Se não houver dados salvos, usa valores padrão e salva automaticamente

### 4. **Indicador Visual de Salvamento**
- Aparece no header da página quando uma temporada está selecionada
- Mostra "Salvando..." com spinner durante o salvamento
- Mostra "✓ Salvo HH:MM" após salvamento bem-sucedido
- Verde para indicar sucesso

### 5. **Estrutura de Dados Salvos**
Para cada etapa, salva:
- **stage_id**: ID da etapa
- **total_tires**: Total de pneus da etapa
- **tires_by_model**: Array com quantidades por modelo
  ```json
  [
    { "model": "30/65-18 Slick", "qty": 320 },
    { "model": "31/71-18 Slick", "qty": 320 }
  ]
  ```
- **categories**: Array com detalhes por categoria
  ```json
  [
    {
      "category_name": "Carrera",
      "car_count": 32,
      "slicks": 4,
      "wets": 2,
      "wildcards_count": 256,
      "front_slick_model": "30/65-18 Slick",
      "rear_slick_model": "31/71-18 Slick",
      "front_wet_model": "30/65-18 P2L",
      "rear_wet_model": "31/71-18 P2L",
      "front_slick_qty": 256,
      "rear_slick_qty": 256,
      "front_wet_qty": 128,
      "rear_wet_qty": 128,
      "total_tires": 768
    }
  ]
  ```

## 🛠️ Configuração Necessária no Supabase

### Passo 1: Criar a Tabela
Execute o script SQL `/supabase_demand_calculations_table.sql` no SQL Editor do Supabase:

```sql
CREATE TABLE IF NOT EXISTS demand_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES season_stages(id) ON DELETE CASCADE,
  total_tires INTEGER NOT NULL DEFAULT 0,
  tires_by_model JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_calculations_stage_id ON demand_calculations(stage_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_demand_calculations_stage ON demand_calculations(stage_id);
```

### Passo 2: Configurar Row Level Security (RLS)
Adicione as políticas de segurança:

```sql
-- Habilita RLS
ALTER TABLE demand_calculations ENABLE ROW LEVEL SECURITY;

-- Permite leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ler cálculos"
ON demand_calculations FOR SELECT
TO authenticated
USING (true);

-- Permite inserção para usuários autenticados
CREATE POLICY "Usuários autenticados podem inserir cálculos"
ON demand_calculations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permite atualização para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar cálculos"
ON demand_calculations FOR UPDATE
TO authenticated
USING (true);

-- Permite deleção para usuários autenticados
CREATE POLICY "Usuários autenticados podem deletar cálculos"
ON demand_calculations FOR DELETE
TO authenticated
USING (true);
```

## 📋 Como Usar

1. **Selecione uma Temporada**
   - Escolha a temporada no dropdown
   - **✨ NOVO**: Os cálculos padrão são salvos automaticamente!

2. **Os Cálculos São Feitos E Salvos Automaticamente**
   - Ao selecionar a temporada, o sistema:
     - Calcula os valores padrão baseados nas premissas
     - Verifica se já existem cálculos salvos
     - Se não existirem, salva automaticamente os valores padrão
     - Se existirem, carrega os valores salvos anteriormente
   - Cada etapa mostra o total de pneus
   - Expanda uma etapa para ver detalhes

3. **Edite Valores (Opcional)**
   - Altere a quantidade de carros por categoria
   - Marque/desmarque "Incluir coringas"
   
4. **Salvamento Automático de Edições**
   - Qualquer alteração é salva automaticamente após 1 segundo
   - Indicador mostra "Salvando..." e depois "✓ Salvo HH:MM"
   - Não precisa clicar em nenhum botão!

5. **Use na Aba "Estoque vs. Demanda"**
   - Os dados salvos estarão disponíveis para comparação com estoque
   - Busque os dados pela tabela `demand_calculations`

## 🔍 Consultando os Dados Salvos

### No Supabase:
```sql
-- Ver todos os cálculos
SELECT * FROM demand_calculations;

-- Ver cálculos de uma etapa específica
SELECT * FROM demand_calculations 
WHERE stage_id = 'uuid-da-etapa';

-- Ver cálculos com join de etapas
SELECT 
  dc.*,
  ss.name as stage_name,
  ss.start_date
FROM demand_calculations dc
JOIN season_stages ss ON ss.id = dc.stage_id
ORDER BY ss.start_date;
```

### No Código React:
```typescript
const supabase = createClient();

// Buscar cálculos de uma temporada
const { data: calculations } = await supabase
  .from('demand_calculations')
  .select(`
    *,
    season_stages (
      name,
      start_date,
      main_championship
    )
  `)
  .eq('season_stages.season_id', seasonId);

// Buscar cálculo de uma etapa específica
const { data: calc } = await supabase
  .from('demand_calculations')
  .select('*')
  .eq('stage_id', stageId)
  .single();
```

## 🎯 Benefícios

1. ✅ **Salvamento automático dos padrões**: Valores são salvos assim que você seleciona a temporada
2. ✅ **Não perde dados**: Salva automaticamente sem precisar clicar em botão
3. ✅ **Restaura edições**: Ao reabrir a página, seus valores editados permanecem
4. ✅ **Performance**: Debounce evita salvar a cada tecla digitada
5. ✅ **Feedback visual**: Usuário sabe quando os dados foram salvos
6. ✅ **Integridade**: Constraint única garante apenas um cálculo por etapa
7. ✅ **Histórico**: Campos `created_at` e `updated_at` para auditoria
8. ✅ **Flexível**: Estrutura JSONB permite adicionar campos facilmente
9. ✅ **Pronto para "Estoque vs. Demanda"**: Dados estruturados e prontos para uso

## 🚀 Próximos Passos

Agora que os cálculos estão sendo salvos, você pode:

1. Implementar a aba "Estoque vs. Demanda"
2. Comparar estoque atual vs demanda calculada
3. Gerar alertas de falta de estoque
4. Criar relatórios de previsão
5. Exportar dados para Excel/PDF
