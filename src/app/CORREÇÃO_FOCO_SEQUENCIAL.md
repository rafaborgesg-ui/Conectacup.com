# ✅ CORREÇÃO - Foco Sequencial Para Baixo

## 🐛 Problema Relatado

O foco após bipar um código estava indo para campos acima quando ainda existiam campos vazios para baixo disponíveis.

**Comportamento Incorreto:**
```
Jogo 1:
  [1] DD - Código1 ✅ (bipado)
  [2] DE - vazio     ← Foco deveria ir aqui
  [3] TD - vazio
  [4] TE - vazio

❌ Mas o foco estava indo para [1] DD novamente ou outro campo acima
```

**Comportamento Esperado:**
```
Jogo 1:
  [1] DD - Código1 ✅ (bipado)
  [2] DE - vazio     ✅ FOCO AQUI (próximo campo para baixo)
  [3] TD - vazio
  [4] TE - vazio
```

## 🔍 Causa Raiz

Na linha **643** do arquivo `/pages/ConferirPneus.tsx`, o código estava usando:

```typescript
const nextEmptyIdx = currentSet.tires.findIndex(t => !t.codigo || t.codigo === '-');
```

Esse código retorna o **PRIMEIRO** campo vazio encontrado no array, sem considerar a posição atual. 

**Problema:**
- Se o usuário bipar o campo na posição visual 2
- E existir um campo vazio na posição visual 1
- O `findIndex` retorna posição 1 (voltando para cima)
- O foco ia para cima ao invés de para baixo

## ✅ Solução Aplicada

Modificado o código nas linhas **642-648** para:

```typescript
// 🔥 Busca o índice visual do pneu que acabou de ser preenchido
const currentVisualIdx = currentSet.tires.findIndex(t => t._originalIndex === position);

// 🔥 Busca o próximo campo vazio APÓS a posição atual (para baixo na lista)
const nextEmptyIdx = currentSet.tires.findIndex((t, idx) => 
  idx > currentVisualIdx && (!t.codigo || t.codigo === '-')
);
```

### **O que mudou:**

#### **1. Identifica a Posição Atual (Linha 643)**
```typescript
const currentVisualIdx = currentSet.tires.findIndex(t => t._originalIndex === position);
```
Encontra onde está visualmente o campo que acabou de ser preenchido.

#### **2. Busca Próximo Vazio APÓS a Posição Atual (Linhas 645-647)**
```typescript
const nextEmptyIdx = currentSet.tires.findIndex((t, idx) => 
  idx > currentVisualIdx && (!t.codigo || t.codigo === '-')
);
```

**Condições da busca:**
- `idx > currentVisualIdx` → **Apenas campos ABAIXO** da posição atual
- `(!t.codigo || t.codigo === '-')` → Campo está vazio

#### **3. Log Melhorado (Linha 658)**
```typescript
console.log(`🎯 Auto-foco no Jogo ${jogo}, índice visual ${nextEmptyIdx} (abaixo de ${currentVisualIdx}), _originalIndex ${nextOriginalIndex}`);
```
Agora mostra claramente que o foco foi para **abaixo** da posição atual.

## 🎯 Novo Fluxo de Foco

```
1. Usuário bipa código na posição visual 2
   └─ currentVisualIdx = 2

2. Sistema busca próximo vazio onde idx > 2
   ├─ Posição 3 está vazia? → SIM ✅
   └─ Foca na posição 3

3. Se não houver vazios abaixo no jogo atual
   └─ Vai para o próximo jogo (comportamento já existente)
```

## 📊 Exemplo Prático

**Cenário: Jogo 1 com ordem visual**
```
[0] DD - vazio
[1] DE - Código123 ✅ (acabou de bipar aqui)
[2] TD - vazio     ← Foco vai para cá
[3] TE - vazio
```

**Log do console:**
```
🎯 Auto-foco no Jogo 1, índice visual 2 (abaixo de 1), _originalIndex 2
```

**Outro Cenário: Último campo do jogo**
```
[0] DD - Código1 ✅
[1] DE - Código2 ✅
[2] TD - Código3 ✅
[3] TE - Código4 ✅ (acabou de bipar aqui)

→ Não há campos vazios abaixo
→ Foco vai para Jogo 2, posição [0]
```

## 🔒 Garantias

✅ **Foco sempre para baixo** no mesmo jogo quando há campos vazios  
✅ **Ordem natural de leitura** (top → bottom)  
✅ **Não volta para cima** enquanto houver campos disponíveis abaixo  
✅ **Muda de jogo automaticamente** quando completar o jogo atual  

## 🧪 Como Testar

1. Abra um chassis com vários pneus para bipar
2. Bipe um código em qualquer campo (ex: posição 2)
3. Verifique que o foco vai para o próximo campo vazio **abaixo** (posição 3)
4. Continue bipando e observe que sempre vai para baixo
5. Ao completar um jogo, deve pular para o próximo jogo automaticamente

**Resultado esperado:** Sequência sempre de cima para baixo, sem nunca voltar para cima enquanto houver campos disponíveis abaixo.
