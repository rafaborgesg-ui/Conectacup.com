# 🔐 Guia de Permissões e Funcionalidades (RBAC)

## Visão Geral

O sistema de permissões da Conecta Cup implementa **RBAC (Role-Based Access Control)** em **dois níveis**:

1. **Nível de Página**: Controla quais páginas o usuário pode acessar
2. **Nível de Funcionalidade**: Controla quais ações o usuário pode executar dentro de cada página

## Estrutura de Permissões

### Páginas (PAGES)
Definidas em `/utils/permissions.ts`:

```typescript
export const PAGES = {
  DASHBOARD: 'dashboard',
  STOCK_ENTRY: 'stock_entry',
  TIRE_MODEL: 'tire_model',
  CONTAINER: 'container',
  REPORTS: 'reports',
  DISCARD_REPORTS: 'discard_reports',
  USER_MANAGEMENT: 'user_management',
  MASTER_DATA: 'master_data',
  STATUS_REGISTRATION: 'status_registration',
  STOCK_ADJUSTMENT: 'stock_adjustment',
  TIRE_MOVEMENT: 'tire_movement',
  TIRE_STATUS_CHANGE: 'tire_status_change',
  TIRE_DISCARD: 'tire_discard',
  TIRE_CONSUMPTION: 'tire_consumption',
  DATA_IMPORT: 'data_import',
  ARCS_UPDATE: 'arcs_update',
} as const;
```

### Funcionalidades (FEATURES)
Ações específicas que podem ser controladas:

```typescript
export const FEATURES = {
  // Entrada de Estoque
  STOCK_CREATE: 'stock_create',
  STOCK_EDIT: 'stock_edit',
  STOCK_DELETE: 'stock_delete',
  STOCK_EXPORT: 'stock_export',
  
  // Modelos de Pneu
  MODEL_CREATE: 'model_create',
  MODEL_EDIT: 'model_edit',
  MODEL_DELETE: 'model_delete',
  
  // Contêineres
  CONTAINER_CREATE: 'container_create',
  CONTAINER_EDIT: 'container_edit',
  CONTAINER_DELETE: 'container_delete',
  
  // Relatórios
  REPORTS_VIEW: 'reports_view',
  REPORTS_EXPORT: 'reports_export',
  
  // Usuários
  USER_CREATE: 'user_create',
  USER_EDIT: 'user_edit',
  USER_DELETE: 'user_delete',
  USER_VIEW: 'user_view',
  
  // Master Data
  MASTER_DATA_EDIT: 'master_data_edit',
  
  // Status
  STATUS_CREATE: 'status_create',
  STATUS_EDIT: 'status_edit',
  STATUS_DELETE: 'status_delete',
  
  // Movimentação
  MOVEMENT_CREATE: 'movement_create',
  MOVEMENT_APPROVE: 'movement_approve',
  
  // Descarte
  DISCARD_CREATE: 'discard_create',
  DISCARD_VIEW: 'discard_view',
  
  // Importação
  IMPORT_DATA: 'import_data',
  
  // ARCS
  ARCS_UPDATE: 'arcs_update',
  ARCS_VIEW: 'arcs_view',
} as const;
```

## Perfis Padrão do Sistema

### 1. Administrador
- **Acesso**: Total (todas as páginas e funcionalidades)
- **Uso**: Gerentes, administradores do sistema

### 2. Operador
- **Acesso**: Funcionalidades operacionais básicas
- **Páginas**: Dashboard, Entrada de Estoque, Modelos, Contêineres, Relatórios, Movimentação, Alteração de Status
- **Funcionalidades**: Criar entradas, exportar, criar modelos/contêineres, visualizar relatórios, criar movimentações

### 3. Supervisor
- **Acesso**: Operacional completo + aprovações e descartes
- **Páginas**: Todas operacionais + Relatórios de Descarte + Ajuste de Estoque + Descarte
- **Funcionalidades**: Tudo do Operador + edição + aprovações + descartes

### 4. Visualizador
- **Acesso**: Somente leitura
- **Páginas**: Dashboard, Relatórios, Relatórios de Descarte
- **Funcionalidades**: Apenas visualização e exportação de relatórios

## Como Usar Permissões nos Componentes

### 1. Proteger Páginas Inteiras

Use o componente `ProtectedRoute`:

```tsx
import { ProtectedRoute } from './ProtectedRoute';
import { PAGES } from '../utils/permissions';

// No App.tsx ou roteador
{currentModule === 'tire-stock' && (
  <ProtectedRoute page={PAGES.STOCK_ENTRY}>
    <TireStockEntry />
  </ProtectedRoute>
)}
```

