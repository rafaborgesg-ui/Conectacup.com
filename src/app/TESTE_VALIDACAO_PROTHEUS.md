# ✅ Guia de Teste e Validação - Protheus

## 🎯 Objetivo

Validar que as 3 tabelas do Protheus (Setor, Projeto, Conta Contábil) estão funcionando 100% integradas com o Supabase.

---

## 📋 Pré-requisitos

Antes de começar os testes, certifique-se de que:

- [x] SQL executado: `/supabase/migrations/ADD_DESCRICAO_COLUMNS.sql`
- [x] Edge Function deployada: `make-server-02726c7c`
- [x] Aplicação recarregada (F5)

---

## 🧪 TESTE 1: Verificar Estrutura no Banco

### Passo 1.1: Executar SQL de Verificação

No SQL Editor do Supabase, execute:

```sql
-- Copie e cole de:
/supabase/migrations/VERIFICAR_ESTRUTURA.sql
```

### Passo 1.2: Verificar Resultado

**Esperado:**
```
✅ TODAS AS COLUNAS NECESSÁRIAS EXISTEM!

Total de registros:
- setor: 28
- projeto: 18  
- conta_contabil: 147
```

**Se aparecer erro:** Execute o SQL de padronização primeiro.

---

## 🧪 TESTE 2: Criar Novo SETOR

### Passo 2.1: Acessar a Interface
1. Vá em: **Cadastros** → **Master Data**
2. Clique na aba: **Protheus**
3. Certifique-se que está na sub-aba: **Setor**

### Passo 2.2: Adicionar Novo Setor
1. Clique: **[+ Adicionar]**
2. Preencha:
   - **Setor:** `TESTE-001`
   - **Descrição:** `Setor de teste para validação`
   - **Responsável:** `João Silva`
3. Clique: **[Salvar]**

### Passo 2.3: Verificar no Front-end
- ✅ Card aparece na lista
- ✅ Nome: "TESTE-001"
- ✅ Descrição: "Setor de teste para validação"
- ✅ Responsável: "João Silva"

### Passo 2.4: Verificar no Banco
Execute no SQL Editor:

```sql
SELECT 
  setor,
  descricao,
  responsavel,
  created_at
FROM setor
WHERE setor = 'TESTE-001';
```

**Esperado:**
```
setor      | descricao                          | responsavel  | created_at
-----------|------------------------------------|--------------|-----------
TESTE-001  | Setor de teste para validação      | João Silva   | 2025-...
```

### Passo 2.5: Editar Setor
1. Clique no ícone de **Editar** (lápis azul)
2. Altere:
   - **Descrição:** `Descrição atualizada`
3. Clique: **[Salvar]**
4. Verifique que a descrição mudou no card

### Passo 2.6: Deletar Setor
1. Clique no ícone de **Deletar** (lixeira vermelha)
2. Confirme a exclusão
3. Verifique que o card sumiu

---

## 🧪 TESTE 3: Criar Novo PROJETO

### Passo 3.1: Acessar a Interface
1. Na aba **Protheus**
2. Clique na sub-aba: **Projeto**

### Passo 3.2: Adicionar Novo Projeto
1. Clique: **[+ Adicionar]**
2. Preencha:
   - **Projeto:** `Challenge Teste 2025`
   - **Descrição:** `Projeto de teste para validação do sistema`
3. Clique: **[Salvar]**

### Passo 3.3: Verificar no Front-end
- ✅ Card aparece na lista
- ✅ Nome: "Challenge Teste 2025"
- ✅ Descrição: "Projeto de teste para validação do sistema"
- ✅ **NÃO** deve ter campo Responsável (só existe em Setor)

### Passo 3.4: Verificar no Banco
```sql
SELECT 
  projeto,
  descricao,
  temporada,
  created_at
FROM projeto
WHERE projeto = 'Challenge Teste 2025';
```

**Esperado:**
```
projeto                | descricao                                    | temporada | created_at
-----------------------|----------------------------------------------|-----------|------------
Challenge Teste 2025   | Projeto de teste para validação do sistema   | 2025      | 2025-...
```

### Passo 3.5: Visualização em Tabela
1. Clique no ícone de **Tabela** (ao lado do ícone de grade)
2. Verifique que as colunas aparecem:
   - ✅ Projeto
   - ✅ Descrição
   - ✅ Data de Criação
   - ✅ Ações

### Passo 3.6: Filtro de Busca
1. No campo de busca, digite: `Challenge`
2. Verifique que o projeto "Challenge Teste 2025" aparece
3. Digite: `teste`
4. Verifique que filtra pela descrição também

