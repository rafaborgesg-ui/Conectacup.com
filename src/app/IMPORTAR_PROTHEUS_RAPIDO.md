# 🚀 Importação Rápida - Dados do Protheus

## ⏱️ Tempo: 2 minutos

### Passo 1: Abra o Supabase Dashboard
1. Acesse: https://app.supabase.com
2. Entre no seu projeto
3. Clique em **SQL Editor** no menu lateral

### Passo 2: Execute o SQL
1. Clique em **New Query**
2. Copie TODO o conteúdo de `/supabase/migrations/protheus_tables.sql`
3. Cole no editor
4. Clique em **RUN** (ou Ctrl + Enter)

### Passo 3: Confira o Resultado
Você verá esta tabela no final:

```
tabela           | total
-----------------+-------
CONTA_CONTABIL   | 147
PROJETO          | 18
SETOR            | 28
```

✅ **Pronto! 193 registros importados!**

---

## 🎯 O que foi criado?

### 3 Tabelas Separadas:

1. **`setor`** (28 registros)
   - Setores da empresa
   - Código, Nome, Responsável
   - Ex: ADE - ADESIVAGEM (Vinícius Quadros)

2. **`projeto`** (18 registros)
   - Projetos/Temporadas 2025
   - Etapas Carrera Cup, Challenge, Trophy
   - Ex: 25ET1 - Etapa 1 (Carrera Cup)

3. **`conta_contabil`** (147 registros)
   - Plano de contas contábeis
   - Código, Descrição, Tipo
   - Ex: 311010001 - Receita Revenda de Mercadorias

---

## ❌ Erros Comuns

### "syntax error at or near 'NOT'" ou "column does not exist"

**Solução Rápida:**
1. Execute o arquivo `/supabase/migrations/LIMPAR_PROTHEUS.sql` (3 linhas só!)
2. Depois execute o SQL completo novamente

**Ou faça manualmente:**
```sql
DROP TABLE IF EXISTS public.setor CASCADE;
DROP TABLE IF EXISTS public.projeto CASCADE;
DROP TABLE IF EXISTS public.conta_contabil CASCADE;
```
(Depois execute o SQL completo novamente)

### "duplicate key value"

**Solução:** Tudo bem! Significa que alguns dados já existiam. O SQL atualiza automaticamente.

### "permission denied"

**Solução:** Certifique-se de estar logado como admin no Supabase.

---

## 📚 Quer Detalhes?

Veja o guia completo: `/COMO_IMPORTAR_MASTER_DATA.md`

---

## 🎉 Próximos Passos

1. Acesse sua aplicação
2. Vá em: **Cadastros → Master Data**
3. Veja as abas: **Setor**, **Projeto**, **Conta Contábil**
4. Os dados já estarão lá! 🚀

---

**Conecta Cup** | Sistema de Gestão SaaS
