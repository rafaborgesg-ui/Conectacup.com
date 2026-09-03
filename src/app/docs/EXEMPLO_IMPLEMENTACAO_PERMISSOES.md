# 📝 Exemplo de Implementação de Permissões

## Componente: Cadastro de Modelos de Pneu (TireModelRegistration)

Este exemplo demonstra como implementar o sistema de permissões em um componente existente.

## Antes (Sem Permissões)

```tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function TireModelRegistration() {
  const [models, setModels] = useState([]);
  
  const handleCreate = () => {
    // Criar modelo
  };
  
  const handleEdit = (id) => {
    // Editar modelo
  };
  
  const handleDelete = (id) => {
    // Deletar modelo
  };
  
  return (
    <div>
      <h1>Cadastro de Modelos</h1>
      
      {/* Formulário de criação */}
      <form onSubmit={handleCreate}>
        <Input placeholder="Nome do modelo" />
        <Button type="submit">Criar Modelo</Button>
      </form>
      
      {/* Lista de modelos */}
      <div>
        {models.map(model => (
          <div key={model.id}>
            <h3>{model.name}</h3>
            <Button onClick={() => handleEdit(model.id)}>Editar</Button>
            <Button onClick={() => handleDelete(model.id)}>Excluir</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Depois (Com Permissões)

```tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';

// 🔐 IMPORTS DE PERMISSÕES
import { ProtectedButton, ConditionalFeature } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';
import { usePermissions } from '../utils/usePermissions';

