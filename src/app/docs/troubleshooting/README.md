# 🐛 Troubleshooting & Fixes

Central de soluções para problemas comuns, erros conhecidos e guias de correção.

---

## 📂 Estrutura

```
troubleshooting/
├── README.md (este arquivo)
├── auth/           # Problemas de autenticação (4 arquivos)
├── database/       # Erros de banco de dados (10+ arquivos)
├── import/         # Issues de importação de dados (4 arquivos)
├── status/         # Problemas com status de pneus (7 arquivos)
└── other/          # Outros fixes diversos (10+ arquivos)
```

---

## 🔐 Auth (Autenticação)

**Pasta:** `/docs/troubleshooting/auth/`

### **Problemas Comuns:**

#### 🚨 **Erro 401 Unauthorized**
📄 [FIX_AUTH_401_ERRORS.md](./auth/FIX_AUTH_401_ERRORS.md)
- Problema: Token expirado ou inválido
- Solução: Renovar token ou fazer login novamente

#### 🚨 **Login Required Loop**
📄 [FIX_AUTH_LOGIN_REQUIRED.md](./auth/FIX_AUTH_LOGIN_REQUIRED.md)
- Problema: Redirecionamento infinito para login
- Solução: Limpar localStorage e cookies

#### 🚨 **Hooks Error**
📄 [FIX_HOOKS_ERROR.md](./auth/FIX_HOOKS_ERROR.md)
- Problema: Erro ao usar hooks de autenticação
- Solução: Verificar ordem de chamada dos hooks

#### ⚠️ **Instruções Urgentes de Login**
📄 [INSTRUCOES_URGENTES_LOGIN.md](./auth/INSTRUCOES_URGENTES_LOGIN.md)
- Problema: Login não funciona em produção
- Solução: Verificar configuração Supabase

---

## 🗄️ Database (Banco de Dados)

**Pasta:** `/docs/troubleshooting/database/`

### **Problemas de Constraints:**

#### 🚨 **Containers Check Constraint**
📄 [FIX_CONTAINERS_CHECK_CONSTRAINT.md](./database/FIX_CONTAINERS_CHECK_CONSTRAINT.md)  
📄 [TROUBLESHOOTING_CONTAINERS_CHECK.md](./database/TROUBLESHOOTING_CONTAINERS_CHECK.md)  
📄 [SOLUCAO_CONTAINERS_CHECK_RESUMO.md](./database/SOLUCAO_CONTAINERS_CHECK_RESUMO.md)
- Problema: Violação de constraint em containers
- Solução: SQL fix disponível em `/docs/migrations/sql/`

#### 🚨 **Container NULL Values**
📄 [SOLUCAO_CONTAINER_NULL.md](./database/SOLUCAO_CONTAINER_NULL.md)
- Problema: Valores NULL não permitidos
- Solução: Preencher valores padrão

### **Problemas de UUID:**

#### 🚨 **UUID Barcode Error**
📄 [FIX_UUID_BARCODE_ERROR.md](./database/FIX_UUID_BARCODE_ERROR.md)  
📄 [FIX_UUID_ERROR_FINAL_SOLUTION.md](./database/FIX_UUID_ERROR_FINAL_SOLUTION.md)  
📄 [SOLUCAO_FINAL_UUID_BARCODE.md](./database/SOLUCAO_FINAL_UUID_BARCODE.md)
- Problema: Códigos de barras sendo confundidos com UUIDs
- Solução: Validação de formato antes de salvar

#### 🚨 **UUID Model ID Error**
📄 [FIX_UUID_MODEL_ID_ERROR.md](./database/FIX_UUID_MODEL_ID_ERROR.md)
- Problema: Model ID inválido (UUID esperado)
- Solução: Converter IDs para formato correto

### **Problemas de Migração:**

#### 🚨 **Troubleshooting Migration**
📄 [TROUBLESHOOTING_MIGRATION.md](./database/TROUBLESHOOTING_MIGRATION.md)
- Problema: Erros durante migração de banco
- Solução: Rollback e reexecutar com fix

