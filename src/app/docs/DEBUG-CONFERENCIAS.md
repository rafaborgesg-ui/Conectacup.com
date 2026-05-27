# Guia de Debug - Conferências de Pedidos

## ✅ Checklist de Implementação

### 1. Tabela no Supabase
- [ ] A tabela `order_conferences` foi criada?
  - Verifique em: Supabase → Table Editor → Procure por "order_conferences"
  - SQL: `/docs/create-order-conferences-table.sql`

### 2. Verificar RLS Policies
Execute no SQL Editor:
```sql
SELECT * FROM pg_policies WHERE tablename = 'order_conferences';
```

Devem aparecer 3 policies:
- `Allow read access to all users`
- `Allow insert for authenticated users`
- `Allow update for authenticated users`

### 3. Testar Inserção Manual
```sql
-- Primeiro, pegue um order_id válido
SELECT id, order_name FROM tire_orders LIMIT 5;

-- Insira uma conferência de teste (substitua o order_id pelo ID real)
INSERT INTO order_conferences (
  order_id,
  conference_date,
  total_items_expected,
  total_items_scanned,
  has_divergences,
  divergences,
  items_detail,
  success_count,
  error_count
) VALUES (
  'COLE_AQUI_UM_ID_REAL',
  NOW(),
  100,
  98,
  true,
  '[{"model": "27/65-18 P1L - Test", "expected": 50, "scanned": 48, "difference": -2}]'::jsonb,
  '[{"model_code": "27/65-18 P1L", "model_description": "Test", "quantity_ordered": 50, "quantity_scanned": 48}]'::jsonb,
  98,
  0
);

-- Verificar se foi inserido
SELECT * FROM order_conferences;
```

## 🔍 Debug no Console do Browser

Abra a página de Pedidos de Pneus e verifique os logs no Console (F12):

### Logs esperados ao carregar a página:

1. **Ao carregar pedidos:**
```
📋 Carregando pedidos do Supabase...
📦 Pedidos carregados do banco: [...]
✅ Pedidos formatados: X pedidos
🔍 Buscando conferências para pedidos: [...]
✅ Conferências carregadas: X [...]
📊 Map de conferências: {...}
```

2. **Ao finalizar uma conferência:**
```
✅ Iniciando finalização da conferência física...
📦 Pedido ID: ...
📋 Entradas lidas: [...]
📊 Leituras por modelo: ...
💾 Salvando registro da conferência...
✅ Registro da conferência salvo com sucesso
✅ Status do pedido atualizado para "received"
```

## 🧪 Teste Completo Passo a Passo

### 1. Criar um Pedido de Teste
1. Vá em "Pedidos de Pneus" → Aba "Criar Pedido"
2. Selecione uma temporada
3. Selecione algumas etapas
4. Clique em "Analisar Estoque vs. Demanda"
5. Preencha o nome do pedido
6. Salve o pedido

### 2. Fazer Conferência Física
1. Vá na aba "Histórico de Pedidos"
2. Localize o pedido criado
3. Clique no ícone de "Conferência Física" (ícone de clipboard verde)
4. Leia alguns códigos de barras (pode ser manualmente ou com scanner)
5. Clique em "Finalizar Conferência"

### 3. Verificar Resultado
1. Expanda o pedido no histórico
2. Deve aparecer um card verde (sem divergências) ou vermelho (com divergências)
3. O card deve mostrar:
   - Data e hora da conferência
   - Total esperado vs. Total lido
   - Diferença
   - Lista de divergências (se houver)

## ❌ Problemas Comuns

### Problema 1: "Conferências carregadas: 0"
**Causa**: Nenhuma conferência foi salva ainda
**Solução**: Faça uma conferência física e finalize

### Problema 2: Erro ao salvar conferência
**Possíveis causas**:
1. Tabela não foi criada → Execute o SQL de criação
2. RLS bloqueando → Verifique as policies
3. Campo obrigatório faltando → Veja os logs de erro

### Problema 3: Conferência não aparece no histórico
**Verificações**:
1. Console do browser mostra "✅ Conferências carregadas: 0"?
   - Sim → A conferência não foi salva no banco
   - Não → Problema ao carregar

2. Verificar no Supabase:
```sql
SELECT * FROM order_conferences ORDER BY created_at DESC LIMIT 10;
```

3. Verificar se o `order_id` bate:
```sql
SELECT 
  oc.id,
  oc.order_id,
  to.order_name,
  oc.total_items_expected,
  oc.total_items_scanned,
  oc.has_divergences
FROM order_conferences oc
LEFT JOIN tire_orders to ON oc.order_id = to.id
ORDER BY oc.created_at DESC;
```

### Problema 4: Card da conferência não aparece visualmente
**Verificações**:
1. O console mostra "📊 Map de conferências: {...}"?
2. O map contém o `order_id` do pedido?
3. Verificar se está expandindo o pedido correto

## 🎯 Teste Rápido

Execute no Console do Browser (quando estiver na página de Pedidos):
```javascript
// Ver o estado atual das conferências
console.log('orderConferences state:', orderConferences);

// Ver os pedidos
console.log('pedidos:', pedidos);
```

## 📊 Consultas SQL Úteis

```sql
-- Ver todas as conferências com informações do pedido
SELECT 
  oc.*,
  to.order_name,
  to.status
FROM order_conferences oc
JOIN tire_orders to ON oc.order_id = to.id
ORDER BY oc.conference_date DESC;

-- Ver apenas conferências com divergências
SELECT * FROM order_conferences 
WHERE has_divergences = true 
ORDER BY conference_date DESC;

-- Contar conferências por pedido
SELECT 
  to.order_name,
  COUNT(oc.id) as total_conferences
FROM tire_orders to
LEFT JOIN order_conferences oc ON to.id = oc.order_id
GROUP BY to.id, to.order_name
ORDER BY total_conferences DESC;

-- Limpar todas as conferências (CUIDADO!)
-- DELETE FROM order_conferences;
```
