# 🔍 DIAGNÓSTICO - E-mail com Planilha Não Chegou

## ✅ Situação Atual

- **E-mail de teste simples:** ✅ CHEGOU
- **E-mail com planilha XLSX:** ❌ NÃO CHEGOU

Isso indica que o problema está **especificamente no anexo**.

---

## 🔬 PASSO 1: Verificar Logs HTTP

Execute no **Supabase SQL Editor**:

```sql
SELECT 
  id,
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as quando,
  status_code,
  CASE 
    WHEN status_code IN (200, 201) THEN '✅ SUCESSO'
    WHEN status_code = 400 THEN '❌ ERRO 400: Requisição inválida'
    WHEN status_code = 401 THEN '❌ ERRO 401: API Key inválida'
    WHEN status_code = 413 THEN '❌ ERRO 413: Arquivo MUITO GRANDE'
    WHEN status_code = 422 THEN '❌ ERRO 422: Dados inválidos'
    WHEN status_code IS NULL THEN '⚠️ NÃO ENVIOU'
    ELSE '❌ ERRO ' || status_code::text
  END as resultado,
  error_msg as erro,
  LEFT(content::text, 200) as resposta
FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;
```

### 📊 Interpretação:

#### ✅ Se `status_code = 200 ou 201`:
- **E-mail foi aceito pelo Resend!**
- **Verifique SPAM**
- **Verifique se o e-mail do gestor está correto**

#### ❌ Se `status_code = 400`:
**Possíveis causas:**
1. Base64 malformado
2. Anexo muito grande
3. Campo `type` incorreto
4. Formato JSON inválido

**Solução:** Execute o código atualizado

#### ❌ Se `status_code = 413`:
**Arquivo muito grande!**
- Limite Resend: **40 MB**
- Reduza o número de avarias exportadas

#### ❌ Se `status_code IS NULL`:
**Não conseguiu enviar**
- Veja o campo `error_msg`
- Problema com pg_net ou conexão

---

## 🔬 PASSO 2: Verificar Console do Navegador

Quando você clicar em **"ENVIAR PLANILHA"**, abra o **Console do Navegador** (F12) e procure por:

```
📧 Gerando planilha e enviando por e-mail...
📊 X avarias encontradas
📝 Gerando planilha com X linhas...
📦 Planilha gerada: X.XX KB
📦 Base64 gerado: X.XX KB
📦 Planilha gerada e convertida para base64
✅ Resposta: {...}
```

### ⚠️ Problemas Comuns:

#### Problema 1: Base64 muito grande
```
📦 Planilha gerada: 50.00 KB
📦 Base64 gerado: 68.00 KB  ← Normal (33% maior)
```

**Se o base64 for maior que 10 MB:**
- Reduza o número de avarias
- Exporte por etapas menores

#### Problema 2: Erro na conversão
```
❌ Erro ao converter para base64: ...
```

**Solução:** Código já foi atualizado para conversão mais robusta!

#### Problema 3: Erro no RPC
```
❌ Erro ao enviar e-mail: {...}
```

**Veja o erro específico** para saber o que corrigir.

---

## 🔬 PASSO 3: Testar com Arquivo Pequeno

Vamos testar com **apenas 1 avaria** para descartar problema de tamanho:

### 1. No Dashboard, crie um filtro:
- Etapa: Selecione uma etapa **com poucas avarias** (1-2)
- Envie a planilha

