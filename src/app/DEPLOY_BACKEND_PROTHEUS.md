# 🚀 Deploy Manual: Backend Protheus

## ❌ Erro Atual

```
Error while deploying: XHR for "/api/integrations/supabase/.../edge_functions/make-server/deploy" failed with status 403
```

**Causa**: Figma Make não tem permissão para fazer deploy automático de Edge Functions.

---

## ✅ Solução: Deploy Manual (3 métodos)

### Método 1: Via Supabase CLI (Recomendado)

#### Pré-requisitos
1. Instale o Supabase CLI: https://supabase.com/docs/guides/cli

#### Passos
```bash
# 1. Faça login no Supabase
supabase login

# 2. Link com seu projeto
supabase link --project-ref nflgqugaabtxzifyhjor

# 3. Deploy da função
supabase functions deploy make-server-02726c7c
```

---

### Método 2: Via Dashboard do Supabase

#### Passos
1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions/make-server-02726c7c

2. Copie **TODO** o conteúdo do arquivo:
   - `/supabase/functions/server/index.tsx`

3. Cole no editor de código da função

4. Clique em **Deploy** ou **Save**

5. Aguarde confirmação de deploy

---

### Método 3: Aplicar apenas as mudanças necessárias

Se você preferir aplicar apenas as alterações específicas sem refazer todo o deploy:

#### Passo 1: Localize a função POST /master-data
Na linha ~2005 do arquivo `/supabase/functions/server/index.tsx`

#### Passo 2: Substitua o bloco de UPDATE (linhas 2034-2060)

**ANTES:**
```typescript
if (existing) {
  // Update
  const { error } = await supabaseAdmin
    .from('master_data')
    .update({
      name: item.name,
      type: item.type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id);
```

**DEPOIS:**
```typescript
if (existing) {
  // Update
  const updateData: any = {
    name: item.name,
    type: item.type,
    updated_at: new Date().toISOString(),
  };
  
  // Adiciona campos opcionais se existirem
  if (item.description !== undefined) updateData.description = item.description;
  if (item.responsavel !== undefined) updateData.responsavel = item.responsavel;
  if (item.address !== undefined) updateData.address = item.address;
  if (item.coordinates !== undefined) updateData.coordinates = item.coordinates;
  if (item.latitude !== undefined) updateData.latitude = item.latitude;
  if (item.longitude !== undefined) updateData.longitude = item.longitude;
  
  const { error } = await supabaseAdmin
    .from('master_data')
    .update(updateData)
    .eq('id', item.id);
```

#### Passo 3: Substitua o bloco de INSERT (linhas 2061-2065)

**ANTES:**
```typescript
} else {
  // Insert
  const { error } = await supabaseAdmin
    .from('master_data')
    .insert({
      id: item.id,
      type: item.type,
      name: item.name,
      created_at: item.createdAt || new Date().toISOString(),
    });
```

**DEPOIS:**
```typescript
} else {
  // Insert
  const insertData: any = {
    id: item.id,
    type: item.type,
    name: item.name,
    created_at: item.createdAt || new Date().toISOString(),
  };
  
  // Adiciona campos opcionais se existirem
  if (item.description !== undefined) insertData.description = item.description;
  if (item.responsavel !== undefined) insertData.responsavel = item.responsavel;
  if (item.address !== undefined) insertData.address = item.address;
  if (item.coordinates !== undefined) insertData.coordinates = item.coordinates;
  if (item.latitude !== undefined) insertData.latitude = item.latitude;
  if (item.longitude !== undefined) insertData.longitude = item.longitude;
  
  const { error } = await supabaseAdmin
    .from('master_data')
    .insert(insertData);
```

#### Passo 4: Substitua o bloco de GET (linhas 1978-1991)

**ANTES:**
```typescript
if (data) {
  data.forEach((item: any) => {
    if (!masterData[item.type]) {
      masterData[item.type] = [];
    }
    masterData[item.type].push({
      id: item.id,
      type: item.type,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  });
}
```

**DEPOIS:**
```typescript
if (data) {
  data.forEach((item: any) => {
    if (!masterData[item.type]) {
      masterData[item.type] = [];
    }
    
    const masterItem: any = {
      id: item.id,
      type: item.type,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
    
    // Adiciona campos opcionais se existirem
    if (item.description !== undefined && item.description !== null) masterItem.description = item.description;
    if (item.responsavel !== undefined && item.responsavel !== null) masterItem.responsavel = item.responsavel;
    if (item.address !== undefined && item.address !== null) masterItem.address = item.address;
    if (item.coordinates !== undefined && item.coordinates !== null) masterItem.coordinates = item.coordinates;
    if (item.latitude !== undefined && item.latitude !== null) masterItem.latitude = item.latitude;
    if (item.longitude !== undefined && item.longitude !== null) masterItem.longitude = item.longitude;
    
    masterData[item.type].push(masterItem);
  });
}
```

---

## 🔍 Verificação

Após o deploy, teste:

1. Acesse **Master Data > Protheus**
2. Cadastre um Setor com Descrição e Responsável
3. Verifique se os campos aparecem após salvar
4. Recarregue a página e confirme que os dados persistiram

---

## 📋 Checklist Completo

- [ ] Executar migration SQL (ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql)
- [ ] Fazer deploy do backend (um dos 3 métodos acima)
- [ ] Recarregar a aplicação (F5)
- [ ] Testar cadastro de Setor com todos os campos
- [ ] Testar cadastro de Projeto com descrição
- [ ] Testar cadastro de Conta Contábil com descrição

---

## 🐛 Problemas Comuns

### ❌ Deploy falha com erro 403
**Solução**: Use o Método 1 (CLI) ou Método 2 (Dashboard)

### ❌ Campos ainda não salvam após deploy
**Solução**: Verifique se executou a migration SQL primeiro

### ❌ Erro de sintaxe no deploy
**Solução**: Copie e cole exatamente como mostrado, respeitando identação

---

**Última atualização:** 27/11/2024
