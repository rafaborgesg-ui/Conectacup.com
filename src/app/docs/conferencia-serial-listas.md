# 📋 Sistema de Listas de Conferência de Serial

## 🎯 Visão Geral

O sistema de Conferência de Serial foi reformulado para trabalhar com **listas de conferência**, permitindo organizar conferências em grupos separados.

## 🏗️ Estrutura de Navegação

### Nível 1: Página Principal - Listas
**Arquivo:** `/pages/ConferenciaSerial.tsx`

- Mostra todas as listas de conferência criadas
- Botão "Criar Lista de Conferência"
- Cada lista exibe:
  - Nome da lista
  - Data de criação
  - Número total de conferências
  - Botões de editar e excluir

### Nível 2: Detalhes da Lista - Conferências
**Arquivo:** `/pages/ConferenciaSerialDetalhes.tsx`

- Scanner de código de barras/número de série
- Lista todas as conferências daquela lista específica
- Botão voltar para a página de listas
- Funcionalidade de excluir conferências individuais

## 🗄️ Estrutura do Banco de Dados

### Tabela: `conferencia_listas`
```sql
- id (UUID, Primary Key)
- nome (TEXT) - Nome da lista
- user_id (UUID) - Referência ao usuário
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabela: `conferencia_serial`
```sql
- id (UUID, Primary Key)
- lista_id (UUID) - Referência à lista (FK para conferencia_listas)
- barcode (TEXT) - Código do pneu
- piloto (TEXT)
- ano (TEXT)
- set_pneu (TEXT)
- lado (TEXT)
- tipo (TEXT)
- situacao (TEXT) - 'Guardar' ou 'Descartar'
- voltas (TEXT)
- user_id (UUID)
- data_conferencia (TIMESTAMP)
- created_at (TIMESTAMP)
```

## 🔧 Como Configurar

### 1. Criar as tabelas no Supabase
Execute o SQL do arquivo `/docs/sql-conferencia-listas.sql` no Supabase SQL Editor

### 2. Funcionalidades Disponíveis

#### Criar Lista
1. Clique em "Criar Lista de Conferência"
2. Digite o nome da lista (ex: "Conferência Janeiro 2026")
3. Clique em "Criar Lista"

#### Editar Lista
1. Clique no ícone de lápis ao lado da lista
2. Altere o nome
3. Clique em "Salvar"

#### Excluir Lista
1. Clique no ícone de lixeira ao lado da lista
2. Confirme a exclusão
3. ⚠️ **ATENÇÃO:** Todas as conferências da lista também serão excluídas

#### Conferir Pneus
1. Clique em uma lista para abri-la
2. No campo "Escanear Número de Série", digite ou escaneie o código
3. Pressione Enter ou clique em "OK"
4. O pneu será automaticamente conferido e adicionado à lista

#### Excluir Conferência Individual
1. Dentro de uma lista, clique no ícone de lixeira ao lado de uma conferência
2. Confirme a exclusão

## 🎨 Interface

### Cores (Padrão Porsche)
- Vermelho principal: `#D50000`
- Fundo branco: `#FFFFFF`
- Cinza texto: `#111827` (gray-900)
- Cinza claro: `#F9FAFB` (gray-50)

### Responsividade
- Desktop: Layout completo
- Coletor 800x480: Adaptações via `collector-adapt-*` classes

## 📱 Adaptação para Coletor

O sistema mantém todas as classes de adaptação para coletor de dados:
- `collector-adapt-content`
- `collector-adapt-header`
- `collector-adapt-scanner`
- `collector-adapt-card`
- `collector-adapt-button`
- `collector-adapt-input`
- Etc.

## 🔒 Segurança (RLS)

- Usuários só podem ver/editar suas próprias listas
- Usuários só podem ver/criar conferências em suas próprias listas
- Ao deletar uma lista, todas as conferências são deletadas automaticamente (CASCADE)

## 🚀 Fluxo de Uso Típico

1. **Criar Lista** - "Conferência Copa Turismo 2026"
2. **Abrir Lista** - Clicar na lista criada
3. **Escanear Pneus** - Conferir os pneus um por um
4. **Visualizar Conferências** - Ver histórico completo
5. **Voltar** - Retornar para a lista de listas
6. **Criar Nova Lista** - Para próximo evento/data

## 📊 Exemplo de Uso

```
📋 Conferência de Serial
  ├── 📁 Conferência Janeiro 2026 (45 conferências)
  ├── 📁 Pré-Temporada 2026 (28 conferências)
  ├── 📁 Copa Turismo Etapa 1 (67 conferências)
  └── 📁 Shakedown Interlagos (12 conferências)
```

Ao clicar em qualquer lista, você entra na tela de detalhes onde pode escanear novos pneus e visualizar o histórico daquela lista específica.
