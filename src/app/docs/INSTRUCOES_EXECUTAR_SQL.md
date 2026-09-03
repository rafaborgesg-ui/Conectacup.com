# 🚨 INSTRUÇÕES URGENTES - EXECUTE O SQL CORRIGIDO!

## ⚠️ VOCÊ ESTÁ VENDO ERRO 400 PORQUE A FUNÇÃO SQL ANTIGA AINDA ESTÁ ATIVA!

---

## ✅ PASSO A PASSO VISUAL:

### **1️⃣ ABRA O SUPABASE:**
👉 https://supabase.com/dashboard/project/SEU_PROJETO

---

### **2️⃣ CLIQUE EM "SQL EDITOR" (NO MENU LATERAL ESQUERDO)**

---

### **3️⃣ COPIE O SQL ABAIXO:**

```sql
-- =====================================================
-- 🔥 CORREÇÃO DEFINITIVA - Execute AGORA!
-- =====================================================

CREATE OR REPLACE FUNCTION send_wheel_damage_report_email(
  p_stage_id UUID,
  p_extra_emails TEXT[],
  p_excel_base64 TEXT,
  p_filename TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_stage_name TEXT;
  v_manager_email TEXT;
  v_all_emails TEXT[];
  v_resend_api_key TEXT := 'COLE_SUA_API_KEY_RESEND_AQUI'; -- 🔥 COLE AQUI!
  v_from_email TEXT := 'onboarding@resend.dev';
  v_response_id BIGINT;
  v_subject TEXT;
  v_html TEXT;
  v_total_occurrences INTEGER := 0;
BEGIN
  -- 1. Buscar nome da etapa
  SELECT name INTO v_stage_name
  FROM season_stages
  WHERE id = p_stage_id;
  
  IF v_stage_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Etapa não encontrada'
    );
  END IF;
  
  -- 2. Buscar e-mail do gestor de avarias
  SELECT email INTO v_manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
  
  IF v_manager_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhum gestor de avarias definido'
    );
  END IF;
  
  -- 3. Montar lista de e-mails
  v_all_emails := ARRAY[v_manager_email];
  IF p_extra_emails IS NOT NULL AND array_length(p_extra_emails, 1) > 0 THEN
    v_all_emails := v_all_emails || p_extra_emails;
  END IF;
  
  -- 4. Contar avarias
  SELECT COUNT(*) INTO v_total_occurrences
  FROM wheel_damage_occurrences
  WHERE stage_name = v_stage_name
    AND status != 'rejected';
  
  IF v_total_occurrences = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhuma avaria encontrada'
    );
  END IF;
  
  -- 5. Montar e-mail
  v_subject := '📊 Relatório de Avarias - ' || v_stage_name;
  
  v_html := '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; }
    .header { background: #DC2626; color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .info-box { background: #f9fafb; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Avarias</h1>
    </div>
    <div class="content">
      <p>Olá,</p>
      <p>Segue o relatório de avarias da etapa <strong>' || v_stage_name || '</strong>.</p>
      <div class="info-box">
        <strong>Total de avarias:</strong> ' || v_total_occurrences || ' ocorrências
      </div>
      <p>📎 A planilha Excel está anexada a este e-mail.</p>
    </div>
    <div class="footer">
      <p>Conecta Cup - Sistema de Gestão de Avarias</p>
    </div>
  </div>
</body>
</html>';
  
  -- 6. Enviar e-mail (SEM O CAMPO "type"!)
  SELECT INTO v_response_id net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from_email,
      'to', v_all_emails,
      'subject', v_subject,
      'html', v_html,
      'attachments', jsonb_build_array(
        jsonb_build_object(
          'filename', p_filename,
          'content', p_excel_base64
        )
      )
    )
  );
  
  -- 7. Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'recipients', v_all_emails,
    'total_occurrences', v_total_occurrences
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION send_wheel_damage_report_email TO authenticated;

-- ✅ PRONTO! Agora teste no Dashboard.
```

---

### **4️⃣ COLE SUA API KEY DO RESEND:**

**Encontre esta linha no SQL:**
```sql
v_resend_api_key TEXT := 'COLE_SUA_API_KEY_RESEND_AQUI'; -- 🔥 COLE AQUI!
```

**Substitua por:**
```sql
v_resend_api_key TEXT := 're_sua_chave_real_aqui';
```

🔑 **Onde pegar a API Key?**
1. Acesse: https://resend.com/api-keys
2. Copie sua API Key
3. Cole no lugar de `COLE_SUA_API_KEY_RESEND_AQUI`

---

### **5️⃣ COLE TODO O SQL NO SUPABASE SQL EDITOR**

**IMPORTANTE:** Cole TODO o código SQL (da linha 1 até o final)

---

### **6️⃣ CLIQUE EM "RUN" (BOTÃO VERDE NO CANTO INFERIOR DIREITO)**

Você deve ver:
```
✅ Success. No rows returned
```

Isso significa que a função foi atualizada!

---

### **7️⃣ TESTE NO DASHBOARD:**

1. Recarregue a página do Dashboard (Ctrl + Shift + R)
2. Clique em **"ENVIAR PLANILHA"**
3. Selecione uma etapa
4. Clique em **"Enviar E-mail"**

---

### **8️⃣ VERIFIQUE OS LOGS NOVAMENTE:**

Execute no Supabase:

```sql
SELECT 
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as quando,
  status_code,
  CASE 
    WHEN status_code IN (200, 201) THEN '✅ SUCESSO!'
    WHEN status_code = 400 THEN '❌ Erro 400'
    ELSE '❌ Erro ' || status_code::text
  END as resultado,
  content::text as resposta
FROM net._http_response 
ORDER BY created DESC 
LIMIT 3;
```

---

## ✅ RESULTADO ESPERADO:

**ANTES (erro 400):**
```
status_code: 400
resultado: ❌ Erro 400
```

**DEPOIS (sucesso):**
```
status_code: 200
resultado: ✅ SUCESSO!
```

---

## ⚠️ SE AINDA DER ERRO APÓS EXECUTAR O SQL:

Execute esta query para ver o erro detalhado:

```sql
SELECT 
  content::text as resposta_completa
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

E me envie o resultado!

---

## 🎯 CHECKLIST:

- [ ] Abri o Supabase SQL Editor
- [ ] Copiei o SQL completo
- [ ] Colei minha API Key do Resend
- [ ] Executei o SQL (cliquei em "Run")
- [ ] Vi a mensagem "Success. No rows returned"
- [ ] Recarreguei a página do Dashboard
- [ ] Testei o envio
- [ ] Verifiquei os logs (status_code = 200?)

---

## 📧 ONDE PEGAR A API KEY RESEND:

1. Acesse: https://resend.com/
2. Faça login
3. Vá em **"API Keys"** no menu
4. Copie sua chave (começa com `re_`)
5. Cole no SQL

---

## 🚀 EXECUTE AGORA E ME AVISE!

**Após executar, me envie um print dos novos logs mostrando status 200!** ✅

---

**Conecta Cup** 🏁
