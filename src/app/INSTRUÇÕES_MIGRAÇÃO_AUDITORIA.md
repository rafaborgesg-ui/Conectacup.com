# 🔥 INSTRUÇÕES - Migração de Auditoria em Tempo Real

## 📋 O QUE FOI IMPLEMENTADO

Sistema completo de **auto-salvamento em tempo real no Supabase** com **auditoria completa** de todas as bipagens e alterações.

### ✅ **Funcionalidades Implementadas:**

1. **Auto-salvamento após cada bipagem** → Salva instantaneamente no Supabase
2. **Registro de usuário + data/hora** → Cada ação registra quem fez e quando
3. **Registro de limpeza de código** → Quando alguém apaga um código, fica registrado
4. **Histórico completo** → Tabela `tire_scan_history` com todas as ações
5. **Sincronização em tempo real** → Atualiza `conference_sessions` automaticamente
6. **Sem localStorage** → 100% Supabase

---

## 🗄️ MIGRAÇÕES SQL NECESSÁRIAS

Execute as seguintes migrações no Supabase na ordem indicada:

### **1️⃣ Adicionar Campos de Auditoria**

**Arquivo:** `/supabase/migrations/ADD_AUDIT_FIELDS_TO_CONFERENCE_SESSIONS.sql`

**O que faz:**
- Adiciona `updated_at` (data/hora da última alteração)
- Adiciona `updated_by` (UUID do usuário que fez a última alteração)
- Cria trigger para atualizar `updated_at` automaticamente

**Como executar:**
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo
4. Clique em **RUN**

---

### **2️⃣ Criar Tabela de Histórico de Bipagens**

**Arquivo:** `/supabase/migrations/CREATE_TIRE_SCAN_HISTORY_TABLE.sql`

**O que faz:**
- Cria tabela `tire_scan_history`
- Armazena CADA bipagem individual com auditoria completa
- Registra ações: `BIPAR` (adicionar código) ou `LIMPAR` (apagar código)

**Estrutura da tabela:**
```sql
tire_scan_history:
  - id (UUID, primary key)
  - session_id (UUID, referencia conference_sessions)
  - chassis (TEXT)
  - jogo (INT, 1-4)
  - posicao (TEXT, DD/DE/TD/TE)
  - tire_code (TEXT, null quando limpar)
  - action (TEXT, 'BIPAR' ou 'LIMPAR')
  - user_id (UUID)
  - user_name (TEXT)
  - tire_data (JSONB, dados completos do pneu)
  - created_at (TIMESTAMPTZ)
```

**Como executar:**
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo
4. Clique em **RUN**

---

## 🔍 COMO FUNCIONA O SISTEMA

### **Fluxo ao Bipar um Código:**

```
1. Usuário bipa código no coletor
   ↓
2. Código é salvo no estado local (tireSets)
   ↓
3. 🔥 NOVO: Função saveToSupabaseRealtime() é chamada
   ↓
4. Registra na tabela tire_scan_history:
   - session_id
   - chassis (ex: 701)
   - jogo (ex: 1)
   - posicao (ex: DD)
   - tire_code (ex: 12345678)
   - action: 'BIPAR'
   - user_id (UUID do usuário)
   - user_name (nome completo)
   - tire_data (JSON com todos os dados do pneu)
   - created_at (timestamp exato)
   ↓
5. Atualiza conference_sessions:
   - excel_data (com novo código)
   - updated_at (timestamp)
   - updated_by (UUID do usuário)
```

### **Fluxo ao Limpar um Código:**

```
1. Usuário clica no X para limpar código
   ↓
2. Confirmação: "Tem certeza?"
   ↓
3. Código é limpo no estado local (tireSets)
   ↓
4. 🔥 NOVO: Função saveToSupabaseRealtime() é chamada
   ↓
5. Registra na tabela tire_scan_history:
   - action: 'LIMPAR'
   - tire_code: '' (vazio)
   - user_id, user_name, created_at
   ↓
6. Atualiza conference_sessions
```

---

## 📊 CONSULTAS ÚTEIS

### **Ver todas as bipagens de um chassis:**

```sql
SELECT 
  created_at,
  user_name,
  action,
  jogo,
  posicao,
  tire_code,
  tire_data->>'piloto' as piloto,
  tire_data->>'tipo' as tipo
FROM tire_scan_history
WHERE chassis = '701'
ORDER BY created_at DESC;
```

### **Ver quem limpou códigos:**

```sql
SELECT 
  created_at,
  user_name,
  chassis,
  jogo,
  posicao,
  tire_code
FROM tire_scan_history
WHERE action = 'LIMPAR'
ORDER BY created_at DESC;
```

