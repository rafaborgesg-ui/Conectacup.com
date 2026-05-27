# Instruções para Adicionar Visualização de Pedidos na Tabela Estoque vs. Demanda

## Localização
Arquivo: `/pages/Demanda.tsx`  
Linha: Entre 2005 e 2007

## O que fazer

1. Localize esta seção no arquivo (por volta da linha 2005):

```typescript
                                 </tr>
                               );

                               return rows;
                               });
```

2. Adicione o código abaixo ENTRE a linha `);` e a linha `return rows;`:

```typescript
                               // 🆕 Linha 4: Pedidos Realizados (se houver)
                               if (demand.order_name && demand.ordered_tires) {
                                 rows.push(
                                   <tr key={`${demand.stage_id}-pedido`} style={{ borderBottom: demandIdx < demandData.length - 1 ? '2px solid #E5E7EB' : 'none', background: '#EFF6FF' }}>
                                     <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                     <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                     <td className="px-1.5 py-2 text-[10px] font-medium" style={{ color: '#2563EB' }}>
                                       <div className="break-words leading-tight flex items-center gap-1">
                                         <span>📦</span>
                                         <span>{demand.order_name}</span>
                                       </div>
                                     </td>
                                     {allTireModels.map((tire, tireIdx: number) => {
                                       const orderedTire = demand.ordered_tires?.find((ot: any) => ot.model === tire.model);
                                       const quantityOrdered = orderedTire?.qty || 0;
                                       
                                       return (
                                         <td 
                                           key={tireIdx}
                                           className="px-1 py-2 text-center text-[10px] font-bold"
                                           style={{ 
                                             backgroundColor: quantityOrdered > 0 ? '#DBEAFE' : '#F3F4F6',
                                             color: quantityOrdered > 0 ? '#1E40AF' : '#9CA3AF'
                                           }}
                                         >
                                           {quantityOrdered > 0 ? `+${quantityOrdered}` : '-'}
                                         </td>
                                       );
                                     })}
                                   </tr>
                                 );
                               }
```

3. O resultado final deve ficar assim:

```typescript
                                 </tr>
                               );

                               // 🆕 Linha 4: Pedidos Realizados (se houver)
                               if (demand.order_name && demand.ordered_tires) {
                                 rows.push(
                                   <tr key={`${demand.stage_id}-pedido`} style={{ borderBottom: demandIdx < demandData.length - 1 ? '2px solid #E5E7EB' : 'none', background: '#EFF6FF' }}>
                                     <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                     <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                     <td className="px-1.5 py-2 text-[10px] font-medium" style={{ color: '#2563EB' }}>
                                       <div className="break-words leading-tight flex items-center gap-1">
                                         <span>📦</span>
                                         <span>{demand.order_name}</span>
                                       </div>
                                     </td>
                                     {allTireModels.map((tire, tireIdx: number) => {
                                       const orderedTire = demand.ordered_tires?.find((ot: any) => ot.model === tire.model);
                                       const quantityOrdered = orderedTire?.qty || 0;
                                       
                                       return (
                                         <td 
                                           key={tireIdx}
                                           className="px-1 py-2 text-center text-[10px] font-bold"
                                           style={{ 
                                             backgroundColor: quantityOrdered > 0 ? '#DBEAFE' : '#F3F4F6',
                                             color: quantityOrdered > 0 ? '#1E40AF' : '#9CA3AF'
                                           }}
                                         >
                                           {quantityOrdered > 0 ? `+${quantityOrdered}` : '-'}
                                         </td>
                                       );
                                     })}
                                   </tr>
                                 );
                               }

                               return rows;
                               });
```

## Verificação

Após aplicar o patch:
1. Execute o script SQL em `/sql/add_order_fields_to_demand_calculations.sql` no Supabase
2. Crie um pedido na página "Pedidos de Pneus"
3. Volte para "Relatórios & Histórico" > aba "Estoque vs. Demanda"
4. Você deverá ver uma 4ª linha azul claro com o nome do pedido e as quantidades pedidas
