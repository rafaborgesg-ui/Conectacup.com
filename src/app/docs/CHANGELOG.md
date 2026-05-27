# Changelog - Sistema de Gestão de Pneus Porsche Cup Brasil

Todas as mudanças notáveis do projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.2.0] - 2025-01-24

### ✨ Adicionado
- **Exportação para Excel**: Relatórios podem ser exportados em formato .xlsx com filtros aplicados
- **Monitor de Ocupação em Tempo Real**: Componente `ContainerOccupancyMonitor` com atualização automática
- **Mapa Visual de Containers**: Grid layout interativo (`ContainerGridMap`) mostrando ocupação
- **Sistema de Toast Consistente**: Wrapper padronizado do Sonner com identidade visual Porsche
- **Animação de Confirmação**: Animação fullscreen ao registrar pneus com som de confirmação
- **Tabela Virtualizada**: Componente `VirtualizedTable` com lazy loading para performance

### 🎨 Melhorado
- Feedback visual em todas as operações (entrada, descarte, movimentação)
- Performance de scroll em listas grandes (virtualização)
- Mensagens de toast com gradientes e cores da marca
- Botões de exportação no header de relatórios

### 📚 Documentação
- Criado `/docs` para organização de documentação
- Consolidado CHANGELOG único
- Documentação de melhorias UX implementadas
- Reorganização de arquivos SQL e MD

---

## [2.1.0] - 2025-01-20

### ✨ Adicionado
- **Correção PostgREST Range**: Implementado `.range(0, 49999)` para suportar até 50.000 registros
- **Loading States Completos**: Skeletons e loaders em todos os componentes
- **Mobile Enhancements**: Otimizações para uso em dispositivos móveis no paddock
- **Modo Rápido**: Toggle para manter modelo e container entre registros

### 🐛 Corrigido
- Limite de 1.000 registros do Supabase PostgREST
- Erros 401 de autenticação em endpoints protegidos
- Hooks do React no componente Reports
- Duplicatas de UUID no campo barcode

### 🔒 Segurança
- Integração completa com Supabase Auth
- Row-Level Security (RLS) implementada
- Validação de sessão em rotas protegidas

---

## [2.0.0] - 2025-01-15

### ✨ Adicionado
- **Dashboard em Tempo Real**: Cards dinâmicos baseados em status cadastrados
- **Gráficos Interativos**: Recharts para visualização de dados
- **ARCS Data Update**: Módulo para atualizar dados ARCS (Piloto, Etapa, Categoria)
- **Filtros Avançados**: Multi-select para temporada, etapa, piloto, campeonato, categoria
- **PWA Completo**: Service Worker, manifest, ícones otimizados
- **Onboarding System**: Tutorial interativo para novos usuários

### 🎨 Melhorado
- Interface responsiva com Tailwind CSS
- Identidade visual Porsche (vermelho #D50000, preto, branco, cinza)
- Componentes de UI com shadcn/ui
- Performance geral da aplicação

### 🗄️ Banco de Dados
- Migração completa para Supabase
- Tabelas: stock_entries, containers, tire_models, tire_status, master_data
- Funções de backend em Deno Edge Functions
- KV Store para dados key-value

---

## [1.5.0] - 2025-01-10

### ✨ Adicionado
- **Descarte em Massa**: Seleção por container e códigos de barras
- **Movimentação em Massa**: Transfer batch de pneus entre containers
- **Relatórios Avançados**: Filtros por temporada e etapa
- **Cadastro de Status**: Admin pode criar status personalizados

### 🐛 Corrigido
- Status "Descartado DSI" não limpava container_id
- Validação de duplicatas em entrada em massa
- Normalização de códigos de 7 para 8 dígitos

---

## [1.0.0] - 2025-01-01

### ✨ Lançamento Inicial
- **Entrada de Estoque**: Registro individual e em lote
- **Descarte de Pneus**: Marcação de pneus descartados
- **Movimentação**: Transfer entre containers
- **Relatórios Básicos**: Listagem e exportação PDF
- **Cadastros**: Modelos de pneus e containers
- **Autenticação**: Login com controle de acesso (admin/operador)

### 🎯 Funcionalidades Core
- Validação de código de barras (8 dígitos)
- Verificação de duplicatas
- Controle de capacidade de containers
- Histórico de operações
- Export PDF

---

## Convenções de Versionamento

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (x.X.0): Novas funcionalidades compatíveis
- **PATCH** (x.x.X): Correções de bugs

## Tipos de Mudanças

- `✨ Adicionado` - Novas funcionalidades
- `🎨 Melhorado` - Melhorias em funcionalidades existentes
- `🐛 Corrigido` - Correções de bugs
- `🗄️ Banco de Dados` - Mudanças no schema ou migrações
- `🔒 Segurança` - Correções de segurança
- `📚 Documentação` - Mudanças apenas na documentação
- `⚡ Performance` - Melhorias de performance
- `🗑️ Removido` - Funcionalidades/arquivos removidos
- `🔧 Configuração` - Mudanças em configuração

---

**Desenvolvido para Porsche Cup Brasil** 🏁
