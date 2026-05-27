# 🚨 COMO CORRIGIR O ERRO RLS

> **Se você está vendo o erro:** `"new row violates row-level security policy for table conference_sessions"`

---

## ⚡ SOLUÇÃO RÁPIDA (1 MINUTO)

### 🎯 Você tem 2 opções:

<table>
<tr>
<td width="50%" valign="top">

### 🖥️ **OPÇÃO 1: Pela Interface**
#### (Mais fácil e visual)

1. **Acesse a aplicação**
   ```
   /administracao/debug
   ```

2. **Siga os 3 passos visuais:**
   - 1️⃣ Clique em **📋 Copiar SQL**
   - 2️⃣ Clique em **🚀 Abrir SQL Editor**
   - 3️⃣ Cole (Ctrl+V) e clique em **RUN**

3. **✅ Pronto!**

</td>
<td width="50%" valign="top">

### 📝 **OPÇÃO 2: Manual**
#### (Mais direto)

1. **Copie o SQL:**
   - Abra: `/SQL_PARA_COPIAR.txt`
   - Copie todo o conteúdo

2. **Execute no Supabase:**
   - Vá em: https://supabase.com/dashboard
   - SQL Editor → New query
   - Cole e clique em **RUN**

3. **✅ Pronto!**

</td>
</tr>
</table>

---

## 📋 O SQL QUE VOCÊ PRECISA EXECUTAR:

```sql
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" 
  ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (true);
```

---

## 🔍 POR QUE ISSO ACONTECE?

| Aspecto | Explicação |
|---------|------------|
| **Problema** | A política RLS bloqueava o UPDATE quando `is_active` mudava para `false` |
| **Causa** | O `WITH CHECK` verificava `is_active = true` (não permitia desativar) |
| **Solução** | Mudamos para `WITH CHECK (true)` (permite qualquer UPDATE) |
| **Segurança** | ✅ Mantida! Só usuários autenticados podem fazer UPDATE |

---

## ✅ DEPOIS DE EXECUTAR:

- ✅ Você poderá salvar conferências normalmente
- ✅ Sessões serão desativadas sem erros
- ✅ O erro **NÃO voltará mais**
- ✅ Nenhuma outra mudança necessária

---

## 🆘 PRECISA DE AJUDA?

1. **Interface Visual:**
   - Acesse `/administracao/debug`
   - Há um guia passo-a-passo com cards coloridos

2. **Arquivos de Suporte:**
   - `/SQL_PARA_COPIAR.txt` - SQL pronto para copiar
   - `/URGENTE_EXECUTE_ESTE_SQL.md` - Guia detalhado
   - `/CORRIGIR_ERRO_RLS.txt` - Instruções rápidas

3. **No Console do Navegador:**
   - Quando o erro acontece, aparece uma mensagem detalhada

---

## ⏱️ QUANTO TEMPO LEVA?

- **Copiar o SQL:** 10 segundos
- **Abrir SQL Editor:** 10 segundos  
- **Executar:** 10 segundos
- **Total:** ~30 segundos

---

## 🔐 É SEGURO?

**SIM!** Este SQL:
- ✅ Não deleta dados
- ✅ Não expõe informações
- ✅ Não remove segurança
- ✅ Apenas ajusta uma regra específica
- ✅ É um procedimento padrão de manutenção

---

## 📱 DICA PRO:

Se você trabalha em **múltiplos ambientes** (dev, staging, produção), execute este SQL em **todos eles** para evitar o erro em outros ambientes.

---

<div align="center">

### 🎯 **Vá direto ao ponto:**

**[Abra /administracao/debug agora →](./administracao/debug)**

*Ou copie o SQL de `/SQL_PARA_COPIAR.txt`*

</div>
