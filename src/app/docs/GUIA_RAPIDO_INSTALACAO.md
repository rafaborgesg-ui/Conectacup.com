# ⚡ GUIA RÁPIDO - INSTALAÇÃO EM 5 MINUTOS

**Você já tem a chave do Resend copiada!** Agora são só 3 passos! 🚀

---

## 📋 CHECKLIST

- [x] ✅ Conta Resend criada
- [x] ✅ API Key copiada
- [ ] ⬜ SQL 1 executado (Funções de Interface)
- [ ] ⬜ SQL 2 executado (Sistema de Notificações)
- [ ] ⬜ Gestor definido
- [ ] ⬜ Testado!

---

## 🎯 PASSO 1: Executar SQL das Funções (1 min)

### No Supabase:

1. **SQL Editor** → **New query**
2. **Copie este arquivo:** `/supabase/migrations/install_interface_functions.sql`
3. **Cole no editor**
4. **Clique em RUN** ▶️
5. ✅ **Deve aparecer:** 3 funções instaladas

---

## 🎯 PASSO 2: Executar SQL do Resend (2 min)

### No Supabase:

1. **SQL Editor** → **New query**
2. **Copie este arquivo:** `/supabase/migrations/install_resend_notifications.sql`
3. **ANTES DE COLAR:**
   - **Linha 16:** Cole sua API Key do Resend (a que você copiou)
   - **Linha 53:** Já está `https://www.conectacup.com` ✅
4. **Cole no editor**
5. **Clique em RUN** ▶️
6. ✅ **Deve aparecer:** Funções + Trigger instalados

---

## 🎯 PASSO 3: Definir Gestor (30 segundos)

### Na interface web:

1. **Acesse:** https://www.conectacup.com/configuracoes-notificacoes
2. **Escolha o usuário** que vai receber os e-mails
3. **Clique:** "Definir como Gestor"
4. ✅ **Vai aparecer:** Card verde confirmando

---

## 🧪 TESTAR (1 min)

1. **Vá em:** Avarias de Rodas
2. **Clique:** Nova Avaria
3. **Preencha** e salve
4. **Aguarde 10-30 segundos**
5. **Confira o e-mail!** 📧

---

## ❌ NÃO FUNCIONOU?

### Checklist de Verificação:

```sql
-- 1. Verificar se as funções estão instaladas
SELECT proname FROM pg_proc 
WHERE proname IN (
  'get_all_users_with_manager_flag',
  'set_wheel_damage_manager',
  'send_email_via_resend',
  'notify_wheel_damage_manager'
);
-- Deve retornar 4 linhas

-- 2. Verificar se o trigger está ativo
SELECT tgname FROM pg_trigger 
WHERE tgname = 'trigger_notify_wheel_damage_manager';
-- Deve retornar 1 linha

-- 3. Verificar se há um gestor definido
SELECT email FROM auth.users 
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
-- Deve retornar 1 e-mail
```

### Teste Manual de E-mail:

```sql
-- Trocar 'seu-email@teste.com' pelo seu e-mail real
SELECT send_email_via_resend(
  'seu-email@teste.com',
  'Teste Conecta Cup',
  '<h1 style="color: #DC2626;">Teste do Sistema</h1><p>Se você recebeu este e-mail, o Resend está funcionando!</p>'
);
```

---

## 📱 Precisa de Ajuda?

1. **Verifique o SQL Editor** do Supabase
2. **Confira a aba "Logs"** do Supabase
3. **Revise** se a API Key foi colada corretamente
4. **Confirme** que existe pelo menos 1 usuário cadastrado

---

## 🎉 TUDO PRONTO!

Agora o sistema vai enviar e-mails automaticamente sempre que uma nova avaria for cadastrada! 🚀

**E-mail chegou?** Parabéns! Sistema 100% funcional! 💪
