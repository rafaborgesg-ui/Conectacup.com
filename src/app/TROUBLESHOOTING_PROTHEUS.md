# 🔧 Troubleshooting: Protheus Master Data

## 🆘 Problemas Comuns e Soluções

---

## ❌ Problema 1: Campos não salvam

### Sintomas
- Preencho Descrição e Responsável
- Clico em Salvar
- Toast "Item adicionado" aparece
- Mas campos não aparecem na lista

### Diagnóstico
Abra o Console (F12) e verifique:
```javascript
💾 Salvando item Protheus: {
  type: "setor",
  name: "Comercial",
  description: "Teste",    // ✅ Deve aparecer aqui
  responsavel: "João"      // ✅ Deve aparecer aqui
}
```

### Soluções

#### Se description/responsavel aparecem no log:
**Causa**: Backend não está atualizado  
**Solução**: Execute o Passo 2 (Deploy Backend)
1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions/make-server-02726c7c
2. Copie `/supabase/functions/server/index.tsx`
3. Cole e Deploy

#### Se description/responsavel NÃO aparecem no log:
**Causa**: Problema no frontend  
**Solução**: Recarregue a página (F5) ou limpe o cache

#### Se erro no console:
**Causa**: Migration SQL não executada  
**Solução**: Execute o Passo 1 (Migration SQL)
1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
2. Copie `/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql`
3. Cole e RUN

---

## ❌ Problema 2: Alerta amarelo não sai

### Sintomas
- Executei migration e deploy
- Alerta amarelo continua aparecendo

### Solução
```
1. Pressione F5 para recarregar a página
2. Se ainda aparecer, limpe o cache:
   - Chrome: Ctrl+Shift+Del
   - Selecione "Cached images and files"
   - Clique "Clear data"
3. Recarregue novamente (F5)
```

### Se persistir
O alerta é apenas visual. Se os campos estão salvando, pode ignorar.

Para remover permanentemente, edite `/components/MasterData.tsx`:
```typescript
// Linha 1171: Comente ou remova
{/* <ProtheusMigrationAlert /> */}
```

---

## ❌ Problema 3: Erro 403 no Deploy

### Sintomas
```
Error while deploying: XHR for ".../edge_functions/.../deploy" failed with status 403
```

### Causa
**Normal!** Figma Make não tem permissão para deploy automático.

### Solução
Use deploy manual via Dashboard ou CLI:

#### Opção A: Dashboard
1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions/make-server-02726c7c
2. Copie todo o arquivo `/supabase/functions/server/index.tsx`
3. Cole no editor
4. Clique Deploy

#### Opção B: CLI
```bash
supabase login
supabase link --project-ref nflgqugaabtxzifyhjor
supabase functions deploy make-server-02726c7c
```

---

## ❌ Problema 4: Migration SQL falha

### Sintomas
```
ERROR: relation "master_data" does not exist
```

### Causa
Tabela `master_data` não existe no banco.

### Solução
Execute primeiro a migration principal do Master Data:
1. Procure arquivo: `MIGRATION_MASTER_DATA.sql` (se existir)
2. Ou crie a tabela manualmente:
```sql
CREATE TABLE IF NOT EXISTS master_data (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(type, name)
);
```
3. Depois execute `ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql`

---

## ❌ Problema 5: Campos aparecem mas não persistem

### Sintomas
- Salvo item com Descrição
- Item aparece na lista com Descrição
- Recarrego a página (F5)
- Descrição desaparece

### Diagnóstico
1. Abra Console (F12) > Network
2. Cadastre um item
3. Procure request `POST /master-data`
4. Veja Response

### Solução

#### Se Response contém erro:
```json
{
  "success": false,
  "error": "column 'description' does not exist"
}
```
**Causa**: Migration não executada  
**Solução**: Execute Migration SQL

#### Se Response é success mas GET não retorna campos:
**Causa**: Backend GET não atualizado  
**Solução**: Verifique se deployou o backend corretamente

