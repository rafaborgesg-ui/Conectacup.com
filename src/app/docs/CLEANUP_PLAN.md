# Plano de Limpeza e Organização de Arquivos

## 📋 Objetivo

Organizar a estrutura de arquivos do projeto, removendo duplicatas e arquivos obsoletos, e movendo documentação para `/docs`.

---

## 🗑️ Arquivos para Deletar (Duplicatas/Obsoletos)

### Changelogs Duplicados
- ❌ `CHANGELOG_CURINGA.md` → Consolidado em `/docs/CHANGELOG.md`
- ❌ `CHANGELOG_MODO_RAPIDO.md` → Consolidado em `/docs/CHANGELOG.md`

### Documentação de Correções (Já Aplicadas)
- ❌ `FIX_*.md` (todos) → Mover para `/docs/fixes/` ou deletar
- ❌ `CORRECAO_*.md` → Consolidar em `/docs/fixes/`
- ❌ `SOLUCAO_*.md` → Consolidar em `/docs/fixes/`

### Guias Temporários (Já Integrados)
- ❌ `APLICAR_LOADING_STATES.sh` → Obsoleto
- ❌ `LEIA_ISTO_*.md` → Obsoleto, consolidado
- ❌ `URGENTE_*.md` → Obsoleto
- ❌ `EXECUTAR_*.md` → Obsoleto
- ❌ `RESOLVER_*.md` → Obsoleto

### Scripts Shell Obsoletos
- ❌ `install-pwa-icons.sh` → Pode ser movido para `/docs/deployment/scripts/`
- ❌ `install-pwa-icons.bat` → Pode ser movido para `/docs/deployment/scripts/`

### Arquivos de Teste/Debug
- ❌ `TESTE_RAPIDO_*.md` → Obsoleto
- ❌ `DEBUG_*.md` → Consolidar ou deletar
- ❌ `VERIFICAR_*.md` → Obsoleto

---

## 📁 Arquivos para Mover

### Para `/docs/features/`
- ✅ `ARCS_DATA_UPDATE_FIELDS.md` → `/docs/features/ARCS_DATA_UPDATE.md`
- ✅ `ARCS_AUTO_REGISTRATION_LOGIC.md` → Consolidar em ARCS_DATA_UPDATE.md
- ✅ `LOADING_STATES_*.md` → `/docs/features/LOADING_STATES.md`
- ✅ `MOBILE_ENHANCEMENTS_GUIDE.md` → `/docs/features/MOBILE.md`
- ✅ `MODO_RAPIDO_*.md` → `/docs/features/MODO_RAPIDO.md`
- ✅ `PWA_*.md` → `/docs/features/PWA.md`
- ✅ `SPRINT_5_MOBILE_INTEGRADO.md` → `/docs/features/MOBILE.md`
- ✅ `UX_IMPROVEMENTS_PRIORITY_1.md` → `/docs/features/UX_ROADMAP.md`

### Para `/docs/database/migrations/`
- ✅ `SETUP_STOCK_ENTRIES_TABLE.sql` → `/docs/database/migrations/001_initial_setup.sql`
- ✅ `INSERT_BUSINESS_RULES_DATA.sql` → `/docs/database/migrations/002_business_rules.sql`
- ✅ `RESET_BUSINESS_RULES_TABLE.sql` → `/docs/database/migrations/002_business_rules_reset.sql`
- ✅ `MIGRATION_*.sql` → `/docs/database/migrations/`
- ✅ `UPDATE_*.sql` → `/docs/database/migrations/` ou `/fixes/`

### Para `/docs/database/fixes/`
- ✅ `FIX_*.sql` → `/docs/database/fixes/`
- ✅ `CLEAR_ALL_CONTAINERS.sql` → `/docs/database/fixes/`
- ✅ `DELETE_UUID_AGORA.sql` → `/docs/database/fixes/`
- ✅ `QUICK_FIX.sql` → `/docs/database/fixes/`
- ✅ `VERIFY_NO_UUID_BARCODES.sql` → `/docs/database/fixes/`
- ✅ `DEBUG_STATUS_PILOTO.sql` → `/docs/database/fixes/`

