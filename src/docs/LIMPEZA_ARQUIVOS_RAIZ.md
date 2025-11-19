# 🧹 Limpeza de Arquivos da Raiz

## Status: EM ANDAMENTO

Este documento registra a limpeza de arquivos temporários, de debug e documentação antiga da raiz do projeto.

## Arquivos a Manter

- ✅ `/README.md` - Documentação principal
- ✅ `/App.tsx` - Componente principal
- ✅ `/index.html` - HTML principal
- ✅ `/package.json` - Dependências
- ✅ `/tsconfig.json` - Configuração TypeScript
- ✅ `/vite.config.ts` - Configuração Vite
- ✅ `/nginx.conf` - Configuração servidor
- ✅ `/guidelines/` - Diretrizes do projeto
- ✅ `/docs/` - Documentação organizada
- ✅ `/components/` - Componentes React
- ✅ `/utils/` - Utilitários
- ✅ `/styles/` - Estilos CSS
- ✅ `/public/` - Assets públicos
- ✅ `/supabase/` - Edge Functions

## Arquivos para Deletar

### Arquivos .md (Documentação Antiga/Duplicada)
- [ ] `/ACAO_IMEDIATA_OAUTH.md`
- [ ] `/ACESSIBILIDADE_FASE1_PROGRESSO.md`
- [ ] `/ARCS_AUTO_REGISTRATION_LOGIC.md`
- [ ] `/ARCS_DATA_UPDATE_FIELDS.md`
- [ ] `/Attributions.md`
- [ ] `/BACKGROUND_IMAGE_IMPLEMENTADO.md`
- [ ] `/BRANDING_CONECTA_CUP_ATUALIZADO.md`
- [ ] `/BUSINESS_RULES_SCHEMA.md`
- [ ] `/COLUMN_PREFERENCES_FEATURE.md`
- [ ] `/COMMIT_MESSAGE.md`
- [ ] `/COMMIT_MESSAGE_FIX_BUILD.md`
- [ ] `/COMO_COMPLETAR_LIMPEZA.md`
- [ ] `/COMO_EXECUTAR_REORGANIZACAO.md`
- [ ] `/COMO_TESTAR_SPLASH_LOGIN.md`
- [ ] `/CORRECAO_COMPLETA_DADOS.md`
- [ ] `/CORRECAO_COR_STATUS_RESUMO.md`
- [ ] `/CORRECAO_OAUTH_FINAL_V2.md`
- [ ] `/CORRECAO_STATUS_BADGE_COMPLETA.md`
- [ ] `/CORRECAO_STATUS_DESCARTADO_DSI.md`
- [ ] `/CORRECAO_STATUS_DESCARTE.md`
- [ ] `/DASHBOARD_GRAFICOS_IMPLEMENTADO.md`
- [ ] `/DASHBOARD_MOVIDO_EM_DESENVOLVIMENTO.md`
- [ ] `/DEBUG_ENTRADA_PLANILHA.md`
- [ ] `/DEBUG_OAUTH_LOOP_COMANDOS.md`
- [ ] `/DEPLOYMENT.md`
- [ ] `/DIAGRAMA_PERFIS_ACESSO.md`
- [ ] `/ERROR_BOUNDARY_IMPLEMENTADO.md`
- [ ] `/ERROR_BOUNDARY_QUICK_GUIDE.md`
- [ ] `/EXECUTAR_AGORA.md`
- [ ] `/EXECUTAR_AGORA_BUILD_FIX.md`
- [ ] `/EXECUTAR_FIX_AGORA.md`
- [ ] `/FASE_1_PERMISSOES_APLICADAS.md`
- [ ] `/FASE_2_PROTECOES_GRANULARES.md`
- [ ] ... (todos os outros .md na raiz)

### Arquivos .sql (Scripts de Debug)
- [ ] `/CLEAR_ALL_CONTAINERS.sql`
- [ ] `/DEBUG_STATUS_PILOTO.sql`
- [ ] `/DELETE_UUID_AGORA.sql`
- [ ] `/EXECUTAR_AGORA_COR_STATUS.sql`
- [ ] `/EXECUTAR_AGORA_FIX_RAFAEL.sql`
- [ ] `/EXECUTAR_AGORA_LIMPAR_ACCESS_PROFILES.sql`
- [ ] `/FIX_ACCESS_PROFILES_INVALID_RECORDS.sql`
- [ ] `/FIX_ALL_CONTAINER_CONSTRAINTS.sql`
- [ ] ... (todos os outros .sql na raiz)

### Scripts de Debug (.sh, .bat, .js, .txt)
- [ ] `/disable-onboarding.js`
- [ ] `/fix-build-error.bat`
- [ ] `/fix-build-error.sh`
- [ ] `/fix-build-now.bat`
- [ ] `/fix-build-now.sh`
- [ ] `/install-pwa-icons.bat`
- [ ] `/install-pwa-icons.sh`
- [ ] `/publicar-gestao-carga.bat`
- [ ] `/publicar-gestao-carga.sh`
- [ ] `/reorganizar.sh`
- [ ] `/EXECUTAR_REORGANIZACAO.sh`
- [ ] `/EXECUTE_AGORA.txt`
- [ ] `/SOLUCAO_RAPIDA_PERFIL_TESTE.txt`
- [ ] `/SOLUCAO_URGENTE_PROFILE_1761463133033.txt`
- [ ] `/INSTRUCOES_PERFIS_SUPABASE.txt`

## Arquivos Movidos para /docs

Alguns arquivos importantes foram reorganizados:

- `MIGRATION_*.sql` → `/docs/migrations/sql/`
- Guias de implementação → `/docs/features/`
- Troubleshooting → `/docs/troubleshooting/`
- Release notes → `/docs/releases/`
- Guias OAuth → `/docs/guides/`

## Próximos Passos

1. [ ] Deletar todos os .md listados acima
2. [ ] Deletar todos os .sql de debug
3. [ ] Deletar scripts temporários
4. [ ] Verificar se não há dependências
5. [ ] Testar build do projeto
6. [ ] Commit com mensagem: "chore: limpar arquivos temporários e de debug da raiz"

## Notas

- Todos os arquivos importantes já foram reorganizados em `/docs`
- Scripts SQL de migração estão em `/docs/migrations/sql/`
- Documentação de features está em `/docs/features/`
- Não há perda de informação, apenas reorganização
