# 🔄 Fluxo Completo: Conferir Pneus

## 📊 Visão Geral do Processo

```
┌─────────────────┐
│  1. UPLOAD      │
│  Excel File     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. VALIDAÇÃO   │
│  Chassis Excel  │
│  vs Cadastrados │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. SELEÇÃO      │
│ Temporada +     │
│ Etapa           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. CONFERÊNCIA  │
│ Leitura QRCode  │
│ dos Pneus       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. VALIDAÇÕES   │
│ Automáticas     │
│ • OK            │
│ • Inversão      │
│ • Analise       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. SALVAMENTO   │
│ Supabase        │
│ tire_check_     │
│ sessions        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. HISTÓRICO    │
│ Relatórios      │
└─────────────────┘
```

---

## 🎯 Detalhamento das Etapas

### **1️⃣ UPLOAD DO EXCEL**

**Arquivo**: `/pages/ConferirPneus.tsx`

**Entrada**:
- Planilha Excel (.xlsx)
- Limite: 10MB
- Múltiplas abas com chassis

**Processamento**:
```typescript
- Identifica header automaticamente (até linha 15)
- Extrai colunas: chassis, piloto, corrida
- Agrupa por categoria (da aba)
- Valida contra chassis cadastrados
```

**Saída**:
```typescript
ExcelChassisData[] = [
  {
    chassis: "992GT3-001",
    piloto: "João Silva",
    corrida: "SIM",
    sheetName: "Carrera Cup (CC)",
    categoria: "CC",
    isValid: true,
    tiresChecked: 0
  }
]
```

---

### **2️⃣ VALIDAÇÃO DOS CHASSIS**

**Validação em Tempo Real**:

| Status | Badge | Condição |
|--------|-------|----------|
| ✅ **Válido** | Verde | Chassis encontrado no cadastro |
| ⚠️ **Não Encontrado** | Vermelho | Chassis não cadastrado |

**Fonte de Dados**:
```typescript
registeredChassis: Chassis[] // De chassisStorage (Supabase)
```

---

### **3️⃣ SELEÇÃO DE TEMPORADA E ETAPA**

**Componente**: Modal de seleção

**Dados Carregados**:
```typescript
// Busca temporada ativa
activeSeason: Season {
  name: "Porsche Cup 2025",
  status: "active"
}

// Busca etapas da temporada
seasonStages: SeasonStage[] = [
  {
    name: "Interlagos",
    track: "Autódromo de Interlagos",
    date: "2025-03-15"
  }
]
```

**Fonte**: `seasonStorage` (Supabase: `seasons`, `season_stages`)

---

### **4️⃣ CONFERÊNCIA DOS PNEUS**

**Interface de Leitura**:

```
┌────────────────────────────────────────┐
│ Chassis: 992GT3-001                    │
│ Piloto: João Silva                     │
│ Status: SIM (Confirmado)               │
├────────────────────────────────────────┤
│                                        │
│ [🔍 Input QR Code]                     │
│                                        │
│ Jogo 1 - Montado no Carro              │
│ ┌──────┬────────┬──────────┬─────┐    │
│ │ DT   │ 0001A  │ J.Silva  │ ✅  │    │
│ │ TE   │ 0002A  │ J.Silva  │ ✅  │    │
│ │ DD   │ 0003A  │ J.Silva  │ ✅  │    │
│ │ TD   │ 0004A  │ J.Silva  │ ✅  │    │
│ └──────┴────────┴──────────┴─────┘    │
└────────────────────────────────────────┘
```

**Busca no Estoque**:
```typescript
getTireByBarcode(codigo) → StockEntry
{
  codigo: "0001A",
  piloto: "João Silva",
  ano: "2025",
  set: "001",
  tipo: "Slick",
  voltas: 50,
  situacao: "Guardar"
}
```

---

### **5️⃣ VALIDAÇÕES AUTOMÁTICAS**

**Matriz de Validação**:

```typescript
// REGRA 1: Chassis CONFIRMADO + Pneu DESCARTAR
if (isConfirmado && isDescartar) {
  return "INVERSÃO NECESSÁRIA" // 🔴
}

// REGRA 2: Chassis NÃO CONFIRMADO + Pneu GUARDAR
if (isNaoConfirmado && isGuardar) {
  return "INVERSÃO NECESSÁRIA" // 🔴
}

// REGRA 3: Chassis NÃO CONFIRMADO + Pneu DESCARTAR
if (isNaoConfirmado && isDescartar) {
  return "CUP - ANALISE VOLTAS" // 🔵
}

// REGRA 4: Piloto Correto + Guardar + Confirmado
if (isPilotCorrect && isGuardar && isConfirmado) {
  return "OK" // ✅
}

// REGRA 5: Piloto Diferente + Guardar
if (!isPilotCorrect && isGuardar) {
  return "INVERSÃO NECESSÁRIA" // 🔴
}
```

**Visualização**:

