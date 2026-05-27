# 🚀 Quick Start: Adicionar Novos Campeonatos

## ⚡ Guia Rápido para "Endurance 300km" e "Endurance 500km"

Se você acabou de adicionar novos campeonatos e eles não aparecem nas Regras, siga estes 3 passos:

---

## 📋 Passo 1: Execute a Migration de Constraints

### Acesse o Supabase SQL Editor:
```
https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
```

### Copie e execute o SQL:
**Arquivo:** `/docs/migrations/sql/FIX_BUSINESS_RULES_CONSTRAINTS.sql`

**O que faz:** Remove os constraints fixos que só aceitavam "Sprint" e "Endurance"

---

## 📋 Passo 2: Limpe as Regras Antigas

### No mesmo SQL Editor, execute:
**Arquivo:** `/docs/migrations/sql/CLEAN_OLD_BUSINESS_RULES.sql`

**O que faz:** Deleta todas as regras antigas do banco (serão regeneradas automaticamente)

---

## 📋 Passo 3: Regenere as Regras na Interface

1. **Recarregue** a página da aplicação (F5)
2. Vá para **Master Data > Regras**
3. Clique no botão **"Regenerar Regras"** (ícone de refresh)
4. ✅ **Pronto!** As regras serão criadas para TODOS os campeonatos

---

## ✅ Resultado Esperado

Você verá as regras para:
- Carrera + Sprint
- Carrera + Endurance
- Carrera + Endurance 300km ⭐ **NOVO**
- Carrera + Endurance 500km ⭐ **NOVO**
- Challenge + Sprint
- Challenge + Endurance
- Challenge + Endurance 300km ⭐ **NOVO**
- Challenge + Endurance 500km ⭐ **NOVO**
- Trophy + Sprint
- Trophy + Endurance 300km ⭐ **NOVO**
- Trophy + Endurance 500km ⭐ **NOVO**

---

## 🔧 Ajustar as Quantidades

Depois de regenerar:
1. Clique em **"Editar Regras"**
2. Ajuste as quantidades conforme necessário
3. Clique em **"Salvar Regras"**
4. ✅ Tudo pronto!

---

## 🆘 Problemas?

### "Erro ao salvar regras"
- Certifique-se de executar AMBOS os SQLs (Passo 1 e 2)
- Recarregue a página completamente (Ctrl+Shift+R)

### "Não vejo o botão Regenerar Regras"
- Recarregue a página
- Verifique se está na aba "Regras"

### "As regras ainda não aparecem"
- Verifique se os campeonatos estão cadastrados em Master Data > Campeonatos
- Tente clicar novamente em "Regenerar Regras"

---

## 📚 Documentação Completa

Para mais detalhes técnicos, consulte:
`/docs/BUSINESS_RULES_CONSTRAINTS_FIX.md`

---

**Tempo estimado:** 2-3 minutos ⏱️

**Criado em:** 2024