export function TireModelRegistration() {
  const [models, setModels] = useState([]);
  
  // 🔐 Hook de permissões
  const { hasFeatureAccess } = usePermissions();
  
  const handleCreate = () => {
    // 🔐 Validação adicional (opcional, para segurança extra)
    if (!hasFeatureAccess(FEATURES.MODEL_CREATE)) {
      toast.error('Você não tem permissão para criar modelos');
      return;
    }
    
    // Criar modelo
  };
  
  const handleEdit = (id) => {
    // 🔐 Validação de permissão
    if (!hasFeatureAccess(FEATURES.MODEL_EDIT)) {
      toast.error('Você não tem permissão para editar modelos');
      return;
    }
    
    // Editar modelo
  };
  
  const handleDelete = (id) => {
    // 🔐 Validação de permissão
    if (!hasFeatureAccess(FEATURES.MODEL_DELETE)) {
      toast.error('Você não tem permissão para excluir modelos');
      return;
    }
    
    // Deletar modelo
  };
  
  return (
    <div>
      <h1>Cadastro de Modelos</h1>
      
      {/* 🔐 Formulário de criação - apenas para quem pode criar */}
      <ConditionalFeature feature={FEATURES.MODEL_CREATE}>
        <form onSubmit={handleCreate}>
          <Input placeholder="Nome do modelo" />
          
          {/* 🔐 Botão protegido */}
          <ProtectedButton
            feature={FEATURES.MODEL_CREATE}
            type="submit"
            className="bg-green-600 text-white"
          >
            Criar Modelo
          </ProtectedButton>
        </form>
      </ConditionalFeature>
      
      {/* 🔐 Mensagem para quem não pode criar */}
      <ConditionalFeature 
        feature={FEATURES.MODEL_CREATE}
        fallback={
          <div className="p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            Você não tem permissão para criar novos modelos. 
            Entre em contato com um administrador.
          </div>
        }
      />
      
      {/* Lista de modelos - todos podem ver */}
      <div className="mt-6">
        <h2>Modelos Cadastrados</h2>
        {models.map(model => (
          <div key={model.id} className="border p-4 rounded-lg">
            <h3>{model.name}</h3>
            
            <div className="flex gap-2 mt-2">
              {/* 🔐 Botão de editar protegido */}
              <ProtectedButton
                feature={FEATURES.MODEL_EDIT}
                onClick={() => handleEdit(model.id)}
                variant="outline"
                size="sm"
              >
                Editar
              </ProtectedButton>
              
              {/* 🔐 Botão de excluir protegido */}
              <ProtectedButton
                feature={FEATURES.MODEL_DELETE}
                onClick={() => handleDelete(model.id)}
                variant="destructive"
                size="sm"
              >
                Excluir
              </ProtectedButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Mudanças Aplicadas

### 1. Imports Adicionados
```tsx
import { ProtectedButton, ConditionalFeature } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';
import { usePermissions } from '../utils/usePermissions';
```

### 2. Hook de Permissões
```tsx
const { hasFeatureAccess } = usePermissions();
```

### 3. Proteção de Formulário
```tsx
<ConditionalFeature feature={FEATURES.MODEL_CREATE}>
  <form>...</form>
</ConditionalFeature>
```

### 4. Botões Protegidos
```tsx
<ProtectedButton
  feature={FEATURES.MODEL_CREATE}
  onClick={handleCreate}
>
  Criar
</ProtectedButton>
```

### 5. Validações Programáticas
```tsx
if (!hasFeatureAccess(FEATURES.MODEL_DELETE)) {
  toast.error('Sem permissão');
  return;
}
```

## Resultado para Diferentes Perfis

### Administrador
- ✅ Vê formulário de criação
- ✅ Botão "Criar Modelo" habilitado
- ✅ Botões "Editar" e "Excluir" habilitados

### Operador
- ✅ Vê formulário de criação
- ✅ Botão "Criar Modelo" habilitado
- ❌ Botões "Editar" e "Excluir" desabilitados (com cadeado)

### Visualizador
- ❌ Não vê formulário de criação
- ❌ Vê mensagem informando que não pode criar
- ❌ Botões "Editar" e "Excluir" desabilitados (com cadeado)

## Checklist de Implementação

Ao implementar permissões em um componente:

- [ ] Importar `ProtectedButton`, `ConditionalFeature` e `usePermissions`
- [ ] Importar `FEATURES` de `../utils/permissions`
- [ ] Adicionar hook `usePermissions()` no componente
- [ ] Envolver formulários com `ConditionalFeature` quando apropriado
- [ ] Substituir `Button` por `ProtectedButton` em ações protegidas
- [ ] Adicionar validações programáticas em funções críticas
- [ ] Testar com diferentes perfis de usuário
- [ ] Verificar UX para usuários sem permissão

## Componentes que Precisam de Permissões

### Alta Prioridade (Ações Críticas)
- [x] TireStockEntry - Criar/editar/deletar entradas
- [ ] TireModelRegistration - Criar/editar/deletar modelos
- [ ] ContainerRegistration - Criar/editar/deletar contêineres
- [ ] StockAdjustment - Editar estoque em massa
- [ ] TireDiscard - Criar descartes
- [ ] UserManagement - Gerenciar usuários

### Média Prioridade
- [ ] TireMovement - Criar movimentações
- [ ] TireConsumption - Transferir para pilotos
- [ ] TireStatusChange - Alterar status
- [ ] StatusRegistration - Gerenciar status
- [ ] MasterData - Editar dados mestres

### Baixa Prioridade (Visualização)
- [ ] Reports - Exportar relatórios
- [ ] DiscardReports - Exportar relatórios de descarte
- [ ] Dashboard - Nenhuma ação crítica

## Notas Importantes

1. **Segurança em Camadas**: As permissões no frontend são apenas UX. O backend (Supabase) deve validar também via RLS (Row Level Security).

2. **UX para Usuários Sem Permissão**: Sempre forneça feedback claro quando um usuário não tem permissão:
   - Botões desabilitados com tooltip explicativo
   - Mensagens informativas em lugar de formulários ocultos
   - Ícone de cadeado para indicar restrição

3. **Performance**: O hook `usePermissions` carrega o perfil uma vez e cacheia. Não há overhead significativo.

4. **Testes**: Sempre teste com os 4 perfis padrão:
   - Admin (acesso total)
   - Operador (operações básicas)
   - Supervisor (operações + aprovações)
   - Visualizador (somente leitura)

## Próximos Passos

1. Implementar permissões em TireStockEntry (alta prioridade)
2. Implementar em TireModelRegistration
3. Implementar em ContainerRegistration
4. Implementar em StockAdjustment
5. Documentar casos especiais encontrados
6. Criar testes automatizados de permissões
