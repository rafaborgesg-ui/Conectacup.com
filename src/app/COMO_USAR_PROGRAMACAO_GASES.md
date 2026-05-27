# 🚀 Como Usar a Programação de Gases

## ✅ Pré-requisitos

Antes de começar a usar o módulo de Programação de Gases, você precisa executar a migration SQL no Supabase.

## 📋 Passo a Passo Rápido

### 1️⃣ Copiar o SQL

Quando você acessar a página de Programação de Gases pela primeira vez, verá um alerta laranja com o botão **"Copiar SQL"**. Clique nele!

### 2️⃣ Acessar o Supabase

1. Abra [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto **Conecta Cup**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### 3️⃣ Executar a Migration

1. Cole o SQL que você copiou
2. Clique no botão **Run** (ou pressione Ctrl+Enter)
3. Aguarde a confirmação de sucesso ✅

### 4️⃣ Recarregar a Aplicação

Volte para a aplicação e pressione **F5** para recarregar a página.

---

## 🎯 Usando a Programação de Gases

### Passo 1: Selecionar Pista e Etapa

Na tela principal, você verá três dropdowns:
- **Pista**: Selecione a pista (ex: Interlagos, Velocitta, Goiânia)
- **Etapa**: Selecione o número da etapa (1, 2, 3...)
- **Temporada**: Selecione o ano (2024, 2025, 2026)

### Passo 2: Visualizar Fornecedores

Após selecionar a pista, você verá um card verde com os fornecedores disponíveis:
- Clique em **"Mostrar Detalhes"** para ver contatos, endereços e telefones
- Os fornecedores principais aparecem com badge "Principal"

### Passo 3: Nova Programação

1. Clique no botão vermelho **"Nova Programação"**
2. Preencha o formulário:
   - **Categoria**: Escolha a categoria (Carrera Cup, Challenge, Trophy, etc.)
   - **Tipo de Gás**: Selecione o tipo (Nitrogênio 9m³, Nitrogênio 3m³, etc.)
   - **Quantidade**: Digite quantas unidades você precisa
   - **Fornecedor** (opcional): Escolha o fornecedor
   - **Data Programada** (opcional): Quando deve ser entregue
   - **Observações** (opcional): Informações adicionais

3. Clique em **"Salvar"**

### Passo 4: Visualizar Programações

A página tem 3 abas:

#### 📊 Visão Geral
Lista todas as programações da etapa selecionada com:
- Badge de categoria
- Badge de status (Planejado, Solicitado, Confirmado, Entregue, Cancelado)
- Tipo de gás e quantidade
- Fornecedor
- Data programada
- Observações

#### 📦 Por Categoria
Agrupa as programações por categoria (Carrera, Challenge, Trophy)

#### 📅 Timeline
Mostra uma linha do tempo com as entregas programadas ordenadas por data

### Passo 5: Editar ou Excluir

- **Editar**: Clique no ícone de lápis ao lado da programação
- **Excluir**: Clique no ícone de lixeira (será pedida confirmação)

---

## 📈 Relatórios e Estatísticas

No topo da página, você verá um card roxo com:
- **Total Programado**: Total de programações na temporada
- **Entregues**: Quantas já foram entregues
- **Confirmados**: Quantas estão confirmadas
- **Pendentes**: Quantas estão planejadas ou solicitadas
- **Histórico por Etapa**: Resumo de cada etapa
- **Top 5 Gases Mais Utilizados**: Ranking dos gases mais programados

---

## 💡 Dicas

### Status das Programações

- **Planejado**: Ainda não foi solicitado ao fornecedor
- **Solicitado**: Já foi pedido ao fornecedor
- **Confirmado**: Fornecedor confirmou a entrega
- **Entregue**: Já foi recebido
- **Cancelado**: Programação cancelada

### Tipos de Gases Disponíveis

**Nitrogênio:**
- Nitrogênio 9m³/10m³ (cilindro grande)
- Nitrogênio 3m³/3.8m³ (cilindro médio)

**Outros:**
- Argônio 1m³, 3m³, 6m³
- Acetileno 1m³, 3m³, 6m³
- Oxigênio 1m³, 3m³, 6m³
- Gás Empilhadeira P20 (20kg)

### Fornecedores por Pista

O sistema já tem cadastrados os principais fornecedores por pista:
- **Interlagos**: ACESOLDA, GAMA Gases, OXITAB, Liquigás
- **Velocitta**: Gás Guaçu White Martins
- **Goiânia**: EBO - Empresa Brasileira de Oxigênio
- **Termas de Rio Hondo**: Farber Elizabeth (Argentina)
- **Estoril/Algarve**: Matinalca Portugal

---

## 🔧 Problemas Comuns

### "Tabela não encontrada"
Execute a migration SQL conforme descrito no início deste documento.

### "Erro ao salvar"
Verifique se todos os campos obrigatórios estão preenchidos (Categoria, Tipo de Gás, Quantidade).

### Fornecedores não aparecem
Certifique-se de ter selecionado uma pista primeiro.

---

## 📞 Exemplo de Uso Prático

### Cenário: Etapa 1 em Interlagos

1. Selecione:
   - Pista: **Interlagos**
   - Etapa: **1**
   - Temporada: **2025**

2. Clique em **Nova Programação**

3. Preencha:
   - Categoria: **Carrera Cup**
   - Tipo de Gás: **Nitrogênio 9m³/10m³**
   - Quantidade: **10**
   - Fornecedor: **GAMA Gases**
   - Data: **15/03/2025**
   - Observações: **Primeira etapa da temporada**

4. Clique em **Salvar**

5. Repita para as outras categorias (Challenge, Trophy)

6. Use a aba **Timeline** para ver todas as entregas programadas

---

## ✨ Recursos Avançados

### Exportar para Excel
Clique em **"Exportar Excel"** para baixar uma planilha com todas as programações (em desenvolvimento).

### Filtrar por Status
Você pode editar cada programação para mudar o status conforme o andamento:
- Quando solicitar ao fornecedor: mude para **Solicitado**
- Quando o fornecedor confirmar: mude para **Confirmado**
- Quando receber: mude para **Entregue**

---

Pronto! Agora você está pronto para gerenciar toda a programação de gases do Conecta Cup! 🏁