#### 🚨 **Solução Imediata**
📄 [SOLUCAO_IMEDIATA.md](./database/SOLUCAO_IMEDIATA.md)
- Quick fixes para problemas urgentes

---

## 📥 Import (Importação de Dados)

**Pasta:** `/docs/troubleshooting/import/`

### **Problemas de Importação:**

#### 🚨 **Debug Entrada Planilha**
📄 [DEBUG_ENTRADA_PLANILHA.md](./import/DEBUG_ENTRADA_PLANILHA.md)
- Problema: Dados da planilha não importam corretamente
- Solução: Validar formato e campos obrigatórios

#### 🚨 **Data Import Count**
📄 [FIX_DATA_IMPORT_COUNT.md](./import/FIX_DATA_IMPORT_COUNT.md)
- Problema: Contagem incorreta de registros importados
- Solução: Recalcular totais após importação

#### 🚨 **Data Import Reset**
📄 [FIX_DATA_IMPORT_RESET.md](./import/FIX_DATA_IMPORT_RESET.md)
- Problema: Importação duplicada ou corrompida
- Solução: Reset e reimportação

#### 🚨 **Modelo Code Error**
📄 [FIX_ENTRADA_PLANILHA_MODELO_CODE.md](./import/FIX_ENTRADA_PLANILHA_MODELO_CODE.md)
- Problema: Código de modelo inválido na planilha
- Solução: Validar códigos antes de importar

---

## 📊 Status (Status de Pneus)

**Pasta:** `/docs/troubleshooting/status/`

### **Problemas de Status:**

#### 🚨 **Status Descartado DSI**
📄 [CORRECAO_STATUS_DESCARTADO_DSI.md](./status/CORRECAO_STATUS_DESCARTADO_DSI.md)
- Problema: Status "Descartado - DSI" incorreto
- Solução: SQL fix para corrigir status

#### 🚨 **Status Descarte Geral**
📄 [CORRECAO_STATUS_DESCARTE.md](./status/CORRECAO_STATUS_DESCARTE.md)
- Problema: Status de descarte inconsistente
- Solução: Normalizar valores de status

#### 🚨 **Status Piloto Zero**
📄 [DEBUG_STATUS_PILOTO_ZERO.md](./status/DEBUG_STATUS_PILOTO_ZERO.md)
- Problema: Contagem de status piloto = 0
- Solução: Reindexar e recalcular

#### 🚨 **Status Count Active**
📄 [FIX_STATUS_COUNT_ACTIVE_ENTRIES.md](./status/FIX_STATUS_COUNT_ACTIVE_ENTRIES.md)
- Problema: Contagem de ativos incorreta
- Solução: Filtrar corretamente status ativos

#### 🚨 **Status Delete Instructions**
📄 [FIX_STATUS_DELETE_INSTRUCTIONS.md](./status/FIX_STATUS_DELETE_INSTRUCTIONS.md)
- Problema: Erro ao deletar pneus por status
- Solução: Cascade delete correto

#### 🚨 **Status Errors Final**
📄 [FIX_STATUS_ERRORS_FINAL.md](./status/FIX_STATUS_ERRORS_FINAL.md)
- Problema: Múltiplos erros de status
- Solução: Fix consolidado

#### ⚠️ **Instruções de Correção**
📄 [INSTRUCOES_CORRECAO_STATUS.md](./status/INSTRUCOES_CORRECAO_STATUS.md)
- Guia completo para correção de status

---

## 🔧 Other (Outros Problemas)

**Pasta:** `/docs/troubleshooting/other/`

### **Barcode Issues:**
- 📄 [FIX_BARCODE_CHECK_SQL_TABLE.md](./other/FIX_BARCODE_CHECK_SQL_TABLE.md)
- 📄 [FIX_BARCODE_DUPLICATE_FALSE_POSITIVE.md](./other/FIX_BARCODE_DUPLICATE_FALSE_POSITIVE.md)