### Passo 3.7: Limpar Teste
1. Delete o projeto de teste criado

---

## 🧪 TESTE 4: Criar Nova CONTA CONTÁBIL

### Passo 4.1: Acessar a Interface
1. Na aba **Protheus**
2. Clique na sub-aba: **Conta Contábil**

### Passo 4.2: Adicionar Nova Conta
1. Clique: **[+ Adicionar]**
2. Preencha:
   - **Conta Contábil:** `1.01.999`
   - **Descrição:** `Conta de teste para validação`
3. Clique: **[Salvar]**

### Passo 4.3: Verificar no Front-end
- ✅ Card aparece na lista
- ✅ Nome: "1.01.999"
- ✅ Descrição: "Conta de teste para validação"
- ✅ **NÃO** deve ter campo Responsável

### Passo 4.4: Verificar no Banco
```sql
SELECT 
  "Conta Contábil",
  descricao,
  created_at
FROM conta_contabil
WHERE "Conta Contábil" = '1.01.999';
```

**Esperado:**
```
Conta Contábil | descricao                        | created_at
---------------|----------------------------------|------------
1.01.999       | Conta de teste para validação    | 2025-...
```

### Passo 4.5: Verificar Ordenação
1. Verifique que as contas estão ordenadas alfabeticamente
2. A conta "1.01.999" deve aparecer entre as outras contas 1.01.x

### Passo 4.6: Limpar Teste
1. Delete a conta de teste criada

---

## 🧪 TESTE 5: Verificar Dados Existentes

### Passo 5.1: Contar Registros em Cada Aba

**SETOR:**
- Deve mostrar: "28 itens cadastrados" (ou mais se adicionou)

**PROJETO:**
- Deve mostrar: "18 itens cadastrados" (ou mais se adicionou)

**CONTA CONTÁBIL:**
- Deve mostrar: "147 itens cadastrados" (ou mais se adicionou)

### Passo 5.2: Verificar Descrições Existentes

**SETOR:**
1. Clique para editar qualquer setor
2. Verifique se tem campo "Descrição"
3. Se vazio, adicione uma descrição
4. Salve e verifique que persiste

**PROJETO:**
1. Verifique projetos existentes
2. Se descrições estiverem vazias, é normal (dados antigos)
3. Adicione descrições nos principais

**CONTA CONTÁBIL:**
1. Verifique contas existentes
2. Descrições podem estar vazias (dados antigos)
3. Adicione descrições nas mais usadas

---

## 🧪 TESTE 6: Testar Funcionalidades

### Teste 6.1: Busca/Filtro
1. Em cada aba, teste o campo de busca
2. Busque por nome (ex: "Challenge")
3. Busque por descrição (ex: "teste")
4. Busque por responsável em Setor (ex: "João")

**Esperado:** Filtra corretamente em todos os casos.

### Teste 6.2: Ordenação
1. Verifique que os itens estão ordenados alfabeticamente
2. Adicione um item com nome começando com "A"
3. Verifique que vai para o topo

### Teste 6.3: Visualização Card vs Tabela
1. Clique no ícone de **Grade** (Card view)
2. Verifique que mostra em cards
3. Clique no ícone de **Lista** (Table view)
4. Verifique que mostra em tabela
5. Ambas devem mostrar: Nome, Descrição (e Responsável no Setor)

---

## 🧪 TESTE 7: Verificar Logs

### Passo 7.1: Acessar Logs da Edge Function

1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions
2. Filtre por: `make-server-02726c7c`
3. Recarregue a página da aplicação (F5)

### Passo 7.2: Verificar Mensagens de Log

Deve aparecer:
```
✅ Setores carregados: 28 registros
✅ Projetos carregados: 18 registros
✅ Contas contábeis carregadas: 147 registros
```

Se aparecer `0 registros`, algo está errado!

### Passo 7.3: Verificar Logs ao Salvar

1. Crie um novo item em qualquer aba
2. Veja os logs
3. Deve aparecer algo como:
```
💾 Salvando item Protheus: {
  type: 'setor',
  name: 'TESTE-001',
  description: 'Descrição do teste',
  responsavel: 'João Silva'
}
```

---

## 🧪 TESTE 8: Verificar Console do Navegador

### Passo 8.1: Abrir DevTools
1. Pressione **F12**
2. Vá na aba **Console**

### Passo 8.2: Recarregar Página
1. Pressione **F5**
2. Verifique que **NÃO** aparecem erros em vermelho
3. Pode aparecer logs informativos (ok)

