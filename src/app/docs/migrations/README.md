# 🗄️ Migrations & Database Scripts

Pasta centralizada para scripts SQL de migração, setup inicial, fixes de banco de dados e guias de migração.

---

## 📂 Estrutura

```
migrations/
├── README.md (este arquivo)
├── sql/                    # Scripts SQL (45 arquivos)
│   ├── migrations/         # Migrações de schema
│   ├── fixes/             # Correções de dados
│   ├── setup/             # Setup inicial
│   └── verification/      # Scripts de verificação
└── guides/                # Guias em Markdown (3 arquivos)
    ├── MIGRATION_STEP_BY_STEP.md
    ├── MIGRATION_NOTES.md
    └── README_MIGRATION.md
```

---

## 📋 Scripts SQL Disponíveis

### **Migrations (Schema Changes)**
- `MIGRATION_BUSINESS_RULES_TABLE.sql` - Criar tabela de regras de negócio
- `MIGRATION_STATUS_COMPLETA.sql` - Migração completa de status

### **Setup (Initial Configuration)**
- `SETUP_STOCK_ENTRIES_TABLE.sql` - Setup inicial da tabela de estoque
- `INSERT_BUSINESS_RULES_DATA.sql` - Inserir dados iniciais
- `RESET_BUSINESS_RULES_TABLE.sql` - Reset da tabela de regras

### **Fixes (Data Corrections)**

#### Container Issues:
- `FIX_ALL_CONTAINER_CONSTRAINTS.sql`
- `FIX_CONTAINERS_CHECK_EMPTY_ID.sql`
- `FIX_CONTAINERS_CHECK_FINAL.sql`
- `FIX_CONTAINERS_CHECK_NULL.sql`
- `FIX_CONTAINERS_FK.sql`
- `FIX_CONTAINERS_FK_SAFE.sql`

#### Status Issues:
- `FIX_STATUS_DESCARTE_PILOTO_2025.sql`
- `FIX_DESCARTE_STATUS.sql`
- `FIX_DESCARTADO_DSI_CLEAR_CONTAINER.sql`
- `FIX_CONTAINER_OCCUPANCY_DESCARTADO_DSI.sql`
- `FIX_TIRE_STATUS_DELETE.sql`
- `UPDATE_STATUS_DESCARTADO_DSI.sql`

#### Barcode Issues:
- `FIX_CORRUPTED_BARCODES.sql`
- `FIX_BARCODE_TYPE_VERIFICATION.sql`
- `VERIFY_NO_UUID_BARCODES.sql`

#### Data Cleanup:
- `CLEAR_ALL_CONTAINERS.sql`
- `DELETE_UUID_AGORA.sql`
- `QUICK_FIX.sql`
- `DEBUG_STATUS_PILOTO.sql`

---

## 📖 Guias de Migração

### **Guia Principal**
📘 [MIGRATION_STEP_BY_STEP.md](./guides/MIGRATION_STEP_BY_STEP.md)  
Passo a passo completo para executar migrações de banco de dados.

### **Notas Importantes**
📝 [MIGRATION_NOTES.md](./guides/MIGRATION_NOTES.md)  
Notas e considerações importantes sobre migrações.

### **README de Migração**
📄 [README_MIGRATION.md](./guides/README_MIGRATION.md)  
Documentação geral sobre processo de migração.

---

## 🚀 Como Usar

### **1. Executar Migração Completa**

```bash
# 1. Backup primeiro!
pg_dump -h localhost -U postgres -d porsche_cup > backup_$(date +%Y%m%d).sql

# 2. Executar migration
psql -h localhost -U postgres -d porsche_cup -f migrations/sql/MIGRATION_*.sql

# 3. Verificar resultado
psql -h localhost -U postgres -d porsche_cup -f migrations/sql/VERIFY_*.sql
```

### **2. Aplicar Fix Específico**

```bash
# Exemplo: Fix de containers
psql -h localhost -U postgres -d porsche_cup -f migrations/sql/FIX_CONTAINERS_CHECK_FINAL.sql
```

### **3. Setup Inicial**

```bash
# Ordem recomendada:
psql ... -f migrations/sql/SETUP_STOCK_ENTRIES_TABLE.sql
psql ... -f migrations/sql/MIGRATION_BUSINESS_RULES_TABLE.sql
psql ... -f migrations/sql/INSERT_BUSINESS_RULES_DATA.sql
```

---

## ⚠️ Avisos Importantes

### **Antes de Executar:**
1. ✅ **SEMPRE faça backup** do banco de dados
2. ✅ Teste em **ambiente de desenvolvimento** primeiro
3. ✅ Leia as **notas de migração**
4. ✅ Verifique **dependências** entre scripts

### **Durante Execução:**
- ⚠️ Alguns scripts são **destrutivos** (DELETE, DROP)
- ⚠️ Scripts com `_FINAL` geralmente sobrescrevem dados
- ⚠️ `RESET_*` scripts apagam e recriam tabelas

### **Após Execução:**
- ✅ Execute scripts de **verificação**
- ✅ Teste a aplicação
- ✅ Monitore logs de erro

---

## 🔍 Troubleshooting

### **Erro: "relation already exists"**
```sql
-- Drop e recrie
DROP TABLE IF EXISTS table_name CASCADE;
-- Depois execute o script novamente
```

### **Erro: "foreign key constraint"**
```sql
-- Use os scripts *_SAFE.sql que fazem checagens
-- Exemplo: FIX_CONTAINERS_FK_SAFE.sql
```

### **Erro: "duplicate key value"**
```sql
-- Limpe dados duplicados primeiro
-- Depois execute o script
```

---

## 📊 Categorias de Scripts

| Categoria | Quantidade | Descrição |
|-----------|------------|-----------|
| **Migrations** | 2 | Mudanças de schema |
| **Setup** | 3 | Configuração inicial |
| **Fixes - Containers** | 6 | Correções de containers |
| **Fixes - Status** | 6 | Correções de status |
| **Fixes - Barcodes** | 3 | Correções de códigos |
| **Cleanup** | 4 | Limpeza de dados |
| **Verification** | 1 | Scripts de verificação |

**Total:** ~45 scripts SQL

---

## 📚 Links Relacionados

- 🐛 [Troubleshooting Database](/docs/troubleshooting/database/)
- 📋 [Business Rules](/docs/business/BUSINESS_RULES_SCHEMA.md)
- 🎯 [Status Projeto](/docs/releases/STATUS_PROJETO.md)

---

## 🆘 Precisa de Ajuda?

- 📖 Consulte os [guias de migração](./guides/)
- 🐛 Veja [troubleshooting de database](/docs/troubleshooting/database/)
- 💬 Abra uma issue no GitHub

---

**Última atualização:** 2025-01-24  
**Mantido por:** Equipe de Desenvolvimento Porsche Cup Brasil
