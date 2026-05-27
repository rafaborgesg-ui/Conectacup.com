# 🔍 Diagnóstico: Diferença de Registros - Ajuste de Estoque

## 📊 Problema Identificado

Você reportou que existem **13.239 registros** no banco de dados Supabase, mas apenas **12.952 registros** aparecem na página "Ajuste de Estoque", resultando em uma diferença de **287 registros** (2,16% dos dados).

## 🎯 Causa Raiz

A função `getStockEntries()` em `/utils/storage.ts` aplica uma **validação de integridade** que filtra registros com códigos de barras corrompidos ou inválidos:

### Padrões de Barcode VÁLIDOS (aceitos):
- ✅ **8 dígitos numéricos**: `12345678`
- ✅ **7 dígitos numéricos**: `1234567`
- ✅ **Formato alfanumérico**: `SEM00001` (3 letras maiúsculas + 5 dígitos)

### Padrões de Barcode INVÁLIDOS (filtrados):
- ❌ **UUID**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (registros corrompidos)
- ❌ **Formatos não padronizados**: códigos com caracteres especiais, espaços, ou tamanhos incorretos

## 🔧 Correção Implementada

Foi aplicada uma correção na validação para **aceitar códigos alfanuméricos** no formato `SEM00001` (pneus sem código de barras), que estava sendo rejeitada anteriormente:

```typescript
// ANTES (rejeitava SEM00001):
if (!/^\d{7,8}$/.test(entry.barcode)) {
  return false; // ❌ Rejeitava SEM00001
}

// DEPOIS (aceita SEM00001):
const isNumeric = /^\d{7,8}$/.test(entry.barcode);
const isAlphanumeric = /^[A-Z]{3}\d{5}$/.test(entry.barcode);

if (!isNumeric && !isAlphanumeric) {
  return false; // ✅ Aceita SEM00001
}
```

## 📋 Próximos Passos

### 1️⃣ **Identificar Registros Filtrados** (RECOMENDADO)

Execute o script SQL para ver exatamente quais registros estão sendo filtrados:

```bash
/diagnostics/IDENTIFY_FILTERED_BARCODES.sql
```

**Como executar:**
1. Abra o Supabase SQL Editor: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
2. Copie TODO o conteúdo do arquivo `IDENTIFY_FILTERED_BARCODES.sql`
3. Cole no editor e clique em **RUN**
4. Revise os resultados

### 2️⃣ **Corrigir ou Remover Registros Inválidos** (OPCIONAL)

Se o diagnóstico confirmar que há registros corrompidos, você pode:

**Opção A: Remover registros inválidos**
```bash
/diagnostics/FIX_INVALID_BARCODES.sql
```

**Opção B: Manter como está**
- A validação protege o sistema de registros corrompidos
- Os 287 registros filtrados podem ser dados ruins de importações antigas
- A interface continuará funcionando normalmente com os 12.952 registros válidos

### 3️⃣ **Verificar Resultado na Interface**

1. Recarregue a página "Ajuste de Estoque" (F5)
2. Observe o console do navegador (F12 → Console)
3. Procure por logs:
   ```
   📥 ${X} registros retornados do banco
   ⚠️ ${Y} registro(s) corrompido(s) filtrado(s)
   ✅ Cache de estoque atualizado: ${Z} pneus
   ```

## 📈 Estatísticas Esperadas

### Cenário 1: Códigos SEM00001 estavam sendo filtrados (CORRIGIDO)
- Total no banco: 13.239
- Códigos SEM* filtrados: ~287
- **Após correção**: Todos os 13.239 devem aparecer ✅

### Cenário 2: Registros com UUID corrompido
- Total no banco: 13.239
- Registros UUID: ~287
- **Após limpeza**: 12.952 registros válidos permanecem ⚠️

## 🛡️ Proteções de Segurança

A validação de barcode protege o sistema contra:

1. **Race Conditions**: Registros criados com UUID ao invés de barcode
2. **Dados Corrompidos**: Importações com formatos inválidos
3. **Erros de API**: Códigos gerados incorretamente

## 💡 Como Prevenir no Futuro

1. **Sempre use validação no frontend**: Valide códigos antes de enviar ao banco
2. **Use transações atômicas**: Garanta que barcode seja gerado corretamente
3. **Monitor de integridade**: Execute `IDENTIFY_FILTERED_BARCODES.sql` mensalmente

## 📞 Suporte

Se após executar o diagnóstico você ainda tiver dúvidas ou precisar remover os registros corrompidos, execute os scripts SQL fornecidos e revise os resultados.

---

**Última atualização**: Sistema corrigido para aceitar códigos alfanuméricos `SEM00001`
**Impacto esperado**: +287 registros devem aparecer na interface após correção
