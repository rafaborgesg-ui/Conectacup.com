# 🧪 TESTE DE REALTIME - PASSO A PASSO

## 🎯 Objetivo
Verificar se a sincronização em tempo real está funcionando entre diferentes dispositivos.

---

## ✅ PRÉ-REQUISITOS

Antes de começar, CERTIFIQUE-SE de ter executado:

1. ✅ SQL de configuração do Realtime:
```sql
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_sessions;
```

2. ✅ Verificação de que a tabela está na publicação:
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'conference_sessions';
```
**Deve retornar 1 linha!**

---

## 📱 TESTE 1: BOTÃO "TESTAR REALTIME" (Mais Fácil)

### Passo 1: Preparar 2 Navegadores

1. Abra a aplicação em **2 navegadores DIFERENTES** (ou 2 abas anônimas)
   - Navegador 1: Chrome
   - Navegador 2: Firefox/Edge/Safari
   
2. Faça login nos 2 navegadores

3. Carregue uma planilha no **Navegador 1**
   - Vá em "Conferir Pneus"
   - Faça upload de uma planilha
   - Selecione a etapa
   - Clique em "Avançar"

### Passo 2: Verificar Conexão no Console

1. No **Navegador 1**, abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por estas mensagens:
```
🔥🔥🔥 CONFIGURANDO LISTENER EM TEMPO REAL
   📌 Session ID: abc123...
   📌 Canal: conference-session-abc123
🔥 STATUS DA SUBSCRIPTION REALTIME:
🔥 Status: SUBSCRIBED
✅✅✅ REALTIME CONECTADO COM SUCESSO!
```

4. Se aparecer **"SUBSCRIBED"**, prossiga para o Passo 3
5. Se aparecer **ERRO**, consulte `/docs/REALTIME-TROUBLESHOOTING.md`

### Passo 3: Teste Manual com o Botão

1. No **Navegador 1**, clique no botão **"Testar Realtime"** (ícone de raio azul)
   - Aparecerá uma notificação: "🧪 Teste enviado!"

2. No **Navegador 1**, veja o console:
```
🧪🧪🧪 ========================================
🧪 TESTE MANUAL DE REALTIME INICIADO
🧪 Session ID: abc123...
🧪 ========================================
📡📡📡 ========================================
📡 ENVIANDO UPDATE PARA SUPABASE
📡 Session ID: abc123...
📡 Timestamp: 2026-02-24T...
📡 ========================================
✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!
```

3. No **Navegador 2** (ou aba 2), abra o DevTools (F12) e veja o console:
```
🔥🔥🔥 ========================================
🔥 UPDATE RECEBIDO EM TEMPO REAL!
🔥 Timestamp: 2026-02-24T...
🔥 Payload completo: { ... }
🔥 ========================================
```

### ✅ RESULTADO ESPERADO:

- ✅ Navegador 1: mostra "UPDATE enviado"
- ✅ Navegador 2: mostra "UPDATE RECEBIDO EM TEMPO REAL!"
- ✅ **DIFERENÇA DE TEMPO**: menos de 1 segundo

### ❌ SE NÃO FUNCIONAR:

- ❌ Navegador 2 NÃO mostrou nada → **Realtime NÃO está funcionando**
- ⏱️ Demorou mais de 3 segundos → **Conexão lenta ou instável**
- Vá para `/docs/REALTIME-TROUBLESHOOTING.md`

---

## 📱 TESTE 2: BIPAR CÓDIGO DE PNEU (Teste Real)

### Passo 1: Preparar Conferência

1. No **Navegador 1**:
   - Abra um chassis para conferência
   - Veja a lista de pneus (4 posições vazias)

2. No **Navegador 2**:
   - Atualize a página (F5)
   - Veja a mesma lista de chassis
   - **NÃO abra nenhum chassis ainda**

### Passo 2: Abrir Console nos 2 Navegadores

1. **Navegador 1**: F12 → Console (DEIXE ABERTO)
2. **Navegador 2**: F12 → Console (DEIXE ABERTO)

### Passo 3: Bipar Código

1. No **Navegador 1**:
   - Clique no primeiro campo de código (Jogo 1, Posição DE)
   - Digite um código qualquer: `ABC123`
   - Pressione ENTER

2. No **Console do Navegador 1**, você deve ver:
```
📡📡📡 ========================================
📡 ENVIANDO UPDATE PARA SUPABASE
📡 Session ID: abc123...
📡 Chassis Index: 0
📡 Timestamp: 2026-02-24T...
📡 ========================================
✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!
   💡 Outros dispositivos devem receber UPDATE em tempo real
