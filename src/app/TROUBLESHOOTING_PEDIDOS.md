# Troubleshooting - Pedidos não aparecem na tabela Estoque vs. Demanda

## Checklist de Verificação

### 1. ✅ Executou o script SQL?
Primeiro, verifique se você executou o script SQL para adicionar os campos na tabela `demand_calculations`:

**Arquivo**: `/sql/add_order_fields_to_demand_calculations.sql`

**Como executar**:
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo do arquivo
4. Execute o script

**Campos que devem ser criados**:
- `ordered_tires` (JSONB)
- `order_name` (TEXT)
- `order_id` (UUID)
- `order_date` (TIMESTAMPTZ)

### 2. ✅ Aplicou o patch no arquivo Demanda.tsx?
Verifique se você adicionou o código para exibir os pedidos na tabela.

**Local**: `/pages/Demanda.tsx` por volta da linha 2006

**Como verificar**: Procure por "Linha 4: Pedidos Realizados" no arquivo. Se não encontrar, siga as instruções em `/INSTRUCOES_PATCH_DEMANDA.md`

### 3. ✅ Criou um pedido NOVO após as alterações?
**IMPORTANTE**: Apenas pedidos criados APÓS a execução do SQL e as alterações no código aparecerão na tabela.

Pedidos antigos não foram atualizados na tabela `demand_calculations`.

### 4. ✅ Verificou os logs do console?
Após criar um pedido, abra o Console do navegador (F12) e procure por:

```
📦 Iniciando registro do pedido em demand_calculations...
📦 Etapas selecionadas: [...]
📦 Nome do pedido: ...
📦 ID do pedido: ...
📦 Pneus pedidos: [...]
📦 Primeira etapa encontrada: ...
✅ Pedido "..." registrado em demand_calculations para etapa: ...
```

**Se aparecer erro**, anote a mensagem e verifique:
- Se a tabela `demand_calculations` tem os novos campos
- Se existe um registro de cálculo para a etapa selecionada

### 5. ✅ Verificou se há cálculo salvo para a etapa?
O pedido só pode ser registrado se já existir um cálculo de demanda salvo para aquela etapa.

**Como verificar**:
1. Vá em "Relatórios & Histórico"
2. Aba "Cálculo de Demanda"
3. Verifique se há um cálculo salvo para a etapa que você selecionou no pedido
4. Se não houver, faça o cálculo e salve antes de criar o pedido

### 6. ✅ Verificou diretamente no Supabase?
Vá no Supabase Table Editor e verifique a tabela `demand_calculations`:

1. Procure pelo registro da etapa que você selecionou no pedido
2. Verifique se os campos `order_name`, `order_id`, `ordered_tires` e `order_date` foram preenchidos
3. Se não foram preenchidos, há um problema na execução do update

### 7. ✅ Recarregou a página Estoque vs. Demanda?
Após criar o pedido:
1. Vá para "Relatórios & Histórico"
2. Clique na aba "Estoque vs. Demanda"
3. Aguarde o carregamento completo dos dados
4. Procure pela etapa onde você criou o pedido
5. Deve aparecer uma 4ª linha azul claro com o ícone 📦 e o nome do pedido

## Estrutura Esperada na Tabela

Para cada etapa com pedido, você deve ver 4 linhas:

```
1. Estoque inicial    (cinza)
2. Consumo previsto   (vermelho)
3. Estoque final      (colorido: verde/amarelo/vermelho)
4. 📦 Nome do Pedido  (azul claro) ← NOVA LINHA
```

## Teste Passo a Passo

Se ainda não aparecer, faça este teste:

1. **Crie um cálculo de demanda**:
   - Vá em "Relatórios & Histórico" > "Cálculo de Demanda"
   - Selecione a temporada
   - Configure as quantidades de carros
   - Aguarde o salvamento automático (deve aparecer "Salvo")

2. **Crie um pedido simples**:
   - Vá em "Pedidos de Pneus"
   - Selecione a mesma temporada
   - Marque UMA etapa apenas (a primeira da temporada)
   - Digite um nome curto: "Teste 1"
   - Adicione 1-2 modelos com quantidades
   - Clique em "Enviar Pedido"

3. **Verifique os logs**:
   - Abra o Console (F12)
   - Deve aparecer mensagens começando com 📦

4. **Verifique a tabela**:
   - Vá em "Relatórios & Histórico" > "Estoque vs. Demanda"
   - Procure pela etapa que você selecionou
   - Deve aparecer a linha azul "📦 Teste 1"

## Erros Comuns

### "relation 'demand_calculations' does not exist"
- **Causa**: A tabela não existe ainda
- **Solução**: Execute o script de criação da tabela primeiro

### "column 'ordered_tires' does not exist"
- **Causa**: O script SQL não foi executado
- **Solução**: Execute `/sql/add_order_fields_to_demand_calculations.sql`

### Pedido criado mas não aparece na tabela
- **Causa**: Não há cálculo de demanda salvo para aquela etapa
- **Solução**: Vá em "Cálculo de Demanda" e salve os cálculos primeiro

### Linha do pedido não aparece visualmente
- **Causa**: O código não foi adicionado em Demanda.tsx
- **Solução**: Siga `/INSTRUCOES_PATCH_DEMANDA.md`
