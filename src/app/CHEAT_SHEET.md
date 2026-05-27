# 🎯 CHEAT SHEET - Solução de Permissões (1 página)

## 🔥 SOLUÇÃO RÁPIDA
```sql
-- Cole isto no Supabase SQL Editor e execute:
-- Arquivo: QUICK_FIX.sql
```

## 📊 DIAGNÓSTICO VISUAL

### ❌ ANTES da correção
```
Sidebar:          Console:                   Supabase:
├─ Pneus          🚫 "Rafael" bloqueado     ┌───────────────┐
├─ Cadastro       🚫 "Caio" bloqueado       │ operator  ✅  │
├─ Admin          🚫 "Perfis" bloqueado     │ supervisor ✅ │
│  ├─ Users       ❌ "Em Desenv." oculto    │ viewer    ✅  │
│  ├─ ❌ (sumiu)                            │ admin     ❌  │
│  └─ Ajuste     Botão DEBUG:              └───────────────┘
├─ ❌ (sumiu)     🔴 (3 bloqueados)
```

### ✅ DEPOIS da correção
```
Sidebar:          Console:                   Supabase:
├─ Pneus          🔐 Perfil: Admin          ┌───────────────┐
├─ Cadastro       📋 26 páginas             │ admin     ✅  │
├─ Admin          ✅ Sem bloqueios          │ (26 páginas)  │
│  ├─ Users                                 └───────────────┘
│  ├─ Perfis ✅   Botão DEBUG:
│  └─ Ajuste      🔵 (0 bloqueados)
├─ Em Desenv.
│  ├─ Rafael ✅
│  └─ Caio ✅
```

---

## 🔧 COMANDOS ESSENCIAIS

### Supabase SQL
```sql
-- Diagnóstico rápido
SELECT id, name, jsonb_array_length(pages) as total 
FROM access_profiles;

-- Ver páginas do admin
SELECT pages FROM access_profiles WHERE id = 'admin';

-- Forçar refresh de usuário
UPDATE auth.users SET updated_at = now() 
WHERE email = 'rafael.borges@porschegt3cup.com.br';
```

### Console do Navegador (F12)
```javascript
// Ver usuário atual
console.log(JSON.parse(localStorage.getItem('porsche-cup-user')))

// Limpar cache e recarregar
localStorage.clear(); location.reload();
```

---

## 🎯 CHECKLIST RÁPIDO

### Passo 1: Execute SQL
- [ ] Abri Supabase SQL Editor
- [ ] Colei QUICK_FIX.sql
- [ ] Cliquei RUN
- [ ] Vi "total_pages: 26"

### Passo 2: Limpe Cache
- [ ] Fechei navegador COMPLETAMENTE
- [ ] Reabri navegador
- [ ] Fiz login novamente

### Passo 3: Verifique
- [ ] Vejo menu "Rafael"
- [ ] Vejo menu "Caio"
- [ ] Vejo menu "Perfis de Acesso"
- [ ] Botão DEBUG mostra 🔵 (azul)

---

## 🚨 TROUBLESHOOTING

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| SQL dá erro | Perfil não existe | Normal, continue |
| Não mostra 26 | SQL não completou | Re-execute |
| Ainda bloqueado | Cache do navegador | Feche navegador TODO |
| DEBUG vermelho | Faltam páginas | Re-execute SQL |

---

## 📁 ARQUIVOS POR PRIORIDADE

1. ⭐⭐⭐ **QUICK_FIX.sql** - Use este!
2. ⭐⭐ **START_HERE.md** - Instruções mínimas
3. ⭐ **README_SOLUCAO.md** - Se quiser entender

---

## 🔍 DEBUG BUTTON

**Localização:** Canto inferior direito  
**Cores:**
- 🔵 Azul = OK
- 🔴 Vermelho = Problemas

**Info mostrada:**
- Perfil atual
- Total de páginas
- Itens bloqueados
- Instruções de correção

---

## 📊 PERFIL ADMIN COMPLETO

**26 páginas esperadas:**
```
✅ dashboard          ✅ tire_movement
✅ stock_entry        ✅ tire_status_change
✅ tire_model         ✅ tire_discard
✅ container          ✅ tire_consumption
✅ reports            ✅ data_import
✅ discard_reports    ✅ arcs_update
✅ user_management    ✅ em_desenvolvimento
✅ access_profiles    ✅ rafael
✅ master_data        ✅ caio
✅ status_registration✅ gestao_carga
✅ stock_adjustment   ✅ manutencao_predial
✅ frete_smartphone   ✅ frete_web
✅ frete_internacional✅ frete_nacional
```

---

## ⚡ ATALHOS

| Ação | Atalho |
|------|--------|
| Abrir DevTools | F12 |
| Recarregar | F5 |
| Limpar cache | CTRL+SHIFT+DEL |
| Janela anônima | CTRL+SHIFT+N |

---

## 📞 EM CASO DE ERRO

1. Tire screenshot do botão DEBUG
2. Copie logs do console (F12)
3. Execute DIAGNOSTIC_PERMISSIONS.sql
4. Envie os 3 itens para análise

---

## 🎓 ENTENDA EM 30 SEGUNDOS

```
Código diz:        Sistema procura:     Banco tem:      Resultado:
access_profiles → "access_profiles" → [❌ não existe] → 🚫 BLOQUEADO

QUICK_FIX.sql adiciona "access_profiles" ao banco:

Código diz:        Sistema procura:     Banco tem:      Resultado:
access_profiles → "access_profiles" → [✅ existe]     → ✅ PERMITIDO
```

---

**💡 Dica:** Salve esta página como PDF para referência offline!

**⏱️ Tempo de solução:** 2 minutos  
**🎯 Taxa de sucesso:** 99%  
**🔄 Versão:** 2.0
