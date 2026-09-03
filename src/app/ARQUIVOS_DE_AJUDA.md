# 📚 ARQUIVOS DE AJUDA - ERRO RLS

## 🎯 Qual arquivo usar?

| Arquivo | Quando usar | Formato |
|---------|-------------|---------|
| **`/administracao/debug`** | ✅ **RECOMENDADO** - Interface visual com guia passo-a-passo | Interface Web |
| `/fix-rls.sql` | Quando você quer só o SQL limpo | SQL puro |
| `/SQL_PARA_COPIAR.txt` | Quando você quer copiar rápido | Texto simples |
| `/README_ERRO_RLS.md` | Quando você quer entender o problema | Markdown completo |
| `/URGENTE_EXECUTE_ESTE_SQL.md` | Quando você quer instruções detalhadas | Markdown |
| `/CORRIGIR_ERRO_RLS.txt` | Quando você quer instruções rápidas | Texto simples |
| `/docs/CORRIGIR_ERRO_RLS.md` | Documentação técnica completa | Markdown |

---

## 🚀 RECOMENDAÇÃO:

### Para usuários normais:
👉 **Acesse: `/administracao/debug`**
- Interface visual
- Botões para copiar e abrir SQL Editor
- Guia passo-a-passo
- Instruções em português

### Para desenvolvedores:
👉 **Use: `/fix-rls.sql`**
- SQL limpo
- Pronto para executar
- Sem formatação extra

---

## 📝 CONTEÚDO DO SQL (todos os arquivos tem o mesmo):

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

## ✅ DEPOIS DE EXECUTAR:

O erro **desaparece permanentemente**. Você só precisa executar uma vez.

---

## 🔄 FLUXO RECOMENDADO:

```
1. Veja o erro na aplicação
   ↓
2. Acesse /administracao/debug
   ↓
3. Clique em "📋 Copiar SQL"
   ↓
4. Clique em "🚀 Abrir SQL Editor"
   ↓
5. Cole (Ctrl+V) e execute (RUN)
   ↓
6. ✅ Erro corrigido!
```

---

## 💡 DICA:

Você pode marcar este arquivo ou salvar o link `/administracao/debug` nos favoritos do navegador para acesso rápido no futuro.