### Passo 8.3: Criar/Editar Item
1. Crie um novo item
2. Verifique no Console que não há erros
3. Deve aparecer mensagem de sucesso (toast verde)

---

## ✅ Checklist Final de Validação

Marque cada item após testar:

### Estrutura
- [ ] SQL de verificação executado sem erros
- [ ] Todas as colunas necessárias existem
- [ ] Contagem de registros está correta

### SETOR
- [ ] Consegue criar novo setor
- [ ] Campo Setor funciona
- [ ] Campo Descrição funciona
- [ ] Campo Responsável funciona
- [ ] Consegue editar setor existente
- [ ] Consegue deletar setor
- [ ] Dados persistem no banco

### PROJETO
- [ ] Consegue criar novo projeto
- [ ] Campo Projeto funciona
- [ ] Campo Descrição funciona
- [ ] NÃO tem campo Responsável
- [ ] Consegue editar projeto existente
- [ ] Consegue deletar projeto
- [ ] Dados persistem no banco

### CONTA CONTÁBIL
- [ ] Consegue criar nova conta
- [ ] Campo Conta Contábil funciona
- [ ] Campo Descrição funciona
- [ ] NÃO tem campo Responsável
- [ ] Consegue editar conta existente
- [ ] Consegue deletar conta
- [ ] Dados persistem no banco

### Funcionalidades
- [ ] Busca/filtro funciona em todas as abas
- [ ] Ordenação alfabética funciona
- [ ] Visualização em Card funciona
- [ ] Visualização em Tabela funciona
- [ ] Logs da Edge Function aparecem corretamente
- [ ] Console do navegador sem erros

---

## 🐛 Problemas Comuns e Soluções

### ❌ "0 itens cadastrados" em todas as abas

**Causa:** Edge Function não foi deployada ou está com erro.

**Solução:**
1. Verifique logs da Edge Function
2. Re-deploy: `supabase functions deploy make-server-02726c7c`
3. Recarregue a página (F5)

---

### ❌ Campo Descrição não aparece no formulário

**Causa:** Configuração do front-end incorreta.

**Solução:** Verifique `/components/MasterData.tsx` linhas 140-142:
```typescript
{ id: 'setor', label: 'Setor', hasDescription: true, hasResponsavel: true },
{ id: 'projeto', label: 'Projeto', hasDescription: true },
{ id: 'conta_contabil', label: 'Conta Contábil', hasDescription: true },
```

Todos devem ter `hasDescription: true`.

---

### ❌ Erro ao salvar: "column does not exist"

**Causa:** Coluna `descricao` não existe no banco.

**Solução:** Execute:
```sql
/supabase/migrations/ADD_DESCRICAO_COLUMNS.sql
```

---

### ❌ Dados aparecem mas descrição vem vazia

**Causa:** Dados antigos não tinham descrição.

**Solução:** Normal! Adicione descrições manualmente ou execute:
```sql
-- Exemplo para adicionar descrições automáticas
UPDATE setor 
SET descricao = 'Setor ' || setor 
WHERE descricao IS NULL;

UPDATE projeto 
SET descricao = 'Projeto ' || projeto 
WHERE descricao IS NULL;

UPDATE conta_contabil 
SET descricao = 'Conta ' || "Conta Contábil" 
WHERE descricao IS NULL;
```

---

### ❌ Conta Contábil não salva/carrega

**Causa:** Nome da coluna tem espaço ("Conta Contábil").

**Solução:** Já está corrigido no backend:
```typescript
item['Conta Contábil']  // ✅ Com colchetes e aspas
```

Se ainda não funciona, verifique se o deploy foi feito.

---

## 📊 Resultado Esperado Final

Após todos os testes:

```
✅ SETOR
   - 28+ registros
   - Campos: Setor, Descrição, Responsável
   - Todas as operações funcionando

✅ PROJETO
   - 18+ registros
   - Campos: Projeto, Descrição
   - Todas as operações funcionando

✅ CONTA CONTÁBIL
   - 147+ registros
   - Campos: Conta Contábil, Descrição
   - Todas as operações funcionando

✅ FUNCIONALIDADES
   - Busca/Filtro: OK
   - Ordenação: OK
   - Card View: OK
   - Table View: OK
   - Logs: OK
   - Console: Sem erros
```

---

## 🎉 Parabéns!

Se todos os testes passaram, a integração Protheus está 100% funcional! 🚀

---

**Conecta Cup** | Testes de Validação - Protheus
