# 🧪 Guia de Teste - Salvamento de Conferência de Pneus

## 📋 Objetivo

Este guia explica como testar o salvamento da conferência de pneus no Supabase usando dados fictícios.

---

## 🚀 Como Testar

### **Passo 1: Configurar a Tabela no Supabase**

⚠️ **IMPORTANTE**: Execute primeiro a configuração do banco de dados

1. Siga as instruções em `/docs/sql/INSTALACAO.md`
2. Execute o script `/docs/sql/SETUP-COMPLETE.sql`
3. Verifique se a tabela `tire_check_sessions` foi criada

---

### **Passo 2: Acessar a Página de Conferência**

1. Faça login no sistema Conecta Cup
2. Vá em: **Operações → Conferir Pneus**
3. Você verá a tela de upload

---

### **Passo 3: Carregar Dados de Teste**

Na tela de upload, você verá:

```
┌────────────────────────────────────────┐
│  [Escolher arquivo Excel]              │
│             --- OU ---                 │
│  [🧪 Carregar Dados de Teste]          │
└────────────────────────────────────────┘
```

**Clique no botão "🧪 Carregar Dados de Teste"**

---

### **Passo 4: O Que Acontece**

O sistema vai carregar automaticamente:

#### **5 Chassis Fictícios:**

| # | Chassis | Piloto | Status | Categoria | Pneus |
|---|---------|--------|--------|-----------|-------|
| 1 | 992GT3-001 | João Silva | SIM | Carrera Cup | 16 |
| 2 | 992GT3-002 | Maria Santos | SIM | Carrera Cup | 16 |
| 3 | 992GT3-003 | Pedro Costa | NÃO | Carrera Cup | 16 |
| 4 | 992GT3-004 | Ana Lima | SIM | Trophy | 12 |
| 5 | 992GT3-005 | Carlos Rocha | INDEF. | Trophy | 12 |

#### **Jogos de Pneus Completos:**

- **Carrera Cup**: 4 jogos de 4 pneus cada (16 total)
- **Trophy**: 3 jogos de 4 pneus cada (12 total)

#### **Validações Automáticas:**

- ✅ **OK**: Chassis confirmado + Piloto correto + Guardar
- 🔴 **INVERSÃO NECESSÁRIA**: Divergências de status/piloto
- 🔵 **CUP - ANALISE VOLTAS**: Chassis não confirmado + Descartar

---

### **Passo 5: Visualizar os Dados**

Após carregar, você verá:

```
┌─────────────────────────────────────────┐
│ ✅ 5 chassis carregados                 │
│                                         │
│ Carrera Cup (CC) - 3 chassis           │
│ Trophy (TROPHY) - 2 chassis            │
│                                         │
│ Todos os chassis com conferência       │
│ finalizada (100%)                       │
└─────────────────────────────────────────┘
```

---

### **Passo 6: Salvar no Supabase**

1. Role até o final da página
2. Você verá o card de finalização:

```
┌─────────────────────────────────────────┐
│ Finalizar e Salvar Etapa                │
│ 5 de 5 chassis conferidos               │
│                                         │
│     [Salvar Etapa no Histórico] ➡      │
└─────────────────────────────────────────┘
```

3. **Clique em "Salvar Etapa no Histórico"**
4. Aguarde o toast de confirmação:

```
✅ Conferência salva com sucesso!
5 chassis salvos no histórico
```

---

### **Passo 7: Verificar no Supabase**

1. Acesse **Supabase Dashboard**
2. Vá em **Table Editor**
3. Abra a tabela `tire_check_sessions`
4. Você verá um novo registro com:
   - `season_name`: Nome da temporada ativa
   - `stage_name`: Nome da primeira etapa
   - `chassis_data`: JSON com os 5 chassis
   - `created_by`: Seu ID de usuário
   - `created_at`: Data/hora atual

---

## 🔍 Estrutura dos Dados de Teste

### **Chassis 1: João Silva (OK)**
```json
{
  "chassis": "992GT3-001",
  "piloto": "João Silva",
  "corrida": "SIM",
  "categoria": "Carrera Cup (CC)",
  "tiresChecked": 16,
  "tireSets": [
    {
      "jogo": 1,
      "montadoNoCarro": true,
      "tires": [
        {
          "posicao": "DT",
          "codigo": "00011A",
          "piloto": "João Silva",
          "situacao": "Guardar",
          "validacao": "OK"
        }
        // ... 15 pneus restantes
      ]
    }
  ]
}
```

### **Chassis 3: Pedro Costa (INVERSÃO)**
```json
{
  "chassis": "992GT3-003",
  "piloto": "Pedro Costa",
  "corrida": "NÃO",
  "categoria": "Carrera Cup (CC)",
  "tiresChecked": 16,
  "tireSets": [
    {
      "jogo": 1,
      "tires": [
        {
          "posicao": "DT",
          "codigo": "00031A",
          "piloto": "Pedro Costa",
          "situacao": "Guardar", // NÃO + Guardar = INVERSÃO
          "validacao": "INVERSÃO NECESSÁRIA"
        }
      ]
    }
  ]
}
```

