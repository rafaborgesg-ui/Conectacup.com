# 🔍 DIAGNÓSTICO: Dados de Teste Corrompidos no Histórico

## 🎯 PROBLEMA IDENTIFICADO:

Você fez um teste e salvou uma conferência com **estrutura de dados incompleta**. Mesmo que tenha "limpado", os dados ainda podem estar no banco com campos faltando (especialmente `tireSets`).

---

## ⚡ PASSO 1: INSPECIONAR OS DADOS

### **Execute no Supabase SQL Editor:**

📁 `/supabase/migrations/INSPECIONAR_ESTRUTURA_DADOS_TESTE.sql`

**Execute a Query 3:**

```sql
SELECT 
  id,
  season_name,
  stage_name,
  chassis.value->>'chassis' as chassis_numero,
  chassis.value->>'piloto' as piloto,
  CASE 
    WHEN chassis.value->'tireSets' IS NULL THEN '❌ SEM tireSets'
    WHEN jsonb_array_length(chassis.value->'tireSets') = 0 THEN '⚠️ tireSets VAZIO'
    ELSE '✅ tireSets OK (' || jsonb_array_length(chassis.value->'tireSets')::text || ' jogos)'
  END as status_tire_sets
FROM tire_check_sessions,
  jsonb_array_elements(chassis_data) as chassis
ORDER BY created_at DESC;
```

### 🔥 **O QUE VOCÊ VAI VER:**

| season_name | stage_name | chassis_numero | status_tire_sets |
|-------------|------------|----------------|------------------|
| Temporada X | Etapa Y    | 001            | ❌ SEM tireSets  |
| Temporada X | Etapa Y    | 002            | ⚠️ tireSets VAZIO |

Se aparecer **"❌ SEM tireSets"** ou **"⚠️ tireSets VAZIO"**, **ESSE É O PROBLEMA!**

---

## ⚡ PASSO 2: LIMPAR OS DADOS DE TESTE

### **Execute no Supabase SQL Editor:**

📁 `/supabase/migrations/LIMPAR_DADOS_TESTE_HISTORICO.sql`

### **Opção A: Deletar uma conferência específica (recomendado)**

1. **Primeiro, veja todas as conferências:**

```sql
SELECT 
  id,
  season_name,
  stage_name,
  check_date,
  created_at
FROM tire_check_sessions
ORDER BY created_at DESC;
```

2. **Copie o ID da conferência de teste**

3. **Delete a conferência:**

```sql
DELETE FROM tire_check_sessions 
WHERE id = 'COLE_O_ID_AQUI';
```

### **Opção B: Deletar todas as conferências de uma etapa**

```sql
DELETE FROM tire_check_sessions 
WHERE season_name = 'NOME_DA_TEMPORADA' 
AND stage_name = 'NOME_DA_ETAPA';
```

### **Opção C: Deletar TODAS as conferências (reset total)**

```sql
DELETE FROM tire_check_sessions;
```

---

## ⚡ PASSO 3: CONFIRMAR LIMPEZA

Execute:

```sql
SELECT COUNT(*) as total_conferencias FROM tire_check_sessions;
```

**Resultado esperado:** 
- Se deletou tudo: `0`
- Se deletou apenas a de teste: número menor que antes

---

## ⚡ PASSO 4: TESTAR A PÁGINA

1. **Recarregue a página Histórico** (Ctrl + Shift + R)
2. **Verifique se o erro sumiu**

---

## ✅ POR QUE ISSO ACONTECEU?

Quando você fez o teste, pode ter:
- ❌ Salvado dados sem `tireSets` completo
- ❌ Interrompido o processo no meio
- ❌ Usado uma versão antiga do código

As correções que fiz agora **protegem contra isso**, usando `(chassis.tireSets || [])`, mas os dados antigos precisam ser limpos.

---

## 🎯 RESUMO RÁPIDO:

```
1. ✅ Execute INSPECIONAR_ESTRUTURA_DADOS_TESTE.sql
2. ✅ Identifique qual conferência tem problema
3. ✅ Execute LIMPAR_DADOS_TESTE_HISTORICO.sql
4. ✅ Delete a conferência problemática
5. ✅ Recarregue a página Histórico
6. 🎉 Erro resolvido!
```

---

**Me confirme depois de executar o PASSO 1 se você vê "❌ SEM tireSets"! Se sim, deleta e o erro some! 🚀**