### 2. Proteger Botões e Ações

Use o componente `ProtectedButton`:

```tsx
import { ProtectedButton } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';

// Botão de criar
<ProtectedButton
  feature={FEATURES.STOCK_CREATE}
  onClick={handleCreate}
  className="bg-green-600 text-white"
>
  Criar Entrada
</ProtectedButton>

// Botão de editar
<ProtectedButton
  feature={FEATURES.STOCK_EDIT}
  onClick={handleEdit}
  variant="outline"
>
  Editar
</ProtectedButton>

// Botão de deletar
<ProtectedButton
  feature={FEATURES.STOCK_DELETE}
  onClick={handleDelete}
  variant="destructive"
>
  Excluir
</ProtectedButton>
```

**Comportamento**: O botão fica automaticamente desabilitado se o usuário não tiver a permissão, com um ícone de cadeado e tooltip explicativo.

### 3. Renderização Condicional

Use o componente `ConditionalFeature`:

```tsx
import { ConditionalFeature } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';

// Mostrar seção apenas para quem pode editar
<ConditionalFeature feature={FEATURES.STOCK_EDIT}>
  <div className="edit-section">
    <h3>Edição</h3>
    <Button onClick={handleEdit}>Editar Lote</Button>
  </div>
</ConditionalFeature>

// Com fallback
<ConditionalFeature 
  feature={FEATURES.REPORTS_EXPORT}
  fallback={
    <div className="text-gray-500 text-sm">
      Você não tem permissão para exportar relatórios
    </div>
  }
>
  <Button onClick={handleExport}>Exportar Excel</Button>
</ConditionalFeature>
```

### 4. Verificação Programática

Use o hook `usePermissions`:

```tsx
import { usePermissions } from '../utils/usePermissions';
import { FEATURES, PAGES } from '../utils/permissions';

function MyComponent() {
  const { 
    hasFeatureAccess, 
    hasPageAccess, 
    isUserAdmin,
    getProfileName 
  } = usePermissions();

  // Verificar funcionalidade
  const canEdit = hasFeatureAccess(FEATURES.STOCK_EDIT);
  
  // Verificar múltiplas funcionalidades
  const canManageStock = hasAnyFeatureAccess([
    FEATURES.STOCK_CREATE,
    FEATURES.STOCK_EDIT,
    FEATURES.STOCK_DELETE
  ]);
  
  // Lógica condicional
  const handleAction = () => {
    if (!hasFeatureAccess(FEATURES.STOCK_DELETE)) {
      toast.error('Você não tem permissão para deletar entradas');
      return;
    }
    
    // Executar ação
    deleteEntry();
  };
  
  // Renderização condicional
  return (
    <div>
      <h1>Estoque</h1>
      {canEdit && <Button onClick={handleEdit}>Editar</Button>}
      {isUserAdmin() && <AdminPanel />}
      <p>Perfil: {getProfileName()}</p>
    </div>
  );
}
```

## Exemplos de Implementação por Página

### Entrada de Estoque (TireStockEntry)

```tsx
import { ProtectedButton, ConditionalFeature } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';

export function TireStockEntry() {
  // ... código existente ...

  return (
    <div>
      {/* Botões protegidos */}
      <div className="flex gap-2">
        <ProtectedButton
          feature={FEATURES.STOCK_CREATE}
          onClick={handleRegister}
          className="bg-green-600 text-white"
        >
          Registrar Pneu
        </ProtectedButton>
        
        <ProtectedButton
          feature={FEATURES.STOCK_DELETE}
          onClick={handleDelete}
          variant="destructive"
        >
          Excluir Selecionados
        </ProtectedButton>
        
        <ProtectedButton
          feature={FEATURES.STOCK_EXPORT}
          onClick={handleExport}
          variant="outline"
        >
          Exportar Excel
        </ProtectedButton>
      </div>

      {/* Seção de entrada em massa - apenas para admins */}
      <ConditionalFeature feature={FEATURES.IMPORT_DATA}>
        <div className="bulk-entry-section">
          <h3>Entrada em Massa</h3>
          {/* ... formulário ... */}
        </div>
      </ConditionalFeature>

      {/* Lista de entradas */}
      <div className="entries-list">
        {entries.map(entry => (
          <div key={entry.id} className="entry-card">
            <p>{entry.barcode}</p>
            
            {/* Botões de ação */}
            <div className="actions">
              <ProtectedButton
                feature={FEATURES.STOCK_EDIT}
                onClick={() => handleEdit(entry.id)}
                size="sm"
              >
                Editar
              </ProtectedButton>
              
              <ProtectedButton
                feature={FEATURES.STOCK_DELETE}
                onClick={() => handleDeleteEntry(entry.id)}
                variant="destructive"
                size="sm"
              >
                Deletar
              </ProtectedButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Relatórios (Reports)

```tsx
import { ProtectedButton, ConditionalFeature } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';
import { usePermissions } from '../utils/usePermissions';

