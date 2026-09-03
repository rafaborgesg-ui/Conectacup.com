# Sistema de Menu Dinâmico - Conecta Cup

## 📋 Visão Geral

O sistema de menu da aplicação Conecta Cup é 100% dinâmico e centralizado. Qualquer alteração no menu é automaticamente refletida em:

- **Sidebar** (navegação lateral)
- **Mobile Nav** (navegação mobile)
- **Perfis de Acesso** (lista de páginas acessíveis)
- **Sistema de Permissões** (controle de acesso RBAC)

## 🎯 Fonte Única de Verdade

O arquivo `/utils/menuStructure.ts` é a **fonte única de verdade** para toda a estrutura de navegação do sistema.

### Estrutura do Menu

```typescript
export interface MenuItem {
  id: string;              // Identificador único
  label: string;           // Nome exibido no menu
  icon?: any;              // Ícone do Lucide React
  isMain?: boolean;        // Se é um menu principal (top-level)
  adminOnly?: boolean;     // Se requer privilégios de admin
  externalUrl?: string;    // URL externa (abre em nova aba)
  subItems?: MenuItem[];   // Subitens (menu aninhado)
  description?: string;    // Descrição para uso em Perfis de Acesso
}
```

## ➕ Como Adicionar um Novo Menu

### Passo 1: Adicionar no MENU_STRUCTURE

Edite `/utils/menuStructure.ts` e adicione o novo item:

```typescript
export const MENU_STRUCTURE: MenuItem[] = [
  // ... menus existentes
  {
    id: 'novo-menu',
    label: 'Novo Menu',
    icon: IconeDoLucide,
    isMain: true,
    externalUrl: 'https://exemplo.com', // Opcional
    description: 'Descrição do novo menu'
  },
];
```

### Passo 2: Adicionar Constante no PAGES

Edite `/utils/permissions.ts` e adicione a nova constante:

```typescript
export const PAGES = {
  // ... páginas existentes
  NOVO_MENU: 'novo_menu',
} as const;
```

### Passo 3: Adicionar Mapeamento

No arquivo `/utils/menuStructure.ts`, adicione o mapeamento:

```typescript
export const MENU_TO_PAGE_MAP: Record<string, string> = {
  // ... mapeamentos existentes
  'novo-menu': 'NOVO_MENU',
};
```

### Passo 4: Adicionar Label (Opcional)

Para um nome mais amigável, adicione em `/utils/permissions.ts`:

```typescript
export const PAGE_LABELS: Record<PageKey, string> = {
  // ... labels existentes
  [PAGES.NOVO_MENU]: 'Novo Menu',
};
```

## ✅ Resultado Automático

Após seguir os 3 passos acima, o novo menu irá:

✅ Aparecer automaticamente na Sidebar  
✅ Aparecer automaticamente no Mobile Nav  
✅ Aparecer automaticamente em **Perfis de Acesso > Páginas Acessíveis**  
✅ Ser controlado pelo sistema de permissões RBAC  
✅ Respeitar configurações de `adminOnly`  
✅ Respeitar configurações de `externalUrl`

## 🔄 Como Funciona Internamente

### 1. Extração de Páginas

O sistema possui funções utilitárias para extrair páginas do menu:

```typescript
// Extrai TODAS as páginas (incluindo categorias)
extractAllPages(): MenuItem[]

// Extrai apenas páginas navegáveis (sem categorias)
extractNavigablePages(): MenuItem[]

// Organiza páginas por categoria
getPagesByCategory(): Record<string, MenuItem[]>
```

### 2. Geração Dinâmica de Categorias

A função `generatePageCategoriesFromMenu()` gera automaticamente as categorias de páginas:

```typescript
export function generatePageCategoriesFromMenu(): Record<string, PageKey[]> {
  const categories: Record<string, PageKey[]> = {};
  const pagesByCategory = getPagesByCategory();
  
  for (const [categoryLabel, menuItems] of Object.entries(pagesByCategory)) {
    const pageKeys: PageKey[] = [];
    
    for (const item of menuItems) {
      const pageKey = MENU_TO_PAGE_MAP[item.id];
      if (pageKey && PAGES[pageKey as keyof typeof PAGES]) {
        pageKeys.push(PAGES[pageKey as keyof typeof PAGES] as PageKey);
      }
    }
    
    if (pageKeys.length > 0) {
      categories[categoryLabel] = pageKeys;
    }
  }
  
  return categories;
}
```

### 3. Uso em Perfis de Acesso

O componente `AccessProfileManagement` usa as categorias dinâmicas:

```typescript
const dynamicPageCategories = getDynamicPageCategories();
const dynamicPageLabels = generatePageLabelsFromMenu();
```

## 📦 Exemplos de Configurações

### Menu Simples (Link Externo)

```typescript
{
  id: 'manutencao-predial',
  label: 'Manutenção predial',
  icon: Wrench,
  isMain: true,
  externalUrl: 'https://docs.google.com/forms/...',
  description: 'Formulário de solicitação de manutenção predial'
}
```

### Menu com Subitens

```typescript
{
  id: 'pneus',
  label: 'Pneus',
  icon: Package,
  isMain: true,
  description: 'Gestão de pneus',
  subItems: [
    { 
      id: 'tire-stock', 
      label: 'Entrada de Estoque', 
      icon: Package,
      description: 'Registro de entrada de pneus no estoque'
    },
    { 
      id: 'tire-movement', 
      label: 'Movimentação de Pneus', 
      icon: ArrowRightLeft,
      description: 'Movimentação de pneus entre contêineres'
    },
  ]
}
```

