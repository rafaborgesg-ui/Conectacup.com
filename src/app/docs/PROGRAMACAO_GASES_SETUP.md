# 📊 Setup: Programação de Gases

## 🎯 Visão Geral

Este documento descreve como configurar o módulo de **Programação de Gases** que digitaliza o processo de planejamento e controle de gases por etapa.

## ✨ Funcionalidades

- ✅ Programação de gases por Pista, Etapa e Temporada
- ✅ Cadastro por Categoria (Carrera, Challenge, Trophy)
- ✅ Todos os tipos de gases (Nitrogênio, Argônio, Acetileno, Oxigênio, Gás de Empilhadeira)
- ✅ Base completa de fornecedores por pista com contatos
- ✅ Status: Planejado → Solicitado → Confirmado → Entregue
- ✅ Relatórios históricos por temporada
- ✅ Timeline de entregas programadas
- ✅ Estatísticas: Total programado, por categoria, por tipo de gás
- ✅ Integração 100% com Supabase

## 📋 Pré-requisitos

1. Ter o módulo **Master Data** configurado
2. Ter os seguintes dados cadastrados no Master Data:
   - Pistas (Interlagos, Velocitta, Goiânia, Termas de Rio Hondo, Estoril, Algarve)
   - Etapas (1 a 9)
   - Categorias (Carrera, Challenge, Trophy)
   - Temporadas (2024, 2025, 2026)

## 🚀 Passo 1: Executar Migration SQL

### No Supabase Dashboard:

1. Acesse: **SQL Editor**
2. Abra o arquivo: `/docs/migrations/sql/CREATE_GAS_PROGRAMMING_TABLE.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run** ✅

### O que a migration faz:

- ✅ Cria tabela `gas_programming` com todos os campos necessários
- ✅ Cria índices para performance
- ✅ Configura trigger para `updated_at` automático
- ✅ Habilita RLS (Row Level Security)
- ✅ Cria políticas de acesso para usuários autenticados
- ✅ Adiciona dados de exemplo (opcional - pode ser removido)

### Verificar se funcionou:

```sql
-- Execute no SQL Editor:
SELECT * FROM gas_programming ORDER BY created_at DESC LIMIT 10;

