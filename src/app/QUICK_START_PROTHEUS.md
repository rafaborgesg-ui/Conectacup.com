# 🚀 Quick Start: Protheus no Master Data

## 📋 Visão Geral

A seção **Protheus** no Master Data permite cadastrar 3 tipos de dados:

### 1. 🏢 Setor
- **Nome**: Identificação do setor
- **Descrição**: Detalhes sobre o setor
- **Responsável**: Nome do responsável pelo setor

### 2. 📊 Projeto  
- **Nome**: Identificação do projeto
- **Descrição**: Detalhes sobre o projeto

### 3. 💰 Conta Contábil
- **Nome**: Identificação da conta contábil
- **Descrição**: Detalhes sobre a conta

---

## ⚡ Configuração Inicial (Primeira vez)

### ⚠️ Migration Necessária

Antes de usar a seção Protheus, você precisa executar uma migration no banco de dados para adicionar as colunas necessárias.

### Passo 1: Acesse o SQL Editor
Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql

### Passo 2: Execute a Migration
1. Abra o arquivo `/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql`
2. Copie **todo** o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou Ctrl+Enter)
5. Aguarde a confirmação: ✅ Migration concluída

### Passo 3: Recarregue a Aplicação
- Pressione **F5** para recarregar a página
- O alerta amarelo na seção Protheus desaparecerá

---

## 🎯 Como Usar

### Cadastrar um Setor
1. Acesse **Master Data** no menu lateral
2. Clique na aba **Protheus 💼**
3. No card **Setor**, clique em **Adicionar**
4. Preencha:
   - Setor: Nome do setor (ex: "Comercial")
   - Descrição: Detalhes (ex: "Setor responsável por vendas")
   - Responsável: Nome (ex: "João Silva")
5. Clique em **Salvar**

### Cadastrar um Projeto
1. No card **Projeto**, clique em **Adicionar**
2. Preencha:
   - Projeto: Nome do projeto (ex: "Expansão 2025")
   - Descrição: Detalhes (ex: "Projeto de expansão da frota")
3. Clique em **Salvar**

### Cadastrar uma Conta Contábil
1. No card **Conta Contábil**, clique em **Adicionar**
2. Preencha:
   - Conta Contábil: Código ou nome (ex: "3.1.001")
   - Descrição: Detalhes (ex: "Despesas com pneus")
3. Clique em **Salvar**

---

## 🔧 Editar/Deletar Itens

### Editar
1. Clique no ícone de **lápis** (✏️) no item desejado
2. Modifique os campos
3. Clique em **Salvar**

### Deletar
1. Clique no ícone de **lixeira** (🗑️) no item desejado
2. Confirme a exclusão

---

## ✅ Verificação

Após cadastrar itens, você verá:
- ✅ Card mostra quantidade de itens: "3 itens cadastrados"
- ✅ Lista organizada alfabeticamente
- ✅ Campos Descrição e Responsável visíveis nos cards
- ✅ Data de criação em cada item

---

## 🐛 Problemas Comuns

### ❌ Campos não salvam
**Causa**: Migration não executada  
**Solução**: Execute os passos da seção "Configuração Inicial"

### ❌ Alerta amarelo não sai
**Causa**: Página não recarregada após migration  
**Solução**: Pressione F5 para recarregar

### ❌ Erro ao salvar
**Causa**: Campo obrigatório vazio  
**Solução**: O campo "Nome" (Setor/Projeto/Conta) é sempre obrigatório

---

## 📚 Documentação Adicional

- **Migration SQL**: `/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql`
- **Guia Completo**: `/EXECUTAR_MIGRATION_PROTHEUS.md`
- **Componente**: `/components/MasterData.tsx`
- **Backend**: `/supabase/functions/server/index.tsx` (linhas 2005-2072)

---

**Última atualização:** 27/11/2024