### Menu Administrativo

```typescript
{
  id: 'cadastro',
  label: 'Cadastro',
  icon: Settings,
  isMain: true,
  adminOnly: true, // Apenas administradores
  description: 'Cadastros gerais do sistema',
  subItems: [...]
}
```

### Menu com Hierarquia Multinível

```typescript
{
  id: 'solicitacao-frete',
  label: 'Solicitação de frete',
  icon: Truck,
  isMain: true,
  subItems: [
    {
      id: 'frete-nacional',
      label: 'Nacional',
      icon: MapPin,
      subItems: [
        { 
          id: 'frete-smartphone', 
          label: 'Smartphone', 
          icon: Smartphone, 
          externalUrl: 'https://sites.google.com/...'
        },
        { 
          id: 'frete-web', 
          label: 'Web', 
          icon: Monitor, 
          externalUrl: 'https://script.google.com/...'
        },
      ]
    },
    { 
      id: 'frete-internacional', 
      label: 'Internacional', 
      icon: Globe, 
      externalUrl: 'https://docs.google.com/...'
    },
  ]
}
```

## 🎨 Ícones Disponíveis

Todos os ícones são do `lucide-react`. Exemplos:

```typescript
import { 
  LayoutDashboard,  // Dashboard
  Package,          // Pacotes/Estoque
  CircleDot,        // Status/Modelos
  Box,              // Contêineres
  BarChart3,        // Relatórios
  ArrowRightLeft,   // Movimentação
  Trash2,           // Descarte
  Shield,           // Administração
  Truck,            // Frete
  Wrench,           // Manutenção
  ClipboardList,    // Gestão
  Globe,            // Internacional
  MapPin,           // Local/Nacional
  Smartphone,       // Mobile
  Monitor,          // Web
  Database,         // Dados
  Settings,         // Configurações
  Code,             // Desenvolvimento
  UserCircle,       // Usuário/Piloto
} from 'lucide-react';
```

## 🔐 Integração com RBAC

O sistema de permissões (RBAC) consome automaticamente a estrutura do menu:

```typescript
// Verifica se o usuário tem acesso à página
const { hasPageAccess } = usePermissions();
const canAccess = hasPageAccess(PAGES.NOVO_MENU);

// Filtra menus visíveis baseado nas permissões
const visibleMenus = MENU_STRUCTURE.filter(item => {
  const pageKey = MENU_TO_PAGE_MAP[item.id];
  return pageKey && hasPageAccess(PAGES[pageKey]);
});
```

## 📝 Checklist de Implementação

Ao adicionar um novo menu, siga este checklist:

- [ ] Adicionar item em `MENU_STRUCTURE` (menuStructure.ts)
- [ ] Adicionar constante em `PAGES` (permissions.ts)
- [ ] Adicionar mapeamento em `MENU_TO_PAGE_MAP` (menuStructure.ts)
- [ ] (Opcional) Adicionar label em `PAGE_LABELS` (permissions.ts)
- [ ] Testar se aparece na Sidebar
- [ ] Testar se aparece em Perfis de Acesso
- [ ] Testar permissões de acesso
- [ ] Testar em mobile (MobileNav)

## 🎯 Benefícios

✅ **Manutenção Simplificada**: Um único lugar para gerenciar toda a estrutura  
✅ **Consistência**: Garante que menu, permissões e navegação estejam sempre sincronizados  
✅ **Escalabilidade**: Adicionar novos menus é rápido e seguro  
✅ **Rastreabilidade**: Histórico de mudanças no Git  
✅ **Type-Safety**: TypeScript garante que não há erros de digitação  
✅ **Automação**: Reduz trabalho manual e possibilidade de erros

## 🚨 Importante

⚠️ **NUNCA** edite as páginas acessíveis diretamente no componente `AccessProfileManagement`  
⚠️ **SEMPRE** adicione novos menus no arquivo central `menuStructure.ts`  
⚠️ **SEMPRE** atualize os 3 locais: MENU_STRUCTURE, PAGES e MENU_TO_PAGE_MAP  

## 📚 Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `/utils/menuStructure.ts` | Estrutura central do menu + mapeamentos |
| `/utils/permissions.ts` | Constantes PAGES + labels + categorias |
| `/components/Sidebar.tsx` | Renderização do menu lateral |
| `/components/MobileNav.tsx` | Renderização do menu mobile |
| `/components/AccessProfileManagement.tsx` | Interface de gerenciamento de perfis |
| `/hooks/usePermissions.ts` | Hook de verificação de permissões |

## 🔍 Debugging

Para debugar o sistema dinâmico, observe os logs no console:

```
✅ Usando categorias dinâmicas do menu: ['Gestão de Carga', 'Manutenção predial', ...]
📋 Páginas permitidas: ['stock_entry', 'tire_movement', ...]
```

Se algo não estiver aparecendo:
1. Verifique se o mapeamento existe em `MENU_TO_PAGE_MAP`
2. Verifique se a constante existe em `PAGES`
3. Verifique se o ID do menu está correto

## 🎓 Conclusão

Este sistema foi projetado para crescer com a aplicação. Ao seguir a estrutura estabelecida, você garante que todos os componentes permaneçam sincronizados e o sistema continue escalável e manutenível.

Para dúvidas ou sugestões de melhorias, consulte a documentação completa em `/docs/`.