### **Ver histórico completo de uma sessão:**

```sql
SELECT 
  h.created_at,
  h.user_name,
  h.action,
  h.chassis,
  h.jogo,
  h.posicao,
  h.tire_code,
  s.season_name,
  s.etapa_name
FROM tire_scan_history h
JOIN conference_sessions s ON h.session_id = s.id
WHERE h.session_id = 'UUID_DA_SESSAO'
ORDER BY h.created_at ASC;
```

### **Ver última alteração de cada chassis:**

```sql
SELECT DISTINCT ON (chassis)
  chassis,
  user_name as ultimo_usuario,
  created_at as ultima_alteracao,
  action as ultima_acao
FROM tire_scan_history
ORDER BY chassis, created_at DESC;
```

---

## 🎯 CÓDIGO IMPLEMENTADO

### **Função Principal: `saveToSupabaseRealtime()`**

Localização: `/pages/ConferirPneus.tsx` (linha ~2840)

**Parâmetros:**
- `chassisNumber` - Número do chassis (ex: "701")
- `jogoNumber` - Número do jogo (1-4)
- `positionIndex` - Índice da posição (0-3)
- `tireCode` - Código do pneu (ou vazio se limpar)
- `action` - Tipo de ação: `'BIPAR'` ou `'LIMPAR'`
- `tireData` - Objeto completo com todos os dados do pneu

**O que faz:**
1. Valida se tem sessão ativa e usuário
2. Insere registro na tabela `tire_scan_history`
3. Atualiza `excel_data` na tabela `conference_sessions`
4. Registra `updated_at` e `updated_by`

### **Integrações:**

1. **handleTireCodeSubmit** (linha ~2958)
   - Chama `saveToSupabaseRealtime()` após bipar código com sucesso
   - Para pneus cadastrados E não cadastrados

2. **handleClearTireCode** (linha ~2584)
   - Chama `saveToSupabaseRealtime()` após limpar código
   - Registra action: `'LIMPAR'`

---

## 🔒 SEGURANÇA

### **Row Level Security (RLS):**

✅ **tire_scan_history:**
- Usuários autenticados podem visualizar todo o histórico
- Usuários autenticados podem inserir registros
- Ninguém pode deletar registros (auditoria permanente)

✅ **conference_sessions:**
- RLS já existente mantido
- Campos `updated_by` rastreiam alterações

---

## ✅ CHECKLIST DE TESTES

Após executar as migrações, teste:

- [ ] Bipar um código → Verificar se aparece em `tire_scan_history`
- [ ] Verificar se `user_name` está correto
- [ ] Verificar se `created_at` está correto
- [ ] Limpar um código → Verificar se action='LIMPAR' aparece
- [ ] Verificar se `conference_sessions.updated_at` é atualizado
- [ ] Verificar se `conference_sessions.updated_by` é atualizado
- [ ] Fazer bipagem com usuário A e verificar auditoria
- [ ] Fazer bipagem com usuário B e verificar auditoria diferente
- [ ] Consultar histórico completo de um chassis
- [ ] Consultar quem limpou códigos

---

## 📝 LOGS E DEBUGGING

No console do navegador, procure por:

```
💾 Salvando no Supabase (tempo real)...
✅ Histórico de bipagem salvo no Supabase!
✅ Sessão atualizada no Supabase com sucesso!
```

Se aparecer erro:
```
❌ Erro ao salvar histórico de bipagem:
```

Verifique:
1. Tabela `tire_scan_history` foi criada?
2. Campos `updated_at` e `updated_by` existem em `conference_sessions`?
3. RLS está habilitado e policies criadas?
4. Usuário está autenticado?

---

## 🚀 BENEFÍCIOS

✅ **Auditoria completa** - Sabe exatamente quem fez o quê e quando  
✅ **Rastreabilidade** - Histórico permanente de todas as ações  
✅ **Sem perda de dados** - Salvamento em tempo real no Supabase  
✅ **Transparência** - Todos veem as mesmas informações  
✅ **Segurança** - Impossível deletar registros de auditoria  
✅ **Conformidade** - Atende requisitos de auditoria e compliance  

---

## 📞 SUPORTE

Se tiver dúvidas ou problemas:

1. Verifique os logs no console do navegador
2. Verifique se as migrações foram executadas corretamente
3. Consulte a tabela `tire_scan_history` para ver se os dados estão sendo salvos
4. Verifique as policies RLS no Supabase Dashboard

---

**Documentação criada em:** 24/02/2026  
**Versão do sistema:** Conecta Cup - Auto-salvamento v2.0