-- Deve retornar a tabela (vazia ou com dados de exemplo)
```

## 🔧 Passo 2: Deploy da Edge Function

A Edge Function já foi atualizada com os endpoints necessários. Para fazer o deploy:

```bash
# No terminal, na raiz do projeto:
supabase functions deploy server
```

### Endpoints criados:

- `GET /gas-programming` - Lista programações (com filtros)
- `POST /gas-programming` - Cria nova programação
- `PUT /gas-programming/:id` - Atualiza programação
- `DELETE /gas-programming/:id` - Remove programação
- `GET /gas-programming/stats` - Estatísticas e relatórios

## 📖 Passo 3: Como Usar

### 3.1 Acessar o Módulo

1. No menu lateral: **Almoxarifado** → **Programação de Gases**
2. Selecione a **Pista**, **Etapa** e **Temporada**

### 3.2 Cadastrar Programação

1. Clique em **Nova Programação**
2. Preencha:
   - Categoria (Carrera, Challenge, Trophy)
   - Tipo de Gás (Nitrogênio 9m³, 3m³, Argônio, etc)
   - Quantidade (em unidades)
   - Fornecedor (opcional - listados automaticamente por pista)
   - Data Programada (opcional)
   - Observações (opcional)
3. Clique em **Salvar**

### 3.3 Visualizar Programação

**3 visualizações disponíveis:**

1. **Visão Geral**: Lista completa com todos os detalhes
2. **Por Categoria**: Agrupado por Carrera, Challenge, Trophy
3. **Timeline**: Entregas programadas em ordem cronológica

### 3.4 Relatórios Históricos

Na parte superior da página, você verá:

- 📊 **Total Programado** na temporada
- ✅ **Entregues** vs **Confirmados** vs **Pendentes**
- 📍 **Histórico por Etapa**: Quantidades programadas por pista/etapa
- 🔝 **Top 5 Gases**: Tipos de gases mais utilizados

## 👥 Fornecedores Cadastrados

O sistema já vem com os fornecedores cadastrados:

### Interlagos
- ACESOLDA Gases
- GAMA Gases
- OXITAB - Oxigênio Taboão
- Liquigás (Gás de Empilhadeira)

### Velocitta (Mogi Guaçu)
- Gás Guaçu White Martins

### Goiânia
- EBO - Empresa Brasileira de Oxigênio (único fornecedor)

### Termas de Rio Hondo (Argentina)
- Farber Elizabeth Nitrogênio Argentina

### Estoril / Algarve (Portugal)
- Matinalca Portugal

**Cada fornecedor inclui:**
- Contatos com telefones
- E-mails
- Endereços
- Observações especiais

## 🎨 Status da Programação

| Status | Descrição | Cor |
|--------|-----------|-----|
| **Planejado** | Programação criada, sem data definida | Cinza |
| **Solicitado** | Solicitação enviada ao fornecedor | Amarelo |
| **Confirmado** | Fornecedor confirmou entrega | Azul |
| **Entregue** | Gás entregue e recebido | Verde |
| **Cancelado** | Programação cancelada | Vermelho |

## 📊 Exemplo de Uso

### Cenário: Etapa 1 em Interlagos

1. Selecionar: **Interlagos** - **Etapa 1** - **2025**
2. Cadastrar programações:

**Carrera:**
- Nitrogênio 9m³: 15 unidades → GAMA Gases
- Nitrogênio 3m³: 8 unidades → ACESOLDA

**Challenge:**
- Nitrogênio 9m³: 12 unidades → GAMA Gases
- Argônio 3m³: 5 unidades → OXITAB

**Trophy:**
- Nitrogênio 9m³: 10 unidades → GAMA Gases
- Gás Empilhadeira P20: 3 unidades → Liquigás

3. Definir datas de entrega
4. Acompanhar status

## 🔄 Fluxo Completo

```
1. PLANEJAMENTO
   └─> Cadastrar necessidades de gases por categoria
   
2. SOLICITAÇÃO
   └─> Definir fornecedor e data
   └─> Status: Solicitado
   
3. CONFIRMAÇÃO
   └─> Fornecedor confirma
   └─> Status: Confirmado
   
4. ENTREGA
   └─> Gás recebido
   └─> Status: Entregue
   
5. RELATÓRIOS
   └─> Visualizar histórico
   └─> Analisar consumo por etapa
   └─> Identificar padrões
```

## 🐛 Troubleshooting

### Erro: "Tabela gas_programming não encontrada"
**Solução:** Execute a migration SQL (Passo 1)

### Erro ao salvar: "Failed to save programming"
**Solução:** 
1. Verifique se a Edge Function foi deployada
2. Verifique as políticas RLS no Supabase
3. Confira se o usuário está autenticado

### Fornecedores não aparecem
**Solução:** Verifique se a pista está selecionada corretamente

### Relatórios não carregam
**Solução:** 
1. Certifique-se que há programações cadastradas
2. Verifique se a temporada está selecionada

## 📚 Arquivos Relacionados

- `/components/AlmoxarifadoGasesProgramacao.tsx` - Componente principal
- `/utils/storage.ts` - Funções de API (getGasProgramming, saveGasProgramming, etc)
- `/supabase/functions/server/index.tsx` - Endpoints da API
- `/docs/migrations/sql/CREATE_GAS_PROGRAMMING_TABLE.sql` - Migration SQL

## 🎯 Próximos Passos (Futuro)

- [ ] Exportação para Excel com formatação da planilha original
- [ ] Importação em massa de programações
- [ ] Notificações automáticas por e-mail aos fornecedores
- [ ] Histórico de alterações
- [ ] Integração com sistema de compras
- [ ] Alertas de estoque baixo
- [ ] Comparativo de preços por fornecedor

## 📞 Suporte

Dúvidas ou problemas? Consulte a documentação completa em `/docs/` ou abra uma issue.

---

**Versão:** 1.0.0  
**Data:** 27/11/2024  
**Status:** ✅ Pronto para uso