### Para `/docs/deployment/`
- ✅ `DEPLOYMENT.md` → `/docs/deployment/DEPLOYMENT.md`
- ✅ `nginx.conf` → `/docs/deployment/nginx.conf`
- ✅ `README_MIGRATION.md` → `/docs/deployment/MIGRATION_GUIDE.md`

### Para `/docs/troubleshooting/`
- ✅ `TROUBLESHOOTING_*.md` → `/docs/troubleshooting/`
- ✅ `COMO_RESOLVER_AGORA.txt` → Deletar (obsoleto)
- ✅ `COMO_VERIFICAR_LIMPEZA.md` → `/docs/troubleshooting/CLEANUP.md`

### Para `/docs/fixes/`
- ✅ Todos os `FIX_*.md` → `/docs/fixes/` (histórico de correções)

---

## 📝 Arquivos para Consolidar

### PWA Documentation
Consolidar em `/docs/features/PWA.md`:
- `PWA_ICONS_STATUS.md`
- `PWA_INDEX.md`
- `PWA_QUICK_START.md`
- `PWA_README.md`
- `PWA_RESUMO.md`
- `PWA_SETUP_GUIDE.md`
- `PWA_STATUS.md`
- `README_PWA_FINAL.md`
- `public/README_PWA.md`

### Loading States
Consolidar em `/docs/features/LOADING_STATES.md`:
- `LOADING_STATES_COMPLETO.md`
- `LOADING_STATES_IMPLEMENTADO.md`
- `LOADING_STATES_QUICK_GUIDE.md`

### Modo Rápido
Consolidar em `/docs/features/MODO_RAPIDO.md`:
- `MODO_RAPIDO_1MIN.md`
- `MODO_RAPIDO_GUIA.md`
- `MODO_RAPIDO_IMPLEMENTADO.md`
- `MODO_RAPIDO_INDICE.md`
- `MODO_RAPIDO_README.md`
- `MODO_RAPIDO_VISUAL.md`

### Fixes/Correções
Criar `/docs/fixes/INDEX.md` consolidando:
- Todos os `FIX_*.md`
- Todos os `CORRECAO_*.md`
- Todos os `SOLUCAO_*.md`

---

## ✅ Manter no Root

Arquivos que devem permanecer no diretório raiz:
- ✅ `README.md` - README principal (atualizado)
- ✅ `package.json`
- ✅ `tsconfig.json`
- ✅ `vite.config.ts`
- ✅ `.gitignore`
- ✅ `.env.example`
- ✅ `index.html`
- ✅ `Attributions.md` - Licenças de terceiros

---

## 🔧 Script de Migração

### Comandos para executar (Linux/Mac):