---

## ❌ Problema 6: Card "Protheus" vazio aparece

### Sintomas
- Além das 3 subseções (Setor, Projeto, Conta)
- Aparece um card vazio "Protheus - 0 itens cadastrados"

### Causa
Filtro não aplicado corretamente

### Solução
Verifique `/components/MasterData.tsx` linha 577:
```typescript
{dataTypes.filter(type => 
  type.id !== 'regras' && 
  type.id !== 'pneu' && 
  type.id !== 'carros' && 
  type.id !== 'protheus'  // ✅ Deve estar aqui
).map((type) => (
```

Se falta `&& type.id !== 'protheus'`, adicione e recarregue.

---

## ❌ Problema 7: Botão "Adicionar" não funciona

### Sintomas
- Clico em "Adicionar"
- Nada acontece ou formulário não abre

### Solução
1. Abra Console (F12)
2. Procure erros em vermelho
3. Se erro menciona `setEditingSubType`:
   - Problema no estado do React
   - Recarregue a página (F5)

---

## ❌ Problema 8: Editar não preenche os campos extras

### Sintomas
- Clico no ícone de editar (lápis)
- Nome aparece preenchido
- Mas Descrição e Responsável ficam vazios

### Diagnóstico
Verifique `/components/MasterData.tsx` linhas 1360-1363:
```typescript
setEditingItem(item);
setNewItemName(item.name);
setProtheusDescription(item.description || '');  // ✅ Deve estar aqui
setProtheusResponsavel(item.responsavel || '');  // ✅ Deve estar aqui
```

### Solução
Se linhas estão corretas:
1. Verifique se backend GET retorna os campos
2. Abra Network > GET /master-data
3. Verifique Response

---

## ❌ Problema 9: Delete não funciona

### Sintomas
- Clico no ícone de deletar (lixeira)
- Nada acontece

### Solução
Delete funciona igual aos outros tipos de Master Data.

Se não funciona:
1. Verifique permissões do usuário
2. Confirme que é admin
3. Veja console para erros

---

## ❌ Problema 10: Performance lenta

### Sintomas
- Salvamento demora muito
- Lista demora a carregar

### Diagnóstico
Verifique se há muitos itens cadastrados.

### Solução
Migration já cria índice otimizado:
```sql
CREATE INDEX idx_master_data_protheus_types 
ON master_data (type) 
WHERE type IN ('setor', 'projeto', 'conta_contabil');
```

Se ainda lento, verifique console para requests duplicados.

---

## 🔍 Como Debugar

### Passo 1: Console.log
Linha 1275 de `MasterData.tsx` tem log de debug:
```javascript
💾 Salvando item Protheus: { ... }
```

### Passo 2: Network
1. F12 > Network
2. Filtre por "master-data"
3. Veja Request/Response

### Passo 3: Supabase Logs
1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions
2. Procure logs da função `make-server-02726c7c`
3. Veja erros

### Passo 4: SQL Direto
Teste direto no banco:
```sql
SELECT * FROM master_data 
WHERE type IN ('setor', 'projeto', 'conta_contabil');
```

---

## 📞 Última Opção

Se nada funcionar:

1. **Reverta mudanças**
   - Remova linhas adicionadas em `MasterData.tsx`
   - Não precisa reverter backend/migration

2. **Documente o erro**
   - Screenshot do console
   - Request/Response do Network
   - Passos para reproduzir

3. **Contate suporte**
   - Com documentação acima
   - Mencione arquivo: `TROUBLESHOOTING_PROTHEUS.md`

---

## ✅ Checklist de Verificação

Antes de pedir ajuda, confirme:

- [ ] Migration SQL executada com sucesso
- [ ] Backend deployado sem erros
- [ ] Página recarregada (F5)
- [ ] Cache limpo
- [ ] Console sem erros
- [ ] Network mostra requests corretas
- [ ] Usuário é admin

---

**Última atualização**: 27/11/2024  
**Versão**: 1.0