```

3. No **Console do Navegador 2**, você deve ver IMEDIATAMENTE:
```
🔥🔥🔥 ========================================
🔥 UPDATE RECEBIDO EM TEMPO REAL!
🔥 Timestamp: 2026-02-24T...
🔥 Dados atualizados: { progress: {...}, excel_data: [...] }
🔥 ========================================
```

### Passo 4: Verificar Sincronização na Interface

1. No **Navegador 2**:
   - Olhe para a lista de chassis
   - O contador de "pneus conferidos" deve MUDAR de `0/16` para `1/16`
   - **SEM PRECISAR RECARREGAR A PÁGINA!**

2. No **Navegador 2**:
   - Abra o mesmo chassis
   - Você deve VER o código `ABC123` no primeiro campo
   - **SEM PRECISAR RECARREGAR!**

### ✅ RESULTADO ESPERADO:

- ✅ Código aparece INSTANTANEAMENTE no Navegador 2
- ✅ Contador de pneus atualiza AUTOMATICAMENTE
- ✅ Tempo de sincronização: menos de 1 segundo

### ❌ SE NÃO FUNCIONAR:

- ❌ Console do Navegador 2 NÃO mostra "UPDATE RECEBIDO"
  - → O Realtime NÃO está funcionando
  - → Execute `/sql/verify-realtime-setup.sql` novamente
  
- ⚠️ Console mostra UPDATE mas interface não atualiza
  - → Problema no código de atualização local
  - → Verifique se `extractedData` está sendo atualizado
  
- ⏱️ Demora mais de 3 segundos
  - → Conexão instável
  - → Verifique rede e latência do Supabase

---

## 📱 TESTE 3: MÚLTIPLOS DISPOSITIVOS (Teste de Carga)

### Passo 1: Preparar 3+ Dispositivos

1. Desktop (Chrome)
2. Desktop (Firefox)
3. Mobile (navegador mobile)
4. Coletor 800x480 (se disponível)

### Passo 2: Abrir Console em TODOS

- Todos devem mostrar:
```
🔥 STATUS DA SUBSCRIPTION REALTIME:
🔥 Status: SUBSCRIBED
✅✅✅ REALTIME CONECTADO COM SUCESSO!
```

### Passo 3: Bipar em Diferentes Dispositivos

1. **Dispositivo 1**: Bipa código no Jogo 1, posição DE
2. **Dispositivo 2**: Bipa código no Jogo 1, posição DD
3. **Dispositivo 3**: Bipa código no Jogo 1, posição TE

### Passo 4: Verificar Sincronização Cruzada

- **TODOS os dispositivos** devem mostrar os 3 códigos
- **SEM conflitos** (códigos não devem sumir ou trocar de posição)
- Tempo de sincronização: menos de 2 segundos

### ✅ RESULTADO ESPERADO:

- ✅ Todos veem os mesmos dados
- ✅ Códigos permanecem nas posições corretas
- ✅ Nenhum código é sobrescrito ou apagado

### ❌ SE HOUVER CONFLITOS:

- ❌ Códigos trocando de posição → Bug no `_originalIndex`
- ❌ Códigos sumindo → Bug na mesclagem de dados
- ❌ Códigos duplicados → Bug na restauração
- Abra issue detalhando o problema

---

## 📊 TESTE 4: VERIFICAÇÃO SQL DIRETA

### Passo 1: Consultar Sessão Ativa

No Supabase SQL Editor, execute:

```sql
SELECT 
  id,
  season_name,
  etapa_name,
  file_name,
  is_active,
  updated_at,
  progress
FROM conference_sessions
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

### Passo 2: Bipar um Código

1. No navegador, bipe um código qualquer
2. Anote o horário exato (segundos)

### Passo 3: Re-executar SQL

Execute o mesmo SELECT novamente

### ✅ RESULTADO ESPERADO:

- ✅ Campo `updated_at` deve ter mudado
- ✅ Campo `progress` deve conter o código bipado
- ✅ Formato do `progress`:
```json
{
  "0": {
    "tireSets": [
      {
        "jogo": 1,
        "label": "Jogo 1",
        "montadoNoCarro": false,
        "tires": [
          {
            "posicao": "DE",
            "codigo": "ABC123",
            "piloto": "...",
            ...
          }
        ]
      }
    ],
    "tiresChecked": 1,
    "completed": false,
    "lockedBy": "user-id-here",
    "lockedAt": "2026-02-24T..."
  }
}
```

---

## 🎯 CHECKLIST FINAL

Antes de considerar o Realtime funcionando, TODOS devem estar ✅:

- [ ] SQL de configuração executado sem erros
- [ ] Tabela `conference_sessions` está na publicação `supabase_realtime`
- [ ] Console mostra "SUBSCRIBED" ao abrir a página
- [ ] Botão "Testar Realtime" envia e recebe UPDATE
- [ ] Bipar código sincroniza em menos de 1 segundo
- [ ] Interface atualiza automaticamente (sem F5)
- [ ] Múltiplos dispositivos sincronizam sem conflitos
- [ ] SQL mostra `progress` atualizado corretamente
- [ ] Nenhum código some ou troca de posição
- [ ] Funciona em desktop, mobile e coletor

---

## 📞 SE AINDA NÃO FUNCIONAR

1. Copie TODOS os logs do console de ambos os navegadores
2. Tire print da saída do `/sql/verify-realtime-setup.sql`
3. Execute este SQL e copie o resultado:
```sql
SELECT 
  name, setting 
FROM pg_settings 
WHERE name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');
```
4. Anote o plano do Supabase (Free/Pro/Team)
5. Abra uma issue com todas essas informações

---

## ✅ CONFIRMAÇÃO DE SUCESSO

**O Realtime está funcionando PERFEITAMENTE se:**

1. Você bipa `ABC123` no navegador Chrome
2. **INSTANTANEAMENTE** (menos de 1 segundo):
   - Firefox mostra `ABC123` no mesmo campo
   - Mobile mostra `ABC123` no mesmo campo
   - Coletor mostra `ABC123` no mesmo campo
   - Contador atualiza de `0/16` para `1/16` em todos
3. **SEM PRECISAR** apertar F5 em nenhum dispositivo

🎉 **SE ISSO ACONTECER, PARABÉNS! O REALTIME ESTÁ 100% FUNCIONAL!**
