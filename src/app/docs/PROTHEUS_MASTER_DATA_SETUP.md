# 🏢 Protheus - Master Data Setup

## 📋 Visão Geral

Nova seção **Protheus** adicionada ao Master Data com 3 subseções de cadastro:

1. **Setor** - Nome + Descrição + Responsável
2. **Projeto** - Nome + Descrição
3. **Conta Contábil** - Nome + Descrição

---

## 🚀 Como Ativar

### Passo 1: Execute a Migration SQL

1. Abra o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Copie e execute o arquivo:

```sql
/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql
```

5. Clique em **Run** (ou F5)
6. Aguarde a mensagem de sucesso ✅

### Passo 2: Use o Sistema

1. Recarregue a página (F5)
2. Acesse: **Cadastro** → **Master Data**
3. Clique na aba **Protheus** 💼
4. Cadastre os itens!

---

## 📊 O Que Foi Adicionado

### Nova Aba no Master Data

**Protheus** 💼 - com 3 subseções:

#### 1️⃣ Setor 🏢
- **Nome**: Nome do setor (obrigatório)
- **Descrição**: Descrição detalhada
- **Responsável**: Nome do responsável pelo setor

**Exemplo:**
```
Nome: Operações
Descrição: Setor responsável por operações de pista
Responsável: João Silva
```

#### 2️⃣ Projeto 📊
- **Nome**: Nome/código do projeto (obrigatório)
- **Descrição**: Descrição do projeto

**Exemplo:**
```
Nome: PROJ-2025-001
Descrição: Projeto de modernização da estrutura de pneus
```

#### 3️⃣ Conta Contábil 💰
- **Nome**: Código da conta contábil (obrigatório)
- **Descrição**: Descrição da conta

**Exemplo:**
```
Nome: 1.01.001
Descrição: Caixa Geral
```

---

## 🎨 Interface

### Layout

A seção Protheus segue o padrão do Master Data:

```
┌─────────────────────────────────────────┐
│ 🏢 Setor                                │
│ X itens cadastrados                     │
│                           [+ Adicionar] │
├─────────────────────────────────────────┤
│                                         │
│ 📋 Lista de Setores                     │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ 🏢 Operações                    │   │
│ │ Descrição: Setor responsável... │   │
│ │ Responsável: João Silva         │   │
│ │                        [✏️] [🗑️] │   │
│ └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Formulário de Cadastro

Ao clicar em **Adicionar**:

```
┌─────────────────────────────────────────┐
│ Novo Setor                              │
├─────────────────────────────────────────┤
│ Setor *                                 │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Descrição                               │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Responsável                             │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│        [✓ Salvar]  [✗ Cancelar]        │
└─────────────────────────────────────────┘
```

---

## 🔧 Detalhes Técnicos

### Campos no Banco de Dados

Tabela: `master_data`

Novos campos adicionados:
```sql
description TEXT  -- Descrição (todos os tipos)
responsavel TEXT  -- Responsável (apenas setor)
```

### Tipos Suportados

```typescript
type: 'setor' | 'projeto' | 'conta_contabil'
```

### Estrutura de Dados

```typescript
interface MasterDataItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  
  // Campos Protheus
  description?: string;    // Todos os tipos
  responsavel?: string;    // Apenas setor
}
```

---

## 📝 Exemplos de Uso

### Cadastrar Setor

```typescript
1. Acesse: Master Data > Protheus
2. Na seção "Setor", clique em "Adicionar"
3. Preencha:
   - Setor: "Operações"
   - Descrição: "Responsável por operações de pista"
   - Responsável: "João Silva"
4. Clique em "Salvar"
```

### Cadastrar Projeto

```typescript
1. Na seção "Projeto", clique em "Adicionar"
2. Preencha:
   - Projeto: "PROJ-2025-001"
   - Descrição: "Modernização de estrutura"
3. Clique em "Salvar"
```

### Cadastrar Conta Contábil

```typescript
1. Na seção "Conta Contábil", clique em "Adicionar"
2. Preencha:
   - Conta Contábil: "1.01.001"
   - Descrição: "Caixa Geral"
3. Clique em "Salvar"
```

---

## ✅ Funcionalidades

### CRUD Completo

- ✅ **Criar**: Adicionar novos itens
- ✅ **Ler**: Visualizar lista de itens
- ✅ **Atualizar**: Editar itens existentes
- ✅ **Deletar**: Remover itens (com confirmação)

### Ordenação

- ✅ Itens ordenados alfabeticamente por nome

### Validação

- ✅ Nome obrigatório
- ✅ Campos opcionais: descrição, responsável

### Interface

- ✅ Design responsivo
- ✅ Ícones visuais
- ✅ Feedback visual (toasts)
- ✅ Confirmação de exclusão
- ✅ Estados de loading
- ✅ Mensagens de erro

---

## 🎯 Casos de Uso

### 1. Gestão de Setores
```
Cadastrar todos os setores da empresa com seus responsáveis:
- Operações - João Silva
- Financeiro - Maria Santos
- TI - Pedro Oliveira
```

### 2. Controle de Projetos
```
Manter lista de projetos ativos:
- PROJ-2025-001 - Modernização
- PROJ-2025-002 - Expansão
- PROJ-2025-003 - Manutenção
```

### 3. Plano de Contas
```
Estruturar plano de contas contábil:
- 1.01.001 - Caixa Geral
- 1.01.002 - Banco Itaú
- 2.01.001 - Fornecedores
```

---

## 🔐 Segurança

### Permissões

- ✅ RLS (Row Level Security) habilitado
- ✅ Apenas usuários autenticados
- ✅ Admin only (Master Data)

### Validação

- ✅ Frontend: Validação de campos
- ✅ Backend: Constraints SQL
- ✅ RLS: Políticas de acesso

---

## 🐛 Troubleshooting

### Erro: "Column description does not exist"
```
✅ Solução: Execute a migration SQL
   /docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql
```

### Não vejo a aba Protheus
```
✅ Solução: 
   1. Recarregue a página (F5)
   2. Limpe cache (Ctrl+Shift+Del)
   3. Faça logout e login novamente
```

### Erro ao salvar
```
✅ Solução:
   1. Verifique se o nome está preenchido
   2. Verifique conexão com internet
   3. Confira se migration foi executada
```

---

## 📊 Arquivos Modificados

### Criados
```
/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql
/docs/PROTHEUS_MASTER_DATA_SETUP.md
```

### Modificados
```
/components/MasterData.tsx
/utils/storage.ts
```

---

## 🎉 Resumo

### O Que Foi Feito

✅ Nova aba Protheus no Master Data  
✅ 3 subseções: Setor, Projeto, Conta Contábil  
✅ Campos estendidos: descrição, responsável  
✅ CRUD completo para cada tipo  
✅ Interface intuitiva e responsiva  
✅ Migration SQL documentada  
✅ Integração com Supabase  

### Como Usar

1. Execute migration SQL
2. Recarregue página
3. Acesse Master Data > Protheus
4. Cadastre os itens! ✨

---

## 📞 Próximos Passos

Após ativar:

1. ✅ Cadastrar setores da empresa
2. ✅ Cadastrar projetos ativos
3. ✅ Cadastrar contas contábeis
4. ✅ Usar nos formulários do sistema

---

**Status**: ✅ **IMPLEMENTADO**  
**Versão**: 1.0  
**Data**: 27/11/2024

🎉 **Seção Protheus pronta para uso!**