export function Reports() {
  const { hasFeatureAccess } = usePermissions();

  const handleExport = () => {
    if (!hasFeatureAccess(FEATURES.REPORTS_EXPORT)) {
      toast.error('Você não tem permissão para exportar relatórios');
      return;
    }
    
    // Lógica de exportação
    exportToExcel();
  };

  return (
    <div>
      <PageHeader 
        title="Relatórios & Histórico"
        subtitle="Visualize e exporte dados do sistema"
      />

      {/* Filtros - todos podem ver */}
      <div className="filters">
        {/* ... filtros ... */}
      </div>

      {/* Tabela de dados - apenas quem tem visualização */}
      <ConditionalFeature 
        feature={FEATURES.REPORTS_VIEW}
        fallback={
          <div className="text-center py-8 text-gray-500">
            Você não tem permissão para visualizar relatórios
          </div>
        }
      >
        <div className="data-table">
          {/* ... tabela ... */}
        </div>
      </ConditionalFeature>

      {/* Botões de exportação */}
      <div className="export-buttons">
        <ProtectedButton
          feature={FEATURES.REPORTS_EXPORT}
          onClick={handleExport}
          className="bg-green-600 text-white"
        >
          Exportar Excel
        </ProtectedButton>
      </div>
    </div>
  );
}
```

### Cadastro de Modelos (TireModelRegistration)

```tsx
import { ProtectedButton, ConditionalFeature } from './ProtectedRoute';
import { FEATURES } from '../utils/permissions';

