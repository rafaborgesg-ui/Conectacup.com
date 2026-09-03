# ✅ Checklist Rápido - Protheus Master Data

## 🎯 Passo a Passo

### ☑️ Passo 1: Abrir Supabase
- [ ] Vá em https://supabase.com/dashboard
- [ ] Faça login
- [ ] Selecione projeto Conecta Cup

### ☑️ Passo 2: SQL Editor
- [ ] Clique em "SQL Editor" no menu lateral

### ☑️ Passo 3: Copiar SQL
- [ ] Abra: `/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql`
- [ ] Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

### ☑️ Passo 4: Executar
- [ ] Cole no SQL Editor (Ctrl+V)
- [ ] Clique em "Run" ou F5
- [ ] Aguarde mensagem "Success"

### ☑️ Passo 5: Usar
- [ ] Recarregue o sistema (F5)
- [ ] Vá em: Cadastro → Master Data
- [ ] Clique na aba "Protheus" 💼
- [ ] Cadastre itens!

---

## 🎉 Pronto!

Se você vê a aba **Protheus** com as 3 seções, **está funcionando!**

---

## 📋 O Que Cadastrar

### 1. Setores
```
Exemplo:
- Nome: Operações
- Descrição: Responsável por operações de pista
- Responsável: João Silva
```

### 2. Projetos
```
Exemplo:
- Nome: PROJ-2025-001
- Descrição: Modernização de estrutura
```

### 3. Contas Contábeis
```
Exemplo:
- Nome: 1.01.001
- Descrição: Caixa Geral
```

---

## ❓ Precisa de Ajuda?

### 📖 Documentação:
- **Setup Completo**: `/docs/PROTHEUS_MASTER_DATA_SETUP.md`

### 🐛 Erros Comuns:

**"Column description does not exist"**
→ Execute o SQL novamente

**Não vejo a aba Protheus**
→ Recarregue a página (F5)

**Erro ao salvar**
→ Verifique se o nome está preenchido

---

**TL;DR**: 
1. SQL Editor no Supabase
2. Executar ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql
3. Recarregar página
4. Master Data > Protheus 🚀
