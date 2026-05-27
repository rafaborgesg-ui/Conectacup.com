# 🔥 Guia de Troubleshooting - Realtime do Supabase

## 🎯 Problema
Códigos de pneus bipados NÃO aparecem em tempo real em outros dispositivos. É preciso fechar e abrir a página para ver as atualizações.

---

## ✅ PASSO A PASSO PARA RESOLVER

### **PASSO 1: Executar SQL de Diagnóstico**

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor** (barra lateral esquerda)
3. Clique em **New query**
4. Cole TODO o conteúdo do arquivo `/sql/verify-realtime-setup.sql`
5. Clique em **Run** (Ctrl+Enter)

**Resultado esperado:**
```
✅ Tabela existe: SIM
✅ Na publicação Realtime: SIM
✅ RLS habilitado: SIM
✅ Possui políticas: SIM
✅ Configuração parece correta!
```

**Se aparecer erro:**
- ❌ "Na publicação Realtime: NÃO" → Execute o **PASSO 2**
- ⚠️ "RLS está habilitado mas não há políticas" → Execute o **PASSO 3**

---

### **PASSO 2: Configurar Realtime (SE NÃO ESTIVER CONFIGURADO)**

Execute este SQL:

```sql
-- Configurar REPLICA IDENTITY
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;

-- Adicionar à publicação Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_sessions;
```

---

### **PASSO 3: Verificar RLS (Row Level Security)**

Execute este SQL para verificar as políticas:

```sql
SELECT 
  policyname,
  cmd,
  qual
FROM 
  pg_policies
WHERE 
  tablename = 'conference_sessions';
```

**Você DEVE ter pelo menos uma política permitindo SELECT para usuários autenticados.**

Se não houver políticas, crie uma:

```sql
-- Política para permitir SELECT
CREATE POLICY "Usuários autenticados podem ler sessões"
ON conference_sessions
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir UPDATE
CREATE POLICY "Usuários autenticados podem atualizar sessões"
ON conference_sessions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

---

### **PASSO 4: Testar Conexão Realtime**

1. Abra a página "Conferir Pneus"
2. Abra o **DevTools** (F12)
3. Vá na aba **Console**
4. Procure por estas mensagens:

**✅ SUCESSO:**
```
🔥🔥🔥 CONFIGURANDO LISTENER EM TEMPO REAL
   📌 Session ID: abc123...
   📌 Canal: conference-session-abc123
