# 📦 Funcionalidade de Fracionamento de Pedidos

## 🎯 Objetivo

Permitir que o usuário divida um pedido com múltiplas etapas em vários pedidos independentes, cada um atendendo a um subconjunto específico de etapas.

## 🔄 Fluxo de Uso

### 1. Seleção de Etapas
- Usuário seleciona uma temporada
- Usuário seleciona **2 ou mais etapas** da temporada

### 2. Ativação do Fracionamento
- Quando 2+ etapas estão selecionadas, aparece a opção **"Fracionar Pedido"**
- Ao ativar, o usuário escolhe em quantas frações deseja dividir (2, 3, 4 ou 5)

### 3. Configuração das Frações
Para cada fração, o usuário pode:
- **Nomear a fração** (ex: "Pedido Etapas Internacionais", "Pedido 1º Semestre", etc.)
- **Atribuir etapas** específicas a cada fração
- Cada etapa só pode pertencer a UMA fração

### 4. Validações
- ✅ Todas as etapas selecionadas devem ser atribuídas a alguma fração
- ✅ Nenhuma fração pode ficar vazia
- ✅ Nome do pedido base deve estar preenchido

### 5. Salvamento
- Ao clicar em **"Salvar X Frações"**, o sistema criará X pedidos independentes no Supabase
- Cada pedido terá:
  - Nome: `[Nome Base] - [Nome da Fração]`
  - Etapas: Apenas as etapas atribuídas àquela fração
  - Cálculo independente de necessidade de pneus

## 💡 Casos de Uso

### Exemplo 1: Separar por Geografia
- **Fração 1 - "Etapas Sul-Americanas"**
  - Interlagos
  - Buenos Aires
  
- **Fração 2 - "Etapas Internacionais"**
  - Spa-Francorchamps
  - Nürburgring

### Exemplo 2: Separar por Período
- **Fração 1 - "1º Semestre"**
  - Etapa 1 (Março)
  - Etapa 2 (Abril)
  
- **Fração 2 - "2º Semestre"**
  - Etapa 3 (Setembro)
  - Etapa 4 (Outubro)

### Exemplo 3: Separar por Tipo de Campeonato
- **Fração 1 - "Etapas Sprint"**
  - Sprint 1
  - Sprint 2
  
- **Fração 2 - "Etapas Endurance"**
  - Endurance 500km
  - Endurance 300km

## 🔧 Implementação Técnica

### Estados React
```typescript
const [enableFractionation, setEnableFractionation] = useState(false);
const [numberOfFractions, setNumberOfFractions] = useState(2);
const [fractionStages, setFractionStages] = useState<Map<number, Set<string>>>(new Map());
const [fractionNames, setFractionNames] = useState<Map<number, string>>(new Map());
```

### Funções Principais
- `initializeFractions(count)` - Inicializa estrutura de frações
- `toggleFractionStage(fractionIndex, stageId)` - Atribui/remove etapa de fração
- `updateFractionName(fractionIndex, name)` - Atualiza nome da fração

### Comportamento
- Fracionamento só aparece se **2+ etapas** estiverem selecionadas
- Ao ativar fracionamento, a análise normal de necessidade é **ocultada**
- Aparece a visualização de frações com resumo
- Uma etapa ao ser atribuída a uma fração é **automaticamente removida** de outras frações

## 🎨 Interface

### Modo Normal (Sem Fracionamento)
- Seleção de etapas
- Análise de necessidade consolidada
- Um único pedido

### Modo Fracionamento (Ativo)
- Seleção de etapas
- Configuração de frações
- Distribuição de etapas por fração
- Resumo visual de cada fração
- Botão para salvar múltiplos pedidos

## 📋 Próximos Passos

- [ ] Implementar função `saveFractions()` para salvar múltiplos pedidos no Supabase
- [ ] Calcular necessidade de pneus independente para cada fração
- [ ] Adicionar validação visual de conflitos de etapas
- [ ] Permitir editar frações após criação (modo rascunho)
- [ ] Adicionar preview de cada fração antes de salvar
