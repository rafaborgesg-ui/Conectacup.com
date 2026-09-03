# ⚡ GUIA RÁPIDO: Adicionar Novo Menu

## 🎯 O sistema JÁ FUNCIONA! Só siga estes 3 passos:

### 1️⃣ Adicione o menu em `/utils/menuStructure.ts`

```typescript
// Exemplo: Adicionando "Nova Página" dentro de "Pneus"
{
  id: 'pneus',
  label: 'Pneus',
  subItems: [
    // ... itens existentes ...
    { 
      id: 'nova-pagina',  // ⬅️ NOVO
      label: 'Nova Página',
      icon: Package,
    },
  ]
},
```

### 2️⃣ Adicione o mapeamento no **MESMO arquivo** `/utils/menuStructure.ts`

Role até `MENU_TO_PAGE_MAP`:

```typescript
export const MENU_TO_PAGE_MAP: Record<string, string> = {
  // ... mapeamentos existentes ...
  'nova-pagina': 'NOVA_PAGINA',  // ⬅️ ADICIONE AQUI
};
```

### 3️⃣ Adicione a constante em `/utils/permissions.ts`

```typescript
export const PAGES = {
  // ... páginas existentes ...
  NOVA_PAGINA: 'nova_pagina',  // ⬅️ ADICIONE AQUI
} as const;
```

---

## ✅ PRONTO! Agora vá em:

**Administração > Perfis de Acesso** → Clique no botão **🔄 Atualizar** 

A nova página vai aparecer!

---

## 📝 FORMATO:

- **ID do menu:** `'kebab-case'` (nova-pagina)
- **Mapeamento:** `'UPPERCASE_UNDERSCORE'` (NOVA_PAGINA)  
- **Constante:** `'lowercase_underscore'` (nova_pagina)
