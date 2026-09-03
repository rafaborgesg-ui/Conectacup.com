# 🎯 Passo a Passo Visual - Correção de Permissões

## ⚡ AÇÃO IMEDIATA (5 minutos)

### 1️⃣ Abra o Supabase SQL Editor
```
🌐 Supabase Dashboard
   └─ 📁 SQL Editor (menu lateral esquerdo)
      └─ ➕ New query
```

---

### 2️⃣ Execute o Diagnóstico
**Cole e execute:**
```sql
-- Copie TODO o conteúdo de: DIAGNOSTIC_PERMISSIONS.sql
```

**📊 Você verá:**
```
Categoria          | admin           | operator        | supervisor      | viewer
------------------ | --------------- | --------------- | --------------- | ---------------
Perfis Padrão      | ❌ NÃO EXISTE   | ✅ existe       | ✅ existe       | ✅ existe
```

Se o admin aparecer como **❌ NÃO EXISTE**, continue para o passo 3.

---

### 3️⃣ Crie o Perfil Admin
**Cole e execute:**
```sql
-- Copie TODO o conteúdo de: FIX_ADMIN_PROFILE_DEFINITIVO.sql
```

**✅ Resultado esperado:**
```
Query 1: 1 row deleted     (deleta admin antigo se existir)
Query 2: 1 row inserted    (cria novo admin completo)
Query 3: 1 row updated     (atualiza metadata do usuário)
Query 4: 1 row updated     (atualiza tabela users)
```

**📊 Verificações:**
```sql
-- Deve mostrar:
id: admin
name: Administrador
total_pages: 26      ← IMPORTANTE: deve ser 26!
total_features: 37   ← IMPORTANTE: deve ser 37!
```

---

### 4️⃣ Feche e Reabra o Navegador
```
❌ CTRL+F5 não é suficiente!
❌ F5 não é suficiente!
❌ Limpar cache não é suficiente!

✅ FECHE COMPLETAMENTE o navegador
✅ Abra novamente
✅ Faça login
```

**Por quê?** 
- O Supabase mantém cache de autenticação em memória
- Apenas fechar a aba não limpa esse cache
- É necessário fechar o processo inteiro do navegador

---

### 5️⃣ Verifique com o Debugger
Após fazer login, procure no **canto inferior direito**:

```
┌─────────────────────────────────┐
│  🔍 DEBUG Permissões            │
└─────────────────────────────────┘
```

**Clique no botão.**

**✅ Se tudo estiver OK, você verá:**
```
👤 Perfil Atual
   Nome: Administrador
   ID: admin
   Sistema: ✅ Sim
   Páginas: 26 permitidas
   Features: 37 permitidas

📋 Páginas no Perfil:
   [26 badges mostrando todas as páginas]

🔍 Análise Detalhada do Menu:
   (Todos os itens em verde = permitido)
```

**❌ Se ainda tiver problemas:**
```
🚫 Itens Bloqueados (X):
   • Rafael - pageValue: rafael (não está em profile.pages)
   • Caio - pageValue: caio (não está em profile.pages)
   • Perfis de Acesso - pageValue: access_profiles (não está em profile.pages)
```

Se aparecer itens bloqueados, volte ao passo 3 e re-execute o SQL.

---

## 🔍 Como Identificar o Problema Visualmente

### ❌ **ANTES da correção:**

**Sidebar (menu lateral):**
```
┌─────────────────────────┐
│ 📦 Pneus                │
│ ⚙️  Cadastro             │  ← Categoria vazia, não aparece
│ 🛡️  Administração        │
│   └─ 👥 Gerenciar Users │
│   └─ ❌ (Perfis sumiu)  │  ← Item bloqueado, sumiu
│   └─ ⚙️  Ajuste Estoque │
│   └─ 💻 Em Desenvolvimento│
│       └─ ❌ (Rafael sumiu)│ ← Item bloqueado, sumiu
│       └─ ❌ (Caio sumiu) │  ← Item bloqueado, sumiu
└─────────────────────────┘
```

**Console (F12):**
```
🚫 "Rafael" bloqueado - pageValue: rafael (não está no perfil)
🚫 "Caio" bloqueado - pageValue: caio (não está no perfil)
🚫 "Perfis de Acesso" bloqueado - pageValue: access_profiles (não está no perfil)
❌ Ocultando "Em Desenvolvimento" - nenhum subitem visível
```

---

### ✅ **DEPOIS da correção:**

**Sidebar (menu lateral):**
```
┌─────────────────────────┐
│ 📦 Pneus                │
│ ⚙️  Cadastro             │
│ 🛡️  Administração        │
│   └─ 👥 Gerenciar Users │
│   └─ 👤 Perfis de Acesso│  ← ✅ APARECEU!
│   └─ ⚙️  Ajuste Estoque │
│   └─ 💻 Em Desenvolvimento│
│       └─ 👤 Rafael      │  ← ✅ APARECEU!
│       └─ 👤 Caio        │  ← ✅ APARECEU!
└─────────────────────────┘
```

**Console (F12):**
```
🔐 Sidebar - Perfil carregado: Administrador
📋 Páginas permitidas: (26) ['dashboard', 'stock_entry', ...]
```

