# Próximas Melhorias - Roadmap 2025

**Última Atualização**: 2025-01-24  
**Versão Atual**: 2.2.0

---

## 🎯 Visão Geral

Este documento detalha as melhorias planejadas para o Sistema de Gestão de Pneus da Porsche Cup Brasil, organizadas por prioridade e versão.

---

## 📅 Versão 2.2.1 - Integração e Limpeza (1-2 dias)

### 🔴 ALTA PRIORIDADE - Fazer AGORA

#### 1. ✅ Integrar Novos Componentes no Dashboard
**Tempo estimado**: 2 horas  
**Complexidade**: Baixa

**Tarefas**:
- [ ] Adicionar `<ContainerOccupancyMonitor />` no Dashboard principal
- [ ] Posicionar após cards de estatísticas
- [ ] Configurar refresh automático (30s)
- [ ] Testar responsividade mobile

**Arquivos a modificar**:
- `/components/Dashboard.tsx`

**Código sugerido**:
```tsx
// Em Dashboard.tsx, após os cards de estatísticas
<div className="mt-8">
  <ContainerOccupancyMonitor 
    refreshInterval={30000}
    showHeader={true}
    compact={false}
  />
</div>
```

---

#### 2. 🗺️ Integrar Mapa Visual na Aba Containers
**Tempo estimado**: 1-2 horas  
**Complexidade**: Baixa

**Tarefas**:
- [ ] Adicionar nova aba "Mapa" em Containers
- [ ] Integrar `<ContainerGridMap />`
- [ ] Adicionar toggle para alternar entre lista e mapa
- [ ] Testar navegação entre abas

**Arquivos a modificar**:
- `/components/ContainerRegistration.tsx`

**Layout sugerido**:
```tsx
<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="list">Lista</TabsTrigger>
    <TabsTrigger value="map">Mapa</TabsTrigger>
  </TabsList>
  
  <TabsContent value="list">
    {/* Lista atual */}
  </TabsContent>
  
  <TabsContent value="map">
    <ContainerGridMap columns={4} />
  </TabsContent>
</Tabs>
```

---

#### 3. ⚡ Usar Tabela Virtualizada em Reports
**Tempo estimado**: 2-3 horas  
**Complexidade**: Média

**Tarefas**:
- [ ] Substituir tabela atual por `<VirtualizedTable />`
- [ ] Configurar colunas e rowHeight
- [ ] Implementar expandedContent para detalhes
- [ ] Testar com 1.000+ registros
- [ ] Ajustar skeleton loading

**Arquivos a modificar**:
- `/components/Reports.tsx`

**Benefícios**:
- ✅ Scroll 60fps com 10.000+ registros
- ✅ -95% uso de memória
- ✅ Carregamento instantâneo

---

#### 4. 🗑️ EXECUTAR LIMPEZA COMPLETA DE ARQUIVOS
**Tempo estimado**: 1-2 horas  
**Complexidade**: Baixa (seguir script)

**IMPORTANTE**: Esta é a tarefa mais impactante para organização do projeto!

**Tarefas**:
- [ ] Fazer backup do repositório
- [ ] Executar script de migração do `/docs/CLEANUP_PLAN.md`
- [ ] Deletar ~100 arquivos obsoletos
- [ ] Mover ~50 arquivos para `/docs`
- [ ] Validar que tudo funciona
- [ ] Commit organizado

**Arquivos a deletar** (principais):
```
LEIA_ISTO_*.md (todos)
URGENTE_*.md (todos)
EXECUTAR_*.md (todos)
FIX_*.md (mover para /docs/fixes/)
CHANGELOG_CURINGA.md
CHANGELOG_MODO_RAPIDO.md
TESTE_RAPIDO_*.md
DEBUG_*.md
STATUS_*.md
CONFIRMACAO_*.md
INDICE_*.md
RESOLVER_*.md
SOLUCAO_*.md (exceto os principais)
```

**Script**:
```bash
# Ver /docs/CLEANUP_PLAN.md para script completo
cd /path/to/project
chmod +x cleanup.sh
./cleanup.sh
```

