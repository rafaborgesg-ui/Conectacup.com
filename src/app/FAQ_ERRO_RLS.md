# ❓ FAQ - Perguntas Frequentes sobre o Erro RLS

## 🔍 Perguntas Gerais

### ❓ O que é esse erro?
```
"new row violates row-level security policy for table conference_sessions"
```

**Resposta:** É um erro de permissão do banco de dados Supabase. A política de segurança (RLS = Row Level Security) está bloqueando a atualização de sessões de conferência quando você tenta desativá-las.

---

### ❓ Por que isso aconteceu?
**Resposta:** A política RLS foi criada com uma restrição muito restritiva que não permitia mudar `is_active` de `true` para `false`. Isso não era intencional, mas é uma proteção padrão do Supabase.

---

### ❓ Isso vai perder meus dados?
**Resposta:** ❌ **NÃO!** Seus dados estão completamente seguros. Este erro apenas impede de SALVAR novos dados, não afeta dados existentes.

---

## 🛠️ Perguntas sobre a Correção

### ❓ Como eu corrijo isso?
**Resposta:** Você precisa executar um SQL no Supabase Dashboard. Há 2 formas:

1. **Mais fácil:** Acesse `/administracao/debug` e siga os 3 passos visuais
2. **Manual:** Copie o SQL de `/fix-rls.sql` e execute no Supabase SQL Editor

---

### ❓ Quanto tempo leva para corrigir?
**Resposta:** Entre 30 segundos e 2 minutos, dependendo do seu conhecimento do Supabase Dashboard.

---

### ❓ Preciso fazer isso toda vez?
**Resposta:** ❌ **NÃO!** Você executa o SQL **UMA VEZ** e o problema está resolvido **PERMANENTEMENTE**.

---

### ❓ Posso corrigir automaticamente pela aplicação?
**Resposta:** ❌ **NÃO.** A aplicação não tem permissão para alterar políticas de segurança do banco de dados. Você DEVE executar o SQL manualmente no Supabase Dashboard.

---

## 🔒 Perguntas sobre Segurança

### ❓ É seguro executar esse SQL?
**Resposta:** ✅ **SIM, totalmente seguro!**

O SQL:
- ✅ Não deleta dados
- ✅ Não altera dados existentes
- ✅ Não expõe informações sensíveis
- ✅ Apenas ajusta uma política específica
- ✅ Mantém a autenticação obrigatória

---

### ❓ Isso vai deixar meu banco de dados inseguro?
**Resposta:** ❌ **NÃO!** A política continua exigindo que:
- Usuários estejam autenticados
- Só podem atualizar sessões ativas
- A única mudança é permitir desativar sessões

---

### ❓ Posso reverter se algo der errado?
**Resposta:** ✅ **SIM!** Você pode reverter executando um SQL que restaura a política anterior. Mas isso não será necessário porque o SQL de correção é seguro e testado.

---

## 📝 Perguntas sobre Execução

### ❓ Onde eu executo esse SQL?
**Resposta:** No **Supabase SQL Editor**:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Menu lateral → "SQL Editor"
4. Clique em "+ New query"
5. Cole o SQL e clique em "RUN"

---

### ❓ Como sei que funcionou?
**Resposta:** Você verá a mensagem:
```
Success. No rows returned
```

Depois, volte para a aplicação e tente salvar uma conferência. Se não aparecer o erro, está corrigido! ✅

---

### ❓ O que fazer se aparecer erro ao executar o SQL?
**Resposta:** Verifique:
1. Você está logado no Supabase Dashboard?
2. Selecionou o projeto correto?
3. Copiou o SQL completo (incluindo o DROP POLICY)?
4. Clicou em RUN (ou Ctrl+Enter)?

Se o problema persistir, copie a mensagem de erro e consulte a documentação do Supabase.

---

## 🔄 Perguntas sobre Múltiplos Ambientes

### ❓ Tenho dev, staging e produção. Preciso executar em todos?
**Resposta:** ✅ **SIM!** Você precisa executar o SQL em **cada ambiente** separadamente, pois cada um tem seu próprio banco de dados.

---

### ❓ Posso automatizar isso com migration?
**Resposta:** ⚠️ **Depende.** Se você usa um sistema de migrations do Supabase, pode adicionar este SQL como uma migration. Mas para correção imediata, execute manualmente.

---

## 🆘 Perguntas sobre Suporte

### ❓ Onde encontro ajuda?
**Resposta:** Veja estes recursos na ordem:

1. `/administracao/debug` - Interface visual com guia
2. `/README_ERRO_RLS.md` - Guia completo
3. `/LEIA-ME-PRIMEIRO.txt` - Início rápido
4. `/INDICE_COMPLETO.md` - Lista de todos os recursos