**Botão DEBUG:**
```
🔵 🔍 DEBUG Permissões  ← Azul = tudo OK
```

---

## 📱 Verificação Rápida no Supabase

**Table Editor → access_profiles:**

| id      | name           | is_system | total_pages | tem_access_profiles | tem_rafael | tem_caio |
|---------|----------------|-----------|-------------|---------------------|------------|----------|
| admin   | Administrador  | ✅ true   | **26** ✅   | ✅ true             | ✅ true    | ✅ true  |
| operator| Operador       | ✅ true   | 12          | ❌ false            | ❌ false   | ❌ false |

**Se `admin` não aparecer nessa lista = problema confirmado!**

---

## 🎬 Linha do Tempo do Problema

### Timeline:
```
1. ⚙️  Você criou a key ACCESS_PROFILES no código
   ↓
2. ✅ Código atualizado corretamente
   ↓
3. ❌ MAS o banco de dados não foi atualizado
   ↓
4. 🔍 Sistema procura "access_profiles" no perfil admin
   ↓
5. ❌ Não encontra (admin só tem as páginas antigas)
   ↓
6. 🚫 hasPageAccess() retorna false
   ↓
7. 📋 Sidebar filtra e remove o item
   ↓
8. 😱 Menu desaparece!
```

### Solução:
```
1. 🔧 Execute FIX_ADMIN_PROFILE_DEFINITIVO.sql
   ↓
2. ✅ Banco atualizado com todas as 26 páginas
   ↓
3. 🔄 Feche o navegador (limpa cache de auth)
   ↓
4. 🔍 Sistema procura "access_profiles" no perfil admin
   ↓
5. ✅ Encontra! (agora está na lista)
   ↓
6. ✅ hasPageAccess() retorna true
   ↓
7. 📋 Sidebar mantém o item visível
   ↓
8. 🎉 Menu aparece!
```

---

## 💡 Dicas de Debug

### 1. **Console do Navegador (F12)**
```javascript
// Ver perfil atual
console.log(localStorage.getItem('porsche-cup-user'))

// Forçar reload do perfil
localStorage.removeItem('porsche-cup-user')
location.reload()
```

### 2. **Supabase SQL**
```sql
-- Ver perfil admin
SELECT * FROM access_profiles WHERE id = 'admin';

-- Ver usuário rafael
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'rafael.borges@porschegt3cup.com.br';

-- Contar páginas
SELECT id, name, jsonb_array_length(pages) as total
FROM access_profiles
ORDER BY total DESC;
```

### 3. **Botão DEBUG**
- 🔵 Azul = Tudo OK
- 🔴 Vermelho = Itens bloqueados (clique para ver detalhes)

---

## ✅ Checklist Visual

Marque cada item conforme completa:

- [ ] **Supabase aberto** - Tab do navegador com Supabase Dashboard
- [ ] **SQL Editor aberto** - Menu lateral → SQL Editor → New query
- [ ] **DIAGNOSTIC executado** - Colei e executei DIAGNOSTIC_PERMISSIONS.sql
- [ ] **Vi o problema** - Resultado mostrou "❌ admin NÃO EXISTE"
- [ ] **FIX executado** - Colei e executei FIX_ADMIN_PROFILE_DEFINITIVO.sql
- [ ] **Vi sucesso** - Resultado mostrou "1 row inserted", "26 páginas"
- [ ] **Navegador fechado** - Fechei COMPLETAMENTE (não só a aba)
- [ ] **Navegador reaberto** - Abri novamente do zero
- [ ] **Login feito** - Fiz login com rafael.borges@...
- [ ] **DEBUG clicado** - Cliquei no botão "🔍 DEBUG Permissões"
- [ ] **Perfil verificado** - Vi "Administrador - 26 páginas"
- [ ] **Menus visíveis** - Consigo ver "Rafael", "Caio", "Perfis de Acesso"
- [ ] **Páginas acessíveis** - Consigo clicar e acessar todas as páginas

---

## 🆘 Se ainda não funcionar

### Último recurso - Reset completo:

1. **Logout da aplicação**
2. **Execute no Supabase:**
   ```sql
   -- Reset completo do usuário
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_build_object(
     'name', 'Rafael Borges',
     'role', 'admin',
     'profileId', 'admin'
   )
   WHERE email = 'rafael.borges@porschegt3cup.com.br';
   
   -- Força refresh do token
   UPDATE auth.users
   SET updated_at = now()
   WHERE email = 'rafael.borges@porschegt3cup.com.br';
   ```

3. **Limpe TUDO no navegador:**
   - F12 → Application → Storage → Clear site data
   - Ou: Settings → Privacy → Clear browsing data → All time

4. **Feche o navegador completamente**

5. **Abra em janela anônima** (para testar sem cache):
   - Chrome: CTRL+SHIFT+N
   - Firefox: CTRL+SHIFT+P

6. **Faça login novamente**

---

**📞 Se após tudo isso ainda não funcionar, tire prints de:**
1. Botão DEBUG expandido
2. Console do navegador (F12)
3. Resultado do DIAGNOSTIC_PERMISSIONS.sql no Supabase

E envie para análise! 🔍
