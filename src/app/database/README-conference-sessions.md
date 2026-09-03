# 🔥 Sistema de Sessões Compartilhadas - Conferir Pneus

## Visão Geral

O sistema de sessões compartilhadas permite que **múltiplos usuários trabalhem simultaneamente** na mesma conferência de pneus, vendo em tempo real o que outros usuários estão fazendo.

## Funcionalidades

### ✅ Sessão Compartilhada
- Quando um usuário faz upload de uma planilha Excel e seleciona a etapa, uma **sessão compartilhada** é criada automaticamente no Supabase
- Essa sessão fica **visível para todos os usuários** que acessarem a página Conferir Pneus
- Todos veem a mesma lista de chassis e podem trabalhar em chassis diferentes simultaneamente

### 🔄 Sincronização em Tempo Real
- Utiliza **Supabase Realtime** para sincronizar mudanças instantaneamente
- Quando um usuário finaliza a conferência de um chassis, **todos os outros usuários veem imediatamente** que aquele chassis foi concluído
- Indicadores visuais mostram qual chassis está sendo editado por outro usuário

### 🔒 Proteção contra Conflitos
- Badge **"🔒 Em edição"** aparece em chassis que estão sendo editados por outros usuários
- Chassis bloqueados por outros usuários não podem ser abertos (previne conflitos)
- Cada usuário pode trabalhar em chassis diferentes ao mesmo tempo

### 📊 Progresso Compartilhado
- Todos os usuários veem o mesmo progresso geral da conferência
- Chassis completos aparecem com o badge **"✓ Completo"** para todos
- Contadores de pneus conferidos são sincronizados em tempo real

## Fluxo de Uso

### 1. Criar Sessão
```
Usuário A → Upload Excel → Seleciona Etapa → Sessão criada
                                            ↓
                        Sessão disponível para todos os usuários
```

### 2. Trabalho Simultâneo
```
Usuário A → Conferindo Chassis #1
Usuário B → Conferindo Chassis #5     } Simultaneamente
Usuário C → Conferindo Chassis #10
```

### 3. Finalização
```
Quando TODOS os chassis estão completos:
Qualquer usuário pode clicar em "Salvar no Supabase"
                ↓
        Sessão é desativada
                ↓
        Todos os usuários são redirecionados para o início
```

## Estrutura da Tabela

### `conference_sessions`

```sql
CREATE TABLE conference_sessions (
  id UUID PRIMARY KEY,
  season_id UUID,
  stage_id UUID,
  etapa_name TEXT NOT NULL,
  excel_data JSONB NOT NULL,        -- Dados da planilha
  progress JSONB DEFAULT '{}',       -- Progresso por chassis
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,    -- Sessão ativa?
  file_name TEXT,
  total_chassis INTEGER,
  completed_chassis INTEGER
);
```

### Estrutura do `progress` (JSONB)

```json
{
  "0": {
    "tireSets": [...],           // Array de jogos de pneus
    "completed": true,            // Chassis completado?
    "tiresChecked": 16,          // Total de pneus conferidos
    "lockedBy": "user-uuid",     // ID do usuário editando (opcional)
    "lockedAt": "2026-01-26T..."  // Timestamp do lock (opcional)
  },
  "1": { ... },
  "2": { ... }
}
```

## Políticas RLS (Row Level Security)

✅ **SELECT**: Qualquer usuário autenticado pode ver sessões ativas  
✅ **INSERT**: Qualquer usuário autenticado pode criar sessões  
✅ **UPDATE**: Qualquer usuário autenticado pode atualizar sessões ativas  
❌ **DELETE**: Apenas o criador pode deletar a sessão  

## Eventos em Tempo Real

### Update de Progresso
Quando um usuário salva progresso em um chassis:
```typescript
updateSessionProgress(chassisIndex, {
  tireSets: [...],
  completed: true,
  tiresChecked: 16
});
```

Todos os outros usuários recebem a atualização instantaneamente via Realtime.

### Descartar Sessão
Quando um usuário descarta a sessão ou salva tudo no Supabase:
```typescript
discardSession(); // Define is_active = false
```

Todos os usuários são notificados e redirecionados para o início.

## Indicadores Visuais

### Badge: 🔒 Em edição
- **Cor**: Laranja (`#FED7AA` / `#9A3412`)
- **Quando aparece**: Chassis sendo editado por outro usuário
- **Comportamento**: Não pode ser aberto até o outro usuário sair

### Badge: ✓ Completo
- **Cor**: Verde (`#D1FAE5` / `#065F46`)
- **Quando aparece**: Chassis com conferência finalizada
- **Comportamento**: Abre em modo leitura

### Card Background
- **Normal**: Branco (`#FFFFFF`)
- **Bloqueado por outro**: Laranja claro (`#FFF7ED`)
- **Border**: Verde se completo, cinza se pendente, laranja se bloqueado

## Desempenho

✅ **Índices otimizados** para queries rápidas  
✅ **Trigger automático** para atualizar `updated_at`  
✅ **JSONB** para armazenar progresso sem criar múltiplas tabelas  
✅ **RLS** para segurança sem precisar validar no código  

## Casos de Uso

### Cenário 1: Equipe Conferindo Juntos
- 3 usuários logados simultaneamente
- Cada um pega um chassis diferente
- Todos veem o progresso geral em tempo real

### Cenário 2: Turnos Diferentes
- Usuário do turno da manhã inicia conferência
- Não finaliza tudo
- Usuário do turno da tarde continua de onde parou
- Todos os dados estão preservados

### Cenário 3: Supervisor Monitorando
- Supervisor abre a página
- Vê quais chassis já foram conferidos
- Vê quem está trabalhando em cada chassis
- Pode ajudar conferindo chassis pendentes

## Troubleshooting

### Sessão não aparece para outros usuários
- Verificar se `is_active = true`
- Verificar RLS policies no Supabase
- Confirmar que o Realtime está habilitado

### Realtime não sincroniza
- Verificar se o canal foi subscrito corretamente
- Confirmar que a tabela tem Realtime habilitado no Supabase
- Verificar console do navegador para erros

### Conflitos de edição
- Sistema previne edição simultânea do mesmo chassis
- Se um chassis ficar "travado", o lock expira automaticamente ou pode ser limpo manualmente
