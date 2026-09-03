# 🔧 Como Corrigir Problemas de Permissões

## 📋 Problema Identificado
O perfil **"admin"** não existe no banco de dados Supabase, causando:
- ❌ Menus não aparecem (Rafael, Caio, Perfis de Acesso)
- ❌ Usuário não tem acesso completo
- ❌ Sistema não reconhece permissões do administrador

---

## ✅ SOLUÇÃO RÁPIDA (3 passos)

### 1️⃣ Diagnosticar o Problema
```sql
-- Cole no Supabase SQL Editor:
DIAGNOSTIC_PERMISSIONS.sql
```

**O que vai mostrar:**
- ✅ Quais perfis existem
- ⚠️ Quais perfis estão faltando
- 📊 Quantas páginas cada perfil tem
- 👤 Status do usuário rafael.borges

---

### 2️⃣ Corrigir Perfil Admin
```sql
-- Cole no Supabase SQL Editor:
FIX_ADMIN_PROFILE_DEFINITIVO.sql
```

**O que faz:**
- ✅ Cria o perfil "admin" com 26 páginas
- ✅ Adiciona 37 features ao admin
- ✅ Vincula rafael.borges ao perfil admin
- ✅ Atualiza metadados do usuário

**Resultado esperado:**
```
id: admin
name: Administrador
total_pages: 26
total_features: 37
```

---

### 3️⃣ Recarregar a Aplicação
1. Feche o navegador completamente
2. Abra novamente
3. Faça login
4. Clique no botão **🔍 DEBUG Permissões** (canto inferior direito)
5. Verifique se aparece:
   - ✅ Perfil: Administrador
   - ✅ 26 páginas permitidas
   - ✅ Nenhum item bloqueado

---

## 🔄 SOLUÇÃO COMPLETA (criar todos os perfis)

Se você quer resetar TODOS os perfis padrão:

```sql
-- Cole no Supabase SQL Editor:
SEED_ALL_DEFAULT_PROFILES.sql
```

**Cria:**
- ✅ **admin** - 26 páginas, 37 features (acesso total)
- ✅ **operator** - 12 páginas, 7 features (operações básicas)
- ✅ **supervisor** - 15 páginas, 16 features (operações + aprovações)
- ✅ **viewer** - 2 páginas, 2 features (apenas visualização)

---

## 🔍 Ferramenta de Debug

Um botão foi adicionado no canto inferior direito da aplicação:

**🔵 "🔍 DEBUG Permissões"** 

### O que mostra:
- 👤 **Perfil Atual**: Nome e ID do perfil
- 📋 **Páginas Permitidas**: Lista todas as páginas que você pode acessar
- 🔍 **Análise do Menu**: Mostra cada item do menu e se está visível/bloqueado
- 🚫 **Itens Bloqueados**: Lista páginas que estão faltando no perfil
- 💡 **Instruções**: Como corrigir cada problema

### Como usar:
1. Clique no botão
2. Veja quais páginas estão bloqueadas
3. Execute o SQL correspondente
4. Recarregue e verifique novamente

---

## 📊 Estrutura de Páginas do Admin

O perfil admin deve ter **26 páginas**:

### Módulo Pneus (5)
- `stock_entry` - Entrada de Estoque
- `tire_movement` - Movimentação
- `arcs_update` - Atualizar ARCS
- `tire_discard` - Registro de Descarte
- `reports` - Relatórios

### Módulo Cadastro (4)
- `tire_model` - Cadastro de Modelos
- `tire_status` - Cadastro de Status
- `container` - Cadastro de Contêineres
- `master_data` - Master Data

### Módulo Administração (3)
- `user_management` - Gerenciar Usuários
- `access_profiles` - **Perfis de Acesso** ⭐
- `stock_adjustment` - Ajuste de Estoque