```bash
# Criar estrutura de diretórios
mkdir -p docs/features
mkdir -p docs/database/migrations
mkdir -p docs/database/fixes
mkdir -p docs/deployment
mkdir -p docs/deployment/scripts
mkdir -p docs/troubleshooting
mkdir -p docs/fixes

# Mover documentação de features
mv ARCS_*.md docs/features/ 2>/dev/null || true
mv LOADING_STATES_*.md docs/features/ 2>/dev/null || true
mv MOBILE_*.md docs/features/ 2>/dev/null || true
mv MODO_RAPIDO_*.md docs/features/ 2>/dev/null || true
mv PWA_*.md docs/features/ 2>/dev/null || true
mv SPRINT_*.md docs/features/ 2>/dev/null || true
mv UX_*.md docs/features/ 2>/dev/null || true

# Mover SQL migrations
mv SETUP_*.sql docs/database/migrations/ 2>/dev/null || true
mv INSERT_*.sql docs/database/migrations/ 2>/dev/null || true
mv MIGRATION_*.sql docs/database/migrations/ 2>/dev/null || true
mv RESET_*.sql docs/database/migrations/ 2>/dev/null || true

# Mover SQL fixes
mv FIX_*.sql docs/database/fixes/ 2>/dev/null || true
mv CLEAR_*.sql docs/database/fixes/ 2>/dev/null || true
mv DELETE_*.sql docs/database/fixes/ 2>/dev/null || true
mv QUICK_FIX.sql docs/database/fixes/ 2>/dev/null || true
mv VERIFY_*.sql docs/database/fixes/ 2>/dev/null || true
mv DEBUG_*.sql docs/database/fixes/ 2>/dev/null || true
mv UPDATE_*.sql docs/database/fixes/ 2>/dev/null || true

# Mover deployment
mv DEPLOYMENT.md docs/deployment/ 2>/dev/null || true
mv nginx.conf docs/deployment/ 2>/dev/null || true
mv README_MIGRATION.md docs/deployment/MIGRATION_GUIDE.md 2>/dev/null || true
mv install-pwa-icons.* docs/deployment/scripts/ 2>/dev/null || true

# Mover troubleshooting
mv TROUBLESHOOTING_*.md docs/troubleshooting/ 2>/dev/null || true

# Mover fixes markdown
mv FIX_*.md docs/fixes/ 2>/dev/null || true
mv CORRECAO_*.md docs/fixes/ 2>/dev/null || true
mv SOLUCAO_*.md docs/fixes/ 2>/dev/null || true

# Deletar arquivos obsoletos
rm -f LEIA_ISTO_*.md
rm -f URGENTE_*.md
rm -f EXECUTAR_*.md
rm -f RESOLVER_*.md
rm -f APLICAR_*.sh
rm -f TESTE_RAPIDO_*.md
rm -f COMO_RESOLVER_*.txt
rm -f INDICE_*.md
rm -f STATUS_*.md
rm -f CONFIRMACAO_*.md
rm -f RESUMO_*.md
rm -f SYNC_*.md
rm -f CHANGELOG_CURINGA.md
rm -f CHANGELOG_MODO_RAPIDO.md

echo "✅ Limpeza e organização concluída!"
echo "📚 Documentação movida para /docs"
echo "🗑️ Arquivos obsoletos removidos"
```

### Comandos para Windows (PowerShell):

```powershell
# Criar estrutura de diretórios
New-Item -ItemType Directory -Force -Path docs\features
New-Item -ItemType Directory -Force -Path docs\database\migrations
New-Item -ItemType Directory -Force -Path docs\database\fixes
New-Item -ItemType Directory -Force -Path docs\deployment
New-Item -ItemType Directory -Force -Path docs\deployment\scripts
New-Item -ItemType Directory -Force -Path docs\troubleshooting
New-Item -ItemType Directory -Force -Path docs\fixes

# Executar movimentações
# (adaptar comandos acima para PowerShell)

Write-Host "✅ Limpeza e organização concluída!"
```

---

## 📊 Resumo

### Antes da Limpeza
- ~150 arquivos no root
- Documentação espalhada
- Duplicatas de changelog
- SQL scripts desorganizados

### Depois da Limpeza
- ~10 arquivos no root (essenciais)
- Documentação em `/docs` organizada
- 1 CHANGELOG consolidado
- SQL em `/docs/database/` categorizado

### Benefícios
- ✅ Navegação mais fácil
- ✅ Manutenção simplificada
- ✅ Versionamento de docs claro
- ✅ Onboarding de novos devs facilitado

---

## 🚀 Próximos Passos

1. **Revisar este plano** com a equipe
2. **Fazer backup** do repositório
3. **Executar script de migração**
4. **Testar** se tudo funciona
5. **Commit** das mudanças
6. **Atualizar links** na documentação

---

**Status**: 📝 Planejamento  
**Data**: 2025-01-24  
**Versão**: 2.2.0
