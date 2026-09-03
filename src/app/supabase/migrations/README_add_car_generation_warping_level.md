# Migração: Adicionar car_generation e warping_level

## 📋 Descrição
Esta migração adiciona duas novas colunas à tabela `wheel_damage_occurrences`:
- `car_generation`: Armazena o modelo/geração do carro (992.1, 991.2, 991.1)
- `warping_level`: Armazena o nível de empenamento quando o tipo de avaria é "empenada" (N1 ou N2)

## 🎯 Objetivo
Permitir o registro completo de informações sobre avarias de rodas, incluindo:
1. O modelo/geração do carro onde ocorreu a avaria
2. O nível de empenamento (quando aplicável)

## 📝 Colunas Adicionadas

### car_generation
- **Tipo**: TEXT
- **Nullable**: Sim
- **Descrição**: Modelo/geração do carro (ex: 992.1, 991.2, 991.1)
- **Valores possíveis**: "992.1", "991.2", "991.1", etc.
- **Origem**: Mapeado automaticamente através da tabela `season_categories` quando a categoria é selecionada

### warping_level
- **Tipo**: TEXT
- **Nullable**: Sim
- **Descrição**: Nível de empenamento (somente quando damage_type = 'empenada')
- **Valores possíveis**: "N1", "N2"
- **Comportamento**: Campo condicional - só aparece no formulário quando o tipo de avaria é "empenada"

## 🚀 Como Executar

### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `add_car_generation_and_warping_level_to_wheel_damage.sql`
5. Clique em **Run** ou pressione `Ctrl + Enter`
6. Verifique as mensagens de sucesso no console

### Opção 2: Via Supabase CLI
```bash
# Execute a migração
supabase migration up

# Ou aplique diretamente
supabase db push
```

### Opção 3: Executar SQL direto
```sql
-- Copie e execute o conteúdo de add_car_generation_and_warping_level_to_wheel_damage.sql
```

## ✅ Verificação

Após executar a migração, você deve ver as seguintes mensagens:
```
✅ Coluna car_generation criada com sucesso
✅ Coluna warping_level criada com sucesso
```

Para verificar manualmente:
```sql
-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wheel_damage_occurrences'
AND column_name IN ('car_generation', 'warping_level');
```

Resultado esperado:
```
column_name     | data_type | is_nullable
----------------+-----------+-------------
car_generation  | text      | YES
warping_level   | text      | YES
```

## 🔄 Impacto na Aplicação

### Frontend (NovaAvariaModal.tsx)
- ✅ Campo `car_generation` é capturado automaticamente quando a categoria é selecionada
- ✅ Campo `warping_level` aparece condicionalmente quando tipo de avaria = "empenada"
- ✅ Ambos os campos são salvos no banco ao criar uma nova avaria

### Exportação (Avarias.tsx)
- ✅ Coluna E: "Modelo" agora vem preenchida com `car_generation`
- ✅ Coluna O: "Nível empenamento" vem preenchida com `warping_level`
- ✅ Estrutura completa de 21 colunas conforme especificado

## 📊 Estrutura Completa da Tabela

Após a migração, a tabela `wheel_damage_occurrences` terá:

```
id                  UUID PRIMARY KEY
line_code           TEXT NOT NULL
incident_date       DATE NOT NULL
stage_id            UUID REFERENCES season_stages(id)
stage_name          TEXT
category            TEXT
car_generation      TEXT          ← NOVO
chassis             TEXT
driver_name         TEXT
driver_number       TEXT
classe              TEXT
session             TEXT
wheel_position      TEXT
wheel_color         TEXT
serial_number       TEXT
damage_type         TEXT
warping_level       TEXT          ← NOVO
action_taken        TEXT
destination         TEXT
observations        TEXT
status              TEXT DEFAULT 'pending'
photo_urls          TEXT[]
created_at          TIMESTAMP DEFAULT NOW()
```

## ⚠️ Notas Importantes

1. **Dados Existentes**: Registros antigos terão `NULL` nas novas colunas (comportamento esperado)
2. **Validação Frontend**: A validação de preenchimento é feita no frontend
3. **Nullable**: Ambas as colunas permitem NULL para manter compatibilidade com dados existentes
4. **Condicional**: `warping_level` só é preenchido quando `damage_type = 'empenada'`

## 🔗 Relacionamentos

### car_generation
- **Fonte**: Tabela `season_categories` (coluna `car_model`)
- **Mapeamento**: Categoria → Geração do carro
- **Exemplo**: "CARRERA CUP" → "992.1"

### warping_level
- **Condicional**: Só aplicável quando `damage_type = 'empenada'`
- **Valores**: "N1" ou "N2"
- **Interface**: Select dropdown que aparece dinamicamente

## 📅 Data de Criação
10 de Fevereiro de 2025

## 👥 Módulos Afetados
- ✅ Cadastro de Avarias (NovaAvariaModal.tsx)
- ✅ Listagem de Avarias (Avarias.tsx)
- ✅ Exportação CSV/XLSX (Avarias.tsx)
- ✅ Modal de Detalhes (AvariaDetailsModal.tsx - pode precisar de atualização)
