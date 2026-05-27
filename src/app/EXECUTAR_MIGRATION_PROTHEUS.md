# 🚨 MIGRATION NECESSÁRIA: Campos Protheus no Master Data

## ❌ Problema Identificado

Os campos **Descrição** e **Responsável** da seção Protheus no Master Data não estão sendo salvos porque **faltam colunas no banco de dados**.

## ✅ Solução (2 minutos)

### Passo 1: Acesse o SQL Editor do Supabase
Abra o link: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql

### Passo 2: Copie a Migration
Copie TODO o conteúdo do arquivo:
```
/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql
```

### Passo 3: Execute a Migration
1. Cole o conteúdo no SQL Editor do Supabase
2. Clique em **RUN** (ou pressione Ctrl+Enter)
3. Aguarde a confirmação de sucesso

### Passo 4: Verifique
1. Recarregue a página da aplicação (F5)
2. Acesse **Master Data > Protheus**
3. Cadastre um item de teste com:
   - **Setor**: Nome + Descrição + Responsável
   - **Projeto**: Nome + Descrição
   - **Conta Contábil**: Nome + Descrição

## 🔍 O que a Migration faz?

Adiciona 2 novas colunas à tabela `master_data`:
- `description` (TEXT) - Para todos os tipos Protheus
- `responsavel` (TEXT) - Apenas para Setor

## ⚡ Após a Migration

O backend já está preparado para salvar e carregar esses campos automaticamente!

---

**Última atualização:** 27/11/2024
