# Patch: Exibição de Conferências no Histórico de Pedidos

## ✅ O que já foi implementado

1. **Salvamento da Conferência** (`PedidosPneus.tsx` - linha ~1147):
   - Ao finalizar a conferência, o sistema agora salva no Supabase na tabela `order_conferences`
   - Atualiza o status do pedido para 'received'
   - Recarrega automaticamente a lista de pedidos

2. **Estado para Conferências** (`PedidosPneus.tsx` - linha ~117):
   ```typescript
   const [orderConferences, setOrderConferences] = useState<Map<string, any>>(new Map());
   ```

3. **Carregamento de Conferências** (`PedidosPneus.tsx` - linha ~781-800):
   - A função `loadPedidos()` agora carrega automaticamente as conferências associadas

## 🔧 O que falta fazer manualmente

### 1. Criar a tabela no Supabase

Execute o SQL disponível em `/docs/CONFERENCIA-PEDIDOS-SQL.md` no Supabase SQL Editor.

### 2. Adicionar exibição das conferências no histórico

**Localização**: `/pages/PedidosPneus.tsx`, aproximadamente na **linha 3774**

**Inserir após a seção de Observações e antes de "Itens do Pedido"**:

```tsx
{/* Informação de Conferência */}
{orderConferences.has(pedido.id) && (() => {
  const conf = orderConferences.get(pedido.id);
  const difference = (conf?.total_items_scanned || 0) - (conf?.total_items_expected || 0);
  return (
    <div className="mb-4 p-4 rounded-lg border" style={{ 
      borderColor: conf?.has_divergences ? '#FCA5A5' : '#86EFAC',
      background: conf?.has_divergences ? '#FEF2F2' : '#F0FDF4'
    }}>
      <div className="flex items-start gap-3">
        <ClipboardCheck size={20} style={{ 
          color: conf?.has_divergences ? '#DC2626' : '#059669',
          flexShrink: 0,
          marginTop: '2px'
        }} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold" style={{ 
              color: conf?.has_divergences ? '#DC2626' : '#059669'
            }}>
              {conf?.has_divergences ? '⚠️ Conferência com Divergências' : '✅ Conferência Realizada'}
            </p>
            <span className="text-xs text-gray-500">
              {new Date(conf?.conference_date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Total Esperado</p>
              <p className="text-sm font-medium text-gray-900">
                {conf?.total_items_expected} pneus
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Total Lido</p>
              <p className="text-sm font-medium text-gray-900">
                {conf?.total_items_scanned} pneus
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Diferença</p>
              <p className="text-sm font-bold" style={{ 
                color: difference === 0 ? '#059669' : '#DC2626'
              }}>
                {difference >= 0 ? '+' : ''}{difference} pneus
              </p>
            </div>
          </div>

          {/* Divergências Detalhadas */}
          {conf?.has_divergences && conf?.divergences && conf.divergences.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#FCA5A5' }}>
              <p className="text-xs font-semibold text-gray-700 mb-2">Divergências por Modelo:</p>
              <div className="space-y-2">
                {conf.divergences.map((div: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded" style={{ background: '#FFF' }}>
                    <span className="font-medium text-gray-700">{div.model}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">Pedido: {div.expected}</span>
                      <span className="text-gray-600">Lido: {div.scanned}</span>
                      <span className="font-bold" style={{ 
                        color: div.difference === 0 ? '#059669' : '#DC2626' 
                      }}>
                        {div.difference >= 0 ? '+' : ''}{div.difference}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})()}
```

**Onde inserir**: Logo após o fechamento da div de Observações (`)}`) e antes do comentário `{/* Itens do Pedido */}`.

## 🎯 Resultado Esperado

Após implementar, ao expandir um pedido que teve conferência:

1. **Sem divergências**: Card verde indicando conferência realizada com sucesso
2. **Com divergências**: Card vermelho mostrando:
   - Total esperado vs. Total lido
   - Lista detalhada de cada modelo com divergência
   - Diferença por modelo (pedido vs. lido)

## 📊 Estrutura de Dados Salva

A conferência é salva com:
- `order_id`: ID do pedido conferido
- `conference_date`: Data/hora da conferência
- `total_items_expected`: Total esperado
- `total_items_scanned`: Total lido
- `has_divergences`: Boolean indicando se houve divergências
- `divergences`: Array JSON com detalhes das divergências
- `items_detail`: Array JSON com detalhamento completo
- `success_count`: Quantidade salva com sucesso
- `error_count`: Quantidade com erro
- `errors`: Array de mensagens de erro

## 🧪 Como Testar

1. Crie um pedido
2. Faça a conferência física lendo os códigos de barras
3. Finalize a conferência
4. Verifique que:
   - A conferência foi salva no Supabase
   - O status do pedido mudou para "Recebido"
   - Ao expandir o pedido no histórico, a conferência aparece com as divergências (se houver)