**Resultado esperado**:
- ✅ ~10 arquivos no root (apenas essenciais)
- ✅ Documentação organizada em `/docs`
- ✅ SQL organizado em `/docs/database/`
- ✅ Projeto profissional e navegável

---

### 🟡 MÉDIA PRIORIDADE

#### 5. 📊 Adicionar Mais Opções de Exportação
**Tempo estimado**: 2 horas  
**Complexidade**: Baixa

**Tarefas**:
- [ ] Adicionar botão de exportar ocupação de containers
- [ ] Adicionar botão de exportar movimentações
- [ ] Criar dropdown "Exportar" com opções
- [ ] Adicionar exportação CSV (além de Excel)

**Arquivos a modificar**:
- `/components/Reports.tsx`
- `/components/ContainerOccupancyMonitor.tsx`
- `/utils/excelExport.ts`

---

#### 6. 🔔 Adicionar Notificações de Container Crítico
**Tempo estimado**: 2 horas  
**Complexidade**: Baixa

**Tarefas**:
- [ ] Detectar quando container atinge 90%
- [ ] Mostrar toast de alerta
- [ ] Badge de notificação no menu Containers
- [ ] Som opcional de alerta

**Arquivos a criar/modificar**:
- `/utils/containerAlerts.ts` (novo)
- `/components/ContainerOccupancyMonitor.tsx`

---

## 📅 Versão 2.3.0 - Filtros e Análises Avançadas (1 semana)

### 🔴 ALTA PRIORIDADE

#### 7. 📅 Filtros de Data Range
**Tempo estimado**: 4 horas  
**Complexidade**: Média

**Tarefas**:
- [ ] Adicionar DateRangePicker em Reports
- [ ] Filtrar por data de criação
- [ ] Filtrar por data de última atualização
- [ ] Filtrar por período de movimentação
- [ ] Persistir filtros no localStorage

**Componentes necessários**:
- shadcn/ui Calendar (já disponível)
- DateRangePicker (criar)

---

#### 8. 📈 Gráficos de Evolução Temporal
**Tempo estimado**: 6 horas  
**Complexidade**: Média-Alta

**Tarefas**:
- [ ] Gráfico de entrada de pneus por dia/semana
- [ ] Gráfico de ocupação de containers ao longo do tempo
- [ ] Gráfico de consumo por etapa
- [ ] Gráfico de descarte acumulado

**Bibliotecas**:
- Recharts (já instalado)

**Arquivos a criar**:
- `/components/TemporalCharts.tsx`
- `/components/OccupancyTrendChart.tsx`

---

#### 9. 🔍 Busca Avançada Global
**Tempo estimado**: 4 horas  
**Complexidade**: Média

**Tarefas**:
- [ ] Busca global por código, piloto, equipe
- [ ] Autocomplete com sugestões
- [ ] Histórico de buscas recentes
- [ ] Comando rápido (Ctrl+K ou Cmd+K)

**Arquivos a criar**:
- `/components/GlobalSearch.tsx`
- Usar shadcn/ui Command (já disponível)

---

### 🟡 MÉDIA PRIORIDADE

#### 10. 📱 PWA Offline Completo
**Tempo estimado**: 1-2 dias  
**Complexidade**: Alta

**Tarefas**:
- [ ] Implementar Service Worker robusto
- [ ] Cache de dados para leitura offline
- [ ] Fila de sincronização para operações offline
- [ ] Indicador visual de modo offline
- [ ] Background sync quando volta online

**Arquivos a modificar**:
- `/public/sw.js`
- `/utils/pwa.ts`

**Desafios**:
- Conflitos de sincronização
- Validação de duplicatas offline
- Merge de dados

---

#### 11. 🔐 Melhorias de Segurança e Auditoria
**Tempo estimado**: 4 horas  
**Complexidade**: Média

**Tarefas**:
- [ ] Log completo de todas as ações (quem, quando, o quê)
- [ ] Histórico de mudanças por pneu
- [ ] Relatório de auditoria exportável
- [ ] Permissões granulares por módulo

