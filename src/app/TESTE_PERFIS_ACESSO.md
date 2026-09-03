# 🧪 Roteiro de Testes - Sistema de Perfis de Acesso

## 📋 Pré-requisitos

1. Supabase configurado e rodando
2. Tabela `access_profiles` criada e populada
3. Tabela `user_profiles` vinculando usuários a perfis
4. Aplicação rodando localmente

---

## 🔍 Teste 1: Login e Carregamento de Perfil

### Objetivo
Verificar se o perfil é carregado corretamente do Supabase no primeiro login.

### Passos
1. Abra o DevTools (F12) → Console
2. Faça login com um usuário válido
3. Observe os logs no console

### ✅ Resultado Esperado
```
🔐 usePermissions - Carregando perfil do Supabase...
✅ usePermissions - Perfil carregado: Administrador
📋 Páginas permitidas: [...]
🔐 Sidebar - Perfil carregado: Administrador
📋 Páginas permitidas: [...]
```

### ❌ Problema Se
- Aparecer: `⚠️ Nenhum perfil encontrado`
- Aparecer: `⚠️ Erro de conexão`
- Ficar preso em "Verificando permissões..."

---

## 🔍 Teste 2: Navegação com Cache

### Objetivo
Verificar se ao navegar entre páginas, o perfil é carregado do cache (sem nova requisição).

### Passos
1. Após login bem-sucedido, navegue para outra página
2. Observe os logs no console

### ✅ Resultado Esperado
```
✅ usePermissions - Usando perfil global em cache
```

### ❌ Problema Se
- Aparecer novamente: `🔐 usePermissions - Carregando perfil do Supabase...`
- Mostrar loading repetido

---

## 🔍 Teste 3: Acesso Negado

### Objetivo
Verificar se usuários sem permissão são bloqueados corretamente.

### Passos
1. Faça login com um usuário com perfil "Operador"
2. Tente acessar `/administracao/usuarios` (apenas admin)
3. Observe a tela

### ✅ Resultado Esperado
- Tela "Acesso Negado"
- Mostra: "Seu perfil: Operador"
- Botão "Voltar" funcional

### ❌ Problema Se
- Página carregar normalmente
- Mostrar erro genérico
- Loading infinito

---

## 🔍 Teste 4: Múltiplas Instâncias Simultâneas

### Objetivo
Verificar se múltiplos componentes usando `usePermissions()` compartilham a mesma requisição.

### Passos
1. Abra o DevTools → Network
2. Filtre por `access_profiles`
3. Faça login
4. Conte quantas requisições foram feitas

### ✅ Resultado Esperado
- **Apenas 1 requisição** para `access_profiles`
- Console mostra: `⏳ usePermissions - Aguardando carregamento em andamento...`

### ❌ Problema Se
- Múltiplas requisições simultâneas
- Cada componente faz sua própria requisição

---

## 🔍 Teste 5: Logout e Limpeza de Cache

### Objetivo
Verificar se o cache é limpo corretamente no logout.

### Passos
1. Faça login com um usuário
2. Navegue por algumas páginas (cache é populado)
3. Faça logout
4. Observe os logs

### ✅ Resultado Esperado
```
🧹 Cache de permissões limpo
```

### Passos Adicionais
5. Faça login novamente
6. Verifique se o perfil é recarregado do Supabase

### ✅ Resultado Esperado
```
🔐 usePermissions - Carregando perfil do Supabase...
✅ usePermissions - Perfil carregado: [Nome do Perfil]
```

### ❌ Problema Se
- Cache não for limpo
- Novo login usar perfil do usuário anterior

---

## 🔍 Teste 6: Timeout de Loading

### Objetivo
Verificar se o sistema lida com timeout de rede corretamente.

### Passos
1. Abra o DevTools → Network
2. Ative "Throttling" → "Slow 3G"
3. Limpe localStorage: `localStorage.clear()`
4. Recarregue a página e faça login
5. Aguarde 5 segundos

### ✅ Resultado Esperado
- Após 5 segundos, mostra tela de erro
- Título: "Erro ao Carregar Permissões"
- Botão "Tentar Novamente" visível

### ❌ Problema Se
- Loading infinito (mais de 5s)
- Aplicação trava
- Erro genérico

---

## 🔍 Teste 7: Modo Offline (Fallback)

### Objetivo
Verificar se o sistema funciona offline usando perfis padrão.

### Passos
1. Faça login normalmente (online)
2. Abra o DevTools → Network
3. Ative "Offline"
4. Recarregue a página
5. Observe os logs

### ✅ Resultado Esperado
```
⚠️ Erro de conexão (offline ou Supabase indisponível)
ℹ️ Usando perfil do cache local: Operador
```

- Sistema continua funcionando
- Usa perfis padrão (admin/operator)

### ❌ Problema Se
- Aplicação quebra completamente
- Mostra erro crítico
- Não carrega nenhuma página

---

## 🔍 Teste 8: Perfil Inexistente (Fallback)

