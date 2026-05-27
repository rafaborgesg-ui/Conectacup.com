# 📋 Instruções: Adicionar coluna exclude_wet_tires

## 🎯 Objetivo
Adicionar uma nova coluna na tabela `demand_calculations` para armazenar o estado do toggle de pneus wet (chuva) em cada etapa.

## 📝 Passo a passo

### 1. Acesse o Supabase Dashboard
- Abra: https://supabase.com/dashboard
- Faça login com sua conta
- Selecione o projeto **Conecta Cup**

### 2. Execute a migração SQL
- Clique em **SQL Editor** no menu lateral
- Clique em **New query**
- Copie e cole o conteúdo do arquivo: `/supabase/migrations/add_exclude_wet_to_demand_calculations.sql`
- Clique em **Run** (ou pressione `Ctrl+Enter`)

### 3. Verifique a execução
Você deve ver a mensagem: **"Success. No rows returned"**

### 4. Confirme a estrutura
Execute esta query para confirmar:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'demand_calculations' 
  AND column_name = 'exclude_wet_tires';
```

Deve retornar:
```
column_name       | data_type | column_default
exclude_wet_tires | boolean   | false
```

## ✅ Pronto!

Agora o sistema está integrado com o Supabase e:

- ✅ **Salva automaticamente** quando você clica no botão de toggle wet
- ✅ **Carrega automaticamente** o estado salvo ao abrir a página
- ✅ **Recalcula em tempo real** o estoque acumulado
- ✅ **Sincroniza** entre dispositivos e usuários

## 🔍 Como testar

1. Vá para **Demanda & Consumo** → **Estoque vs. Demanda**
2. Clique no botão **CloudOff** ao lado de uma etapa
3. O ícone muda para **CloudRain** (verde)
4. Os pneus wet são removidos do cálculo
5. Recarregue a página → o estado persiste! ✨

## 📊 Estrutura da tabela atualizada

```sql
demand_calculations
├── id (UUID)
├── stage_id (UUID) → FK para season_stages
├── total_tires (INTEGER)
├── tires_by_model (JSONB)
├── categories (JSONB)
├── exclude_wet_tires (BOOLEAN) ← NOVO!
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🎨 Comportamento visual

| Estado | Ícone | Cor | Ação ao clicar |
|--------|-------|-----|----------------|
| **Com wet** | CloudOff | Vermelho | Remove pneus wet |
| **Sem wet** | CloudRain | Verde | Adiciona pneus wet |

## 🔄 Sincronização em tempo real

O sistema agora:
1. **Salva** no Supabase quando você clica no botão
2. **Recalcula** automaticamente os totais
3. **Persiste** o estado entre sessões
4. **Sincroniza** com outros usuários acessando a mesma temporada

## 📚 Próximos módulos

Essa informação será usada em:
- **Gestão de Entrada de Pneus**
- **Alocação de Pneus por Etapa**
- **Relatórios de Consumo Real vs. Previsto**
- **Dashboards de Controle**
