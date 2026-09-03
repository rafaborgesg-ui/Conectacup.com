# 🚀 SOLUÇÃO SIMPLIFICADA - APENAS RESEND (SEM MAKE.COM)

**Tempo total:** 5 minutos  
**Custo:** Gratuito (3.000 e-mails/mês)  
**Sem instalar nada! Tudo via SQL!**

---

## ✅ PASSO 1: Criar Conta Resend (2 min)

1. **Acesse:** https://resend.com/signup
2. **Preencha:**
   - E-mail
   - Senha
3. **Verifique seu e-mail** e confirme
4. **Login:** https://resend.com/login

---

## ✅ PASSO 2: Criar API Key (1 min)

1. No dashboard, clique em **"API Keys"** no menu lateral
2. Clique em **"Create API Key"**
3. **Name:** `Conecta Cup - Notificações`
4. **Permission:** Selecione **"Sending access"**
5. Clique em **"Add"**
6. **🔥 COPIE A CHAVE!** (começa com `re_...`)
   - Exemplo: `re_123abc456def789ghi`
   - Guarde em local seguro - só aparece uma vez!

---

## ✅ PASSO 3: Configurar Domínio de Envio (2 min)

### Opção A: Usar domínio do Resend (MAIS RÁPIDO - Recomendado para teste)

1. No Resend, vá em **"Domains"**
2. Use o domínio padrão deles: **`onboarding@resend.dev`**
3. ✅ **Pronto!** Já funciona para testes!

### Opção B: Usar seu próprio domínio (Opcional)

1. No Resend, clique em **"Add Domain"**
2. Digite: `conectacup.com` (ou seu domínio)
3. Siga as instruções para adicionar registros DNS
4. Aguarde verificação (pode levar até 24h)

**💡 Recomendação:** Use Opção A primeiro para testar! Depois adiciona seu domínio.

---

## ✅ PASSO 4: Instalar Funções SQL no Supabase (2 min)

### 4.1 Funções de Interface (EXECUTAR PRIMEIRO)

Estas funções permitem que a interface web funcione:

1. Acesse seu projeto Supabase
2. Vá em **"SQL Editor"**
3. Clique em **"New query"**
4. **Cole e execute:** `/supabase/migrations/install_interface_functions.sql`

✅ **Deve mostrar:** 3 funções instaladas

---

### 4.2 Sistema de Notificações (EXECUTAR DEPOIS)

Este SQL configura o envio de e-mails via Resend:

1. No SQL Editor, **"New query"**
2. **Cole e execute:** `/supabase/migrations/install_resend_notifications.sql`

**🔥 ANTES DE EXECUTAR - Substitua 2 coisas:**
- **Linha 16:** Cole sua API Key do Resend (começa com `re_...`)
- **Linha 53:** Cole `https://www.conectacup.com`

✅ **Deve mostrar:** Funções criadas + Trigger ativo

---

## ✅ PASSO 5: Definir Gestor (1 min)

### Opção A: Pela Interface Web (RECOMENDADO) 🖥️

1. Acesse: **https://www.conectacup.com/configuracoes-notificacoes**
2. Ou navegue: **Menu** → **Configurações** → **Notificações de Avarias**
3. Selecione o usuário que receberá os e-mails
4. Clique em **"Definir como Gestor"**
5. ✅ Pronto! Vai aparecer um card verde confirmando

---

### Opção B: Via SQL (Alternativa)

Execute este SQL para definir quem receberá os e-mails:

```sql
-- Ver usuários disponíveis
SELECT id, email FROM auth.users;

-- Copie o UUID do gestor e execute:
SELECT set_wheel_damage_manager('UUID-DO-USUARIO-AQUI', true);

-- Verificar
SELECT email 
FROM auth.users 
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

---

## ✅ PASSO 6: TESTAR! 🧪

1. **Cadastre uma avaria de teste:**
   - Vá em **Avarias de Rodas**
   - Clique em **"Nova Avaria"**
   - Preencha todos os campos obrigatórios
   - Salve

2. **Aguarde 10-30 segundos**

3. **Verifique o e-mail do gestor!** 📧
   - Deve chegar um e-mail bonito e profissional
   - Assunto: **"🚨 Nova Avaria de Roda - [CÓDIGO]"**
   - Se não chegar, verifique **SPAM**

---

## 🐛 Problemas? Ver Logs

```sql
-- Ver se a função foi chamada (procure por NOTICE no log)
-- Dashboard do Supabase → Logs → Postgres Logs

-- Testar envio manual
SELECT send_email_via_resend(
  'seu-email@teste.com',
  'Teste Manual',
  '<h1>Teste</h1><p>Se receber este e-mail, está funcionando!</p>'
);
```

---

## ✅ Vantagens desta Solução

- ✅ **Sem instalar CLI**
- ✅ **Sem serviços externos** (Make.com, Zapier)
- ✅ **Tudo em SQL**
- ✅ **100% gratuito** (3.000 e-mails/mês)
- ✅ **E-mail profissional e bonito**
- ✅ **Interface web para gerenciar gestores**
- ✅ **Funciona em produção**

---

## 📧 Preview do E-mail

O e-mail que será enviado tem:
- ✅ Header vermelho com gradiente (identidade Conecta Cup)
- ✅ Informações organizadas em grid bonito
- ✅ Botão chamativo para acessar o sistema
- ✅ Seção "Ação necessária" com dica
- ✅ Design responsivo
- ✅ Compatível com todos os clientes de e-mail

---

## 📁 Estrutura de Arquivos

```
/supabase/migrations/
├── install_interface_functions.sql      # EXECUTAR PRIMEIRO
├── install_resend_notifications.sql     # EXECUTAR DEPOIS (ajustar API Key)
└── add_get_users_function.sql          # Função auxiliar (já incluída no primeiro)

/pages/
└── ConfiguracoesNotificacoes.tsx        # Interface web para gerenciar gestores

/docs/
└── SOLUCAO_RESEND_SIMPLES.md           # Este arquivo
```

---

## 🎉 Pronto!

Agora toda vez que uma avaria for cadastrada, o gestor receberá automaticamente um e-mail elegante! 🚀

**Funcionou?** Teste cadastrando uma avaria! 💪