### Objetivo
Verificar se o sistema lida com profileId inválido.

### Passos
1. Abra o DevTools → Console
2. Execute:
```javascript
localStorage.setItem('porsche-cup-user', JSON.stringify({
  id: '123',
  email: 'test@test.com',
  name: 'Teste',
  role: 'operator',
  profileId: 'profile-nao-existe'
}));
```
3. Recarregue a página
4. Observe os logs

### ✅ Resultado Esperado
```
⚠️ Perfil "profile-nao-existe" não encontrado
🔄 Tentando fallback para perfil "operator"...
✅ Usando perfil "operator" como fallback
💾 ProfileId atualizado para "operator" localmente
```

### ❌ Problema Se
- Aplicação quebra
- Mostra tela branca
- Não usa fallback

---

## 🔍 Teste 9: Sidebar Filtrando Menus

### Objetivo
Verificar se a Sidebar mostra apenas menus permitidos.

### Passos
1. Faça login com perfil "Operador"
2. Observe o menu lateral
3. Verifique se itens admin não aparecem

### ✅ Resultado Esperado
- ❌ NÃO mostra: "Gerenciar Usuários"
- ❌ NÃO mostra: "Perfis de Acesso"
- ✅ Mostra: "Entrada de Estoque"
- ✅ Mostra: "Relatórios"

### Passos Adicionais
4. Faça logout
5. Faça login com perfil "Administrador"
6. Verifique se todos os menus aparecem

### ✅ Resultado Esperado
- ✅ Mostra: "Gerenciar Usuários"
- ✅ Mostra: "Perfis de Acesso"
- ✅ Mostra: Todos os outros menus

---

## 🔍 Teste 10: Atualização de Perfil em Tempo Real

### Objetivo
Verificar se mudanças no perfil são refletidas após refresh.

### Passos
1. Faça login com perfil "Operador"
2. No Supabase, altere o perfil do usuário para "Administrador"
3. No console, execute:
```javascript
window.location.reload();
```
4. Observe os logs e o menu

### ✅ Resultado Esperado
- Novo perfil é carregado
- Menu é atualizado com novos itens
- Logs mostram: `✅ Perfil carregado: Administrador`

---

## 📊 Checklist Resumido

| # | Teste | Status |
|---|-------|--------|
| 1 | Login e carregamento de perfil | ⬜ |
| 2 | Navegação com cache | ⬜ |
| 3 | Acesso negado | ⬜ |
| 4 | Múltiplas instâncias simultâneas | ⬜ |
| 5 | Logout e limpeza de cache | ⬜ |
| 6 | Timeout de loading | ⬜ |
| 7 | Modo offline (fallback) | ⬜ |
| 8 | Perfil inexistente (fallback) | ⬜ |
| 9 | Sidebar filtrando menus | ⬜ |
| 10 | Atualização de perfil | ⬜ |

---

## 🐛 Troubleshooting

### Problema: "Nenhum perfil encontrado"

**Causas possíveis:**
1. Tabela `access_profiles` vazia
2. Usuário não tem entrada em `user_profiles`
3. RLS (Row Level Security) bloqueando consulta

**Solução:**
```sql
-- Verificar se há perfis
SELECT * FROM access_profiles;

-- Verificar vinculação do usuário
SELECT * FROM user_profiles WHERE user_id = 'UUID_DO_USUARIO';

-- Se vazio, criar vinculação
INSERT INTO user_profiles (user_id, profile_id)
VALUES ('UUID_DO_USUARIO', 'admin');
```

---

### Problema: "Erro de conexão"

**Causas possíveis:**
1. Supabase offline
2. API key inválida
3. Firewall bloqueando

**Solução:**
1. Verificar URL do Supabase em `/utils/supabase/info.tsx`
2. Verificar anon key
3. Testar conexão:
```javascript
// No console
const { data, error } = await supabase.from('access_profiles').select('*');
console.log({ data, error });
```

---

### Problema: Loading infinito

**Causas possíveis:**
1. Timeout não funcionando
2. Promessa nunca resolve
3. Estado preso

**Solução:**
1. Verificar se timeout está em 5s (ProtectedRoute.tsx)
2. Limpar cache:
```javascript
localStorage.clear();
window.location.reload();
```

---

## ✅ Critérios de Aceitação

Para considerar o sistema **100% funcional**, todos os testes devem passar:

- ✅ Perfil carrega corretamente do Supabase
- ✅ Cache funciona (sem requisições repetidas)
- ✅ Acesso negado bloqueia corretamente
- ✅ Logout limpa cache
- ✅ Timeout funciona (5s)
- ✅ Fallback offline funciona
- ✅ Sidebar filtra menus corretamente
- ✅ Sem race conditions
- ✅ Logs detalhados e claros

---

## 📞 Suporte

Se algum teste falhar:
1. Copie os logs do console
2. Tire um screenshot da tela de erro
3. Verifique a seção de Troubleshooting acima
4. Documente o problema encontrado