**Arquivos a criar**:
- `/components/AuditLog.tsx`
- Tabela `audit_log` no Supabase

---

## 📅 Versão 2.4.0 - Automação e Integrações (2 semanas)

### 🔴 ALTA PRIORIDADE

#### 12. 🤖 Exportação Programada Automática
**Tempo estimado**: 1 dia  
**Complexidade**: Média-Alta

**Tarefas**:
- [ ] Configurar agendamento (diário, semanal, mensal)
- [ ] Envio automático por email
- [ ] Upload para cloud storage (Google Drive, Dropbox)
- [ ] Dashboard de exportações agendadas

**Tecnologias**:
- Supabase Edge Functions (cron)
- SendGrid ou Resend para email
- Cloud storage API

**Arquivos a criar**:
- `/supabase/functions/scheduled-export/index.tsx`
- `/components/ExportScheduler.tsx`

---

#### 13. 🔗 API Pública para Integrações
**Tempo estimado**: 2 dias  
**Complexidade**: Alta

**Tarefas**:
- [ ] Endpoints REST para leitura de dados
- [ ] Webhook para eventos (novo pneu, descarte, etc.)
- [ ] API keys e autenticação
- [ ] Documentação OpenAPI/Swagger
- [ ] Rate limiting

**Endpoints sugeridos**:
```
GET /api/stock
GET /api/containers
GET /api/movements
POST /api/webhooks/register
```

**Arquivos a criar**:
- `/supabase/functions/api/` (múltiplos arquivos)
- `/docs/API.md` (documentação)

---

#### 14. 📊 Dashboard Executivo
**Tempo estimado**: 1 dia  
**Complexidade**: Média

**Tarefas**:
- [ ] KPIs principais (cards grandes)
- [ ] Gráficos de desempenho
- [ ] Comparação entre temporadas
- [ ] Exportação de relatório executivo (PowerPoint?)

**Métricas**:
- Consumo médio por etapa
- Taxa de descarte
- Ocupação média de containers
- Pneus por piloto/equipe
- Custo estimado (se houver dados)

---

### 🟡 MÉDIA PRIORIDADE

#### 15. 📸 Scanner de Código de Barras por Câmera
**Tempo estimado**: 1 dia  
**Complexidade**: Alta

**Tarefas**:
- [ ] Integrar biblioteca de leitura de código (ZXing, QuaggaJS)
- [ ] Acesso à câmera do dispositivo
- [ ] Preview e captura
- [ ] Fallback para entrada manual

**Bibliotecas sugeridas**:
- `html5-qrcode`
- `@zxing/library`

**Arquivos a criar**:
- `/components/CameraScanner.tsx`

---

#### 16. 🏷️ Etiquetas e QR Codes
**Tempo estimado**: 1 dia  
**Complexidade**: Média

**Tarefas**:
- [ ] Geração de etiquetas para impressão
- [ ] QR Code com link para detalhes do pneu
- [ ] Layout de etiqueta customizável
- [ ] Impressão em massa

**Bibliotecas**:
- `qrcode.react`
- `jspdf` (já instalado)

**Arquivos a criar**:
- `/components/LabelGenerator.tsx`
- `/utils/labelTemplates.ts`

---

## 📅 Versão 3.0.0 - Mobile Nativo e IA (3-6 meses)

### 🔮 LONGO PRAZO

#### 17. 📱 App Mobile Nativo
**Tempo estimado**: 2-3 meses  
**Complexidade**: Muito Alta

**Tecnologias**:
- React Native
- Expo
- Compartilhar lógica de negócio

**Funcionalidades**:
- Scanner nativo mais rápido
- Notificações push
- Offline-first
- Geolocalização

---

#### 18. 🤖 Predição de Consumo com IA
**Tempo estimado**: 1 mês  
**Complexidade**: Muito Alta

**Tarefas**:
- [ ] Análise histórica de consumo
- [ ] Predição de necessidade por etapa
- [ ] Alertas de reabastecimento
- [ ] Otimização de estoque