| Validação | Ícone | Cor | Significado |
|-----------|-------|-----|-------------|
| **OK** | ✅ CheckCircle2 | Verde | Tudo correto |
| **INVERSÃO NECESSÁRIA** | 🔴 AlertOctagon | Vermelho | Ação necessária |
| **CUP - ANALISE VOLTAS** | 🔵 Info | Azul | Requer análise |

---

### **6️⃣ SALVAMENTO NO SUPABASE**

**Botão de Salvamento**:
```
[Salvar Etapa no Histórico]
```

**Função**: `handleSaveToSupabase()`

**Processo**:
1. Filtra apenas chassis completamente conferidos
2. Calcula validações para cada pneu
3. Monta estrutura `ChassisCheckData[]`
4. Chama `saveTireCheckSession()`
5. Insere no Supabase `tire_check_sessions`

**Estrutura Salva**:
```json
{
  "id": "uuid-gerado",
  "season_name": "Porsche Cup 2025",
  "stage_name": "Interlagos",
  "check_date": "2025-01-22T14:30:00Z",
  "created_by": "uuid-do-usuario",
  "chassis_data": [
    {
      "chassis": "992GT3-001",
      "piloto": "João Silva",
      "corrida": "SIM",
      "categoria": "Carrera Cup (CC)",
      "tiresChecked": 16,
      "tireSets": [
        {
          "jogo": 1,
          "label": "Jogo 1",
          "montadoNoCarro": true,
          "tires": [
            {
              "posicao": "DT",
              "codigo": "0001A",
              "piloto": "João Silva",
              "ano": "2025",
              "set": "001",
              "tipo": "Slick",
              "voltas": "50",
              "situacao": "Guardar",
              "validacao": "OK"
            }
          ]
        }
      ]
    }
  ],
  "created_at": "2025-01-22T14:30:00Z",
  "updated_at": "2025-01-22T14:30:00Z"
}
```

---

### **7️⃣ HISTÓRICO E RELATÓRIOS**

**Em Desenvolvimento**:

Será possível:
- ✅ Visualizar todas as conferências salvas
- ✅ Filtrar por temporada/etapa
- ✅ Ver detalhes completos (chassis, pneus, validações)
- ✅ Exportar para Excel
- ✅ Gerar relatórios estatísticos

---

## 🗂️ Estrutura de Arquivos

```
/pages
  └── ConferirPneus.tsx          # Página principal
  
/utils
  ├── tireCheckSupabase.ts       # API Supabase (conferências)
  ├── chassisStorage.ts          # API chassis
  ├── seasonStorage.ts           # API temporadas/etapas
  └── storage.ts                 # API estoque pneus
  
/components
  └── UpdateStatusModal.tsx      # Modal atualização status

/docs
  ├── supabase-tire-check-table.sql     # Script criação tabela
  ├── INTEGRACAO-CONFERIR-PNEUS-SUPABASE.md
  └── FLUXO-CONFERIR-PNEUS.md          # Este arquivo
```

---

## 📊 Banco de Dados Supabase

### Tabelas Utilizadas

| Tabela | Descrição | Uso |
|--------|-----------|-----|
| **tire_check_sessions** | Conferências salvas | Histórico completo |
| **chassis** | Chassis cadastrados | Validação |
| **seasons** | Temporadas | Seleção |
| **season_stages** | Etapas | Seleção |
| **stock_entries** | Estoque pneus | Busca por QR Code |

### Relacionamentos

```
tire_check_sessions
├── created_by → auth.users (FK)
├── season_name → seasons.name (referência)
└── stage_name → season_stages.name (referência)

chassis_data (JSONB)
└── chassis → chassis.numero (referência lógica)
    └── tires[].codigo → stock_entries.codigo (referência lógica)
```

---

## 🚀 Performance

### Otimizações Implementadas

1. **Upload Excel**:
   - Limite 10MB
   - Processamento otimizado XLSX
   - Limpeza automática de memória

2. **Leitura QR Code**:
   - Busca indexada por código
   - Cache local dos dados do chassis

3. **Salvamento Supabase**:
   - Batch insert único
   - JSONB para dados estruturados
   - Índices GIN para buscas JSON

4. **RLS**:
   - Políticas otimizadas
   - Índices em colunas filtradas

---

## 🎨 UX/UI

### Estados Visuais

| Estado | Cor | Badge |
|--------|-----|-------|
| Chassis válido | Verde | ✅ VÁLIDO |
| Chassis inválido | Vermelho | ⚠️ NÃO ENCONTRADO |
| Pneu OK | Verde | ✅ OK |
| Inversão necessária | Vermelho | 🔴 INVERSÃO NECESSÁRIA |
| Análise voltas | Azul | 🔵 CUP - ANALISE VOLTAS |
| Divergência piloto | Laranja | ⚠️ Piloto inválido |

### Feedback ao Usuário

- **Toast Success**: Salvamento concluído
- **Toast Error**: Falha no salvamento
- **Loading States**: Botões com spinner
- **Validação em Tempo Real**: Ícones e cores

---

**Versão**: 1.0.0  
**Última Atualização**: 22/01/2025  
**Status**: ✅ Implementado
