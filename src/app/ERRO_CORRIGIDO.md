# ✅ Erro de Sintaxe Corrigido

## 🐛 Erro Original

```
Failed to deploy edge function: Failed to bundle the function 
(reason: The module's source code could not be parsed: 
Expression expected at file:///tmp/.../index.tsx:2050:2 }); ~).
```

---

## 🔍 Causa

Na linha 1967, faltava o fechamento `}` do bloco `if (setores && !setorError)`.

### Código ERRADO (antes):
```typescript
if (setores && !setorError) {
  masterData.setor = setores.map((item: any) => ({
    id: item.id,
    type: 'setor',
    name: item.setor || item.name,
    description: item.descricao || item.description || '',
    responsavel: item.responsavel || '',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
  console.log(`✅ Setores carregados: ${setores.length} registros`);
  // ❌ FALTAVA FECHAR O IF AQUI!

// 2. Busca dados da tabela projeto
```

### Código CORRETO (agora):
```typescript
if (setores && !setorError) {
  masterData.setor = setores.map((item: any) => ({
    id: item.id,
    type: 'setor',
    name: item.setor || item.name,
    description: item.descricao || item.description || '',
    responsavel: item.responsavel || '',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
  console.log(`✅ Setores carregados: ${setores.length} registros`);
} // ✅ AGORA TEM O FECHAMENTO!

// 2. Busca dados da tabela projeto
```

---

## ✅ Correção Aplicada

O arquivo `/supabase/functions/server/index.tsx` foi corrigido automaticamente.

---

## 🚀 Próximo Passo: Deploy

Agora você pode fazer o deploy sem erros:

### Via Dashboard:
1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions
2. Encontre: `make-server-02726c7c`
3. Clique: **Edit Function**
4. Copie TODO o código de: `/supabase/functions/server/index.tsx`
5. Cole no editor
6. Clique: **Deploy**

### Via CLI:
```bash
supabase functions deploy make-server-02726c7c
```

---

## ✅ Resultado Esperado

Após o deploy:
- ✅ Mensagem: "Function deployed successfully"
- ✅ Recarregue a aplicação (F5)
- ✅ Descrição aparece em Setor
- ✅ Descrição aparece em Projeto
- ✅ Descrição aparece em Conta Contábil

---

**Conecta Cup** | Erro de Sintaxe Corrigido! 🎉