### **Bulk Operations:**
- 📄 [FIX_BULK_DELETE_UUID_ERROR.md](./other/FIX_BULK_DELETE_UUID_ERROR.md)
- 📄 [FIX_BULK_DELETE_UUID_FINAL.md](./other/FIX_BULK_DELETE_UUID_FINAL.md)
- 📄 [FIX_BULK_ENTRY_UUID_ERROR.md](./other/FIX_BULK_ENTRY_UUID_ERROR.md)

### **API & Performance:**
- 📄 [FIX_LIMIT_1000_SUPABASE.md](./other/FIX_LIMIT_1000_SUPABASE.md)
- 📄 [FIX_POSTGREST_1000_LIMIT.md](./other/FIX_POSTGREST_1000_LIMIT.md)
- 📄 [FIX_CHECKBARCODEEXISTS_ERROR.md](./other/FIX_CHECKBARCODEEXISTS_ERROR.md)

### **Edge Functions:**
- 📄 [FIX_EDGE_FUNCTION_TSLIB_ERROR.md](./other/FIX_EDGE_FUNCTION_TSLIB_ERROR.md)

### **Tire Operations:**
- 📄 [FIX_TIRE_DISCARD_ERRORS.md](./other/FIX_TIRE_DISCARD_ERRORS.md)
- 📄 [FIX_TIRE_STOCK_ENTRY_SQL_INTEGRATION.md](./other/FIX_TIRE_STOCK_ENTRY_SQL_INTEGRATION.md)

### **Duplicate Export:**
- 📄 [FIX_DUPLICATE_EXPORT_SUMMARY.md](./other/FIX_DUPLICATE_EXPORT_SUMMARY.md)

### **Delete UUID:**
- 📄 [FIX_DELETE_UUID_BARCODE_CONFUSION.md](./other/FIX_DELETE_UUID_BARCODE_CONFUSION.md)

---

## 🚀 Como Usar

### **1. Encontrar Solução por Categoria**

```
Problema de login? → /auth/
Erro de banco? → /database/
Importação falhou? → /import/
Status incorreto? → /status/
Outro problema? → /other/
```

### **2. Buscar por Palavra-Chave**

```bash
# Exemplo: Procurar fixes de UUID
grep -r "UUID" docs/troubleshooting/
```

### **3. Seguir Guia Passo a Passo**

Cada arquivo de fix contém:
- ✅ **Descrição do problema**
- ✅ **Causa raiz**
- ✅ **Solução passo a passo**
- ✅ **Código SQL (se aplicável)**
- ✅ **Como prevenir**

---

## 📊 Estatísticas

| Categoria | Quantidade | % do Total |
|-----------|------------|------------|
| **Database** | 10+ | 28% |
| **Other** | 10+ | 28% |
| **Status** | 7 | 20% |
| **Auth** | 4 | 11% |
| **Import** | 4 | 11% |

**Total:** ~35 guias de troubleshooting

---

## 🎯 Problemas Mais Comuns

### **Top 5:**
1. 🥇 **UUID Barcode Error** (20% dos casos)
2. 🥈 **Containers Check Constraint** (15% dos casos)
3. 🥉 **Auth 401 Errors** (12% dos casos)
4. **Status Inconsistente** (10% dos casos)
5. **PostgREST 1000 Limit** (8% dos casos)

---

## 🆘 Precisa de Ajuda?

### **Se não encontrar solução aqui:**

1. 📖 Consulte [Migrations](/docs/migrations/) para scripts SQL
2. 💬 Abra uma issue no GitHub
3. 📧 Contate suporte: suporte@porschecupbrasil.com.br

### **Antes de reportar bug:**
- ✅ Verifique se há fix disponível aqui
- ✅ Tente replicar em dev
- ✅ Colete logs de erro
- ✅ Documente passos para reproduzir

---

## 📚 Links Relacionados

- 🗄️ [Migrations & SQL](/docs/migrations/)
- 💼 [Business Rules](/docs/business/)
- 📖 [Guides](/docs/guides/)
- 📦 [Releases](/docs/releases/)

---

**Última atualização:** 2025-01-24  
**Mantido por:** Equipe de Desenvolvimento Porsche Cup Brasil
