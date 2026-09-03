# 🔗 Integração Conferir Pneus com Supabase

## 📋 Visão Geral

A funcionalidade **"Conferir Pneus"** agora está 100% integrada com Supabase para armazenar todas as conferências realizadas no histórico permanente.

## 🎯 Funcionalidades Implementadas

### ✅ Salvamento Automático
- Todos os dados da conferência são salvos no Supabase ao clicar em **"Salvar Etapa no Histórico"**
- Inclui informações completas: chassis, pneus, validações, situações e divergências
- Armazena metadados: temporada, etapa, data, usuário responsável

### ✅ Validações Salvas
O sistema salva automaticamente as validações calculadas:
- **OK**: Piloto correto + Guardar + Chassis confirmado
- **INVERSÃO NECESSÁRIA**: Divergências de piloto ou status inválido
- **CUP - ANALISE VOLTAS**: Chassis não confirmado + Descartar

### ✅ Estrutura de Dados
```typescript
{
  season_name: "Porsche Cup 2025",
  stage_name: "Interlagos",
  check_date: "2025-01-22T10:30:00Z",
  created_by: "uuid-do-usuario",
  chassis_data: [
    {
      chassis: "992GT3-001",
      piloto: "João Silva",
      corrida: "SIM",
      categoria: "Carrera Cup (CC)",
      tiresChecked: 16,
      tireSets: [
        {
          jogo: 1,
          montadoNoCarro: true,
          tires: [
            {
              posicao: "DT",
              codigo: "0001A",
              piloto: "João Silva",
              situacao: "Guardar",
              validacao: "OK",
              // ... mais dados
            }
          ]
        }
      ]
    }
  ]
}
```

## 🚀 Configuração no Supabase

### Passo 1: Criar a Tabela

⚠️ **IMPORTANTE**: Use o script correto para evitar erros de sintaxe

1. Acesse seu projeto no **Supabase Dashboard**
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **"+ New query"**
4. Abra o arquivo `/docs/sql/SETUP-COMPLETE.sql`
5. Copie **TODO** o conteúdo
6. Cole no SQL Editor
7. Clique em **"Run"** (ou Ctrl/Cmd + Enter)
8. Aguarde a mensagem: **"Success. No rows returned"**

### Passo 2: Verificar a Criação

1. Vá em **Table Editor** (menu lateral)
2. Procure pela tabela `tire_check_sessions`
3. Verifique se as 8 colunas foram criadas:
   - ✅ `id` (uuid, PRIMARY KEY)
   - ✅ `season_name` (text)
   - ✅ `stage_name` (text)
   - ✅ `check_date` (timestamptz)
   - ✅ `chassis_data` (jsonb)
   - ✅ `created_by` (uuid, FOREIGN KEY)
   - ✅ `created_at` (timestamptz)
   - ✅ `updated_at` (timestamptz)

### Passo 3: Verificar RLS (Segurança)

1. Na tabela `tire_check_sessions`, procure o ícone de **cadeado** 🔒
2. Deve estar **habilitado** (verde)
3. Clique na tabela → aba **"Policies"**
4. Verifique se existem **4 políticas**:
   - SELECT (visualizar)
   - INSERT (inserir)
   - UPDATE (atualizar)
   - DELETE (deletar)

### 🔧 Problemas na Instalação?

Consulte o guia completo: `/docs/sql/INSTALACAO.md`

**Erros comuns**:
- ❌ "syntax error" → Use `/docs/sql/SETUP-COMPLETE.sql`
- ❌ "already exists" → Tabela já foi criada
- ❌ "permission denied" → Verifique permissões de admin

## 📊 Índices Criados

Para otimizar as consultas:

- **season_name**: Busca por temporada
- **season_name + stage_name**: Busca por etapa
- **created_by**: Busca por usuário
- **check_date**: Ordenação por data
- **chassis_data (GIN)**: Busca dentro do JSON

## 🔧 Funções Utilitárias

Criadas em `/utils/tireCheckSupabase.ts`:

### `saveTireCheckSession()`
Salva uma nova sessão de conferência

```typescript
const result = await saveTireCheckSession(
  "Porsche Cup 2025",    // Temporada
  "Interlagos",          // Etapa
  chassisDataArray       // Dados dos chassis
);
```

### `getTireCheckSessions()`
Busca todas as conferências

```typescript
const sessions = await getTireCheckSessions();
```

### `getTireCheckSessionById()`
Busca uma conferência específica

```typescript
const session = await getTireCheckSessionById(sessionId);
```

### `getTireCheckSessionsBySeason()`
Busca conferências de uma temporada

```typescript
const sessions = await getTireCheckSessionsBySeason("Porsche Cup 2025");
```

### `getTireCheckSessionsByStage()`
Busca conferências de uma etapa específica

```typescript
const sessions = await getTireCheckSessionsByStage(
  "Porsche Cup 2025",
  "Interlagos"
);
```

### `deleteTireCheckSession()`
Remove uma conferência

```typescript
const success = await deleteTireCheckSession(sessionId);
```

## 🎨 Interface do Usuário

### Botão de Salvamento

Localizado no final da listagem de chassis, após a conferência:

```
┌─────────────────────────────────────────────┐
│ Finalizar e Salvar Etapa                    │
│ 5 de 5 chassis conferidos                   │
│                                              │
│                 [Salvar Etapa no Histórico] │
└─────────────────────────────────────────────┘
```

### Estados do Botão

- **Normal**: Pronto para salvar
- **Salvando**: Mostra loader e desabilitado
- **Sucesso**: Toast verde com confirmação
- **Erro**: Toast vermelho com mensagem

## 📈 Próximos Passos

### Página de Histórico (Em desenvolvimento)

Será criada uma página para visualizar:
- ✅ Listagem de todas as conferências
- ✅ Filtros por temporada/etapa
- ✅ Visualização detalhada de cada conferência
- ✅ Exportação para Excel
- ✅ Relatórios e estatísticas

## 🔒 Segurança

### Autenticação Obrigatória
- Apenas usuários autenticados podem salvar conferências
- O ID do usuário é registrado automaticamente

### Proteção de Dados
- RLS ativado na tabela
- Políticas específicas por operação
- Foreign Key com `auth.users`

### Validação
- Tipos TypeScript garantem estrutura correta
- Validação no cliente antes de salvar
- Validação no servidor via RLS

## 🐛 Troubleshooting

### Erro: "Tabela não encontrada"
→ Execute o script SQL de criação da tabela

### Erro: "Usuário não autenticado"
→ Faça login no sistema antes de usar a funcionalidade

### Erro: "Permission denied"
→ Verifique se as políticas RLS estão ativas

### Erro ao salvar dados grandes
→ O JSONB suporta até 255 MB, mas mantenha conferências individuais

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase Dashboard
3. Confirme que a tabela foi criada corretamente
4. Verifique se o usuário está autenticado

---

**Versão**: 1.0.0  
**Data**: 22/01/2025  
**Status**: ✅ Implementado e Testado