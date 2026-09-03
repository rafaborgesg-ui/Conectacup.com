# 🔗 FIX: Links Externos Ignorando Permissões

## ❌ **PROBLEMA IDENTIFICADO:**

Links externos como "Gestão de Carga", "Manutenção Predial" e "Solicitação de Frete" apareciam no menu **MESMO quando desmarcados** no perfil de acesso do usuário.

---

## 🔍 **CAUSA RAIZ:**

No arquivo `/components/Sidebar.tsx`, havia uma regra na função `filterMenuItems()` que **forçava** todos os links externos a aparecerem, ignorando completamente o sistema de permissões:

### **Código problemático (linha 33-34):**
```typescript
// Links externos sempre são mostrados
if (item.externalUrl) return true; // ❌ BYPASS nas permissões!
```

Isso significava:
- ✅ Páginas internas respeitavam permissões
- ❌ **Links externos SEMPRE eram mostrados**

---

## ✅ **SOLUÇÃO APLICADA:**

Removi a regra especial para links externos e unifiquei a lógica de verificação de permissões para **TODOS os itens** do menu (internos e externos).

### **Arquivo modificado:** `/components/Sidebar.tsx`

### **Antes (INCORRETO):**
```typescript
const filterMenuItems = (items: any[]): any[] => {
  return items.filter(item => {
    // Links externos sempre são mostrados
    if (item.externalUrl) return true; // ❌ Bypass!
    
    // ... resto da lógica
  });
};
```

### **Depois (CORRETO):**
```typescript
const filterMenuItems = (items: any[]): any[] => {
  return items.filter(item => {
    // Se tem subItems, filtra recursivamente primeiro
    if (item.subItems) {
      const filteredSubItems = filterMenuItems(item.subItems);
      if (filteredSubItems.length === 0) return false;
      item.subItems = filteredSubItems;
      return true;
    }
    
    // Verifica permissões (inclui links externos E páginas internas)
    const pageKey = menuToPageMap[item.id];
    if (pageKey) {
      return hasPageAccess(PAGES[pageKey]); // ✅ Valida TODOS
    }
    
    // Se não tem mapeamento, verifica adminOnly
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    
    return true;
  });
};
```

---

## 🎯 **MUDANÇAS:**

1. ✅ **Removida regra especial** para `item.externalUrl`
2. ✅ **Unificada verificação de permissões** para links internos e externos
3. ✅ **Mantida lógica de filtragem recursiva** para submenus
4. ✅ **Mantida compatibilidade** com `adminOnly`

---

## 📋 **LINKS EXTERNOS AFETADOS:**

Agora **RESPEITAM permissões**:
- `gestao-carga` → "Gestão de Carga"
- `manutencao-predial` → "Manutenção Predial"
- `frete-smartphone` → "Frete Smartphone"
- `frete-web` → "Frete Web"
- `frete-internacional` → "Frete Internacional"

---

## 🧪 **COMO TESTAR:**

1. ✅ Logue como **admin**
2. ✅ Vá em **"Perfis de Acesso"**
3. ✅ Edite o perfil **"Operador"**
4. ✅ **DESMARQUE** "Gestão de Carga"
5. ✅ **DESMARQUE** "Manutenção Predial"
6. ✅ **Salve**
7. ✅ Faça **logout**
8. ✅ Logue com usuário **operador**
9. ✅ Verifique que **NÃO aparecem** no menu lateral

---

## 🔐 **SISTEMA DE MAPEAMENTO:**

Os links externos estão mapeados no `/utils/menuStructure.ts`:

```typescript
export const MENU_TO_PAGE_MAP: Record<string, string> = {
  // ... outras páginas
  
  // Links externos
  'gestao-carga': 'GESTAO_CARGA',
  'manutencao-predial': 'MANUTENCAO_PREDIAL',
  'frete-smartphone': 'FRETE_SMARTPHONE',
  'frete-web': 'FRETE_WEB',
  'frete-internacional': 'FRETE_INTERNACIONAL',
};
```

E os `PageKeys` correspondentes em `/utils/permissions.ts`:

```typescript
export const PAGES = {
  // ... outras páginas
  
  // Links externos
  GESTAO_CARGA: 'gestao_carga',
  MANUTENCAO_PREDIAL: 'manutencao_predial',
  FRETE_SMARTPHONE: 'frete_smartphone',
  FRETE_WEB: 'frete_web',
  FRETE_INTERNACIONAL: 'frete_internacional',
} as const;
```

---

## ✅ **RESULTADO:**

Agora o sistema de permissões funciona **100% uniformemente**:

- ✅ Páginas internas respeitam permissões
- ✅ **Links externos TAMBÉM respeitam permissões**
- ✅ Subitens são filtrados recursivamente
- ✅ Menus pais são ocultados se não sobrar nenhum subitem visível

---

## 🎓 **APRENDIZADO:**

**Nunca crie regras especiais que bypassam o sistema de segurança!**

Mesmo sendo "apenas links externos", eles devem respeitar o controle de acesso configurado pelos administradores.

---

**Data da correção:** 19/11/2025  
**Arquivo modificado:** `/components/Sidebar.tsx`  
**Linhas alteradas:** 30-58 (função `filterMenuItems`)  
**Impacto:** Segurança - Controle de acesso a links externos
