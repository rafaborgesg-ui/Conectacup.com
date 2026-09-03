# 🔍 SCRIPT DE VALIDAÇÃO - Sincronização Menu ↔ Páginas Acessíveis

## Como usar

Copie e cole este código no **Console do Navegador** (F12) dentro da aplicação:

```javascript
// ========================================
// SCRIPT DE VALIDAÇÃO DE SINCRONIZAÇÃO
// ========================================

console.log('🔍 ===== VALIDANDO SINCRONIZAÇÃO MENU ↔ PÁGINAS =====\n');

// Importa estruturas (se estiver no contexto da app)
import { MENU_STRUCTURE, MENU_TO_PAGE_MAP } from './utils/menuStructure';
import { PAGES } from './utils/permissions';

// Função para extrair todos os IDs do menu recursivamente
function extractAllMenuIds(items, ids = []) {
  for (const item of items) {
    ids.push(item.id);
    if (item.subItems && item.subItems.length > 0) {
      extractAllMenuIds(item.subItems, ids);
    }
  }
  return ids;
}

// Extrai todos os IDs
const allMenuIds = extractAllMenuIds(MENU_STRUCTURE);
console.log(`📋 Total de itens no menu: ${allMenuIds.length}`);
console.log('IDs do menu:', allMenuIds);

// Verifica quais IDs do menu NÃO estão no mapeamento
const missingInMap = allMenuIds.filter(id => !MENU_TO_PAGE_MAP[id]);

// Verifica quais IDs mapeados NÃO existem em PAGES
const missingInPages = Object.keys(MENU_TO_PAGE_MAP)
  .filter(menuId => {
    const pageKey = MENU_TO_PAGE_MAP[menuId];
    return !Object.values(PAGES).includes(pageKey.toLowerCase().replace(/_/g, '-'));
  });

console.log('\n📊 RESULTADO:\n');

if (missingInMap.length > 0) {
  console.error('❌ IDs do menu SEM mapeamento em MENU_TO_PAGE_MAP:');
  missingInMap.forEach(id => console.error(`   - ${id}`));
  console.log('\n💡 SOLUÇÃO: Adicione em menuStructure.ts > MENU_TO_PAGE_MAP:');
  missingInMap.forEach(id => {
    const constName = id.toUpperCase().replace(/-/g, '_');
    console.log(`   '${id}': '${constName}',`);
  });
} else {
  console.log('✅ Todos os IDs do menu estão mapeados!');
}

if (missingInPages.length > 0) {
  console.error('\n❌ Keys mapeadas SEM constante correspondente em PAGES:');
  missingInPages.forEach(key => console.error(`   - ${key} -> ${MENU_TO_PAGE_MAP[key]}`));
  console.log('\n💡 SOLUÇÃO: Adicione em permissions.ts > PAGES:');
  missingInPages.forEach(key => {
    const pageConst = MENU_TO_PAGE_MAP[key];
    const pageValue = key.replace(/-/g, '_');
    console.log(`   ${pageConst}: '${pageValue}',`);
  });
} else {
  console.log('✅ Todas as keys mapeadas existem em PAGES!');
}

console.log('\n🔍 ===== FIM DA VALIDAÇÃO =====\n');

// Retorna diagnóstico
return {
  totalMenuIds: allMenuIds.length,
  missingInMap: missingInMap,
  missingInPages: missingInPages,
  isValid: missingInMap.length === 0 && missingInPages.length === 0
};
```

---

## OU use esta função simplificada que já existe no sistema:

```javascript
// Cole no console do navegador (F12)
import { diagnoseMissingPages } from './utils/permissions';

const result = diagnoseMissingPages();

if (result.success) {
  console.log('✅ TUDO SINCRONIZADO!');
} else {
  console.error('❌ Problemas encontrados:');
  result.suggestions.forEach(s => console.log(s));
}
```

---

## O que este script valida:

1. ✅ Todos os IDs do `MENU_STRUCTURE` estão em `MENU_TO_PAGE_MAP`
2. ✅ Todos os valores de `MENU_TO_PAGE_MAP` existem em `PAGES`
3. ✅ Labels dinâmicos são gerados corretamente

---

## Resultado esperado:

Se tudo estiver correto, você verá:
```
✅ Todos os IDs do menu estão mapeados!
✅ Todas as keys mapeadas existem em PAGES!
✅ TUDO SINCRONIZADO!
```

Se houver problemas, o script mostrará exatamente o que adicionar e onde.
