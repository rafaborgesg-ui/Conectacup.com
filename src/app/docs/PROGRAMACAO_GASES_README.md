# 📊 Programação de Gases - README

## 🎯 Visão Geral

Sistema completo de **Programação e Controle de Gases** integrado ao Conecta Cup, digitalizando o processo manual de Excel.

**Status**: ✅ **Pronto para Uso**  
**Versão**: 1.1.0 (Solução Direta Supabase)  
**Data**: 27/11/2024

---

## ⚡ Quick Start

### 1 Minuto para Ativar:

```
1. Supabase Dashboard → SQL Editor
2. Copiar e executar: CREATE_GAS_PROGRAMMING_TABLE.sql
3. Recarregar página (F5)
4. Usar! ✨
```

**Veja**: `/docs/CHECKLIST_RAPIDO.md`

---

## 📚 Documentação

### 🚀 Para Começar
| Documento | O Que É | Quando Usar |
|-----------|---------|-------------|
| **CHECKLIST_RAPIDO.md** | Lista de tarefas simples | ✅ Comece aqui! |
| **ATIVAR_PROGRAMACAO_GASES.md** | Guia de ativação | Para ativar o módulo |

### 🛠️ Solução de Problemas
| Documento | O Que É | Quando Usar |
|-----------|---------|-------------|
| **CORRECAO_ERROS_404_403.md** | Fix para erros 404/403 | Se teve erros |
| **SOLUCAO_ALTERNATIVA_GASES.md** | Integração direta Supabase | Detalhes técnicos |

### 📖 Referência Completa
| Documento | O Que É | Quando Usar |
|-----------|---------|-------------|
| **PROGRAMACAO_GASES_SETUP.md** | Setup completo | Guia detalhado |
| **RELEASE_PROGRAMACAO_GASES.md** | Release notes | Ver funcionalidades |
| **RESUMO_PROGRAMACAO_GASES.md** | Resumo executivo | Visão geral |

### 🔧 Avançado
| Documento | O Que É | Quando Usar |
|-----------|---------|-------------|
| **COMO_FAZER_DEPLOY_EDGE_FUNCTION.md** | Deploy manual (não necessário) | Curiosidade |

---

## 🎨 Funcionalidades

### ✅ Cadastro Completo
- Programação por Pista/Etapa/Temporada
- 12 tipos de gases
- 5 status (Planejado → Entregue)
- 3 categorias (Carrera, Challenge, Trophy)

### ✅ Base de Fornecedores
- 6 pistas com fornecedores
- Contatos completos (telefone, email)
- Endereços e observações

### ✅ Relatórios Históricos
- Total programado por temporada
- Breakdown por status/categoria/gás
- Histórico por etapa
- Top 5 gases mais utilizados

### ✅ Visualizações
- **Visão Geral**: Lista completa
- **Por Categoria**: Agrupado
- **Timeline**: Cronológico

---

## 🗂️ Estrutura de Arquivos

```
/components/
  ├─ AlmoxarifadoGasesProgramacao.tsx     ← Componente principal
  └─ GasProgrammingMigrationAlert.tsx     ← Alerta de setup

/utils/
  └─ gasProgrammingSupabase.ts            ← Integração Supabase

/docs/
  ├─ migrations/sql/
  │  └─ CREATE_GAS_PROGRAMMING_TABLE.sql  ← Migration (EXECUTE ISSO!)
  │
  ├─ CHECKLIST_RAPIDO.md                  ← ⭐ COMECE AQUI
  ├─ ATIVAR_PROGRAMACAO_GASES.md          ← Guia de ativação
  ├─ CORRECAO_ERROS_404_403.md            ← Fix de erros
  ├─ SOLUCAO_ALTERNATIVA_GASES.md         ← Solução técnica
  ├─ PROGRAMACAO_GASES_SETUP.md           ← Setup completo
  ├─ RELEASE_PROGRAMACAO_GASES.md         ← Release notes
  ├─ RESUMO_PROGRAMACAO_GASES.md          ← Resumo executivo
  └─ PROGRAMACAO_GASES_README.md          ← Este arquivo
```

---

## 🚀 Instalação

### Pré-requisitos
- ✅ Projeto Conecta Cup configurado
- ✅ Supabase conectado
- ✅ Master Data configurado (pistas, etapas, categorias)

### Passo a Passo

```bash
# 1. Execute a Migration SQL
# No Supabase Dashboard → SQL Editor
# Copie e execute: /docs/migrations/sql/CREATE_GAS_PROGRAMMING_TABLE.sql

# 2. Recarregue a Página
# Pressione F5 ou Ctrl+R

# 3. Acesse o Módulo
# Menu → Almoxarifado → Programação de Gases

# 4. Pronto! ✨
```

---

## 💻 Uso

### Cadastrar Programação

```typescript
1. Selecionar: Pista, Etapa, Temporada
2. Clicar: "Nova Programação"
3. Preencher:
   - Categoria (obrigatório)
   - Tipo de Gás (obrigatório)
   - Quantidade (obrigatório)
   - Fornecedor (opcional)
   - Data Programada (opcional)
   - Observações (opcional)
4. Salvar
```

