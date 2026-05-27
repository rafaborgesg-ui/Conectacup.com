# ⚡ Deploy Rápido - 2 Minutos

## ✅ ERRO DE SINTAXE CORRIGIDO!
O erro de sintaxe na linha 1967 foi corrigido. Agora pode fazer o deploy sem problemas!

## 🎯 Problema
A descrição não aparece em Setor porque a **Edge Function não foi deployada**.

## ✅ Solução em 5 Passos

### 1️⃣ Abrir Dashboard
Clique aqui: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions

### 2️⃣ Encontrar Function
Procure: `make-server-02726c7c`

### 3️⃣ Editar
- Clique nos **3 pontinhos** (⋮)
- Clique em **"Edit Function"**

### 4️⃣ Copiar e Colar
1. Abra o arquivo: `/supabase/functions/server/index.tsx`
2. Selecione TUDO (Ctrl+A)
3. Copie (Ctrl+C)
4. Cole no editor da Supabase (Ctrl+V)
5. Substitua todo o código antigo

### 5️⃣ Deploy
- Clique no botão **"Deploy"** (canto superior direito)
- Aguarde: "Function deployed successfully"

---

## ✅ Verificar

1. Volte para a aplicação
2. Pressione **F5** (recarregar)
3. Vá em: Cadastros → Master Data → Protheus → Setor
4. **PRONTO!** A coluna "Descrição" agora deve mostrar os valores do banco

---

## 📊 Resultado Esperado

**ANTES:**
```
Setor | Descrição | Responsável
------|-----------|-------------
ALM   | -         | RAFAEL BORGES
ATP   | -         | GESSE ALVES
```

**DEPOIS:**
```
Setor | Descrição         | Responsável
------|-------------------|-------------
ALM   | RECURSOS HUMANOS  | RAFAEL BORGES
ATP   | OFICINA           | GESSE ALVES
```

---

## ⏱️ Tempo Total: ~2 minutos

---

## 🆘 Se não funcionar

1. **Limpe o cache:** Ctrl+Shift+R
2. **Veja os logs:** https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions
3. **Procure por:** "Setores carregados: 28 registros"

---

**Conecta Cup** | Deploy Rápido ⚡