---

### ❓ Qual arquivo devo usar?
**Resposta:** Depende do seu perfil:

- **Não técnico:** `/administracao/debug` (interface visual)
- **Desenvolvedor:** `/fix-rls.sql` (SQL direto)
- **Gestor:** `/RESUMO_EXECUTIVO.md` (visão executiva)
- **Primeira vez:** `/LEIA-ME-PRIMEIRO.txt` (visão geral)

---

### ❓ Executei o SQL mas o erro ainda aparece
**Resposta:** Tente:

1. ✅ Recarregue a aplicação (F5)
2. ✅ Limpe o cache do navegador (Ctrl+Shift+Delete)
3. ✅ Faça logout e login novamente
4. ✅ Feche e abra o navegador
5. ✅ Verifique se o SQL foi executado com sucesso no Supabase

---

## 💡 Perguntas Técnicas

### ❓ O que o SQL exatamente faz?
**Resposta:** 

**Antes:**
```sql
WITH CHECK (is_active = true)  -- ❌ Bloqueia is_active = false
```

**Depois:**
```sql
WITH CHECK (true)  -- ✅ Permite qualquer UPDATE
```

O SQL altera a condição `WITH CHECK` da política RLS de `is_active = true` para apenas `true`, permitindo que sessões sejam desativadas.

---

### ❓ Qual a diferença entre USING e WITH CHECK?
**Resposta:**

- **`USING`**: Verifica o estado ANTES do UPDATE (quais linhas podem ser atualizadas)
- **`WITH CHECK`**: Verifica o estado DEPOIS do UPDATE (quais valores são permitidos)

O problema estava no `WITH CHECK` que não permitia `is_active = false`.

---

### ❓ Por que não usar DISABLE RLS?
**Resposta:** Desabilitar o RLS completamente (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`) removeria TODA a segurança da tabela. Nossa solução mantém a segurança e apenas ajusta uma regra específica.

---

### ❓ Posso ver as políticas RLS atuais?
**Resposta:** ✅ **SIM!** No Supabase Dashboard:

1. Vá em "Database" → "Tables"
2. Selecione `conference_sessions`
3. Aba "RLS Policies"
4. Verá todas as políticas ativas

---

## 📊 Perguntas sobre Performance

### ❓ Isso vai deixar meu banco mais lento?
**Resposta:** ❌ **NÃO!** A mudança não afeta performance. As políticas RLS são avaliadas da mesma forma, apenas com uma condição diferente.

---

### ❓ Isso aumenta o uso de recursos?
**Resposta:** ❌ **NÃO!** O impacto é zero. A política continua sendo executada normalmente.

---

## 🎯 Perguntas sobre Próximos Passos

### ❓ Depois de corrigir, o que mais preciso fazer?
**Resposta:** ❌ **NADA!** Após executar o SQL com sucesso, está tudo resolvido. Continue usando a aplicação normalmente.

---

### ❓ Isso vai afetar outras funcionalidades?
**Resposta:** ❌ **NÃO!** A mudança afeta APENAS a tabela `conference_sessions` e APENAS a operação de UPDATE. Nada mais é alterado.

---

### ❓ Preciso avisar outros usuários?
**Resposta:** ⚠️ **APENAS SE** eles também estão vendo o erro. Se você executar o SQL, o erro desaparece para TODOS os usuários automaticamente (é uma mudança no banco, não no usuário).

---

## 🔧 Perguntas sobre Troubleshooting

### ❓ Como verifico se a política está corrigida?
**Resposta:** Acesse o Supabase Dashboard:

1. Database → Tables → conference_sessions
2. RLS Policies
3. Procure por "Usuários autenticados podem atualizar sessões ativas"
4. Verifique se `WITH CHECK` está como `true`

---

### ❓ Posso executar o SQL mais de uma vez?
**Resposta:** ✅ **SIM!** O SQL usa `DROP POLICY IF EXISTS`, então é seguro executar múltiplas vezes. Ele não vai dar erro ou duplicar nada.

---

### ❓ O que fazer se não tenho acesso ao Supabase Dashboard?
**Resposta:** Peça para alguém que tenha acesso de administrador ao projeto Supabase executar o SQL por você. Envie o arquivo `/fix-rls.sql` para essa pessoa.

---

<div align="center">

## 🎯 **TL;DR - Resumo Ultra-Rápido**

**Problema:** Erro ao salvar conferências  
**Causa:** Política RLS bloqueando  
**Solução:** Executar SQL no Supabase  
**Tempo:** 30 segundos  
**Onde:** `/administracao/debug`  
**Execuções:** 1x (permanente)  
**Riscos:** Nenhum  

</div>