### 2. Verifique os logs:
```sql
SELECT 
  status_code,
  content::text as resposta_completa
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

#### ✅ Se status_code = 200/201:
**FUNCIONOU!** O problema era o tamanho do arquivo.

**Solução:**
- Exporte etapas menores
- Ou subdivida a exportação

#### ❌ Se status_code = 400 ainda:
O problema é no formato do anexo. Execute o código atualizado.

---

## 🛠️ CORREÇÕES APLICADAS

### 1. Conversão de Base64 Melhorada

**ANTES (problemático com arquivos grandes):**
```javascript
const excelBase64 = btoa(
  new Uint8Array(excelBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
);
```

**DEPOIS (mais robusto):**
```javascript
const uint8Array = new Uint8Array(excelBuffer);
const chunks: string[] = [];
const chunkSize = 0x8000; // 32KB chunks

for (let i = 0; i < uint8Array.length; i += chunkSize) {
  const chunk = uint8Array.subarray(i, i + chunkSize);
  chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
}

const excelBase64 = btoa(chunks.join(''));
```

**Benefícios:**
- ✅ Processa em chunks de 32KB (evita stack overflow)
- ✅ Funciona com arquivos grandes
- ✅ Mais confiável

### 2. Logs Detalhados

Agora mostra no console:
```
📦 Planilha gerada: 45.23 KB
📦 Base64 gerado: 60.31 KB
```

Isso ajuda a identificar se o arquivo está muito grande.

### 3. Validação de Tamanho

Se o arquivo for maior que **10 MB**, aparece:
```
⚠️ Arquivo muito grande! Pode ter problema no envio.
```

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Execute na ordem:

- [ ] **1. Verificar logs HTTP** (status_code)
- [ ] **2. Verificar console do navegador** (tamanho do base64)
- [ ] **3. Testar com 1-2 avarias apenas**
- [ ] **4. Verificar SPAM** (se status = 200/201)
- [ ] **5. Confirmar e-mail do gestor** correto
- [ ] **6. Executar código atualizado** no frontend

---

## 🎯 SOLUÇÃO RÁPIDA

### Se você ainda não aplicou as correções:

1. **Recarregue a página do Dashboard**
   - As correções no código já estão aplicadas
   - A conversão de base64 está otimizada

2. **Tente enviar a planilha novamente**
   - Abra o Console (F12)
   - Clique em "ENVIAR PLANILHA"
   - Veja os logs

3. **Verifique os logs HTTP:**
   ```sql
   SELECT status_code, content::text 
   FROM net._http_response 
   ORDER BY created DESC LIMIT 1;
   ```

4. **Se status = 200/201:**
   - ✅ **FUNCIONOU!**
   - Verifique SPAM
   - Verifique e-mail do gestor

5. **Se status = 400:**
   - Copie a resposta completa
   - Veja qual campo está errado

---

## 🚨 PROBLEMAS CONHECIDOS

### Problema 1: "Attachment too large"
**Erro:** Status 400, mensagem contém "attachment" ou "size"

**Causa:** Arquivo maior que limite do Resend (40 MB)

**Solução:**
- Exporte etapas menores
- Ou reduza fotos/dados

### Problema 2: "Invalid base64"
**Erro:** Status 400, mensagem contém "base64" ou "encoding"

**Causa:** Base64 malformado

**Solução:**
- ✅ Código já corrigido!
- Recarregue a página

### Problema 3: "Missing required fields"
**Erro:** Status 400, mensagem contém "required"

**Causa:** Falta campo obrigatório (filename, content, type)

**Solução:**
- ✅ Código já tem todos os campos!
- Verifique se executou a migração SQL atualizada

---

## 🧪 TESTE MANUAL SIMPLIFICADO

Execute no **Console do Navegador** (F12):

```javascript
// 1. Gerar arquivo XLSX pequeno de teste
const XLSX = await import('xlsx');
const testData = [{ Nome: 'Teste', Valor: '123' }];
const ws = XLSX.utils.json_to_sheet(testData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Teste');

// 2. Converter para base64
const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
const uint8 = new Uint8Array(buffer);
const chunks = [];
const chunkSize = 0x8000;

for (let i = 0; i < uint8.length; i += chunkSize) {
  const chunk = uint8.subarray(i, i + chunkSize);
  chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
}

const base64 = btoa(chunks.join(''));
console.log('📦 Tamanho do arquivo:', uint8.length, 'bytes');
console.log('📦 Tamanho do base64:', base64.length, 'caracteres');
console.log('✅ Base64 gerado com sucesso!');
```

**Esperado:**
```
📦 Tamanho do arquivo: 4567 bytes
📦 Tamanho do base64: 6090 caracteres
✅ Base64 gerado com sucesso!
```

Se funcionar, o problema não é na conversão!

---

## 📞 PRÓXIMOS PASSOS

### ✅ Se logs mostram status 200/201:
→ **E-mail foi enviado!** Verifique SPAM e e-mail do gestor.

### ❌ Se logs mostram status 400:
→ Execute a query abaixo para ver o erro completo:

```sql
SELECT content::text 
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

Copie a resposta completa e consulte: `/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`

### ⚠️ Se não há logs:
→ O RPC não está sendo chamado. Veja console do navegador.

---

**Desenvolvido para Conecta Cup** 🏁
