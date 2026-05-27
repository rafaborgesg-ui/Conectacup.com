# 📧 Sistema de Envio de Planilha de Avarias - README

## ⚡ INÍCIO RÁPIDO (3 minutos)

### 🔥 E-mail não chegou? 

👉 **[SIGA ESTES 3 PASSOS](/docs/INICIO_RAPIDO_3_PASSOS.md)** 👈

**Resumo:**
1. Execute: `/supabase/migrations/diagnostico_completo.sql`
2. Corrija o que estiver com ❌
3. Faça o teste manual

---

## 📚 Documentação Disponível

### 🚀 **Para Instalar e Configurar:**
📄 [`/docs/GUIA_DEFINITIVO_ENVIO_PLANILHA.md`](/docs/GUIA_DEFINITIVO_ENVIO_PLANILHA.md)
- Passo a passo completo de instalação
- Correção de todos os problemas comuns
- Teste manual
- Verificação de funcionamento

### 🔍 **Para Diagnosticar Problemas:**
📄 [`/docs/SOLUCAO_EMAIL_NAO_CHEGOU.md`](/docs/SOLUCAO_EMAIL_NAO_CHEGOU.md)
- Diagnóstico rápido (3 minutos)
- Interpretação de erros
- Soluções imediatas

### 🐛 **Para Debug Avançado:**
📄 [`/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`](/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md)
- Análise detalhada de logs
- Consultas SQL úteis
- Troubleshooting completo

### 📖 **Manual de Uso:**
📄 [`/docs/GUIA_ENVIO_PLANILHA_AVARIAS.md`](/docs/GUIA_ENVIO_PLANILHA_AVARIAS.md)
- Como usar o sistema
- Formato da planilha
- Regras de negócio

---

## 🗂️ Arquivos SQL

### 🔧 **Para Instalar:**

1. **Função Base** (executar PRIMEIRO):
   ```
   /supabase/migrations/install_resend_notifications.sql
   ```
   ⚠️ Cole sua API Key do Resend na linha 16

2. **Função de Planilha** (executar DEPOIS):
   ```
   /supabase/migrations/send_wheel_damage_report_email.sql
   ```
   ⚠️ Cole sua API Key do Resend na linha 13

### 🧪 **Para Testar:**

- **Diagnóstico Completo** (recomendado):
  ```
  /supabase/migrations/diagnostico_completo.sql
  ```
  Executa todos os testes de uma vez!

- **Testes Individuais**:
  ```
  /supabase/migrations/teste_rapido_email.sql
  ```
  Passo a passo com explicações

---

## ⚡ Instalação em 5 Passos

### 1️⃣ Criar API Key no Resend
- Acesse: https://resend.com/api-keys
- Crie uma chave com permissão "Sending access"
- Copie a chave (começa com `re_...`)

### 2️⃣ Instalar Funções Base
Execute no SQL Editor do Supabase:
```
/supabase/migrations/install_resend_notifications.sql
```
⚠️ Cole sua API Key na linha 16!

### 3️⃣ Instalar Função de Planilha
Execute no SQL Editor do Supabase:
```
/supabase/migrations/send_wheel_damage_report_email.sql
```
⚠️ Cole sua API Key na linha 13!

### 4️⃣ Definir Gestor
Acesse: `/configuracoes-notificacoes`
Clique em "Definir como Gestor" em um usuário

### 5️⃣ Testar
Execute o diagnóstico:
```
/supabase/migrations/diagnostico_completo.sql
```

---

## ✅ Checklist de Verificação

- [ ] API Key do Resend criada
- [ ] Função `send_email_via_resend` instalada
- [ ] Função `send_wheel_damage_report_email` instalada
- [ ] API Key configurada em ambas as funções
- [ ] Extensão `pg_net` habilitada
- [ ] Gestor de avarias definido
- [ ] Diagnóstico completo executado
- [ ] Teste manual enviado e recebido

---

## 🚨 Problemas Comuns

### ❌ E-mail não chega
**Solução:** Verifique SPAM! Muitas vezes vai para lá.

### ❌ Status 401 (Unauthorized)
**Solução:** API Key incorreta. Crie uma nova no Resend.

### ❌ "Função não existe"
**Solução:** Execute os SQLs de instalação.

### ❌ "Nenhum gestor definido"
**Solução:** Acesse `/configuracoes-notificacoes` e defina um.

---

## 📊 Como Funciona

```
┌─────────────────┐
│   Dashboard     │
│  (Frontend)     │
└────────┬────────┘
         │
         │ 1. Busca avarias
         │ 2. Gera XLSX
         │ 3. Converte base64
         │
         ▼
┌─────────────────┐
│   Supabase RPC  │
│  (PostgreSQL)   │
└────────┬────────┘
         │
         │ 4. Busca gestor
         │ 5. Monta e-mail HTML
         │ 6. Envia via pg_net
         │
         ▼
┌─────────────────┐
│  Resend API     │
│  (E-mail)       │
└────────┬────────┘
         │
         │ 7. Envia e-mail
         │    com anexo XLSX
         │
         ▼
┌─────────────────┐
│ Caixa de Entrada│
│   (Destinatário)│
└─────────────────┘
```

---

## 🎯 Recursos

- ✅ Geração de planilha XLSX no frontend
- ✅ Envio via função PostgreSQL (sem Edge Function)
- ✅ E-mail HTML responsivo
- ✅ Anexo Excel com todas as avarias
- ✅ Gestor recebe automaticamente
- ✅ Destinatários extras opcionais
- ✅ Uma linha por foto na planilha
- ✅ Apenas avarias aprovadas

---

## 📞 Suporte

**Problema com instalação?**
→ [`/docs/GUIA_DEFINITIVO_ENVIO_PLANILHA.md`](/docs/GUIA_DEFINITIVO_ENVIO_PLANILHA.md)

**E-mail não chegou?**
→ [`/docs/SOLUCAO_EMAIL_NAO_CHEGOU.md`](/docs/SOLUCAO_EMAIL_NAO_CHEGOU.md)

**Erro no console?**
→ [`/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`](/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md)

**Dúvida sobre uso?**
→ [`/docs/GUIA_ENVIO_PLANILHA_AVARIAS.md`](/docs/GUIA_ENVIO_PLANILHA_AVARIAS.md)

---

## 🏆 Versão

**v1.0** - Sistema completo funcionando com:
- Função PostgreSQL (sem Edge Function)
- Biblioteca `xlsx` para geração de XLSX
- Envio via `pg_net` + Resend
- E-mail HTML profissional
- Anexo em base64

---

**Desenvolvido para Conecta Cup** 🏁  
Sistema de Gestão de Avarias de Rodas