### **Chassis 5: Carlos Rocha (ANALISE VOLTAS)**
```json
{
  "chassis": "992GT3-005",
  "piloto": "Carlos Rocha",
  "corrida": "INDEF.",
  "categoria": "Trophy (TROPHY)",
  "tiresChecked": 12,
  "tireSets": [
    {
      "jogo": 1,
      "tires": [
        {
          "posicao": "DT",
          "codigo": "00051A",
          "piloto": "Carlos Rocha",
          "situacao": "Descartar", // INDEF + Descartar = ANALISE
          "validacao": "CUP - ANALISE VOLTAS"
        }
      ]
    }
  ]
}
```

---

## 🧪 Cenários de Teste

### **Teste 1: Salvamento Básico**
✅ Clique em "Carregar Dados de Teste"  
✅ Clique em "Salvar Etapa no Histórico"  
✅ Verifique toast de sucesso  
✅ Confirme registro no Supabase

### **Teste 2: Múltiplos Salvamentos**
✅ Carregue dados de teste  
✅ Salve no histórico  
✅ Repita o processo 3x  
✅ Verifique 3 registros no Supabase

### **Teste 3: Validações**
✅ Carregue dados de teste  
✅ Clique em um chassis para ver detalhes  
✅ Verifique as validações de cada pneu:
- João Silva: ✅ OK
- Pedro Costa: 🔴 INVERSÃO NECESSÁRIA
- Carlos Rocha: 🔵 CUP - ANALISE VOLTAS

### **Teste 4: Filtros (Futuro)**
Quando a página de histórico for criada:
✅ Buscar por temporada  
✅ Buscar por etapa  
✅ Buscar por usuário  
✅ Filtrar por data

---

## 📊 Dados Gerados

### **Códigos de Pneus:**
- Jogo 1: `00011A`, `00011B`, `00011C`, `00011D`
- Jogo 2: `00012A`, `00012B`, `00012C`, `00012D`
- Jogo 3: `00013A`, `00013B`, `00013C`, `00013D`
- Jogo 4: `00014A`, `00014B`, `00014C`, `00014D`

### **Voltas Aleatórias:**
- Entre 20 e 120 voltas
- Gerado aleatoriamente para cada pneu

### **Situações:**
- **Chassis SIM**: Todos com "Guardar"
- **Chassis NÃO/INDEF**: Mix de "Guardar" e "Descartar" (aleatório)

---

## 🔧 Troubleshooting

### ❌ Erro: "Temporada ou etapa não selecionada"

**Causa**: Não há temporada ativa configurada

**Solução**:
1. Vá em **Master Data → Configurar Temporada**
2. Crie uma temporada
3. Marque como **"active"**
4. Adicione pelo menos uma etapa
5. Tente novamente

### ❌ Erro: "Usuário não autenticado"

**Causa**: Sessão expirada

**Solução**:
1. Faça logout
2. Faça login novamente
3. Tente carregar os dados de teste

### ❌ Erro: "Tabela não encontrada"

**Causa**: Tabela `tire_check_sessions` não foi criada

**Solução**:
1. Execute `/docs/sql/SETUP-COMPLETE.sql`
2. Verifique se a tabela existe no Table Editor
3. Tente novamente

### ❌ Toast não aparece

**Causa**: Erro silencioso no salvamento

**Solução**:
1. Abra o Console do navegador (F12)
2. Vá na aba "Console"
3. Procure por erros em vermelho
4. Copie a mensagem de erro
5. Verifique os logs do Supabase

---

## 📝 Logs de Debug

O sistema gera logs no console:

```
🧪 Carregando dados de teste...
✅ Temporada ativa: Porsche Cup 2025
✅ Etapas carregadas: 3
✅ Dados de teste carregados: { chassis: 5, conferenciasCompletas: 5 }
```

Ao salvar:

```
Preparando salvamento...
✅ Conferência salva com sucesso!
✅ Sessão salva com ID: uuid-do-registro
```

---

## ✅ Checklist de Teste Completo

- [ ] Tabela criada no Supabase
- [ ] RLS habilitado
- [ ] Usuário autenticado
- [ ] Temporada ativa configurada
- [ ] Etapa cadastrada
- [ ] Dados de teste carregados
- [ ] Salvamento realizado com sucesso
- [ ] Toast de confirmação exibido
- [ ] Registro aparece no Supabase
- [ ] JSON `chassis_data` está completo
- [ ] Validações foram salvas corretamente

---

**Versão**: 1.0  
**Data**: 22/01/2025  
**Status**: ✅ Pronto para Teste