🔥 STATUS DA SUBSCRIPTION REALTIME:
🔥 Status: SUBSCRIBED
✅✅✅ REALTIME CONECTADO COM SUCESSO!
```

**❌ ERRO:**
```
🔥 Status: CHANNEL_ERROR
❌❌❌ ERRO NO CANAL REALTIME: [erro aqui]
```

Se der erro, vá para o **PASSO 5**.

---

### **PASSO 5: Teste Manual de UPDATE**

1. Abra a página "Conferir Pneus" em **2 navegadores/abas diferentes**
2. No **navegador 1**, abra o **DevTools Console** (F12)
3. No **navegador 2**, bipe um código de pneu
4. Volte para o **navegador 1** e veja o console

**Resultado esperado:**
```
🔥🔥🔥 ========================================
🔥 UPDATE RECEBIDO EM TEMPO REAL!
🔥 Timestamp: 2026-02-24T...
🔥 Payload completo: { ... }
🔥 ========================================
```

**Se NÃO aparecer nada:**
- ❌ O Realtime NÃO está funcionando
- Vá para o **PASSO 6**

---

### **PASSO 6: Verificar se o Realtime está HABILITADO no Projeto**

1. Vá no **Supabase Dashboard**
2. Clique em **Project Settings** (ícone de engrenagem)
3. Vá em **API**
4. Role até **Realtime**
5. Verifique se está **ENABLED** (verde)

**Se estiver DISABLED (vermelho):**
- ❌ O Realtime está DESABILITADO no projeto
- Clique em **Enable Realtime**
- Aguarde alguns minutos

---

### **PASSO 7: Verificar Limites do Plano**

O Supabase tem limites de Realtime por plano:

| Plano        | Conexões Simultâneas | Mensagens/segundo |
|--------------|----------------------|-------------------|
| **Free**     | 200                  | 100               |
| **Pro**      | 500                  | 500               |
| **Team**     | Ilimitado            | Ilimitado         |

**Verificar uso:**
1. Supabase Dashboard → **Reports**
2. Vá em **Realtime**
3. Veja **Concurrent Connections** e **Messages**

**Se estiver no limite:**
- ⚠️ Faça upgrade do plano
- OU reduza o número de dispositivos conectados

---

### **PASSO 8: Executar Teste Automatizado**

1. Abra o **DevTools Console** (F12)
2. Cole e execute:

```javascript
import { testRealtimeConnection } from './utils/testRealtime';
testRealtimeConnection();
```

Siga as instruções que aparecerem no console.

---

## 🔍 DIAGNÓSTICO RÁPIDO

### ✅ **Checklist de Verificação**

- [ ] Tabela `conference_sessions` existe?
- [ ] Tabela está na publicação `supabase_realtime`?
- [ ] REPLICA IDENTITY está configurado como FULL?
- [ ] RLS tem políticas de SELECT e UPDATE para `authenticated`?
- [ ] Realtime está ENABLED no projeto?
- [ ] Status da subscription é `SUBSCRIBED`?
- [ ] Console mostra "REALTIME CONECTADO COM SUCESSO!"?

Se **TODOS** estiverem marcados e ainda não funcionar, vá para **PROBLEMAS AVANÇADOS**.

---

## 🚨 PROBLEMAS AVANÇADOS

### **Problema 1: Subscription fica em TIMEOUT**

**Sintoma:**
```
🔥 Status: TIMED_OUT
⏱️⏱️⏱️ TIMEOUT NA CONEXÃO REALTIME
```

**Soluções:**
1. Verifique sua conexão de internet
2. Tente em outra rede (pode ser bloqueio de firewall)
3. Verifique se o Supabase está online: https://status.supabase.com
4. Tente desabilitar VPN/proxy

---

### **Problema 2: Subscription conecta mas UPDATE não chega**

**Sintoma:**
- Status mostra `SUBSCRIBED`
- Mas ao bipar código, nenhum UPDATE é recebido

**Soluções:**

1. Verifique se o campo `progress` está sendo atualizado no banco:
```sql
SELECT id, progress, updated_at 
FROM conference_sessions 
WHERE is_active = true;
```

2. Execute um UPDATE manual para testar:
```sql
UPDATE conference_sessions
SET updated_at = NOW()
WHERE is_active = true;
```

Se o UPDATE manual **FUNCIONAR**, o problema está na função `updateConferenceSessionRealtime`.

Se o UPDATE manual **NÃO FUNCIONAR**, o problema está no Realtime do Supabase.

---

### **Problema 3: Funciona no navegador mas não no coletor**

**Sintoma:**
- Desktop/web funciona perfeitamente
- Coletor 800x480 não sincroniza

**Soluções:**
1. Verifique o console do coletor (se possível)
2. Verifique se o coletor está na mesma rede
3. Tente acessar o Supabase Dashboard do coletor (testar conectividade)
4. Verifique se há bloqueios de firewall no dispositivo

---

### **Problema 4: CHANNEL_ERROR ao conectar**

**Sintoma:**
```
🔥 Status: CHANNEL_ERROR
❌❌❌ ERRO NO CANAL REALTIME
```

**Soluções:**
1. Verifique se a tabela foi adicionada à publicação (PASSO 2)
2. Verifique RLS (PASSO 3)
3. Verifique se o Realtime está habilitado (PASSO 6)
4. Tente recriar a sessão (fazer novo upload de planilha)

---

## 📞 SUPORTE

Se nenhuma solução funcionou:

1. **Copie TODOS os logs do console** (F12 → Console → clique direito → Save as...)
2. **Tire print da tela do Supabase** mostrando:
   - Database → Replication
   - SQL Editor executando `verify-realtime-setup.sql`
3. **Anote**:
   - Plano do Supabase (Free/Pro/Team)
   - Navegador e versão
   - Dispositivo (desktop/mobile/coletor)

---

## 🎯 SOLUÇÃO RÁPIDA (SE ESTIVER COM PRESSA)

Execute este SQL e recarregue a página:

```sql
-- Resetar configuração completa
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;

DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE public.conference_sessions;

-- Recriar políticas
DROP POLICY IF EXISTS "Usuários autenticados podem ler sessões" ON conference_sessions;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões" ON conference_sessions;

CREATE POLICY "Usuários autenticados podem ler sessões"
ON conference_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem atualizar sessões"
ON conference_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

---

## ✅ CONFIRMAÇÃO DE FUNCIONAMENTO

Para confirmar que está tudo funcionando:

1. Abra a página em **2 navegadores diferentes**
2. No navegador 1, abra o console (F12)
3. No navegador 2, bipe um código
4. Veja no console do navegador 1:
   - Deve aparecer "UPDATE RECEBIDO EM TEMPO REAL!"
5. No navegador 1, veja a lista de chassis:
   - O número de pneus conferidos deve atualizar **INSTANTANEAMENTE**
   - O código bipado deve aparecer **SEM RECARREGAR A PÁGINA**

🎉 **Se tudo isso funcionar, o Realtime está 100% operacional!**