### Em Desenvolvimento (5)
- `em_desenvolvimento` - Menu pai
- `rafael` - Área Rafael ⭐
- `dashboard` - Dashboard
- `tire_consumption` - Transferir para Piloto
- `tire_status_change` - Mudar Status
- `data_import` - Importação
- `discard_reports` - Relatórios de Descarte
- `caio` - Área Caio ⭐

### Links Externos (6)
- `gestao_carga` - Gestão de Carga
- `manutencao_predial` - Manutenção Predial
- `frete_nacional` - Frete Nacional (pai)
- `frete_smartphone` - Frete Smartphone
- `frete_web` - Frete Web
- `frete_internacional` - Frete Internacional

---

## 🛠️ Troubleshooting

### ❌ Problema: "Perfis do sistema não podem ser editados"
**Causa:** Cache do make-server  
**Solução:** Já corrigido com cache-busting headers no `AccessProfileManagement.tsx`

### ❌ Problema: Menus não aparecem
**Causa:** Perfil admin não tem as páginas  
**Solução:** Execute `FIX_ADMIN_PROFILE_DEFINITIVO.sql`

### ❌ Problema: Botão DEBUG não aparece
**Causa:** Componente não importado  
**Solução:** Já adicionado no `App.tsx` (linha 747)

### ❌ Problema: Após SQL, ainda não funciona
**Causa:** Cache do navegador  
**Solução:** 
1. Abra DevTools (F12)
2. Clique com botão direito no ícone de refresh
3. Escolha "Limpar cache e recarregar"

---

## 📝 Verificação Manual no Supabase

1. Acesse: **Supabase → Table Editor → access_profiles**
2. Procure linha com `id = 'admin'`
3. Clique na célula `pages`
4. Verifique se tem estas páginas:
   ```json
   [
     "dashboard", "stock_entry", "tire_model", "container",
     "reports", "discard_reports", "user_management",
     "access_profiles", "master_data", "status_registration",
     "stock_adjustment", "tire_movement", "tire_status_change",
     "tire_discard", "tire_consumption", "data_import",
     "arcs_update", "em_desenvolvimento", "rafael", "caio",
     "gestao_carga", "manutencao_predial", "frete_smartphone",
     "frete_web", "frete_internacional", "frete_nacional"
   ]
   ```

---

## 🎯 Checklist Final

- [ ] Executei `DIAGNOSTIC_PERMISSIONS.sql` e vi o problema
- [ ] Executei `FIX_ADMIN_PROFILE_DEFINITIVO.sql`
- [ ] Vi mensagem "✅ 1 row affected"
- [ ] Fechei completamente o navegador
- [ ] Abri novamente e fiz login
- [ ] Cliquei no botão "🔍 DEBUG Permissões"
- [ ] Vi "✅ Administrador - 26 páginas"
- [ ] Vejo os menus "Rafael", "Caio" e "Perfis de Acesso"
- [ ] Consigo acessar todas as páginas

---

## 💡 Prevenção de Problemas Futuros

### Sistema Dinâmico de Menus
O sistema foi projetado para sincronização automática:

**Arquivo central:** `/utils/menuStructure.ts`
- ✅ Define estrutura do menu
- ✅ Define mapeamento menu → página
- ✅ Usado pelo Sidebar
- ✅ Usado pelos Perfis de Acesso

**Quando adicionar novo menu:**
1. Adicione em `MENU_STRUCTURE`
2. Adicione key em `PAGES` (permissions.ts)
3. Adicione em `MENU_TO_PAGE_MAP`
4. Atualize perfis no Supabase (execute SEED)

---

## 📞 Suporte

Se após seguir todos os passos o problema persistir:
1. Tire um print do botão "🔍 DEBUG Permissões" expandido
2. Copie os logs do console (F12)
3. Copie o resultado do `DIAGNOSTIC_PERMISSIONS.sql`
4. Envie para análise

---

**Última atualização:** 21/01/2025  
**Versão:** 2.0 - Fix definitivo de permissões
