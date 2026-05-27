# 🏁 FIX RÁPIDO: Campos de Pista não Salvam

## 🔴 PROBLEMA
Os campos **Endereço Completo** e **Coordenadas (Lat, Lng)** na seção **Pista** do Master Data não estão salvando.

## ✅ SOLUÇÃO
As colunas não existem no banco de dados. Execute a migration SQL para criá-las.

---

## 📋 PASSO A PASSO (3 minutos)

### 1️⃣ Abrir SQL Editor do Supabase
Clique aqui: [https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql](https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql)

### 2️⃣ Abrir o arquivo SQL
No seu projeto, abra:
```
/docs/migrations/sql/ADD_PISTA_FIELDS_TO_MASTER_DATA.sql
```

### 3️⃣ Copiar todo o conteúdo
Selecione todo o código SQL e copie (Ctrl+C / Cmd+C)

### 4️⃣ Colar no SQL Editor
Cole o código no SQL Editor do Supabase

### 5️⃣ Executar
Clique no botão **RUN** (ou Ctrl+Enter / Cmd+Enter)

### 6️⃣ Verificar sucesso
Você deve ver a mensagem:
```
✅ MIGRATION EXECUTADA COM SUCESSO!

📋 Campos adicionados:
   - address (TEXT)
   - coordinates (TEXT)
   - latitude (DOUBLE PRECISION)
   - longitude (DOUBLE PRECISION)
🔍 Índice criado: idx_master_data_pista_type
```

---

## 🎯 RESULTADO

Após executar a migration, os campos funcionarão normalmente:

- ✅ **Endereço Completo** será salvo
- ✅ **Coordenadas (Lat, Lng)** serão salvas
- ✅ **Busca automática de coordenadas** funcionará
- ✅ Dados serão exibidos corretamente nos cards

---

## 📝 O QUE FOI FEITO

### Frontend (✅ JÁ PRONTO)
- Formulário estendido com campos de endereço e coordenadas
- Integração com API de geolocalização
- Visualização dos dados nos cards
- Logs de debug para acompanhamento

### Backend (✅ JÁ PRONTO)
A Edge Function `/supabase/functions/server/index.tsx` já está preparada:
```typescript
// Salva os campos
if (item.address !== undefined) updateData.address = item.address;
if (item.coordinates !== undefined) updateData.coordinates = item.coordinates;
if (item.latitude !== undefined) updateData.latitude = item.latitude;
if (item.longitude !== undefined) updateData.longitude = item.longitude;
```

### Banco de Dados (⚠️ FALTANDO - Execute a migration!)
As colunas precisam ser criadas:
- `address` (TEXT)
- `coordinates` (TEXT)
- `latitude` (DOUBLE PRECISION)
- `longitude` (DOUBLE PRECISION)

---

## 🗑️ REMOVER ALERTA

Após executar a migration e confirmar que tudo funciona, você pode remover o alerta laranja:

1. Abra `/components/MasterData.tsx`
2. Encontre a linha:
   ```tsx
   {type.id === 'pista' && <PistaMigrationAlert />}
   ```
3. Delete ou comente essa linha

---

## 🆘 TROUBLESHOOTING

### ❌ Erro: "relation master_data does not exist"
**Solução:** Execute primeiro a migration principal do Master Data

### ❌ Campos ainda não salvam após migration
**Verificar:**
1. A migration foi executada com sucesso?
2. Há erros no console do navegador (F12)?
3. A Edge Function foi deployada?

### 🔍 Debug
Abra o console do navegador (F12) e procure por:
```
💾 Salvando Pista com dados: {...}
```

---

## 📚 ARQUIVOS RELACIONADOS

- **Migration SQL:** `/docs/migrations/sql/ADD_PISTA_FIELDS_TO_MASTER_DATA.sql`
- **Componente Alerta:** `/components/PistaMigrationAlert.tsx`
- **Formulário:** `/components/PistaFormExtended.tsx`
- **Master Data:** `/components/MasterData.tsx`
- **Backend:** `/supabase/functions/server/index.tsx` (linhas 2045-2048, 2073-2076)

---

## ✨ DEPOIS DA MIGRATION

Teste criando/editando uma pista:
1. Vá para **Master Data > Pista**
2. Clique em **Adicionar**
3. Preencha:
   - Nome: "Interlagos"
   - Endereço: "Av. Senador Teotônio Vilela, 261 - São Paulo"
4. Clique em **🔍 Buscar Coordenadas**
5. Salve
6. Verifique se o endereço e coordenadas aparecem no card

---

**Tempo estimado:** 3 minutos  
**Dificuldade:** ⭐ Fácil  
**Status:** ✅ Solução pronta, apenas precisa executar a migration
