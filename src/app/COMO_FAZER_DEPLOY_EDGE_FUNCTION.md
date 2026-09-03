# 🚀 Como Fazer Deploy da Edge Function - Passo a Passo

## ⚠️ IMPORTANTE
A Edge Function `make-server-02726c7c` foi atualizada para buscar corretamente a coluna `descricao` do banco de dados, mas o **deploy ainda não foi feito**. Por isso a descrição não está aparecendo!

---

## 📋 Opção 1: Deploy via Dashboard (RECOMENDADO)

### Passo 1: Acessar o Dashboard
Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions

### Passo 2: Encontrar a Function
Procure por: `make-server-02726c7c`

### Passo 3: Editar a Function
1. Clique nos **3 pontinhos** (⋮) ao lado da function
2. Clique em **"Edit Function"**

### Passo 4: Substituir o Código
1. Selecione **TODO** o código antigo
2. Delete tudo
3. Abra o arquivo: `/supabase/functions/server/index.tsx`
4. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)
5. Cole no editor da Supabase (Ctrl+V)

### Passo 5: Deploy
1. Clique no botão **"Deploy"** (canto superior direito)
2. Aguarde a mensagem: "Function deployed successfully"

### Passo 6: Verificar
1. Volte para a aplicação
2. Pressione **F5** para recarregar
3. Vá em: Cadastros → Master Data → Protheus → Setor
4. Agora a coluna "Descrição" deve aparecer preenchida!

---

## 📋 Opção 2: Deploy via CLI

Se você tiver o Supabase CLI instalado:

### Passo 1: Navegar até a pasta do projeto
```bash
cd /caminho/do/seu/projeto
```

### Passo 2: Fazer login
```bash
supabase login
```

### Passo 3: Linkar com o projeto
```bash
supabase link --project-ref nflgqugaabtxzifyhjor
```

### Passo 4: Deploy
```bash
supabase functions deploy make-server-02726c7c
```

### Passo 5: Verificar
- Aguarde mensagem de sucesso
- Recarregue a aplicação (F5)

---

## 🔍 Como Verificar se Deu Certo

### 1. Verificar Logs da Function

**Acessar:**
https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions

**Filtrar por:**
- Function: `make-server-02726c7c`
- Últimos 15 minutos

**Procurar por:**
```
✅ Setores carregados: 28 registros
✅ Projetos carregados: 18 registros
✅ Contas contábeis carregadas: 147 registros
```

Se aparecer essas mensagens, o deploy foi bem-sucedido!

---

### 2. Testar no Front-end

1. **Recarregue a página** (F5)
2. Vá em: **Cadastros** → **Master Data** → **Protheus**
3. Clique na aba: **Setor**
4. Agora a coluna "Descrição" deve mostrar os valores:
   - ADE → VAZIO
   - ADM → EMPTY
   - ALM → RECURSOS HUMANOS
   - ATP → OFICINA
   - etc.

---

### 3. Verificar no Console do Navegador

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Recarregue a página (F5)
4. Procure por mensagens de erro
5. **NÃO** deve ter erros em vermelho

---

## 🐛 Problemas Comuns

### ❌ Erro: "Function not found"

**Causa:** Nome da function incorreto.

**Solução:** Certifique-se de usar o nome exato: `make-server-02726c7c`

---

### ❌ Erro: "Permission denied"

**Causa:** Sem permissão no projeto Supabase.

**Solução:** 
1. Verifique se está logado com a conta correta
2. Verifique se tem acesso ao projeto no Dashboard

---

### ❌ Descrição ainda não aparece após deploy

**Causa:** Cache do navegador.

**Solução:**
1. Pressione **Ctrl+Shift+R** (hard reload)
2. Ou abra em aba anônima (Ctrl+Shift+N)
3. Ou limpe cache do navegador

---

### ❌ Descrição aparece vazia para alguns itens

**Causa:** Alguns registros realmente não têm descrição no banco.

**Solução:** Normal! Veja na imagem do banco que alguns têm "EMPTY" ou valores reais. Se quiser preencher:

```sql
-- Ver quais estão vazios
SELECT setor, descricao, responsavel 
FROM setor 
WHERE descricao IS NULL OR descricao = '' OR descricao = 'EMPTY';

-- Preencher com descrição padrão (opcional)
UPDATE setor 
SET descricao = 'Setor ' || setor 
WHERE descricao IS NULL OR descricao = '' OR descricao = 'EMPTY';
```

---

## ✅ Checklist de Deploy

Marque cada item após executar:

- [ ] Abri o Dashboard do Supabase
- [ ] Encontrei a function `make-server-02726c7c`
- [ ] Cliquei em "Edit Function"
- [ ] Copiei TODO o código de `/supabase/functions/server/index.tsx`
- [ ] Colei no editor
- [ ] Cliquei em "Deploy"
- [ ] Vi mensagem de sucesso
- [ ] Recarreguei a aplicação (F5)
- [ ] Abri Master Data → Protheus → Setor
- [ ] Coluna Descrição agora mostra valores do banco

---

## 📸 Resultado Esperado

**ANTES do deploy:**
```
Setor | Descrição | Responsável
------|-----------|-------------
ADE   | -         | VINÍCIUS QUADROS
ADM   | -         | CARLOS
ALM   | -         | RAFAEL BORGES
```

**DEPOIS do deploy:**
```
Setor | Descrição         | Responsável
------|-------------------|-------------
ADE   | (vazio ou EMPTY)  | VINÍCIUS QUADROS
ADM   | EMPTY             | CARLOS
ALM   | RECURSOS HUMANOS  | RAFAEL BORGES
ATP   | OFICINA           | GESSE ALVES
```

**Nota:** Alguns podem continuar vazios se realmente não têm descrição no banco. Veja a segunda imagem que você enviou - alguns registros têm "EMPTY" na coluna descricao.

---

## 🎯 Próximos Passos Após Deploy

1. ✅ Verificar que descrições aparecem
2. ✅ Testar editar um setor e adicionar/mudar descrição
3. ✅ Verificar que a descrição persiste após salvar
4. ✅ Testar o mesmo para Projeto e Conta Contábil

---

## 📞 Dúvidas?

Se após o deploy a descrição ainda não aparecer:

1. **Verifique os logs** da Edge Function
2. **Abra o Console** do navegador (F12)
3. **Tire um print** do erro
4. **Envie** para análise

---

**Conecta Cup** | Deploy Edge Function - Atualização Protheus 🚀