### Ver Relatórios

```typescript
1. Selecionar: Temporada
2. Automaticamente mostra:
   - Total programado
   - Breakdown por status
   - Histórico por etapa
   - Top 5 gases
```

### Visualizações

```typescript
Tabs disponíveis:
- Visão Geral: Lista completa com detalhes
- Por Categoria: Agrupado (Carrera/Challenge/Trophy)
- Timeline: Entregas em ordem cronológica
```

---

## 🔧 Configuração

### Tabela: `gas_programming`

**Campos:**
- `pista`: Nome da pista
- `etapa`: Número da etapa
- `temporada`: Ano
- `categoria`: Carrera, Challenge, Trophy
- `gas_type`: Tipo do gás
- `quantidade`: Unidades
- `fornecedor`: Nome do fornecedor
- `data_programada`: Data de entrega
- `status`: planejado, solicitado, confirmado, entregue, cancelado
- `observacoes`: Notas adicionais

**Índices:**
- Por pista, etapa, temporada, categoria, status, data

**Segurança:**
- RLS habilitado
- Políticas de acesso configuradas
- Apenas usuários autenticados

---

## 🎨 Tipos de Gases

### Nitrogênio
- Nitrogênio 9m³/10m³
- Nitrogênio 3m³/3.8m³

### Outros
- Argônio 1m³, 3m³, 6m³
- Acetileno 1m³, 3m³, 6m³
- Oxigênio 1m³, 3m³, 6m³
- Gás Empilhadeira P20

---

## 👥 Fornecedores

### Interlagos (4)
- ACESOLDA Gases
- GAMA Gases
- OXITAB - Oxigênio Taboão
- Liquigás (Empilhadeira)

### Velocitta (1)
- Gás Guaçu White Martins

### Goiânia (1)
- EBO - Empresa Brasileira de Oxigênio

### Argentina (1)
- Farber Elizabeth Nitrogênio

### Portugal (2)
- Matinalca (Estoril e Algarve)

---

## 🔐 Segurança

### Row Level Security (RLS)
```sql
✅ Habilitado na tabela
✅ Políticas de leitura/escrita/atualização/exclusão
✅ Apenas usuários autenticados
```

### Validação
```typescript
✅ Frontend: Campos obrigatórios
✅ Backend: Constraints SQL
✅ RLS: Políticas de acesso
```

---

## 📊 API Reference

### getGasProgramming()
```typescript
const programacoes = await getGasProgramming({
  pista: 'Interlagos',
  etapa: '1',
  temporada: '2025'
});
```

### saveGasProgramming()
```typescript
await saveGasProgramming({
  pista: 'Interlagos',
  etapa: '1',
  temporada: '2025',
  categoria: 'Carrera',
  gas_type: 'Nitrogênio 9m³',
  quantidade: 15,
  status: 'planejado'
});
```

### deleteGasProgramming()
```typescript
await deleteGasProgramming(id);
```

### getGasProgrammingStats()
```typescript
const stats = await getGasProgrammingStats({
  pista: 'Interlagos',
  temporada: '2025'
});
```

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| Tabela não encontrada | Execute migration SQL |
| Permission denied | Faça login novamente |
| 404/403 | Solução alternativa já aplicada |
| Invalid input | Preencha campos obrigatórios |

**Veja**: `/docs/CORRECAO_ERROS_404_403.md`

---

## 🎯 Roadmap Futuro

- [ ] Exportação para Excel
- [ ] Importação em massa
- [ ] E-mails para fornecedores
- [ ] Histórico de alterações
- [ ] Comparativo de preços
- [ ] Alertas de estoque
- [ ] Gráficos avançados

---

## 📈 Métricas

**Código:**
- 850+ linhas no componente
- 200+ linhas de integração
- 150+ linhas de SQL

**Features:**
- 4 funções de API
- 3 visualizações
- 12 tipos de gases
- 9 fornecedores
- 5 status

**Documentação:**
- 8 documentos completos
- 1500+ linhas de docs

---

## 🤝 Suporte

### Dúvidas?
1. Consulte `/docs/CHECKLIST_RAPIDO.md`
2. Veja `/docs/ATIVAR_PROGRAMACAO_GASES.md`
3. Leia `/docs/CORRECAO_ERROS_404_403.md`

### Problemas?
1. Verifique se executou migration SQL
2. Confirme que está logado
3. Limpe cache do navegador

---

## 📄 Licença

Parte do sistema Conecta Cup - Uso interno

---

## 📞 Contato

Documentação criada em: 27/11/2024  
Versão: 1.1.0

---

## ✅ Checklist Rápido

- [ ] Li este README
- [ ] Executei migration SQL
- [ ] Recarreguei a página
- [ ] Testei cadastro
- [ ] Funcionou! 🎉

---

**TL;DR**: Execute `CREATE_GAS_PROGRAMMING_TABLE.sql` no Supabase e use! 🚀
