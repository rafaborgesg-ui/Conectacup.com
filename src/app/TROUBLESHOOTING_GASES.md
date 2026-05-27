# 🔧 Troubleshooting - Programação de Gases

## Erro: "null value in column 'id' violates not-null constraint"

### ❌ Sintoma
```
Erro ao criar programação: {
  "code": "23502",
  "message": "null value in column \"id\" of relation \"gas_programming\" violates not-null constraint"
}
```

### ✅ Solução
Este erro foi corrigido! Se você ainda está vendo isso:

1. **Limpe o cache do navegador**: Ctrl+Shift+R ou Cmd+Shift+R
2. **Recarregue a página completamente**: F5
3. Se persistir, verifique se a tabela foi criada corretamente:

```sql
-- Execute no SQL Editor do Supabase
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'gas_programming'
AND column_name = 'id';
```

**Esperado:**
- `column_default` deve ser: `gen_random_uuid()`

---

## Erro: "relation 'gas_programming' does not exist"

### ❌ Sintoma
```
Erro: {
  "code": "42P01",
  "message": "relation \"gas_programming\" does not exist"
}
```

### ✅ Solução

A tabela não foi criada. Execute a migration:

1. Clique em **"Copiar SQL"** no alerta laranja da página
2. Abra [Supabase Dashboard](https://app.supabase.com)
3. Vá em **SQL Editor** → **New Query**
4. Cole o SQL e clique em **Run**
5. Recarregue a página (F5)

---

## Erro: "permission denied for table gas_programming"

### ❌ Sintoma
```
Erro: {
  "code": "42501",
  "message": "permission denied for table gas_programming"
}
```

### ✅ Solução

As políticas RLS não foram criadas corretamente.

**Execute este SQL no Supabase:**

```sql
-- Remove políticas antigas (se existirem)
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.gas_programming;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.gas_programming;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.gas_programming;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON public.gas_programming;

-- Recria as políticas
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.gas_programming FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.gas_programming FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados"
ON public.gas_programming FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir deleção para usuários autenticados"
ON public.gas_programming FOR DELETE TO authenticated USING (true);
```

---

## Erro: "XHR failed with status 403"

### ❌ Sintoma
```
Error while deploying: XHR for "/api/integrations/supabase/.../edge_functions/make-server/deploy" failed with status 403
```

### ✅ Solução

Este erro NÃO afeta o funcionamento da Programação de Gases! 

O módulo de Programação de Gases **não usa Edge Functions**, usa integração direta com Supabase.

**Pode ignorar este erro com segurança.**

Se quiser removê-lo, verifique:
- Se você tem permissões de deploy no projeto Supabase
- Se o projeto Supabase está ativo e acessível

---

## Erro: "Preencha todos os campos obrigatórios"

### ❌ Sintoma
Toast de erro ao tentar salvar programação.

### ✅ Solução

Certifique-se de preencher:
1. **Pista** (selecionada no topo da página)
2. **Etapa** (selecionada no topo da página)
3. **Temporada** (selecionada no topo da página)
4. **Categoria** (no formulário)
5. **Tipo de Gás** (no formulário)
6. **Quantidade** (no formulário, maior que 0)

Os campos **Fornecedor**, **Data Programada** e **Observações** são opcionais.

---

## Erro: "TypeError: Cannot read property 'id' of undefined"

### ❌ Sintoma
Erro no console do navegador ao editar uma programação.

### ✅ Solução

1. Recarregue a página (F5)
2. Tente editar novamente
3. Se persistir, delete e recrie a programação

---

## Verificação Completa do Setup

Execute este script completo no SQL Editor do Supabase para verificar tudo:

```sql
-- 1. Verificar se a tabela existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'gas_programming'
    ) THEN '✅ Tabela existe'
    ELSE '❌ Tabela NÃO existe - Execute a migration!'
  END as status_tabela;

-- 2. Verificar colunas
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'gas_programming'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'gas_programming';

-- 4. Verificar políticas
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'gas_programming';

-- 5. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'gas_programming';

-- 6. Teste de inserção (opcional - comente se não quiser inserir)
-- INSERT INTO public.gas_programming (
--   pista, etapa, temporada, categoria, gas_type, quantidade, status
-- ) VALUES (
--   'Interlagos', '1', '2025', 'Carrera Cup', 'Nitrogênio 9m³', 10, 'planejado'
-- ) RETURNING *;
```

**Resultados Esperados:**
1. ✅ Tabela existe
2. 13 colunas listadas (id, pista, etapa, temporada, categoria, gas_type, quantidade, fornecedor, data_programada, status, observacoes, created_at, updated_at, created_by)
3. RLS habilitado = true
4. 4 políticas listadas (SELECT, INSERT, UPDATE, DELETE)
5. 4 índices listados

---

## Ainda com Problemas?

### Debug Passo a Passo

1. **Abra o Console do Navegador** (F12)
2. Vá para a aba **Console**
3. Tente criar uma programação
4. Procure por mensagens de erro detalhadas
5. Procure por logs que começam com "Inserindo programação:" ou "Programação criada com sucesso:"

### Verificar Autenticação

```sql
-- Execute no SQL Editor
SELECT auth.uid() as meu_user_id;
```

Se retornar NULL, você não está autenticado no Supabase.

### Recriar a Tabela do Zero

Se nada funcionar, delete e recrie:

```sql
-- ⚠️ ATENÇÃO: Isso vai apagar TODOS os dados!
DROP TABLE IF EXISTS public.gas_programming CASCADE;

-- Depois execute a migration completa novamente
-- (copie do botão "Copiar SQL" na interface)
```

---

## Logs Úteis

Ao criar uma programação, você deve ver no console:

```
Inserindo programação: {
  pista: "Interlagos",
  etapa: "1",
  temporada: "2025",
  categoria: "Carrera Cup",
  gas_type: "Nitrogênio 9m³/10m³",
  quantidade: 10,
  fornecedor: "GAMA Gases",
  status: "planejado"
}

Programação criada com sucesso: {
  id: "abc-123-def-456",
  pista: "Interlagos",
  ...
  created_at: "2025-11-27T10:00:00.000Z"
}
```

Se você NÃO vê esses logs, significa que há um problema antes da chamada ao Supabase.

---

## Contato

Se nenhuma dessas soluções funcionar, copie o erro completo do console (F12) e entre em contato com o suporte técnico.