export function TireModelRegistration() {
  return (
    <div>
      {/* Formulário de criação */}
      <ConditionalFeature feature={FEATURES.MODEL_CREATE}>
        <form onSubmit={handleSubmit}>
          <h3>Novo Modelo</h3>
          {/* ... campos ... */}
          <ProtectedButton
            feature={FEATURES.MODEL_CREATE}
            type="submit"
          >
            Salvar Modelo
          </ProtectedButton>
        </form>
      </ConditionalFeature>

      {/* Lista de modelos */}
      <div className="models-list">
        {models.map(model => (
          <div key={model.id} className="model-card">
            <h4>{model.name}</h4>
            
            <div className="actions">
              <ProtectedButton
                feature={FEATURES.MODEL_EDIT}
                onClick={() => handleEdit(model)}
                size="sm"
              >
                Editar
              </ProtectedButton>
              
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

## Mapeamento de Permissões por Componente

### Operacionais

| Componente | Página | Funcionalidades Necessárias |
|------------|--------|----------------------------|
| TireStockEntry | `STOCK_ENTRY` | `STOCK_CREATE`, `STOCK_EDIT`, `STOCK_DELETE`, `STOCK_EXPORT` |
| TireModelRegistration | `TIRE_MODEL` | `MODEL_CREATE`, `MODEL_EDIT`, `MODEL_DELETE` |
| ContainerRegistration | `CONTAINER` | `CONTAINER_CREATE`, `CONTAINER_EDIT`, `CONTAINER_DELETE` |

### Movimentação

| Componente | Página | Funcionalidades Necessárias |
|------------|--------|----------------------------|
| StockAdjustment | `STOCK_ADJUSTMENT` | `STOCK_EDIT` |
| TireMovement | `TIRE_MOVEMENT` | `MOVEMENT_CREATE`, `MOVEMENT_APPROVE` |
| TireStatusChange | `TIRE_STATUS_CHANGE` | `STATUS_EDIT` |
| TireDiscard | `TIRE_DISCARD` | `DISCARD_CREATE` |
| TireConsumption | `TIRE_CONSUMPTION` | `MOVEMENT_CREATE` |

### Relatórios

| Componente | Página | Funcionalidades Necessárias |
|------------|--------|----------------------------|
| Reports | `REPORTS` | `REPORTS_VIEW`, `REPORTS_EXPORT` |
| DiscardReports | `DISCARD_REPORTS` | `DISCARD_VIEW`, `REPORTS_EXPORT` |

### Administração

| Componente | Página | Funcionalidades Necessárias |
|------------|--------|----------------------------|
| UserManagement | `USER_MANAGEMENT` | `USER_VIEW`, `USER_CREATE`, `USER_EDIT`, `USER_DELETE` |
| MasterData | `MASTER_DATA` | `MASTER_DATA_EDIT` |
| StatusRegistration | `STATUS_REGISTRATION` | `STATUS_CREATE`, `STATUS_EDIT`, `STATUS_DELETE` |
| DataImport | `DATA_IMPORT` | `IMPORT_DATA` |
| ARCSDataUpdate | `ARCS_UPDATE` | `ARCS_UPDATE`, `ARCS_VIEW` |

## Boas Práticas

### ✅ Faça

1. **Sempre use ProtectedRoute para páginas**
   ```tsx
   <ProtectedRoute page={PAGES.STOCK_ENTRY}>
     <TireStockEntry />
   </ProtectedRoute>
   ```

2. **Use ProtectedButton para ações principais**
   ```tsx
   <ProtectedButton feature={FEATURES.STOCK_CREATE} onClick={handleCreate}>
     Criar
   </ProtectedButton>
   ```

3. **Use ConditionalFeature para seções inteiras**
   ```tsx
   <ConditionalFeature feature={FEATURES.STOCK_EDIT}>
     <EditSection />
   </ConditionalFeature>
   ```

4. **Valide permissões antes de ações críticas**
   ```tsx
   if (!hasFeatureAccess(FEATURES.STOCK_DELETE)) {
     toast.error('Sem permissão');
     return;
   }
   ```

### ❌ Não Faça

1. **Não confie apenas em UI para segurança**
   - Sempre valide no backend também

2. **Não crie lógica de permissão customizada**
   - Use os componentes e hooks fornecidos

3. **Não hardcode verificações de role**
   ```tsx
   // ❌ Errado
   if (userRole === 'admin') { ... }
   
   // ✅ Correto
   if (hasFeatureAccess(FEATURES.USER_CREATE)) { ... }
   ```

## Adicionando Novas Funcionalidades

### 1. Definir a Funcionalidade

Em `/utils/permissions.ts`:

```typescript
export const FEATURES = {
  // ... existentes ...
  
  // Nova funcionalidade
  BULK_IMPORT: 'bulk_import',
  BULK_EXPORT: 'bulk_export',
} as const;
```

### 2. Adicionar Label

```typescript
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  // ... existentes ...
  
  [FEATURES.BULK_IMPORT]: 'Importação em Massa',
  [FEATURES.BULK_EXPORT]: 'Exportação em Massa',
};
```

### 3. Adicionar aos Perfis Apropriados

```typescript
export const DEFAULT_PROFILES = [
  {
    id: 'admin',
    // ...
    features: [
      // ... existentes ...
      FEATURES.BULK_IMPORT,
      FEATURES.BULK_EXPORT,
    ],
  },
  // ...
];
```

### 4. Usar no Componente

```tsx
<ProtectedButton
  feature={FEATURES.BULK_IMPORT}
  onClick={handleBulkImport}
>
  Importar em Massa
</ProtectedButton>
```

## Testando Permissões

### Console do Navegador

```javascript
// Ver perfil atual
const user = JSON.parse(localStorage.getItem('porsche-cup-user'));
console.log('Perfil:', user.profileId);

// Ver perfis disponíveis
const profiles = JSON.parse(localStorage.getItem('porsche-cup-profiles'));
console.log('Perfis:', profiles);

// Mudar perfil para testes (APENAS EM DESENVOLVIMENTO)
const user = JSON.parse(localStorage.getItem('porsche-cup-user'));
user.profileId = 'viewer'; // ou 'operator', 'supervisor', 'admin'
localStorage.setItem('porsche-cup-user', JSON.stringify(user));
location.reload();
```

### Criar Perfil de Teste

No painel de Perfis de Acesso, crie um perfil customizado com permissões específicas para testar diferentes cenários.

## Sincronização com Supabase

Os perfis são armazenados no Supabase (tabela `access_profiles`) e sincronizados com o localStorage para cache.

### Estrutura da Tabela

```sql
CREATE TABLE access_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pages JSONB NOT NULL DEFAULT '[]',
  features JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Atribuir Perfil a Usuário

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"profileId": "operator"}'::jsonb
WHERE email = 'usuario@example.com';
```

## Resumo

O sistema de permissões da Conecta Cup oferece:

- ✅ Controle granular de acesso (páginas + funcionalidades)
- ✅ Componentes React prontos para uso
- ✅ Perfis padrão configuráveis
- ✅ Interface visual para gerenciar perfis
- ✅ Sincronização com Supabase
- ✅ Fallbacks e mensagens de erro claras
- ✅ Fácil extensão e customização

Use este guia como referência ao implementar novas funcionalidades ou páginas no sistema.
