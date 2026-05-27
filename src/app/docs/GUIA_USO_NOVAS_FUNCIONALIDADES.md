# Guia de Uso - Novas Funcionalidades v2.2.0

## 📚 Índice
1. [Exportação para Excel](#1-exportação-para-excel)
2. [Monitor de Ocupação em Tempo Real](#2-monitor-de-ocupação-em-tempo-real)
3. [Mapa Visual de Containers](#3-mapa-visual-de-containers)
4. [Sistema de Toast Notifications](#4-sistema-de-toast-notifications)
5. [Animação de Confirmação](#5-animação-de-confirmação)
6. [Tabela Virtualizada](#6-tabela-virtualizada)

---

## 1. Exportação para Excel

### Como Usar

#### No Módulo de Relatórios
1. Acesse **Relatórios & Histórico** no menu lateral
2. Aplique os filtros desejados:
   - Temporada
   - Etapa
   - Status
   - Modelo
   - Container
   - Piloto
   - Campeonato
   - Categoria
3. Clique no botão **"Excel"** no canto superior direito
4. O arquivo será baixado automaticamente

#### Conteúdo do Arquivo
O arquivo Excel exportado contém:

**Aba 1: "Filtros Aplicados"**
- Data de exportação
- Total de registros
- Lista de todos os filtros ativos

**Aba 2: "Estoque de Pneus"**
Colunas:
- Código de Barras
- Modelo
- Tipo (Slick/Wet)
- Container
- Status
- Piloto
- Equipe
- Temporada
- Etapa
- Campeonato
- Categoria
- Observações
- Data de Criação
- Última Atualização

### Dicas
- ✅ Sempre aplique filtros ANTES de exportar
- ✅ O nome do arquivo inclui a data automaticamente
- ✅ O arquivo é compatível com Excel, Google Sheets e LibreOffice

### Casos de Uso
- 📊 Análise de dados offline
- 📈 Apresentações para gestão
- 🔍 Auditoria de estoque
- 📋 Relatórios mensais

---

## 2. Monitor de Ocupação em Tempo Real

### Onde Encontrar
*Será integrado no Dashboard em breve (v2.2.1)*

### O que Mostra

#### Cards de Estatísticas (topo)
1. **Ocupação Média** - Percentual médio de todos os containers
2. **Pneus Ativos** - Total de pneus em containers
3. **Capacidade Total** - Soma de todas as capacidades
4. **Críticos/Cheios** - Containers com 90%+ de ocupação

#### Lista de Containers
Cada container exibe:
- Nome e localização
- Barra de progresso colorida
- Status atual (Vazio, Baixo, Normal, Alto, Crítico, Cheio)
- Números: X/Y pneus
- Alerta visual se crítico (≥90%)

### Cores e Status

| Status | Cor | Ocupação | Significado |
|--------|-----|----------|-------------|
| Vazio | ⚪ Cinza | 0% | Container vazio |
| Baixo | 🔵 Azul | 1-39% | Pouco ocupado |
| Normal | 🟢 Verde | 40-69% | Ocupação normal |
| Alto | 🟡 Amarelo | 70-89% | Ocupação alta |
| Crítico | 🟠 Laranja | 90-99% | Próximo ao limite |
| Cheio | 🔴 Vermelho | 100% | Capacidade máxima |

### Atualização Automática
- ⏱️ Atualiza a cada 30 segundos
- 🔄 Atualiza ao salvar/mover/descartar pneus
- 📱 Funciona em segundo plano

### Dicas
- ✅ Monitore containers **críticos** antes de operações
- ✅ Use para planejar movimentações
- ✅ Identifique rapidamente gargalos

---

## 3. Mapa Visual de Containers

### Onde Encontrar
*Será integrado na aba Containers em breve (v2.2.1)*

### Como Usar

#### Visualização do Grid
- Grid responsivo mostrando todos os containers
- Cada card mostra:
  - Nome do container
  - Localização
  - Indicador de cor (status)
  - Barra de progresso
  - Percentual de ocupação

#### Interação
1. **Click em um container** para abrir detalhes
2. Modal exibe:
   - Nome e localização completos
   - Ocupação detalhada com barra grande
   - Espaço disponível (card destacado)
   - Alertas se crítico

#### Legenda de Cores
Sempre visível acima do grid:
- ⚪ Vazio (0%)
- 🟢 Normal (<70%)
- 🟡 Alto (70-90%)
- 🟠 Crítico (90-99%)
- 🔴 Cheio (100%)

### Casos de Uso
- 🗺️ **Navegação visual** rápida
- 📍 **Localização** física de containers
- 🎯 **Identificação** de containers críticos
- 📊 **Visão geral** do paddock

### Dicas
- ✅ Use antes de movimentações para ver espaço disponível
- ✅ Cores vermelhas/laranjas indicam urgência
- ✅ Grid adapta-se ao tamanho da tela

---

## 4. Sistema de Toast Notifications

### O que São
Mensagens pop-up que aparecem no canto da tela confirmando ações.

### Quando Aparecem

#### Entrada de Estoque
- ✅ **Pneu Registrado** - Verde, 2.5s
- ❌ **Código Duplicado** - Vermelho, 4s
- ❌ **Código Inválido** - Vermelho, 4s
- 🚨 **Container Cheio** - Vermelho, 5s
- ⚠️ **Container Quase Cheio** - Laranja, 3.5s

#### Descarte
- 🗑️ **Pneu Descartado** - Verde, 2.5s
- ❌ **Não Encontrado** - Vermelho, 4s
- ⚠️ **Já Descartado** - Vermelho, 4s

#### Movimentação
- 🚚 **Pneu Movimentado** - Verde, 2.5s
- ❌ **Mesmo Container** - Vermelho, 4s
- ❌ **Não Encontrado** - Vermelho, 4s

### Características Visuais
- **Gradientes** nas cores da Porsche
- **Bordas coloridas** (2px)
- **Sombras** para destaque
- **Ícones** contextuais
- **Duração** otimizada por tipo

### Dicas
- ✅ Não precisa clicar para fechar (fecha automaticamente)
- ✅ Leia a descrição para detalhes
- ✅ Toasts vermelhos indicam erro/atenção

---

## 5. Animação de Confirmação

### Quando Aparece
Ao registrar um pneu com sucesso na **Entrada de Estoque**.

### O que Mostra
1. **Tela Cheia** (backdrop escurecido)
2. **Círculo Verde** grande e animado
3. **Checkmark** ✓ branco
4. **Partículas** explosivas ao redor
5. **Sparkles** ✨ piscando
6. **Som** "beep" de confirmação
7. **Informações**:
   - Mensagem: "Pneu Registrado!"
   - Modelo do pneu
   - Código de barras

### Duração
- ⏱️ **1.5 segundos** total
- 🚀 **Não bloqueia** próximo scan
- 🔊 **Som** opcional (pode ser mutado pelo navegador)

### Características
- ✅ Feedback visual **impactante**
- ✅ Confirma operação com **clareza**
- ✅ Não atrasa **velocidade** de trabalho
- ✅ Animação **fluida** (60fps)

### Dicas
- ✅ Use fone de ouvido para ouvir o beep
- ✅ Não tente clicar (fecha automaticamente)
- ✅ Continue escaneando normalmente

---

## 6. Tabela Virtualizada

### Onde Será Usada
*Próxima atualização em Relatórios (v2.2.1)*

### O que Faz
Exibe listas grandes (1000+ items) de forma **super rápida**.

### Benefícios
- ⚡ **Scroll fluido** mesmo com 10.000 items
- 💾 **Menos memória** usada (~95% de redução)
- 🚀 **Carregamento instantâneo**

### Como Funciona
- Renderiza apenas linhas **visíveis** na tela
- Adiciona algumas linhas **acima/abaixo** (overscan)
- Simula scroll com altura total

### Performance

| Quantidade | Antes | Depois |
|------------|-------|--------|
| 100 items | ✅ OK | ✅ Excelente |
| 1.000 items | ⚠️ Lento | ✅ Excelente |
| 10.000 items | ❌ Trava | ✅ Excelente |

### Recursos
- 📄 **Paginação virtual** (sem botões)
- 🔽 **Linhas expansíveis** (opcional)
- 💀 **Skeleton loading** durante carregamento
- 📊 **Indicador** de posição

### Dicas
- ✅ Scroll normal funciona perfeitamente
- ✅ Busca e filtros são instantâneos
- ✅ Performance constante independente do tamanho

---

## 🎯 Melhores Práticas

### Para Operadores

#### Entrada de Estoque
1. Ative **Modo Rápido** se for registrar vários do mesmo modelo
2. Espere a **animação** confirmar antes do próximo
3. Observe **toasts** para detectar erros rapidamente

#### Gestão de Containers
1. Verifique **Monitor de Ocupação** antes de movimentações
2. Use **Mapa Visual** para localizar containers rapidamente
3. Preste atenção em containers **críticos** (laranja/vermelho)

#### Relatórios
1. Aplique **filtros** antes de exportar
2. Use **Excel** para análises offline
3. Exporte **periodicamente** para backup

### Para Administradores

#### Monitoramento
1. Verifique **Dashboard** diariamente
2. Monitore **containers críticos** frequentemente
3. Exporte **relatórios mensais** em Excel

#### Planejamento
1. Use **Mapa de Containers** para planejar layout
2. Analise **ocupação média** para otimizar capacidade
3. Identifique **gargalos** com dados do Excel

---

## 🐛 Solução de Problemas

### Exportação Excel não funciona
- ✅ Verifique se navegador permite downloads
- ✅ Tente desabilitar bloqueador de pop-ups
- ✅ Verifique espaço em disco

### Animação de confirmação sem som
- ✅ Verifique volume do navegador
- ✅ Alguns navegadores bloqueiam som automático
- ✅ Dê permissão de áudio ao site

### Toast não aparece
- ✅ Recarregue a página
- ✅ Limpe cache do navegador
- ✅ Verifique se não há bloqueador de anúncios

### Monitor não atualiza
- ✅ Verifique conexão com internet
- ✅ Aguarde 30 segundos (tempo de atualização)
- ✅ Recarregue a página

---

## 📞 Suporte

Precisa de ajuda?
- 📧 Email: suporte@porschecupbrasil.com.br
- 📚 Documentação: `/docs`
- 🐛 Reportar bug: GitHub Issues

---

## 🎓 Vídeo Tutoriais

*Em breve:*
- 🎥 Como usar exportação Excel
- 🎥 Navegando pelo mapa de containers
- 🎥 Otimizando workflow com Modo Rápido

---

**Aproveite as novas funcionalidades! 🏁**

Sistema de Gestão de Pneus - Porsche Cup Brasil v2.2.0
