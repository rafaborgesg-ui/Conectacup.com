// PATCH PARA APLICAR NO LISTENER EM TEMPO REAL
// Arquivo: /pages/ConferirPneus.tsx
// Linhas: 452-482

// ============================================
// VERSÃO ATUAL (PROBLEMÁTICA)
// ============================================
/*
Object.keys(progress).forEach(key => {
  const idx = parseInt(key);
  const chassisProgress = progress[key];
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
  if (chassisProgress.completed) {
    restoredCompletedChassis[idx] = true;
  }
  if (chassisProgress.lockedBy) {
    restoredLocks[idx] = {
      userId: chassisProgress.lockedBy,
      userName: userNamesMap[chassisProgress.lockedBy] || '',
      lockedAt: chassisProgress.lockedAt
    };
  } else {
    restoredLocks[idx] = null;
  }
});

setSavedTireSets(restoredSavedSets);
setCompletedChassis(restoredCompletedChassis);
setChassisLocks(restoredLocks);
*/

// ============================================
// NOVA VERSÃO (CORRIGIDA)
// ============================================

Object.keys(progress).forEach(key => {
  const idx = parseInt(key);
  const chassisProgress = progress[key];
  
  // 🔒 PROTEÇÃO: NÃO sobrescrever o chassis que o usuário atual está editando
  const isCurrentUserEditing = chassisProgress.lockedBy === currentUserId;
  const isCurrentlyViewing = idx === selectedChassisIndex;
  
  // ✅ SÓ atualiza tireSets se NÃO for o chassis sendo editado pelo usuário atual
  if (chassisProgress.tireSets && !isCurrentUserEditing && !isCurrentlyViewing) {
    // 🔥 SEMPRE recria o label como "Jogo X" e garante _originalIndex
    restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
      ...set,
      label: `Jogo ${set.jogo}`,
      tires: set.tires.map((tire, tireIdx) => ({
        ...tire,
        _originalIndex: tire._originalIndex ?? tireIdx
      }))
    }));
  } else if (isCurrentUserEditing || isCurrentlyViewing) {
    // 🔒 Preserva dados locais não salvos
    console.log(`🔒 Mantendo dados locais do chassis ${idx} (usuário ${currentUserId} está editando)`);
  }
  
  if (chassisProgress.completed) {
    restoredCompletedChassis[idx] = true;
  }
  
  // ✅ SEMPRE atualiza locks (importante para sincronização)
  if (chassisProgress.lockedBy) {
    restoredLocks[idx] = {
      userId: chassisProgress.lockedBy,
      userName: userNamesMap[chassisProgress.lockedBy] || '',
      lockedAt: chassisProgress.lockedAt
    };
  } else {
    restoredLocks[idx] = null;
  }
});

// 🔒 MESCLA ao invés de SUBSTITUIR (preserva dados locais não salvos)
setSavedTireSets(prev => {
  const merged = { ...prev };
  Object.keys(restoredSavedSets).forEach(key => {
    const idx = parseInt(key);
    // SÓ sobrescreve se NÃO for o chassis sendo editado
    if (idx !== selectedChassisIndex) {
      merged[idx] = restoredSavedSets[idx];
    }
  });
  return merged;
});

setCompletedChassis(restoredCompletedChassis);
setChassisLocks(restoredLocks);
