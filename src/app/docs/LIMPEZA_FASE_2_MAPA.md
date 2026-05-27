# 📁 Mapa de Movimentação - Fase 2

**Status**: 🔄 EM EXECUÇÃO  
**Data**: 2025-01-24

---

## 📋 Plano de Movimentação

### Grupo 1: Features → `/docs/features/` (26 arquivos)

**ARCS** (2 arquivos):
- [ ] ARCS_AUTO_REGISTRATION_LOGIC.md
- [ ] ARCS_DATA_UPDATE_FIELDS.md

**Loading States** (3 arquivos):
- [ ] LOADING_STATES_COMPLETO.md
- [ ] LOADING_STATES_IMPLEMENTADO.md
- [ ] LOADING_STATES_QUICK_GUIDE.md

**Mobile** (1 arquivo):
- [ ] MOBILE_ENHANCEMENTS_GUIDE.md

**Modo Rápido** (6 arquivos):
- [ ] MODO_RAPIDO_1MIN.md
- [ ] MODO_RAPIDO_GUIA.md
- [ ] MODO_RAPIDO_IMPLEMENTADO.md
- [ ] MODO_RAPIDO_INDICE.md
- [ ] MODO_RAPIDO_README.md
- [ ] MODO_RAPIDO_VISUAL.md

**PWA** (7 arquivos):
- [ ] PWA_ICONS_STATUS.md
- [ ] PWA_INDEX.md
- [ ] PWA_QUICK_START.md
- [ ] PWA_README.md
- [ ] PWA_RESUMO.md
- [ ] PWA_SETUP_GUIDE.md
- [ ] PWA_STATUS.md

**UX e Sprint** (2 arquivos):
- [ ] UX_IMPROVEMENTS_PRIORITY_1.md
- [ ] SPRINT_5_MOBILE_INTEGRADO.md

**Dashboard e Sync** (2 arquivos):
- [ ] DASHBOARD_GRAFICOS_IMPLEMENTADO.md
- [ ] SYNC_DASHBOARD_DISCARD_REPORTS.md

**Melhorias e Roadmap** (3 arquivos):
- [ ] MELHORIAS_IMPLEMENTADAS_RESUMO.md
- [ ] MELHORIAS_UX_IMPLEMENTADAS.md (já existe em /docs/features/)
- [ ] ROADMAP_MELHORIAS_2025.md
- [ ] PROXIMAS_MELHORIAS_SUGERIDAS.md

---

### Grupo 2: SQL Migrations → `/docs/database/migrations/` (5 arquivos)

- [ ] SETUP_STOCK_ENTRIES_TABLE.sql
- [ ] INSERT_BUSINESS_RULES_DATA.sql
- [ ] MIGRATION_BUSINESS_RULES_TABLE.sql
- [ ] MIGRATION_STATUS_COMPLETA.sql
- [ ] RESET_BUSINESS_RULES_TABLE.sql

---

### Grupo 3: SQL Fixes → `/docs/database/fixes/` (19 arquivos)

**Constraints e FK**:
- [ ] FIX_ALL_CONTAINER_CONSTRAINTS.sql
- [ ] FIX_CONTAINERS_CHECK_EMPTY_ID.sql
- [ ] FIX_CONTAINERS_CHECK_FINAL.sql
- [ ] FIX_CONTAINERS_CHECK_NULL.sql
- [ ] FIX_CONTAINERS_FK.sql
- [ ] FIX_CONTAINERS_FK_SAFE.sql

**Barcode e UUID**:
- [ ] FIX_BARCODE_TYPE_VERIFICATION.sql
- [ ] FIX_CORRUPTED_BARCODES.sql
- [ ] VERIFY_NO_UUID_BARCODES.sql

**Status e Descarte**:
- [ ] FIX_CONTAINER_OCCUPANCY_DESCARTADO_DSI.sql
- [ ] FIX_DESCARTADO_DSI_CLEAR_CONTAINER.sql
- [ ] FIX_DESCARTE_STATUS.sql
- [ ] FIX_STATUS_DESCARTE_PILOTO_2025.sql
- [ ] FIX_TIRE_STATUS_DELETE.sql
- [ ] UPDATE_STATUS_DESCARTADO_DSI.sql

**Outros**:
- [ ] CLEAR_ALL_CONTAINERS.sql
- [ ] DELETE_UUID_AGORA.sql
- [ ] DEBUG_STATUS_PILOTO.sql
- [ ] QUICK_FIX.sql

---

### Grupo 4: Fixes (MD) → `/docs/fixes/` (27 arquivos)

**Auth e Login**:
- [ ] FIX_AUTH_401_ERRORS.md
- [ ] FIX_AUTH_LOGIN_REQUIRED.md

