# CORREÇÃO CRÍTICA - Listener em Tempo Real

## Problema Identificado

O listener em tempo real (linhas 374-486 de `/pages/ConferirPneus.tsx`) está **SEMPRE sobrescrevendo** os dados locais (`savedTireSets`) sempre que recebe uma atualização do Supabase, **independentemente** de quem está editando o chassis.

Isso significa que:
- ❌ Se você está editando o chassis 1 e outro usuário atualiza o chassis 2
- ❌ **TODOS os dados locais são substituídos** pelos dados do servidor
- ❌ Você perde os códigos que acabou de bipar

## Solução Necessária

Modificar a seção do listener (linha 455-480) de:

```typescript
if (chassisProgress.tireSets) {
  // 🔥 SEMPRE recria o label como "Jogo X" e garante _originalIndex
  restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
    ...set,
    label: `Jogo ${set.jogo}`,
    tires: set.tires.map((tire, tireIdx) => ({
      ...tire,
      _originalIndex: tire._originalIndex ?? tireIdx
    }))
  }));
}
```

Para:

```typescript
// 🔒 PROTEÇÃO CRÍTICA: NÃO sobrescrever dados que o usuário atual está editando
const isCurrentUserEditing = chassisProgress.lockedBy === currentUserId;
const isCurrentlySelected = idx === selectedChassisIndex;

// ✅ ATUALIZA tireSets SOMENTE se NÃO for o chassis que o usuário está editando
if (chassisProgress.tireSets && !isCurrentUserEditing && !isCurrentlySelected) {
  // 🔥 SEMPRE recria o label como "Jogo X" e garante _originalIndex
  restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
    ...set,
    label: `Jogo ${set.jogo}`,
    tires: set.tires.map((tire, tireIdx) => ({
      ...tire,
      _originalIndex: tire._originalIndex ?? tireIdx
    }))
  }));
} else if (isCurrentUserEditing || isCurrentlySelected) {
  // 🔒 Mantém os dados locais do usuário atual
  console.log(`🔒 Protegendo dados locais do chassis ${idx} (usuário está editando)`);
}
```

E modificar a linha 480 de:

```typescript
setSavedTireSets(restoredSavedSets);
```

Para:

```typescript
// 🔒 Mescla com dados locais preservados (não sobrescreve tudo)
setSavedTireSets(prev => ({
  ...prev,
  ...restoredSavedSets
}));
```

## Garantias após a correção

✅ Dados do usuário atual **NUNCA** serão sobrescritos enquanto ele está editando
✅ Locks são sempre atualizados (importante para sincronização)
✅ Dados de outros chassis são atualizados normalmente
✅ Códigos bipados ficam **IMUTÁVEIS** até que o usuário salve ou outro usuário edite explicitamente

## Mesmo problema em loadSharedSession

A mesma proteção precisa ser aplicada na função `loadSharedSession` (linha 782-808).

Modificar de:

```typescript
if (chassisProgress.tireSets) {
  restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
    ...set,
    label: `Jogo ${set.jogo}`,
    tires: set.tires.map((tire, tireIdx) => ({
      ...tire,
      _originalIndex: tire._originalIndex ?? tireIdx
    }))
  }));
}
```

Para:

```typescript
// 🔒 Na loadSharedSession, carrega TODOS os dados (não há proteção aqui, pois é carga inicial)
if (chassisProgress.tireSets) {
  restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
    ...set,
    label: `Jogo ${set.jogo}`,
    tires: set.tires.map((tire, tireIdx) => ({
      ...tire,
      _originalIndex: tire._originalIndex ?? tireIdx
    }))
  }));
}
```

Nota: Na `loadSharedSession`, NÃO aplicamos a proteção porque é a carga inicial da sessão.