**Tecnologias**:
- TensorFlow.js ou Python backend
- Modelos de séries temporais

---

#### 19. 🗣️ Comando por Voz
**Tempo estimado**: 2 semanas  
**Complexidade**: Alta

**Tarefas**:
- [ ] "Registrar pneu 12345678"
- [ ] "Mover pneu para container A"
- [ ] "Quantos pneus no container B?"

**Tecnologias**:
- Web Speech API
- Natural Language Processing

---

## 🎯 Priorização Resumida

### FAZER AGORA (Esta Semana - v2.2.1)
1. ✅ Integrar ContainerOccupancyMonitor no Dashboard
2. 🗺️ Integrar ContainerGridMap em Containers
3. ⚡ VirtualizedTable em Reports
4. 🗑️ **LIMPEZA COMPLETA DE ARQUIVOS** (mais importante!)
5. 📊 Opções extras de exportação

### PRÓXIMAS 2 SEMANAS (v2.3.0)
6. 📅 Filtros de data range
7. 📈 Gráficos temporais
8. 🔍 Busca avançada global
9. 🔔 Notificações de container crítico

### PRÓXIMO MÊS (v2.4.0)
10. 🤖 Exportação programada
11. 🔗 API pública
12. 📊 Dashboard executivo
13. 🔐 Melhorias de auditoria

### PRÓXIMOS 3-6 MESES (v3.0.0)
14. 📱 PWA offline completo
15. 📸 Scanner por câmera
16. 🏷️ Etiquetas e QR codes
17. 📱 App mobile nativo
18. 🤖 IA e predições

---

## 📊 Matriz de Priorização

| # | Melhoria | Impacto | Esforço | Prioridade | Versão |
|---|----------|---------|---------|------------|--------|
| 4 | Limpeza de arquivos | 🔴 Alto | 🟢 Baixo | **P0** | 2.2.1 |
| 1 | Integrar monitor ocupação | 🔴 Alto | 🟢 Baixo | **P0** | 2.2.1 |
| 2 | Integrar mapa containers | 🟡 Médio | 🟢 Baixo | **P1** | 2.2.1 |
| 3 | VirtualizedTable | 🔴 Alto | 🟡 Médio | **P1** | 2.2.1 |
| 5 | Mais exportações | 🟡 Médio | 🟢 Baixo | **P1** | 2.2.1 |
| 6 | Alertas críticos | 🟡 Médio | 🟢 Baixo | **P2** | 2.2.1 |
| 7 | Filtros de data | 🔴 Alto | 🟡 Médio | **P1** | 2.3.0 |
| 8 | Gráficos temporais | 🔴 Alto | 🟡 Médio | **P1** | 2.3.0 |
| 9 | Busca global | 🟡 Médio | 🟡 Médio | **P2** | 2.3.0 |
| 10 | PWA offline | 🔴 Alto | 🔴 Alto | **P2** | 2.4.0 |
| 12 | Export programado | 🟡 Médio | 🟡 Médio | **P2** | 2.4.0 |
| 13 | API pública | 🟡 Médio | 🔴 Alto | **P3** | 2.4.0 |

**Legenda**:
- P0 = Fazer AGORA (urgente)
- P1 = Fazer esta sprint
- P2 = Próxima sprint
- P3 = Backlog

---

## 🚀 Como Contribuir

### Para Desenvolvedores

1. **Escolha uma tarefa** desta lista
2. **Crie uma branch**: `git checkout -b feature/nome-da-feature`
3. **Siga os guidelines**: Ver `/guidelines/Guidelines.md`
4. **Teste completamente**
5. **Documente** em `/docs`
6. **Abra Pull Request**

### Para Stakeholders

- Dê feedback sobre prioridades
- Sugira novas funcionalidades
- Reporte bugs ou UX issues

---

## 📞 Contato

Dúvidas sobre o roadmap?
- Email: suporte@porschecupbrasil.com.br
- Discussões: GitHub Discussions (se disponível)

---

**Última Atualização**: 2025-01-24  
**Versão**: 2.2.0 → 3.0.0  
**Status**: 🟢 Ativo