**Barcode e UUID**:
- [ ] FIX_BARCODE_CHECK_SQL_TABLE.md
- [ ] FIX_BARCODE_DUPLICATE_FALSE_POSITIVE.md
- [ ] FIX_BULK_DELETE_UUID_ERROR.md
- [ ] FIX_BULK_DELETE_UUID_FINAL.md
- [ ] FIX_BULK_ENTRY_UUID_ERROR.md
- [ ] FIX_CHECKBARCODEEXISTS_ERROR.md
- [ ] FIX_DELETE_UUID_BARCODE_CONFUSION.md
- [ ] FIX_UUID_BARCODE_ERROR.md
- [ ] FIX_UUID_BARCODE_FINAL_SOLUTION.md
- [ ] FIX_UUID_ERROR_FINAL_SOLUTION.md
- [ ] FIX_UUID_ERROR_INSTRUCTIONS.md
- [ ] FIX_UUID_MODEL_ID_ERROR.md

**Containers**:
- [ ] FIX_CONTAINERS_CHECK_CONSTRAINT.md

**Data Import**:
- [ ] FIX_DATA_IMPORT_COUNT.md
- [ ] FIX_DATA_IMPORT_RESET.md
- [ ] FIX_ENTRADA_PLANILHA_MODELO_CODE.md

**Diversos**:
- [ ] FIX_DUPLICATE_EXPORT_SUMMARY.md
- [ ] FIX_EDGE_FUNCTION_TSLIB_ERROR.md
- [ ] FIX_HOOKS_ERROR.md
- [ ] FIX_LIMIT_1000_SUPABASE.md
- [ ] FIX_POSTGREST_1000_LIMIT.md

**Status**:
- [ ] FIX_STATUS_COUNT_ACTIVE_ENTRIES.md
- [ ] FIX_STATUS_DELETE_INSTRUCTIONS.md
- [ ] FIX_STATUS_ERRORS_FINAL.md

**Tire Discard**:
- [ ] FIX_TIRE_DISCARD_ERRORS.md
- [ ] FIX_TIRE_DISCARD_SUPABASE.md
- [ ] FIX_TIRE_STOCK_ENTRY_SQL_INTEGRATION.md

**Correções**:
- [ ] CORRECAO_STATUS_DESCARTADO_DSI.md
- [ ] CORRECAO_STATUS_DESCARTE.md

**Soluções**:
- [ ] SOLUCAO_CONTAINERS_CHECK_RESUMO.md
- [ ] SOLUCAO_CONTAINER_NULL.md
- [ ] SOLUCAO_FINAL_UUID_BARCODE.md
- [ ] SOLUCAO_IMEDIATA.md

**Instruções**:
- [ ] INSTRUCOES_CORRECAO_STATUS.md
- [ ] INSTRUCOES_URGENTES_LOGIN.md

---

### Grupo 5: Deployment → `/docs/deployment/` (5 arquivos)

- [ ] DEPLOYMENT.md
- [ ] README_MIGRATION.md → MIGRATION_GUIDE.md
- [ ] MIGRATION_NOTES.md
- [ ] MIGRATION_STEP_BY_STEP.md
- [ ] nginx.conf

**Scripts** → `/docs/deployment/scripts/` (2 arquivos):
- [ ] install-pwa-icons.sh
- [ ] install-pwa-icons.bat

---

### Grupo 6: Troubleshooting → `/docs/troubleshooting/` (3 arquivos)

- [ ] TROUBLESHOOTING_CONTAINERS_CHECK.md
- [ ] TROUBLESHOOTING_MIGRATION.md
- [ ] DEBUG_ENTRADA_PLANILHA.md
- [ ] DEBUG_STATUS_PILOTO_ZERO.md

---

### Grupo 7: Database → `/docs/database/` (1 arquivo)

- [ ] BUSINESS_RULES_SCHEMA.md

---

## 📊 Totais

| Grupo | Destino | Arquivos |
|-------|---------|----------|
| Features | `/docs/features/` | 26 |
| SQL Migrations | `/docs/database/migrations/` | 5 |
| SQL Fixes | `/docs/database/fixes/` | 19 |
| Fixes MD | `/docs/fixes/` | 27 |
| Deployment | `/docs/deployment/` | 5 |
| Scripts | `/docs/deployment/scripts/` | 2 |
| Troubleshooting | `/docs/troubleshooting/` | 4 |
| Database | `/docs/database/` | 1 |
| **TOTAL** | | **89 arquivos** |

---

## ✅ Progresso

- [ ] Grupo 1: Features (0/26)
- [ ] Grupo 2: SQL Migrations (0/5)
- [ ] Grupo 3: SQL Fixes (0/19)
- [ ] Grupo 4: Fixes MD (0/27)
- [ ] Grupo 5: Deployment (0/5)
- [ ] Grupo 6: Scripts (0/2)
- [ ] Grupo 7: Troubleshooting (0/4)
- [ ] Grupo 8: Database (0/1)

**Total**: 0/89 (0%)

---

**Executar movimentação manual ou solicitar continuação por grupo.**
